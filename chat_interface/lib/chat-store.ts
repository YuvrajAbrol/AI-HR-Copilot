"use client"

import type { ReactNode } from 'react'
import { create } from 'zustand'
// Type-only import (erased at build time, so no runtime import cycle with
// agent-runtime, which imports the store's `useChat` value).
import type { EventCategory, EventStatus } from './agent-runtime'
// Leaf store (does not import back into chat-store), so importing the value is
// cycle-safe. Tool observations feed the right-hand Side Canvas.
import { useCanvas, type CanvasModule } from './canvas-store'
import { HR_ACTION_TOOL_NAMES, actionTitle, actionStepTitle } from './hr-actions'

export type Reaction = 'up' | 'down' | null

/**
 * A single step in the agent's live reasoning stream, derived from the
 * backend's Action/Observation events. The execution panel (agent-runtime)
 * maps these into its RunEvent shape for rendering. Timestamps are absolute
 * (ms) and converted to run-relative offsets at render time.
 */
export interface ActivityStep {
  id: string
  category: EventCategory
  title: string
  detail?: string
  status: EventStatus
  createdAtMs: number
  endedAtMs?: number
  /** Backend tool_call_id, used to match an Observation back to its Action. */
  toolCallId?: string
  level?: 'info' | 'warn' | 'error' | 'debug'
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  createdAt?: number
  reaction?: Reaction
  status: 'sending' | 'sent' | 'receiving' | 'received' | 'error'
  metadata?: {
    files?: string[]
    artifacts?: unknown
    tool_calls?: unknown[]
  }
}

export interface ConversationMeta {
  id: string
  title: string
}

interface ChatState {
  // Active conversation (UI)
  activeConversation: Message[]
  conversations: ConversationMeta[]
  activeId: string | null

  // Run state
  isRunning: boolean
  error: string | null

  // Live agent reasoning steps for the current turn (execution panel / feed).
  activity: ActivityStep[]
  activityStartedAt: number | null

  // Backend (HRAgents agent server) connection
  backendConversationId: string | null
  socket: WebSocket | null
  backendConnected: boolean
  connectionError: string | null

  // Settings
  model: string
  tone: string
  dataSource: string
  webSearch: boolean

  // UI state
  sidebarOpen: boolean
  sidebarWidth: number
  agent: string

  // Actions
  sendMessage: (content: string) => Promise<void>
  cancelRun: () => void
  clearConversation: () => void
  setModel: (model: string) => void
  setTone: (tone: string) => void
  setDataSource: (source: string) => void
  toggleWebSearch: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setAgent: (agent: string) => void
  newChat: () => void
  selectConversation: (id: string) => void
  deleteConversation: (id: string) => void
  reactToMessage: (messageId: string, reaction: 'up' | 'down') => void
}

const MODELS = [
  { label: 'GPT-4o (Azure)', value: 'gpt-4o' },
  { label: 'GPT-5.5', value: 'gpt-5.5' },
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
  { label: 'Claude 3 Opus', value: 'claude-3-opus' },
]

const TONES = [
  'Default',
  'Professional',
  'Friendly',
  'Technical',
  'Creative',
  'Analytical',
]

const DATA_SOURCES = [
  'Internal Knowledge',
  'Web Search',
  'Both',
]

// Browser-reachable base for the backend event WebSocket. The REST calls that
// carry secrets (creating the conversation with the Azure LLM config) go
// through the Next.js server route instead, so no credentials touch the client.
const WS_BASE =
  process.env.NEXT_PUBLIC_HRAGENT_WS_URL?.replace(/\/$/, '') || 'ws://127.0.0.1:8001'

// Optional token for the browser's event WebSocket, used only when the backend
// is started with SESSION_API_KEY. Sent as a first-message auth frame. NOTE:
// because it is a NEXT_PUBLIC_ value it is visible to the browser; treat this
// as a network-scoped (VPN/internal) control, not a real secret. A short-lived
// minted token / WS proxy is tracked for the hardening phase. Empty = the
// backend is open (local testing default) and no auth frame is sent.
const WS_TOKEN = process.env.NEXT_PUBLIC_HRAGENT_WS_TOKEN || ''

const CONNECT_TIMEOUT_MS = 20000

// Whether the agent produced any visible text during the current turn. Used to
// decide if we need the final-response fallback when the run finishes. The UI
// only runs one turn at a time, so a module-scoped flag is sufficient.
let sawAgentTextThisTurn = false

// Id of the assistant message currently being built from streaming token
// deltas, if any. Null when we are not mid-stream. Reset each turn.
let streamingMessageId: string | null = null

const TERMINAL_STATUSES = new Set(['finished', 'error', 'stuck'])

// hr-mcp tools that read structured data (Azure SQL later) vs. policy RAG.
const DATA_TOOLS = new Set(['employee_lookup', 'pto_balance', 'org_chart', 'benefits_lookup'])

const TOOL_LABELS: Record<string, string> = {
  employee_lookup: 'Looking up employee record',
  pto_balance: 'Checking PTO balance',
  org_chart: 'Fetching org chart',
  benefits_lookup: 'Looking up benefits',
  policy_search: 'Searching HR policies',
}

// Map a backend tool name to the execution panel's visual category so the
// reasoning stepper shows a sensible icon (DB lookup vs. knowledge search).
function categoryForTool(name: string): EventCategory {
  if (name === 'policy_search') return 'memory'
  if (DATA_TOOLS.has(name)) return 'database'
  if (name === 'think') return 'step'
  return 'tool'
}

function truncate(text: string, max = 140): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

// Extract a tool call's real arguments from the ActionEvent `action` payload.
// MCP tools nest args under `data`; client tools carry them top-level. Either
// way, drop the SDK meta fields (kind / summary / security_risk).
function extractActionParams(action: any): Record<string, any> {
  if (!action || typeof action !== 'object') return {}
  const base =
    action.data && typeof action.data === 'object' && !Array.isArray(action.data)
      ? action.data
      : action
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(base)) {
    if (k === 'kind' || k === 'summary' || k === 'security_risk') continue
    out[k] = v
  }
  return out
}

// Compact "key: value, key: value" summary of a tool call's arguments for the
// step's detail line.
function argsSummary(action: any): string | undefined {
  const entries = Object.entries(extractActionParams(action))
  if (entries.length === 0) return undefined
  const parts = entries.map(
    ([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`,
  )
  return truncate(parts.join(', '), 120)
}

function observationText(observation: any): string {
  const content = observation?.content
  if (!Array.isArray(content)) return ''
  return content
    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join(' ')
    .trim()
}

function titleForAction(evt: any): string {
  const toolName: string = evt?.tool_name || 'tool'
  if (toolName === 'think') {
    const thought = evt?.action?.thought
    if (typeof thought === 'string' && thought.trim()) return truncate(thought)
    return 'Thinking'
  }
  const summary = typeof evt?.summary === 'string' ? evt.summary.trim() : ''
  if (summary) return truncate(summary)
  return TOOL_LABELS[toolName] || `Calling ${toolName}`
}

// hr-mcp tools whose results have a structured Side Canvas rendering.
const CANVAS_TOOLS = new Set(Object.keys(TOOL_LABELS))

function moduleForTool(name: string): CanvasModule {
  switch (name) {
    case 'employee_lookup':
      return 'employee_profile'
    case 'pto_balance':
      return 'pto'
    case 'org_chart':
      return 'org_chart'
    case 'benefits_lookup':
      return 'benefits'
    case 'policy_search':
      return 'policy'
    default:
      return 'json'
  }
}

// The MCP observation content is a list of text parts (a "[Tool ... executed.]"
// marker plus the JSON payload). Return the first part that parses to an object.
function tryParseJsonObject(text: string): any | null {
  const s = text.trim()
  try {
    const o = JSON.parse(s)
    if (o && typeof o === 'object') return o
  } catch {
    /* fall through to brace extraction */
  }
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try {
      const o = JSON.parse(s.slice(first, last + 1))
      if (o && typeof o === 'object') return o
    } catch {
      /* ignore */
    }
  }
  return null
}

function parseObservationResult(observation: any): any | null {
  const content = observation?.content
  if (!Array.isArray(content)) return null
  for (const part of content) {
    if (part && part.type === 'text' && typeof part.text === 'string') {
      const obj = tryParseJsonObject(part.text)
      if (obj) return obj
    }
  }
  return null
}

// Surface a successful tool result on the Side Canvas for human review. Skips
// misses (found=false) and empty policy searches so we never pop a blank panel.
function ingestCanvas(toolName: string, observation: any) {
  if (!CANVAS_TOOLS.has(toolName)) return
  const result = parseObservationResult(observation)
  if (!result || typeof result !== 'object') return
  if (result.found === false) return
  if (
    toolName === 'policy_search' &&
    (!Array.isArray(result.results) || result.results.length === 0)
  ) {
    return
  }
  const module: CanvasModule = (result._canvas?.module as CanvasModule) || moduleForTool(toolName)
  const title: string = result._canvas?.title || TOOL_LABELS[toolName] || toolName
  useCanvas.getState().openArtifact({ module, toolName, title, data: result })
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function textFromLlmMessage(llmMessage: any): string {
  if (!llmMessage) return ''
  const content = llmMessage.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text)
      .join('\n')
      .trim()
  }
  return ''
}

function readExecutionStatus(evt: any): string | undefined {
  const value = evt?.value
  if (evt?.key === 'execution_status') {
    return typeof value === 'string' ? value : value?.execution_status
  }
  if (value && typeof value === 'object') return value.execution_status
  return undefined
}

export const useChat = create<ChatState>((set, get) => ({
  // Initial state
  activeConversation: [],
  conversations: [],
  activeId: null,
  isRunning: false,
  error: null,

  activity: [],
  activityStartedAt: null,

  backendConversationId: null,
  socket: null,
  backendConnected: false,
  connectionError: null,

  model: MODELS[0].value,
  tone: 'Default',
  dataSource: 'Internal Knowledge',
  webSearch: false,
  sidebarOpen: true,
  sidebarWidth: 320,
  agent: 'HR Agent',

  sendMessage: async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return

    const now = new Date()
    const userMessage: Message = {
      id: newId('user'),
      role: 'user',
      content: trimmed,
      timestamp: now,
      createdAt: now.getTime(),
      reaction: null,
      status: 'sent',
    }

    set((state) => ({
      activeConversation: [...state.activeConversation, userMessage],
      isRunning: true,
      error: null,
      // Start a fresh reasoning stream for this turn.
      activity: [],
      activityStartedAt: now.getTime(),
    }))

    sawAgentTextThisTurn = false
    streamingMessageId = null

    try {
      const socket = await ensureSocket(get, set)
      socket.send(
        JSON.stringify({
          role: 'user',
          content: [{ type: 'text', text: trimmed }],
        }),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Failed to reach HR Agent'
      appendSystem(set, `Error: ${detail}`)
      set({ isRunning: false, error: detail, connectionError: detail })
    }
  },

  cancelRun: () => {
    const { backendConversationId } = get()
    set({ isRunning: false })
    if (backendConversationId) {
      // Best-effort interrupt of the running backend conversation.
      fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: backendConversationId }),
      }).catch(() => {})
    }
  },

  clearConversation: () => {
    streamingMessageId = null
    useCanvas.getState().clear()
    set({ activeConversation: [], error: null, activity: [], activityStartedAt: null })
  },

  setModel: (model: string) => set({ model }),
  setTone: (tone: string) => set({ tone }),
  setDataSource: (dataSource: string) => set({ dataSource }),
  toggleWebSearch: () => set((state) => ({ webSearch: !state.webSearch })),
  setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen }),
  setSidebarWidth: (sidebarWidth: number) => set({ sidebarWidth }),
  setAgent: (agent: string) => set({ agent }),

  reactToMessage: (messageId: string, reaction: 'up' | 'down') => {
    set((state) => ({
      activeConversation: state.activeConversation.map((message) =>
        message.id === messageId
          ? { ...message, reaction: message.reaction === reaction ? null : reaction }
          : message,
      ),
    }))
  },

  newChat: () => {
    resetConnection(get, set)
    streamingMessageId = null
    useCanvas.getState().clear()
    const id = `chat-${Date.now()}`
    set((state) => ({
      activeConversation: [],
      activeId: id,
      conversations: [{ id, title: 'New Chat' }, ...state.conversations],
      error: null,
      isRunning: false,
      activity: [],
      activityStartedAt: null,
    }))
  },

  selectConversation: (id: string) => {
    resetConnection(get, set)
    streamingMessageId = null
    useCanvas.getState().clear()
    set({
      activeId: id,
      activeConversation: [],
      error: null,
      isRunning: false,
      activity: [],
      activityStartedAt: null,
    })
  },

  deleteConversation: (id: string) => {
    const conversations = get().conversations.filter((c) => c.id !== id)
    const isActive = get().activeId === id
    const activeId = isActive ? (conversations[0]?.id ?? null) : get().activeId
    if (isActive) {
      resetConnection(get, set)
      streamingMessageId = null
      useCanvas.getState().clear()
    }
    set({
      conversations,
      activeId,
      ...(isActive
        ? {
            activeConversation: [],
            error: null,
            isRunning: false,
            activity: [],
            activityStartedAt: null,
          }
        : {}),
    })
  },
}))

type Getter = typeof useChat.getState
type Setter = (partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)) => void

function appendAssistant(set: Setter, text: string) {
  const now = new Date()
  const message: Message = {
    id: newId('assistant'),
    role: 'assistant',
    content: text,
    timestamp: now,
    createdAt: now.getTime(),
    reaction: null,
    status: 'received',
  }
  set((state) => ({ activeConversation: [...state.activeConversation, message] }))
}

function pushActivity(set: Setter, step: ActivityStep) {
  set((state) => ({ activity: [...state.activity, step] }))
}

// Patch the most recent still-running step matching a tool_call_id (an
// Observation/error responding to an earlier Action).
function updateActivityByToolCall(
  set: Setter,
  toolCallId: string | undefined,
  patch: Partial<ActivityStep>,
) {
  if (!toolCallId) return
  set((state) => {
    let done = false
    const activity = state.activity.map((s) => {
      if (!done && s.toolCallId === toolCallId && s.status === 'running') {
        done = true
        return { ...s, ...patch }
      }
      return s
    })
    return done ? { activity } : {}
  })
}

function markRunningStepsError(set: Setter, detail: string) {
  const now = Date.now()
  set((state) => ({
    activity: state.activity.map((s) =>
      s.status === 'running' ? { ...s, status: 'error' as EventStatus, endedAtMs: now, detail } : s,
    ),
  }))
}

// Append a streamed token chunk to the in-progress assistant bubble, creating
// it on the first delta of the turn.
function appendStreamingDelta(set: Setter, delta: string) {
  sawAgentTextThisTurn = true
  if (!streamingMessageId) {
    const now = new Date()
    const id = newId('assistant')
    streamingMessageId = id
    const message: Message = {
      id,
      role: 'assistant',
      content: delta,
      timestamp: now,
      createdAt: now.getTime(),
      reaction: null,
      status: 'receiving',
    }
    set((state) => ({ activeConversation: [...state.activeConversation, message] }))
    return
  }
  const id = streamingMessageId
  set((state) => ({
    activeConversation: state.activeConversation.map((m) =>
      m.id === id ? { ...m, content: m.content + delta } : m,
    ),
  }))
}

// Commit the streamed bubble: mark it received and, when the authoritative
// final text is available, replace the accumulated deltas with it.
function finalizeStreaming(set: Setter, finalText?: string) {
  const id = streamingMessageId
  if (!id) return
  streamingMessageId = null
  const authoritative = finalText != null && finalText.trim().length > 0 ? finalText : undefined
  set((state) => ({
    activeConversation: state.activeConversation.map((m) =>
      m.id === id
        ? { ...m, content: authoritative ?? m.content, status: 'received' as Message['status'] }
        : m,
    ),
  }))
}

function appendSystem(set: Setter, text: string) {
  const now = new Date()
  const message: Message = {
    id: newId('system'),
    role: 'system',
    content: text,
    timestamp: now,
    createdAt: now.getTime(),
    reaction: null,
    status: 'error',
  }
  set((state) => ({ activeConversation: [...state.activeConversation, message] }))
}

function resetConnection(get: Getter, set: Setter) {
  const { socket } = get()
  if (socket) {
    try {
      socket.onopen = null
      socket.onmessage = null
      socket.onclose = null
      socket.onerror = null
      socket.close()
    } catch {
      /* ignore */
    }
  }
  set({ socket: null, backendConversationId: null, backendConnected: false })
}

async function ensureSocket(get: Getter, set: Setter): Promise<WebSocket> {
  const existing = get().socket
  const conversationId = get().backendConversationId
  if (existing && existing.readyState === WebSocket.OPEN && conversationId) {
    return existing
  }
  if (existing) {
    try {
      existing.close()
    } catch {
      /* ignore */
    }
  }

  // 1) Create a backend conversation server-side (Azure LLM config + secrets
  //    stay in the Next.js server process, never in the browser).
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    let detail = 'Failed to create HR Agent conversation'
    try {
      const body = await res.json()
      detail = body.error || body.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  const { conversationId: newConversationId } = await res.json()
  if (!newConversationId) throw new Error('Backend did not return a conversation id')

  // 2) Open the event WebSocket directly to the backend and subscribe.
  const url = `${WS_BASE}/sockets/events/${newConversationId}`
  const ws = new WebSocket(url)
  set({
    socket: ws,
    backendConversationId: newConversationId,
    connectionError: null,
  })

  ws.onmessage = (event) => {
    let parsed: any
    try {
      parsed = JSON.parse(event.data)
    } catch {
      return
    }
    handleServerEvent(parsed, get, set)
  }
  ws.onclose = () => {
    if (get().socket === ws) set({ backendConnected: false })
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timed out connecting to the HR Agent event stream'))
    }, CONNECT_TIMEOUT_MS)
    ws.onopen = () => {
      clearTimeout(timer)
      // First-message auth when the backend requires a session key. Must be the
      // first frame we send; ignored by the backend when no keys are configured.
      if (WS_TOKEN) {
        try {
          ws.send(JSON.stringify({ type: 'auth', session_api_key: WS_TOKEN }))
        } catch {
          /* ignore */
        }
      }
      set({ backendConnected: true })
      resolve()
    }
    ws.addEventListener(
      'error',
      () => {
        clearTimeout(timer)
        reject(new Error('Could not connect to the HR Agent event stream'))
      },
      { once: true },
    )
  })

  return ws
}

function handleServerEvent(evt: any, get: Getter, set: Setter) {
  const kind = evt?.kind

  if (kind === 'MessageEvent') {
    // Only render the agent's messages; the user's own turn is added
    // optimistically when sending, and echoes back as source "user".
    if (evt.source === 'agent') {
      const text = textFromLlmMessage(evt.llm_message)
      if (text) {
        sawAgentTextThisTurn = true
        // If we streamed this answer token-by-token, replace the in-progress
        // bubble with the authoritative text instead of appending a duplicate.
        if (streamingMessageId) finalizeStreaming(set, text)
        else appendAssistant(set, text)
      }
    }
    return
  }

  // A live token delta for the current answer (only emitted when the backend
  // LLM is configured with stream=true). Builds the assistant bubble
  // incrementally; the trailing MessageEvent finalizes it.
  if (kind === 'StreamingDeltaEvent') {
    if (typeof evt.content === 'string' && evt.content.length > 0) {
      appendStreamingDelta(set, evt.content)
    }
    return
  }

  // The agent decided to call a tool: add a running step to the reasoning feed.
  if (kind === 'ActionEvent') {
    const toolName: string = evt.tool_name || 'tool'
    // The final answer is delivered via MessageEvent; don't clutter the feed
    // with the internal "finish" call.
    if (toolName === 'finish') return

    // Human-in-the-loop action tool: the backend acks without sending, so we
    // surface an "Approve & Send" card on the Side Canvas for the HR user.
    if (HR_ACTION_TOOL_NAMES.has(toolName)) {
      const params = extractActionParams(evt.action)
      pushActivity(set, {
        id: newId('act'),
        category: 'tool',
        title: actionStepTitle(toolName, params),
        detail: argsSummary(evt.action),
        status: 'running',
        createdAtMs: Date.now(),
        toolCallId: evt.tool_call_id,
      })
      useCanvas.getState().openApproval({
        toolName,
        title: actionTitle(toolName, params),
        params,
      })
      return
    }

    pushActivity(set, {
      id: newId('act'),
      category: categoryForTool(toolName),
      title: titleForAction(evt),
      detail: argsSummary(evt.action),
      status: 'running',
      createdAtMs: Date.now(),
      toolCallId: evt.tool_call_id,
    })
    return
  }

  // A tool returned: close out the matching step (success or error) and, on
  // success, surface any structured result on the Side Canvas for review.
  if (kind === 'ObservationEvent') {
    const isErr = !!evt.observation?.is_error
    updateActivityByToolCall(set, evt.tool_call_id, {
      status: isErr ? 'error' : 'success',
      endedAtMs: Date.now(),
      ...(isErr ? { detail: truncate(observationText(evt.observation)) || 'Tool error' } : {}),
    })
    if (!isErr) ingestCanvas(evt.tool_name, evt.observation)
    return
  }

  if (kind === 'UserRejectObservation') {
    updateActivityByToolCall(set, evt.tool_call_id, {
      status: 'warn',
      endedAtMs: Date.now(),
      detail: truncate(evt.rejection_reason || 'Rejected'),
    })
    return
  }

  // Conversation-level failure (not fed back to the LLM). Surface it and stop.
  if (kind === 'ConversationErrorEvent') {
    const detail = evt.detail || evt.code || 'The conversation failed.'
    appendSystem(set, `Conversation error: ${detail}`)
    markRunningStepsError(set, truncate(String(detail)))
    finalizeStreaming(set)
    set({ isRunning: false })
    return
  }

  if (kind === 'ConversationStateUpdateEvent') {
    const status = readExecutionStatus(evt)
    if (status === 'running') {
      set({ isRunning: true })
    } else if (status && TERMINAL_STATUSES.has(status)) {
      finishTurn(status, get, set)
    }
    return
  }

  if (kind === 'AgentErrorEvent') {
    const detail = evt.error || evt.detail || evt.message || 'The agent reported an error.'
    // Reflect the failure on the originating tool step when we can match it.
    if (evt.tool_call_id) {
      updateActivityByToolCall(set, evt.tool_call_id, {
        status: 'error',
        endedAtMs: Date.now(),
        detail: truncate(String(detail)),
      })
    }
    appendSystem(set, `Agent error: ${detail}`)
    return
  }

  if (kind === 'ServerErrorEvent') {
    const detail = evt.detail || evt.code || 'Unknown server error'
    appendSystem(set, `Server error: ${detail}`)
    set({ isRunning: false })
    return
  }
}

function finishTurn(status: string, get: Getter, set: Setter) {
  set({ isRunning: false })

  // Close out any steps still marked running so the feed doesn't spin forever,
  // and commit any partially streamed answer.
  const stepStatus: EventStatus = status === 'finished' ? 'success' : 'error'
  const now = Date.now()
  set((state) => ({
    activity: state.activity.map((s) =>
      s.status === 'running' ? { ...s, status: stepStatus, endedAtMs: now } : s,
    ),
  }))
  finalizeStreaming(set)

  if (status === 'error' || status === 'stuck') {
    appendSystem(set, `The agent stopped (${status}).`)
    return
  }

  // status === 'finished'. Some agents deliver their final answer via a
  // finish action rather than a plain message event. If nothing rendered this
  // turn, pull the final response as a fallback (give a trailing message event
  // a brief moment to arrive first).
  if (sawAgentTextThisTurn) return
  const conversationId = get().backendConversationId
  if (!conversationId) return
  setTimeout(async () => {
    if (sawAgentTextThisTurn) return
    try {
      const res = await fetch(
        `/api/chat?conversationId=${encodeURIComponent(conversationId)}&final=1`,
      )
      if (!res.ok) return
      const data = await res.json()
      const text = (data.response || '').trim()
      if (text && !sawAgentTextThisTurn) {
        sawAgentTextThisTurn = true
        appendAssistant(set, text)
      }
    } catch {
      /* ignore */
    }
  }, 500)
}

export function ChatProvider({ children }: { children: ReactNode }) {
  return children
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} d ago`
}

export { MODELS, TONES, DATA_SOURCES }
