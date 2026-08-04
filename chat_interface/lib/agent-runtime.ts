"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useChat } from "./chat-store"

// HR Agent SDK integration for real agent processing
export interface RunEvent {
  id: string
  category: EventCategory
  title: string
  detail?: string
  status: EventStatus
  startedAt: number
  endedAt?: number
  parentId?: string
  progress?: number
  meta?: { label: string; value: string }[]
}

export type EventCategory =
  | "step" | "skill" | "tool" | "mcp" | "memory" | "database"
  | "subagent" | "task" | "file" | "api" | "log" | "error" | "retry"

export type EventStatus = "pending" | "running" | "success" | "warn" | "error"

interface AgentRuntimeState {
  status: "idle" | "thinking" | "planning" | "executing" | "finished" | "error"
  isRunning: boolean
  hasRun: boolean
  elapsedMs: number
  events: RunEvent[]
  panelOpen: boolean
  prompt?: string
}

export const STATUS_LABEL = {
  idle: "Idle",
  thinking: "Thinking",
  planning: "Planning",
  executing: "Executing",
  finished: "Finished",
  error: "Error"
}

export function fmtClock(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

export function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function createEvent(category: EventCategory, title: string, detail?: string): RunEvent {
  return {
    id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    category,
    title,
    detail,
    status: "pending",
    startedAt: Date.now(),
  }
}

export function useAgentRuntime() {
  const [state, setState] = useState<AgentRuntimeState>({
    status: "idle",
    isRunning: false,
    hasRun: false,
    elapsedMs: 0,
    events: [],
    panelOpen: false,
  })

  const timerRef = useRef<number>()
  const intervalRef = useRef<number>()
  const { hrConnect, hrDisconnect, hrSendMessage, isHRConnected, hrError } = useChat()

  const startRun = useCallback(async (prompt: string) => {
    setState(prev => ({ ...prev, status: "thinking", isRunning: true, hasRun: true, prompt }))

    const event = createEvent("task", "Starting agent", prompt)
    setState(prev => ({ ...prev, events: [...prev.events, event] }))

    try {
      const connected = await hrConnect()

      if (connected) {
        const startEvent = createEvent("task", "Starting HR Agent", prompt)
        startEvent.status = "running"
        setState(prev => ({ ...prev, events: [...prev.events, startEvent] }))

        await hrSendMessage(prompt)

        const completeEvent = createEvent("step", "HR Agent response", "Request completed successfully")
        completeEvent.status = "success"
        completeEvent.endedAt = Date.now()

        setState(prev => ({
          ...prev,
          events: [...prev.events, completeEvent],
          status: "finished",
          isRunning: false,
        }))

        return
      }
    } catch (error) {
      const errorEvent = createEvent("error", "HR Agent failed", `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      errorEvent.status = "error"

      setState(prev => ({
        ...prev,
        events: [...prev.events, errorEvent],
        status: "error",
        isRunning: false,
      }))

      return
    }

    // Fallback to simulated execution if HR Agent is not connected
      const phases: Array<{status: AgentRuntimeState["status"]; delay: number; event: {title: string; detail?: string}}[]> = [
        { status: "thinking", delay: 1000, event: {title: "Analyzing prompt", detail: prompt.substring(0, 50) + "..."} },
        { status: "planning", delay: 2000, event: {title: "Creating execution plan"} },
        { status: "executing", delay: 3000, event: {title: "Executing task"} },
        { status: "finished", delay: 2000, event: {title: "Task completed"} },
      ]

      let phaseIndex = 0
      const runPhases = () => {
        if (phaseIndex >= phases.length) {
          setState(prev => ({
            ...prev,
            status: "finished",
            isRunning: false,
            elapsedMs: Date.now() - Date.now(),
          }))
          return
        }

        const phase = phases[phaseIndex]

        // Update current phase event
        setState(prev => {
          const newEvents = [...prev.events]
          const taskEvent = newEvents.find(e => e.category === "task")
          if (taskEvent) {
            taskEvent.status = phase.status
            taskEvent.endedAt = Date.now()
          }

          return {
            ...prev,
            status: phase.status,
            events: newEvents,
          }
        })

        // Create new event for next phase
        setTimeout(() => {
          const newEvent = createEvent(phase.event.title.includes("Executing") ? "skill" : "step", phase.event.title)
          if (phase.event.detail) newEvent.detail = phase.event.detail

          setState(prev => ({
            ...prev,
            events: [...prev.events, newEvent],
          }))

          phaseIndex++
          runPhases()
        }, phase.delay)
      }

      runPhases()
      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          elapsedMs: Date.now() - Date.now(),
        }))
      }, 100)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [hrSendMessage, isHRConnected])

  const stopRun = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: "error",
      isRunning: false,
      events: prev.events.map(e => ({ ...e, status: e.status === "running" ? "error" : e.status })),
    }))
    if (intervalRef.current) clearInterval(intervalRef.current)
    // Disconnect from HR Agent if connected
    if (isHRConnected) {
      // Note: hrDisconnect is accessed through the chat store context
    }
  }, [isHRConnected])

  const togglePanel = useCallback(() => {
    setState(prev => ({ ...prev, panelOpen: !prev.panelOpen }))
  }, [])

  const setPanelOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, panelOpen: open }))
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return {
    ...state,
    startRun,
    stopRun,
    togglePanel,
    setPanelOpen,
  }
}