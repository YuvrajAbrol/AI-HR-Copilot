"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

export type RunStatus = "idle" | "thinking" | "planning" | "executing" | "finished" | "error"
export type EventStatus = "pending" | "running" | "success" | "warn" | "error"
export type EventCategory =
  | "step"
  | "skill"
  | "tool"
  | "mcp"
  | "memory"
  | "database"
  | "subagent"
  | "task"
  | "file"
  | "api"
  | "log"
  | "error"
  | "retry"

export interface EventMeta {
  label: string
  value: string
}

export interface RunEvent {
  id: string
  category: EventCategory
  title: string
  detail?: string
  status: EventStatus
  /** ms relative to run start */
  startedAt: number
  endedAt?: number
  progress?: number
  parentId?: string
  level?: "info" | "warn" | "error" | "debug"
  meta?: EventMeta[]
}

interface RunState {
  runId: string | null
  prompt: string
  status: RunStatus
  events: RunEvent[]
  startedAt: number | null
  elapsedMs: number
  phases: Partial<Record<RunStatus, { start: number; end?: number }>>
}

interface AgentRuntimeValue extends RunState {
  isRunning: boolean
  hasRun: boolean
  panelOpen: boolean
  setPanelOpen: (v: boolean) => void
  togglePanel: () => void
  startRun: (prompt: string) => void
  stopRun: () => void
}

const AgentRuntimeContext = createContext<AgentRuntimeValue | null>(null)

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

const INITIAL: RunState = {
  runId: null,
  prompt: "",
  status: "idle",
  events: [],
  startedAt: null,
  elapsedMs: 0,
  phases: {},
}

export function AgentRuntimeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RunState>(INITIAL)
  const [panelOpen, setPanelOpen] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []
    if (clockRef.current) {
      clearInterval(clockRef.current)
      clockRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const stopRun = useCallback(() => {
    clearTimers()
    setState((s) => (s.status === "idle" || s.status === "finished" ? s : { ...s, status: "finished" }))
  }, [clearTimers])

  const startRun = useCallback(
    (prompt: string) => {
      clearTimers()
      const runId = uid()
      const t0 = Date.now()

      setState({
        runId,
        prompt,
        status: "thinking",
        events: [],
        startedAt: t0,
        elapsedMs: 0,
        phases: { thinking: { start: 0 } },
      })
      setPanelOpen(true)

      // live wall-clock so running events tick their duration
      clockRef.current = setInterval(() => {
        setState((s) => {
          if (s.startedAt == null) return s
          if (s.status === "finished" || s.status === "error" || s.status === "idle") return s
          return { ...s, elapsedMs: Date.now() - s.startedAt }
        })
      }, 100)

      // ---- state mutators used by the scheduled timeline ----
      const addEvent = (ev: RunEvent) => setState((s) => ({ ...s, events: [...s.events, ev] }))
      const patch = (id: string, p: Partial<RunEvent>) =>
        setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...p } : e)) }))
      const setStatus = (st: RunStatus) =>
        setState((s) => {
          const rel = s.startedAt == null ? 0 : Date.now() - s.startedAt
          const phases = { ...s.phases }
          if (s.status !== "idle" && phases[s.status]) phases[s.status] = { ...phases[s.status]!, end: rel }
          phases[st] = { start: rel }
          return { ...s, status: st, phases }
        })

      // ---- tiny scheduling DSL ----
      const ops: { at: number; fn: () => void }[] = []
      const status = (at: number, st: RunStatus) => ops.push({ at, fn: () => setStatus(st) })
      const add = (at: number, ev: Omit<RunEvent, "startedAt" | "status"> & { status?: EventStatus }) =>
        ops.push({ at, fn: () => addEvent({ status: "running", startedAt: at, ...ev }) })
      const fin = (at: number, id: string, p?: Partial<RunEvent>) =>
        ops.push({ at, fn: () => patch(id, { status: "success", endedAt: at, ...p }) })
      const fail = (at: number, id: string, p?: Partial<RunEvent>) =>
        ops.push({ at, fn: () => patch(id, { status: "error", endedAt: at, ...p }) })
      const prog = (at: number, id: string, p: number) =>
        ops.push({
          at,
          fn: () => patch(id, p >= 100 ? { progress: 100, status: "success", endedAt: at } : { progress: p }),
        })
      const log = (at: number, level: RunEvent["level"], title: string, detail?: string) =>
        ops.push({
          at,
          fn: () => addEvent({ id: uid(), category: "log", level, title, detail, status: "success", startedAt: at, endedAt: at }),
        })

      // ---- ids ----
      const mem1 = uid()
      const skill1 = uid()
      const stepPlan = uid()
      const t1 = uid()
      const t2 = uid()
      const t3 = uid()
      const t4 = uid()
      const mcp1 = uid()
      const mcp2 = uid()
      const skill2 = uid()
      const step1 = uid()
      const file1 = uid()
      const step2 = uid()
      const tool1 = uid()
      const db1 = uid()
      const api1 = uid()
      const retry1 = uid()
      const api2 = uid()
      const db2 = uid()
      const step3 = uid()
      const sub1 = uid()
      const subStepA = uid()
      const skill3 = uid()
      const tool2 = uid()
      const subStepB = uid()
      const file2 = uid()
      const step4 = uid()
      const mem2 = uid()
      const file3 = uid()
      const warn1 = uid()

      const short = prompt.trim().length > 48 ? prompt.trim().slice(0, 48) + "…" : prompt.trim() || "user request"

      // ============ THINKING ============
      log(120, "info", "Run initialized", `objective: "${short}"`)
      log(220, "debug", "Context window assembled", "system + 3 memories + tools manifest")
      add(300, {
        id: mem1,
        category: "memory",
        title: "Retrieving long-term memory",
        detail: "vector search over 12,480 embeddings",
      })
      fin(1250, mem1, {
        detail: "4 relevant memories matched",
        meta: [
          { label: "top score", value: "0.912" },
          { label: "namespace", value: "user/preferences" },
        ],
      })
      add(500, { id: skill1, category: "skill", title: "Loading skill: hr-workflows", detail: "v2.4.1" })
      fin(1150, skill1, { detail: "hr-workflows ready · 6 tools registered" })

      // ============ PLANNING ============
      status(1600, "planning")
      add(1700, { id: stepPlan, category: "step", title: "Decompose objective into subtasks" })
      fin(2700, stepPlan, { detail: "4 subtasks identified" })
      add(2000, { id: t1, category: "task", title: "Ingest & validate data sources", progress: 0 })
      add(2060, { id: t2, category: "task", title: "Query HR + sales databases", progress: 0 })
      add(2120, { id: t3, category: "task", title: "Generate visual summary", progress: 0 })
      add(2180, { id: t4, category: "task", title: "Compile final report", progress: 0 })
      log(2800, "info", "Execution plan ready", "4 subtasks · estimated 6 tool calls")

      // ============ EXECUTING ============
      status(2900, "executing")
      add(3000, { id: mcp1, category: "mcp", title: "Connect MCP server: neon-postgres", detail: "wss://mcp.neon…" })
      fin(3800, mcp1, {
        detail: "connected · 12 tools exposed",
        meta: [
          { label: "transport", value: "websocket" },
          { label: "latency", value: "38ms" },
        ],
      })
      add(3200, { id: mcp2, category: "mcp", title: "Connect MCP server: filesystem", detail: "stdio" })
      fin(3950, mcp2, { detail: "connected · 5 tools exposed" })
      add(4000, { id: skill2, category: "skill", title: "Loading skill: sql-query", detail: "v1.8.0" })
      fin(4600, skill2, { detail: "sql-query ready" })

      // subtask 1
      add(4200, { id: step1, category: "step", title: "Subtask 1 · ingest & validate data" })
      add(4300, { id: file1, category: "file", title: "Read data/sales_q3.csv", detail: "filesystem MCP" })
      prog(4600, t1, 35)
      fin(5200, file1, {
        detail: "18,204 rows parsed",
        meta: [
          { label: "size", value: "2.4 MB" },
          { label: "encoding", value: "utf-8" },
        ],
      })
      prog(5100, t1, 100)
      fin(5300, step1, { detail: "sources validated · 0 schema errors" })

      // subtask 2
      add(5400, { id: step2, category: "step", title: "Subtask 2 · query HR + sales databases" })
      add(5500, { id: tool1, category: "tool", title: "call query_database", detail: "via neon-postgres" })
      add(5600, {
        id: db1,
        category: "database",
        title: "SELECT * FROM employees WHERE dept = 'Sales'",
        detail: "HR database · read",
      })
      prog(5700, t2, 30)
      fin(6600, db1, {
        detail: "128 rows returned",
        meta: [
          { label: "duration", value: "42ms" },
          { label: "scanned", value: "3,910 rows" },
        ],
      })
      fin(6750, tool1, { detail: "query_database → 128 rows" })
      add(5800, { id: api1, category: "api", title: "GET /hr/headcount", detail: "api.internal" })
      fail(6250, api1, {
        detail: "503 Service Unavailable",
        meta: [{ label: "duration", value: "451ms" }],
      })
      log(6280, "warn", "API request failed", "GET /hr/headcount → 503, scheduling retry")
      add(6350, { id: retry1, category: "retry", title: "Retry 1/3 · GET /hr/headcount", detail: "backoff 400ms" })
      prog(6600, t2, 55)
      add(6900, { id: api2, category: "api", title: "GET /hr/headcount", detail: "api.internal · attempt 2" })
      fin(7350, api2, {
        detail: "200 OK",
        meta: [
          { label: "duration", value: "298ms" },
          { label: "bytes", value: "4.1 KB" },
        ],
      })
      fin(7400, retry1, { detail: "recovered on attempt 2" })
      add(7000, {
        id: db2,
        category: "database",
        title: "SELECT region, SUM(amount) FROM sales GROUP BY region",
        detail: "sales database · read",
      })
      fin(7900, db2, {
        detail: "5 rows returned",
        meta: [{ label: "duration", value: "88ms" }],
      })
      prog(7600, t2, 100)
      fin(8000, step2, { detail: "2 datasets joined · 133 records" })

      // subtask 3 — recursive sub-agent
      add(8100, { id: step3, category: "step", title: "Subtask 3 · generate visual summary" })
      add(8200, {
        id: sub1,
        category: "subagent",
        title: "Spawn sub-agent: chart-generator",
        detail: "depth 1 · isolated context",
      })
      add(8350, { id: subStepA, category: "step", parentId: sub1, title: "Select chart types for 3 metrics" })
      prog(8400, t3, 25)
      fin(9050, subStepA, { detail: "bar · line · stacked-area" })
      add(8600, { id: skill3, category: "skill", parentId: sub1, title: "Loading skill: charts", detail: "v3.0.2" })
      fin(9150, skill3, { detail: "charts ready" })
      add(8800, { id: tool2, category: "tool", parentId: sub1, title: "call generate_chart", detail: "type=bar" })
      fin(9800, tool2, { detail: "chart rendered · 1240×720" })
      add(9200, { id: subStepB, category: "step", parentId: sub1, title: "Render 3 charts to SVG" })
      prog(9400, t3, 70)
      fin(10250, subStepB, { detail: "3 SVGs generated" })
      add(9600, { id: file2, category: "file", parentId: sub1, title: "Write reports/figures/revenue_by_region.svg" })
      fin(10300, file2, { detail: "written · 96 KB" })
      fin(10450, sub1, {
        detail: "sub-agent complete · 3 charts produced",
        meta: [
          { label: "tool calls", value: "3" },
          { label: "tokens", value: "8,120" },
        ],
      })
      prog(10500, t3, 100)
      fin(10600, step3, { detail: "visual summary ready" })

      // subtask 4
      add(10700, { id: step4, category: "step", title: "Subtask 4 · compile final report" })
      add(10800, { id: mem2, category: "memory", title: "Persist run artifacts to memory", detail: "namespace: runs" })
      fin(11300, mem2, { detail: "3 artifacts stored" })
      prog(11000, t4, 50)
      add(11100, { id: file3, category: "file", title: "Write reports/summary.md" })
      fin(11900, file3, {
        detail: "written · 3.1 KB",
        meta: [{ label: "sections", value: "5" }],
      })
      add(11500, {
        id: warn1,
        category: "error",
        title: "Formatting warning",
        detail: "2 table cells missing units — auto-annotated",
        status: "warn",
        level: "warn",
      })
      ops.push({ at: 11560, fn: () => patch(warn1, { endedAt: 11560 }) })
      prog(11950, t4, 100)
      fin(12050, step4, { detail: "report compiled" })

      // ============ FINISHED ============
      status(12300, "finished")
      log(12320, "info", "Run completed", "4/4 subtasks · 6 tool calls · 1 sub-agent · 1 retry")

      ops.forEach(({ at, fn }) => timersRef.current.push(setTimeout(fn, at)))
      // freeze the clock shortly after the final event
      timersRef.current.push(
        setTimeout(() => {
          if (clockRef.current) {
            clearInterval(clockRef.current)
            clockRef.current = null
          }
          setState((s) => ({ ...s, elapsedMs: Math.max(s.elapsedMs, 12400) }))
        }, 12500),
      )
    },
    [clearTimers],
  )

  const isRunning = state.status === "thinking" || state.status === "planning" || state.status === "executing"

  const value = useMemo<AgentRuntimeValue>(
    () => ({
      ...state,
      isRunning,
      hasRun: state.runId !== null,
      panelOpen,
      setPanelOpen,
      togglePanel: () => setPanelOpen((v) => !v),
      startRun,
      stopRun,
    }),
    [state, isRunning, panelOpen, startRun, stopRun],
  )

  return <AgentRuntimeContext.Provider value={value}>{children}</AgentRuntimeContext.Provider>
}

export function useAgentRuntime() {
  const ctx = useContext(AgentRuntimeContext)
  if (!ctx) throw new Error("useAgentRuntime must be used within an AgentRuntimeProvider")
  return ctx
}

// ---- formatting + presentation helpers shared by the panel ----

export function fmtDuration(ms: number): string {
  if (ms < 0) ms = 0
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export const STATUS_LABEL: Record<RunStatus, string> = {
  idle: "Idle",
  thinking: "Thinking",
  planning: "Planning",
  executing: "Executing",
  finished: "Finished",
  error: "Error",
}
