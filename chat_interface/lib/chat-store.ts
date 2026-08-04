"use client"

import type { ReactNode } from 'react'
import { create } from 'zustand'

export type Reaction = 'up' | 'down' | null

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  createdAt?: number
  reaction?: Reaction
  status: 'sending' | 'sent' | 'receiving' | 'received' | 'error'
  metadata?: {
    files?: string[]
    artifacts?: any
    tool_calls?: any[]
  }
}

interface ChatState {
  // Active conversation
  activeConversation: Message[]
  isRunning: boolean
  error: string | null

  // Settings
  model: string
  tone: string
  dataSource: string
  webSearch: boolean

  // UI state
  sidebarOpen: boolean
  sidebarWidth: number
  agent: string

  // HR Agent state
  isHRConnected: boolean
  hrError: string | null
  hrReconnectAttempts: number

  // HR Agent configuration
  hrConfig: any | null

  // HR Agent client instance
  hrAgentClient: any | null

  // Actions
  sendMessage: (content: string) => Promise<void>
  runConversation: () => Promise<void>
  clearConversation: () => void
  setModel: (model: string) => void
  setTone: (tone: string) => void
  setDataSource: (source: string) => void
  toggleWebSearch: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setAgent: (agent: string) => void
  newChat: () => void

  // HR Agent actions
  hrConnect: () => Promise<void>
  hrDisconnect: () => void
  hrSendMessage: (content: string) => Promise<void>
  setHRConfig: (config: any) => void
  reactToMessage: (messageId: string, reaction: 'up' | 'down') => void
}

const MODELS = [
  { label: 'GPT-5.5', value: 'gpt-5.5' },
  { label: 'GPT-4o', value: 'gpt-4o' },
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

export const useChat = create<ChatState>((set, get) => ({
  // Initial state
  activeConversation: [],
  isRunning: false,
  error: null,
  model: MODELS[0].value,
  tone: 'Default',
  dataSource: 'Internal Knowledge',
  webSearch: false,
  sidebarOpen: true,
  sidebarWidth: 320,
  agent: 'HR Agent',

  // HR Agent state
  isHRConnected: false,
  hrError: null,
  hrReconnectAttempts: 0,

  // HR Agent client instance
  hrAgentClient: null as any,

  // HR Agent configuration
  hrConfig: null as any,

  // Actions
  sendMessage: async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return

    const now = new Date()
    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: trimmed,
      timestamp: now,
      createdAt: now.getTime(),
      reaction: null,
      status: 'sent'
    }

    set(state => ({
      activeConversation: [...state.activeConversation, userMessage],
      error: null,
      hrError: null
    }))

    const hrState = get()
    const connected = hrState.isHRConnected || await get().hrConnect()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          ...(connected ? { agent: 'hr-agent', use_real_agent: true } : {})
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      const assistantTimestamp = new Date()
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: data.message || 'No response received',
        timestamp: assistantTimestamp,
        createdAt: assistantTimestamp.getTime(),
        reaction: null,
        status: 'received',
        metadata: {
          files: data.metadata?.files || [],
          artifacts: data.metadata?.artifacts || [],
          tool_calls: data.metadata?.tool_calls || [],
          agent_id: data.agent_id,
          session_id: data.session_id
        }
      }

      set(state => ({
        activeConversation: [...state.activeConversation, assistantMessage]
      }))
    } catch (error) {
      const errorTimestamp = new Date()
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: errorTimestamp,
        createdAt: errorTimestamp.getTime(),
        reaction: null,
        status: 'error'
      }

      set(state => ({
        activeConversation: [...state.activeConversation, errorMessage],
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  },

  runConversation: async () => {
    set({ isRunning: true, error: null })

    try {
      // Process the conversation with OpenHands
      for (const message of get().activeConversation) {
        if (message.role === 'user') {
          await get().sendMessage(message.content)
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error running conversation' })
    } finally {
      set({ isRunning: false })
    }
  },

  clearConversation: () => {
    set({
      activeConversation: [],
      error: null
    })
  },

  setModel: (model: string) => set({ model }),
  setTone: (tone: string) => set({ tone }),
  setDataSource: (dataSource: string) => set({ dataSource }),
  toggleWebSearch: () => set(state => ({ webSearch: !state.webSearch })),
  setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen }),
  setSidebarWidth: (sidebarWidth: number) => set({ sidebarWidth }),
  setAgent: (agent: string) => set({ agent }),

  reactToMessage: (messageId: string, reaction: 'up' | 'down') => {
    set(state => ({
      activeConversation: state.activeConversation.map(message =>
        message.id === messageId
          ? {
              ...message,
              reaction: message.reaction === reaction ? null : reaction
            }
          : message
      )
    }))
  },

  newChat: () => {
    set({
      activeConversation: [],
      error: null,
      model: MODELS[0].value,
      tone: 'Default',
      dataSource: 'Internal Knowledge',
      webSearch: false
    })
  },

  // HR Agent actions

  hrConnect: async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('HR Agent backend is not reachable')
      }

      const data = await response.json()
      set({
        isHRConnected: data.connected === true,
        hrError: null,
        hrReconnectAttempts: 0,
        hrConfig: data
      })

      return data.connected === true
    } catch (error) {
      set({
        isHRConnected: false,
        hrError: error instanceof Error ? error.message : 'HR Agent connection failed',
        hrReconnectAttempts: get().hrReconnectAttempts + 1
      })
      return false
    }
  },

  hrDisconnect: () => {
    set({
      isHRConnected: false,
      hrAgentClient: null,
      hrConfig: null,
      hrReconnectAttempts: 0,
      hrError: null
    })
  },

  hrSendMessage: async (content: string) => {
    const connected = await get().hrConnect()
    if (!connected) {
      throw new Error('HR Agent is not connected. Please connect first.')
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: content.trim(),
          agent: 'hr-agent',
          use_real_agent: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message to HR Agent')
      }

      const data = await response.json()

      const assistantTimestamp = new Date()
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: data.message || 'No response received from HR Agent',
        timestamp: assistantTimestamp,
        createdAt: assistantTimestamp.getTime(),
        reaction: null,
        status: 'received',
        metadata: {
          files: data.metadata?.files || [],
          artifacts: data.metadata?.artifacts || [],
          tool_calls: data.metadata?.tool_calls || [],
          agent_id: data.agent_id,
          session_id: data.session_id
        }
      }

      set(state => ({
        activeConversation: [...state.activeConversation, assistantMessage]
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'HR Agent error'
      set({ hrError: errorMessage, hrReconnectAttempts: get().hrReconnectAttempts + 1 })
      throw error
    }
  },

  setHRConfig: (config: any) => {
    set({ hrConfig: config })
  }
}))

export function ChatProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
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