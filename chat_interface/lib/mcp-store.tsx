"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import { toast } from "sonner"
import { INITIAL_CONNECTIONS, uid } from "@/components/pages/mcp/mcp-data"
import type {
  Health,
  HistoryEvent,
  LibraryServer,
  LogStatus,
  McpConnection,
  McpTool,
} from "@/components/pages/mcp/mcp-types"

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

interface McpContextValue {
  connections: McpConnection[]
  testingId: string | null
  reconnectingId: string | null
  rotatingId: string | null
  toggleConnection: (id: string) => void
  testConnection: (id: string) => void
  testAllConnections: () => void
  reconnectConnection: (id: string) => void
  disconnectAll: () => void
  deleteConnection: (id: string) => void
  duplicateConnection: (conn: McpConnection) => void
  upsertConnection: (conn: McpConnection) => void
  installFromLibrary: (lib: LibraryServer, apiKey: string, envVars: McpConnection["envVars"]) => void
  updateTool: (connId: string, toolName: string, patch: Partial<Pick<McpTool, "enabled" | "permission">>) => void
  saveConfig: (connId: string, patch: Partial<Pick<McpConnection, "envVars" | "authConfigured" | "authTokenPreview">>) => void
  setApiKey: (id: string, key: string) => void
  rotateAuth: (id: string) => void
  revokeAuth: (id: string) => void
}

const McpContext = createContext<McpContextValue | null>(null)

export function McpProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<McpConnection[]>(INITIAL_CONNECTIONS)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [reconnectingId, setReconnectingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)

  const patchConn = (id: string, fn: (c: McpConnection) => McpConnection) =>
    setConnections((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))

  const addEvent = (c: McpConnection, title: string, detail: string, status: LogStatus, iconName: string) => ({
    id: `e-${uid()}`,
    title,
    detail,
    time: "just now",
    ts: Date.now(),
    status,
    iconName,
  })

  const addHistory = (
    c: McpConnection,
    kind: HistoryEvent["kind"],
    title: string,
    detail: string,
  ): HistoryEvent => ({
    id: `h-${uid()}`,
    kind,
    title,
    detail,
    time: "just now",
    ts: Date.now(),
  })

  const toggleConnection = (id: string) => {
    const conn = connections.find((c) => c.id === id)
    if (!conn) return
    const next = !conn.connected
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              connected: next,
              health: next ? "healthy" : "unknown",
              lastHealthCheck: next ? "just now" : "never",
              errorMessage: next ? undefined : c.errorMessage,
              eventLog: [
                addEvent(c, next ? "Connection enabled" : "Connection disabled", `${c.name} ${next ? "enabled" : "disabled"} by workspace owner`, next ? "success" : "default", next ? "plug" : "power-off"),
                ...c.eventLog,
              ],
              history: [
                addHistory(c, next ? "connect" : "disconnect", next ? "Connected" : "Disconnected", next ? "Enabled by workspace owner" : "Disabled by workspace owner"),
                ...c.history,
              ],
            }
          : c,
      ),
    )
    toast(next ? `${conn.name} enabled` : `${conn.name} disabled`)
  }

  const testConnection = (id: string) => {
    const conn = connections.find((c) => c.id === id)
    if (!conn) return
    setTestingId(id)
    toast.loading(`Testing ${conn.name}...`, { id: `test-${id}` })
    setTimeout(() => {
      setTestingId(null)
      const fail = conn.health === "error" && Math.random() < 0.5
      const degraded = conn.health === "degraded" && !fail
      const latency = Math.floor(40 + Math.random() * 200)
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                latencyMs: latency,
                latencyTrend: latency > c.latencyMs ? "up" : "down",
                health: (fail ? "error" : degraded ? "degraded" : "healthy") as Health,
                lastHealthCheck: "just now",
                errorCount24h: fail ? c.errorCount24h + 1 : c.errorCount24h,
                errorMessage: fail
                  ? "Health check failed — the server did not respond in time. Check the endpoint and credentials."
                  : degraded
                    ? c.errorMessage
                    : undefined,
                eventLog: [
                  addEvent(
                    c,
                    fail ? "Health check failed" : degraded ? "Health check degraded" : "Health check passed",
                    fail ? "Request timed out after 30s" : `Response time ${latency}ms`,
                    fail ? "error" : degraded ? "warning" : "success",
                    "activity",
                  ),
                  ...c.eventLog,
                ],
                history: fail
                  ? [addHistory(c, "error", "Health check failed", "Request timed out after 30s"), ...c.history]
                  : c.history,
              }
            : c,
        ),
      )
      if (fail) toast.error(`${conn.name} health check failed`, { id: `test-${id}` })
      else if (degraded) toast.warning(`${conn.name} responded in ${latency}ms (degraded)`, { id: `test-${id}` })
      else toast.success(`${conn.name} responded in ${latency}ms`, { id: `test-${id}` })
    }, 1000)
  }

  const testAllConnections = () => {
    const connected = connections.filter((c) => c.connected)
    if (connected.length === 0) {
      toast.error("No connected servers to test")
      return
    }
    toast.loading(`Testing ${connected.length} servers...`, { id: "test-all" })
    setTimeout(() => {
      setConnections((prev) =>
        prev.map((c) =>
          c.connected
            ? { ...c, latencyMs: Math.floor(40 + Math.random() * 200), lastHealthCheck: "just now", latencyTrend: "stable" as const }
            : c,
        ),
      )
      toast.success(`All ${connected.length} servers responded`, { id: "test-all" })
    }, 1500)
  }

  const reconnectConnection = (id: string) => {
    const conn = connections.find((c) => c.id === id)
    if (!conn) return
    setReconnectingId(id)
    toast.loading(`Reconnecting ${conn.name}...`, { id: `reconnect-${id}` })
    setTimeout(() => {
      setReconnectingId(null)
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                connected: true,
                health: "healthy",
                lastHealthCheck: "just now",
                errorMessage: undefined,
                eventLog: [addEvent(c, "Connection re-established", "Handshake completed", "success", "plug"), ...c.eventLog],
                history: [addHistory(c, "reconnect", "Reconnected", "Handshake completed"), ...c.history],
              }
            : c,
        ),
      )
      toast.success(`${conn.name} reconnected`, { id: `reconnect-${id}` })
    }, 1200)
  }

  const disconnectAll = () => {
    setConnections((prev) =>
      prev.map((c) =>
        c.connected
          ? {
              ...c,
              connected: false,
              health: "unknown",
              lastHealthCheck: "never",
              errorMessage: undefined,
              eventLog: [addEvent(c, "Connection disabled", "Bulk disconnect by workspace owner", "default", "power-off"), ...c.eventLog],
              history: [addHistory(c, "disconnect", "Disconnected", "Bulk disconnect"), ...c.history],
            }
          : c,
      ),
    )
    toast.success("All servers disconnected")
  }

  const deleteConnection = (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id))
    toast.success("Connection removed")
  }

  const duplicateConnection = (conn: McpConnection) => {
    const clone: McpConnection = {
      ...conn,
      id: `mcp-${uid()}`,
      name: `${conn.name} (Copy)`,
      connected: false,
      health: "unknown",
      lastUsed: "never",
      created: todayLabel(),
      uptimePercent: 0,
      lastHealthCheck: "never",
      errorCount24h: 0,
      totalCalls: 0,
      calls24h: 0,
      eventLog: [],
      history: [addHistory(conn, "connect", "Created", "Duplicated from an existing connection")],
    }
    setConnections((prev) => [clone, ...prev])
    toast.success(`Duplicated "${conn.name}"`)
  }

  const upsertConnection = (conn: McpConnection) => {
    setConnections((prev) => {
      const exists = prev.some((c) => c.id === conn.id)
      return exists ? prev.map((c) => (c.id === conn.id ? conn : c)) : [conn, ...prev]
    })
  }

  const installFromLibrary = (lib: LibraryServer, apiKey: string, envVars: McpConnection["envVars"]) => {
    const tools: McpTool[] = lib.tools.map((t) => ({
      name: t,
      description: `Exposed by ${lib.name}`,
      enabled: true,
      permission: "allow",
      calls24h: 0,
    }))
    const finalEnvVars = apiKey
      ? [
          ...envVars,
          {
            key: `${lib.name.toUpperCase().replace(/\s+/g, "_")}_ACCESS_TOKEN`,
            value: `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`,
            secret: true,
          },
        ]
      : envVars
    const installed: McpConnection = {
      id: `mcp-${lib.id}-${Date.now()}`,
      name: lib.name,
      description: lib.description,
      connected: true,
      serverType: lib.serverType,
      url: lib.url,
      auth: lib.auth,
      authConfigured: apiKey !== "",
      authTokenPreview: apiKey ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}` : undefined,
      envVars: finalEnvVars,
      tools,
      category: lib.category,
      latencyMs: Math.floor(40 + Math.random() * 160),
      health: "healthy",
      lastUsed: "just now",
      created: todayLabel(),
      icon: lib.icon,
      uptimePercent: 100,
      lastHealthCheck: "just now",
      errorCount24h: 0,
      latencyTrend: "stable",
      totalCalls: 0,
      calls24h: 0,
      serverVersion: "1.0.0",
      protocolVersion: "2025-03-26",
      eventLog: [],
      history: [],
    }
    installed.eventLog = [addEvent(installed, "Connection established", `${lib.name} MCP server connected`, "success", "plug")]
    installed.history = [addHistory(installed, "connect", "Connected", "Installed from library")]
    upsertConnection(installed)
    toast.success(`${lib.name} installed`, { description: `${tools.length} tools now available` })
  }

  const updateTool = (connId: string, toolName: string, patch: Partial<Pick<McpTool, "enabled" | "permission">>) => {
    patchConn(connId, (c) => ({ ...c, tools: c.tools.map((t) => (t.name === toolName ? { ...t, ...patch } : t)) }))
  }

  const saveConfig = (connId: string, patch: Partial<Pick<McpConnection, "envVars" | "authConfigured" | "authTokenPreview">>) => {
    patchConn(connId, (c) => ({ ...c, ...patch }))
  }

  const setApiKey = (id: string, key: string) => {
    patchConn(id, (c) => ({
      ...c,
      authConfigured: true,
      authTokenPreview: `${key.slice(0, 4)}••••••••${key.slice(-4)}`,
      eventLog: [addEvent(c, "Credential saved", "New API key stored in the vault", "success", "auth"), ...c.eventLog],
      history: [addHistory(c, "auth", "Credential updated", "New API key configured"), ...c.history],
    }))
    toast.success("Credential saved")
  }

  const rotateAuth = (id: string) => {
    const conn = connections.find((c) => c.id === id)
    if (!conn) return
    setRotatingId(id)
    toast.loading("Rotating token...", { id: `rotate-${id}` })
    setTimeout(() => {
      setRotatingId(null)
      const previews: Record<string, string> = {
        // Masked demo previews — no real credential prefixes so secret
        // scanners never flag the repo.
        "OAuth 2.0": "••••••••••••••••4q7x",
        "API Key": "••••••••••••••••9z2m",
        "Bearer Token": "••••••••••••••••••",
      }
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                authConfigured: true,
                authTokenPreview: previews[c.auth] ?? c.authTokenPreview,
                eventLog: [addEvent(c, "Token rotated", "A new credential was issued", "success", "auth"), ...c.eventLog],
                history: [addHistory(c, "auth", "Token rotated", "Old credential invalidated"), ...c.history],
              }
            : c,
        ),
      )
      toast.success("Token rotated successfully", { id: `rotate-${id}` })
    }, 1200)
  }

  const revokeAuth = (id: string) => {
    const conn = connections.find((c) => c.id === id)
    if (!conn) return
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              authConfigured: false,
              authTokenPreview: undefined,
              eventLog: [addEvent(c, "Credential revoked", "The stored token was invalidated", "warning", "auth"), ...c.eventLog],
              history: [addHistory(c, "auth", "Credential revoked", "Stored token invalidated"), ...c.history],
            }
          : c,
      ),
    )
    toast.success("Credential revoked")
  }

  const value = useMemo<McpContextValue>(
    () => ({
      connections,
      testingId,
      reconnectingId,
      rotatingId,
      toggleConnection,
      testConnection,
      testAllConnections,
      reconnectConnection,
      disconnectAll,
      deleteConnection,
      duplicateConnection,
      upsertConnection,
      installFromLibrary,
      updateTool,
      saveConfig,
      setApiKey,
      rotateAuth,
      revokeAuth,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connections, testingId, reconnectingId, rotatingId],
  )

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>
}

export function useMcp() {
  const ctx = useContext(McpContext)
  if (!ctx) throw new Error("useMcp must be used within a McpProvider")
  return ctx
}
