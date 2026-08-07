"use client"

import { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import { uid, timeAgo } from "@/lib/mcp-util"
import {
  BarChart3,
  Boxes,
  Bug,
  Database,
  FileText,
  FolderOpen,
  GitBranch,
  Mail,
  MessageSquare,
  Plug,
  Search as SearchIcon,
  Terminal,
  Zap,
  type LucideIcon,
} from "lucide-react"
import * as mcpApi from "@/lib/mcp-api"
import type {
  EnvVar,
  Health,
  LibraryServer,
  LogStatus,
  McpConnection,
  McpTool,
  ServerType,
} from "@/components/pages/mcp/mcp-types"

/* ------------------------------------------------------------------ */
/*  Server-config -> McpConnection mapping (backend is source of truth) */
/* ------------------------------------------------------------------ */

const TRANSPORT_TO_TYPE: Record<string, ServerType> = {
  stdio: "Stdio",
  http: "HTTP",
  "streamable-http": "HTTP",
  sse: "SSE",
}

const AUTH_STRATEGY_LABEL: Record<string, string> = {
  none: "None",
  api_key: "API Key",
  bearer: "Bearer Token",
  basic: "Basic",
  header: "Header",
  oauth2: "OAuth 2.0",
}

function iconForName(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (/(github|git)/.test(n)) return GitBranch
  if (/(postgres|sql|mysql|database|db)/.test(n)) return Database
  if (/(slack|chat|message|teams)/.test(n)) return MessageSquare
  if (/(notion|doc|wiki)/.test(n)) return FileText
  if (/(gmail|google|mail|outlook|email)/.test(n)) return Mail
  if (/(jira|atlassian|linear|ticket)/.test(n)) return Bug
  if (/(linear|box)/.test(n)) return Boxes
  if (/(drive|storage|folder|onedrive)/.test(n)) return FolderOpen
  if (/(search|web)/.test(n)) return SearchIcon
  if (/(sentry|error|monitor)/.test(n)) return Zap
  if (/(posthog|analytics|graph|chart)/.test(n)) return BarChart3
  if (/(fs|filesystem|shell|terminal)/.test(n)) return Terminal
  return Plug
}

/** Derive a masked auth preview for the UI. Never renders raw secret
 *  material — a `${VAR}` secret placeholder shows as a label, and real
 *  values are truncated to a head/tail preview like "abcd…wxyz". */
function authPreview(server: mcpApi.McpServerConfig): string {
  const auth = server.auth
  if (!auth) return ""
  const value = auth.value ?? ""
  if (auth.strategy === "oauth2") return auth.state ? "OAuth session" : "Not configured"
  if (auth.strategy === "basic") return auth.username ? `${auth.username}:••••` : ""
  if (!value) return ""
  if (value.startsWith("${") && value.endsWith("}")) return "Secret reference"
  if (value.length <= 8) return "••••••"
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}


function buildConnection(name: string, server: mcpApi.McpServerConfig, existing?: McpConnection): McpConnection {
  const auth = server.auth
  const authStrategy = auth?.strategy ?? "none"
  const authConfigured = Boolean(
    auth && (typeof auth.value === "string" ? auth.value.length > 0 : Boolean(auth.password || auth.state)),
  )
  const transport = server.transport
  const serverType = (transport ? TRANSPORT_TO_TYPE[transport] : undefined) ?? "HTTP"
  const url = server.url ?? (serverType === "Stdio" && server.command ? `stdio://${server.command}` : "")

  const envVars: EnvVar[] = server.env
    ? Object.entries(server.env).map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : "",
        // Every entry in settings.env is a SecretStr; ciphertext or ${VAR}
        // placeholders are never shown as plaintext.
        secret: true,
      }))
    : []

  // Preserve per-session probe results for servers that already existed.
  const prev = existing?.id === name ? existing : undefined

  // Merge tool permissions from server config into tool list
  const toolsWithPermissions = (prev?.tools ?? []).map((tool) => {
    const permissionOverride = server.tool_permissions?.[tool.name]
    return {
      ...tool,
      permission: permissionOverride ?? tool.permission ?? "allow",
    }
  })

  return {
    id: name,
    name,
    description: server.description ?? `${name} MCP server`,
    connected: true,
    serverType,
    url,
    auth: AUTH_STRATEGY_LABEL[authStrategy] ?? "None",
    authConfigured,
    authTokenPreview: authPreview(server),
    envVars,
    tools: toolsWithPermissions,
    category: "Custom",
    latencyMs: prev?.latencyMs ?? 0,
    health: prev?.health ?? "unknown",
    lastUsed: prev?.lastUsed ?? "never",
    created: prev?.created ?? "",
    icon: prev?.icon ?? iconForName(name),
    uptimePercent: 0,
    lastHealthCheck: prev?.lastHealthCheck ?? "never",
    errorCount24h: 0,
    latencyTrend: "stable",
    totalCalls: 0,
    calls24h: 0,
    serverVersion: prev?.serverVersion ?? "",
    protocolVersion: prev?.protocolVersion ?? "",
    errorMessage: prev?.errorMessage,
    eventLog: prev?.eventLog ?? [],
    history: prev?.history ?? [],
    config: server as unknown as Record<string, unknown>,
  }
}

/** Convert an McpConnection back into a settings.mcp_config server entry. */
function connectionToConfig(conn: McpConnection): mcpApi.McpServerConfig {
  const config: mcpApi.McpServerConfig = {
    description: conn.description,
  }
  if (conn.serverType === "Stdio") {
    config.transport = "stdio"
    const command = typeof conn.config?.command === "string" ? conn.config.command : conn.url.replace(/^stdio:\/\//, "")
    if (command) config.command = command
    const args = conn.config?.args
    if (Array.isArray(args)) config.args = args as string[]
  } else {
    config.transport = conn.serverType === "SSE" ? "sse" : "http"
    config.url = conn.url
    const headers = conn.config?.headers
    if (headers && typeof headers === "object") {
      config.headers = headers as Record<string, string | null>
    }
  }
  const env: Record<string, string | null> = {}
  for (const e of conn.envVars) {
    if (e.key.trim()) env[e.key.trim()] = e.value || null
  }
  if (Object.keys(env).length > 0) config.env = env

  const strategy = authStrategyFor(conn.auth)
  const prevAuth = conn.config?.auth as { strategy?: string; value?: string | null } | null | undefined
  config.auth = { strategy, value: prevAuth?.value ?? null }

  // Include per-tool permissions if they differ from defaults
  const toolPermissions: Record<string, "allow" | "deny" | "ask"> = {}
  for (const tool of conn.tools) {
    if (tool.permission && tool.permission !== "allow") {
      toolPermissions[tool.name] = tool.permission
    }
  }
  if (Object.keys(toolPermissions).length > 0) {
    config.tool_permissions = toolPermissions
  }

  return config
}

function authStrategyFor(authLabel: string): string {
  switch (authLabel) {
    case "API Key":
      return "api_key"
    case "Bearer Token":
      return "bearer"
    case "Basic":
      return "basic"
    case "Header":
      return "header"
    case "OAuth 2.0":
      return "oauth2"
    default:
      return "none"
  }
}

/* ------------------------------------------------------------------ */
/*  Probe helpers                                                      */
/* ------------------------------------------------------------------ */

function toolsFromProbe(names: string[] | undefined, prev?: McpTool[]): McpTool[] {
  if (!names) return []
  return names.map((name) => {
    const prior = prev?.find((t) => t.name === name)
    return {
      name,
      description: prior?.description ?? "Exposed by the MCP server",
      enabled: prior?.enabled ?? true,
      permission: prior?.permission ?? "allow",
      calls24h: 0,
    }
  })
}

function addEvent(
  c: McpConnection,
  title: string,
  detail: string,
  status: LogStatus,
  iconName: string,
): McpConnection["eventLog"] {
  return [{ id: `e-${uid()}`, title, detail, time: timeAgo(Date.now()), ts: Date.now(), status, iconName }, ...c.eventLog]
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

export type DataSource = "loading" | "empty" | "backend"

interface McpContextValue {
  connections: McpConnection[]
  dataSource: DataSource
  catalog: LibraryServer[]
  catalogLoading: boolean
  testingId: string | null
  reconnectingId: string | null
  rotatingId: string | null
  load: () => Promise<void>
  loadCatalog: () => Promise<void>
  toggleConnection: (id: string) => Promise<void>
  testConnection: (id: string) => Promise<void>
  testAllConnections: () => Promise<void>
  reconnectConnection: (id: string) => Promise<void>
  disconnectAll: () => Promise<void>
  deleteConnection: (id: string) => Promise<void>
  duplicateConnection: (conn: McpConnection) => Promise<void>
  upsertConnection: (conn: McpConnection) => Promise<void>
  installFromLibrary: (lib: LibraryServer, apiKey: string, envVars: EnvVar[]) => Promise<void>
  updateTool: (connId: string, toolName: string, patch: Partial<Pick<McpTool, "enabled" | "permission">>) => void
  saveConfig: (connId: string, patch: Partial<Pick<McpConnection, "envVars" | "authConfigured" | "authTokenPreview">>) => Promise<void>
  setApiKey: (id: string, key: string) => Promise<void>
  rotateAuth: (id: string) => Promise<void>
  revokeAuth: (id: string) => Promise<void>
}

const McpContext = createContext<McpContextValue | null>(null)

export function McpProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<McpConnection[]>([])
  const [dataSource, setDataSource] = useState<DataSource>("loading")
  const [catalog, setCatalog] = useState<LibraryServer[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [reconnectingId, setReconnectingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)

  /* ---------------- settings -> connections ---------------- */

  const load = useCallback(async () => {
    try {
      const settings = await mcpApi.getSettings()
      const config = settings.agent_settings.mcp_config ?? {}
      setConnections((prev) => {
        const prevById = new Map(prev.map((c) => [c.id, c]))
        return Object.entries(config).map(([name, server]) => buildConnection(name, server, prevById.get(name)))
      })
      setDataSource(Object.keys(config).length > 0 ? "backend" : "empty")
    } catch (error) {
      console.error("Failed to load MCP connections:", error)
      setDataSource("empty")
      toast.error(error instanceof Error ? error.message : "Failed to load MCP servers")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /* ---------------- catalog (marketplace) ---------------- */

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const { plugins } = await mcpApi.marketplaceCatalog()
      setCatalog(
        plugins.map((p) => ({
          id: p.name,
          name: p.name,
          description: p.description ?? "",
          serverType: "HTTP",
          // Real category from the backend catalog (Communication, Development,
          // Databases, Storage, Productivity) — never local fiction.
          category: p.category ?? "Custom",
          url: p.source,
          // Real auth label advertised by the catalog, e.g. "Google OAuth 2.0".
          auth: p.authentication ?? "None",
          tools: p.tools ?? [],
          icon: iconForName(p.name),
          source: p.source,
          ref: p.ref,
          repo_path: p.repo_path,
          mcp: p.mcp ?? true,
        })),
      )
    } catch (error) {
      console.error("Failed to load marketplace catalog:", error)
      setCatalog([])
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  /* ---------------- settings writes ---------------- */

  const patchConfig = useCallback(
    async (diff: Record<string, mcpApi.McpServerConfig | null>) => {
      await mcpApi.patchSettings({ agent_settings_diff: { mcp_config: diff } })
      await load()
    },
    [load],
  )

  const toggleConnection = useCallback(
    async (id: string) => {
      const conn = connections.find((c) => c.id === id)
      if (!conn) return
      try {
        if (conn.connected) {
          await patchConfig({ [id]: null })
          setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, connected: false, health: "unknown" as Health } : c)))
          toast.success(`${conn.name} disconnected`)
        } else {
          await patchConfig({ [id]: connectionToConfig(conn) })
          setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, connected: true } : c)))
          toast.success(`${conn.name} reconnected`)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update connection")
      }
    },
    [connections, patchConfig],
  )

  const deleteConnection = useCallback(
    async (id: string) => {
      try {
        await patchConfig({ [id]: null })
        setConnections((prev) => prev.filter((c) => c.id !== id))
        toast.success("Connection removed")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove connection")
      }
    },
    [patchConfig],
  )

  const disconnectAll = useCallback(async () => {
    const toRemove = connections.filter((c) => c.connected).map((c) => c.id)
    if (toRemove.length === 0) return
    try {
      const diff: Record<string, mcpApi.McpServerConfig | null> = {}
      for (const id of toRemove) diff[id] = null
      await patchConfig(diff)
      setConnections((prev) => prev.map((c) => (c.connected ? { ...c, connected: false, health: "unknown" as Health } : c)))
      toast.success("All servers disconnected")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect servers")
    }
  }, [connections, patchConfig])

  const duplicateConnection = useCallback(
    async (conn: McpConnection) => {
      try {
        const copy = { ...conn, name: `${conn.name} (Copy)` }
        await patchConfig({ [copy.name]: connectionToConfig(copy) })
        toast.success(`Duplicated "${conn.name}"`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to duplicate connection")
      }
    },
    [patchConfig],
  )

  const upsertConnection = useCallback(
    async (conn: McpConnection) => {
      const name = conn.name.trim()
      if (!name) {
        toast.error("Server name is required")
        return
      }
      try {
        await patchConfig({ [name]: connectionToConfig(conn) })
        toast.success(conn.connected ? `${name} connected` : `${name} saved`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save connection")
      }
    },
    [patchConfig],
  )

  /* ---------------- install ---------------- */

  const installFromLibrary = useCallback(
    async (lib: LibraryServer, apiKey: string, envVars: EnvVar[]) => {
      try {
        if (lib.source) {
          await mcpApi.installPlugin(lib.source, lib.ref ?? undefined, lib.repo_path ?? undefined)
        }
        // Store any entered credentials as secrets so ${VAR} placeholders in
        // the plugin's .mcp.json resolve at conversation build time.
        const secretCandidates: { key: string; value: string }[] = []
        for (const v of envVars) {
          if (v.key.trim() && v.value) secretCandidates.push({ key: v.key.trim(), value: v.value })
        }
        if (apiKey) {
          const key = `${lib.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_ACCESS_TOKEN`
          if (!secretCandidates.some((s) => s.key === key)) secretCandidates.push({ key, value: apiKey })
        }
        for (const s of secretCandidates) {
          try {
            await mcpApi.setSecret(s.key, s.value)
          } catch (error) {
            console.warn(`Failed to store secret ${s.key}:`, error)
          }
        }
        await loadCatalog()
        toast.success(`${lib.name} installed`, { description: "MCP servers from the plugin activate on the next conversation" })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to install ${lib.name}`)
      }
    },
    [loadCatalog],
  )

  /* ---------------- probe / test ---------------- */

  const applyProbe = useCallback((conn: McpConnection, spec: mcpApi.McpTestServerSpec, id: string) => {
    setTestingId(id)
    const toastId = `test-${id}`
    toast.loading(`Testing ${conn.name}...`, { id: toastId })
    mcpApi
      .testServer({ name: conn.name, server: spec })
      .then((result) => {
        setConnections((prev) =>
          prev.map((c) =>
            c.id === id
              ? result.ok
                ? {
                    ...c,
                    health: "healthy" as Health,
                    lastHealthCheck: "just now",
                    errorMessage: undefined,
                    tools: toolsFromProbe(result.tools, c.tools),
                    eventLog: addEvent(c, "Connection test passed", `Discovered ${result.tools.length} tool(s)`, "success", "activity"),
                    history: [
                      { id: `h-${uid()}`, kind: "connect" as const, title: "Connected", detail: "Probe succeeded", time: "just now", ts: Date.now() },
                      ...c.history,
                    ],
                  }
                : {
                    ...c,
                    health: "error" as Health,
                    lastHealthCheck: "just now",
                    errorMessage: result.error,
                    eventLog: addEvent(c, "Connection test failed", result.error, "error", "wifi-off"),
                  }
              : c,
          ),
        )
        if (result.ok) toast.success(`${conn.name} responded — ${result.tools.length} tools`, { id: toastId })
        else toast.error(`${conn.name} failed: ${result.error}`, { id: toastId })
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Connection test failed", { id: toastId })
      })
      .finally(() => setTestingId(null))
  }, [])

  const testConnection = useCallback(
    async (id: string) => {
      const conn = connections.find((c) => c.id === id)
      if (!conn) return
      const spec = mcpApi.buildTestServerSpec(conn)
      if (!spec) {
        toast.error("Cannot build a probe from this configuration")
        return
      }
      applyProbe(conn, spec, id)
    },
    [connections],
  )

  const testAllConnections = useCallback(async () => {
    const connected = connections.filter((c) => c.connected && c.url)
    if (connected.length === 0) {
      toast.error("No connected servers to test")
      return
    }
    toast.loading(`Testing ${connected.length} servers...`, { id: "test-all" })
    for (const conn of connected) {
      const spec = mcpApi.buildTestServerSpec(conn)
      if (spec) {
        const result = await mcpApi.testServer({ name: conn.name, server: spec })
        setConnections((prev) =>
          prev.map((c) =>
            c.id === conn.id
              ? result.ok
                ? {
                    ...c,
                    health: "healthy" as Health,
                    lastHealthCheck: "just now",
                    errorMessage: undefined,
                    tools: toolsFromProbe(result.tools, c.tools),
                  }
                : { ...c, health: "error" as Health, lastHealthCheck: "just now", errorMessage: result.error }
              : c,
          ),
        )
      }
    }
    toast.success(`All ${connected.length} servers tested`, { id: "test-all" })
  }, [connections])

  const reconnectConnection = useCallback(
    async (id: string) => {
      const conn = connections.find((c) => c.id === id)
      if (!conn) return
      const spec = mcpApi.buildTestServerSpec(conn)
      if (!spec) {
        toast.error("Cannot build a probe from this configuration")
        return
      }
      setReconnectingId(id)
      const toastId = `reconnect-${id}`
      toast.loading(`Reconnecting ${conn.name}...`, { id: toastId })
      try {
        const result = await mcpApi.testServer({ name: conn.name, server: spec })
        if (result.ok) {
          // Reconnect = probe + ensure the server is present in the persisted config.
          if (!conn.connected) await patchConfig({ [id]: connectionToConfig(conn) })
          setConnections((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    connected: true,
                    health: "healthy" as Health,
                    lastHealthCheck: "just now",
                    errorMessage: undefined,
                    tools: toolsFromProbe(result.tools, c.tools),
                    eventLog: addEvent(c, "Connection re-established", `Discovered ${result.tools.length} tool(s)`, "success", "plug"),
                  }
                : c,
            ),
          )
          toast.success(`${conn.name} reconnected`, { id: toastId })
        } else {
          setConnections((prev) =>
            prev.map((c) =>
              c.id === id
                ? { ...c, health: "error" as Health, lastHealthCheck: "just now", errorMessage: result.error }
                : c,
            ),
          )
          toast.error(`${conn.name} failed: ${result.error}`, { id: toastId })
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Reconnect failed", { id: toastId })
      } finally {
        setReconnectingId(null)
      }
    },
    [connections, patchConfig],
  )

  /* ---------------- config / auth ---------------- */

  const saveConfig = useCallback(
    async (connId: string, patch: Partial<Pick<McpConnection, "envVars" | "authConfigured" | "authTokenPreview">>) => {
      const conn = connections.find((c) => c.id === connId)
      if (!conn) return
      const env: Record<string, string | null> = {}
      for (const e of patch.envVars ?? conn.envVars) {
        if (e.key.trim()) env[e.key.trim()] = e.value || null
      }
      const server: mcpApi.McpServerConfig = {
        ...(conn.config as mcpApi.McpServerConfig | undefined),
        env: Object.keys(env).length > 0 ? env : undefined,
      }
      if (patch.authConfigured !== undefined && server.auth) {
        server.auth = { ...server.auth, value: patch.authConfigured ? server.auth.value ?? null : null }
      }
      try {
        await patchConfig({ [connId]: server })
        toast.success(`${conn.name} configuration saved`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save configuration")
      }
    },
    [connections, patchConfig],
  )

  const setApiKey = useCallback(
    async (id: string, key: string) => {
      const conn = connections.find((c) => c.id === id)
      if (!conn) return
      const strategy = authStrategyFor(conn.auth)
      try {
        await patchConfig({ [id]: { ...(conn.config as mcpApi.McpServerConfig), auth: { strategy, value: key } } })
        toast.success("Credential saved")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save credential")
      }
    },
    [connections, patchConfig],
  )

  const rotateAuth = useCallback(
    async (id: string) => {
      const conn = connections.find((c) => c.id === id)
      if (!conn) return
      setRotatingId(id)
      try {
        const strategy = authStrategyFor(conn.auth)
        await patchConfig({ [id]: { ...(conn.config as mcpApi.McpServerConfig), auth: { strategy, value: null } } })
        toast.success("Credential cleared — enter a new value to rotate", { description: "For OAuth servers use the OAuth flow (Phase 8)." })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to rotate credential")
      } finally {
        setRotatingId(null)
      }
    },
    [connections, patchConfig],
  )

  const revokeAuth = useCallback(
    async (id: string) => {
      const conn = connections.find((c) => c.id === id)
      if (!conn) return
      try {
        const strategy = authStrategyFor(conn.auth)
        await patchConfig({ [id]: { ...(conn.config as mcpApi.McpServerConfig), auth: { strategy, value: null } } })
        toast.success("Credential revoked")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to revoke credential")
      }
    },
    [connections, patchConfig],
  )

  /* ---------------- tools ---------------- */

  const updateTool = useCallback(
    async (connId: string, toolName: string, patch: Partial<Pick<McpTool, "enabled" | "permission">>) => {
      // Optimistically update local state
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connId
            ? { ...c, tools: c.tools.map((t) => (t.name === toolName ? { ...t, ...patch } : t)) }
            : c,
        ),
      )

      // Persist to backend settings
      const conn = connections.find((c) => c.id === connId)
      if (!conn) return

      // Build the full tool_permissions map for this connection
      const toolPermissions: Record<string, "allow" | "deny" | "ask"> = {}
      for (const tool of conn.tools) {
        const permission = tool.name === toolName ? patch.permission ?? tool.permission : tool.permission
        if (permission && permission !== "allow") {
          toolPermissions[tool.name] = permission
        }
      }

      const server: mcpApi.McpServerConfig = {
        ...(conn.config as mcpApi.McpServerConfig | undefined),
        tool_permissions: Object.keys(toolPermissions).length > 0 ? toolPermissions : undefined,
      }

      try {
        await patchConfig({ [connId]: server })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save tool permission")
        // Revert on error - reload from backend
        await load()
      }
    },
    [connections, patchConfig, load],
  )

  const value = useMemo<McpContextValue>(
    () => ({
      connections,
      dataSource,
      catalog,
      catalogLoading,
      testingId,
      reconnectingId,
      rotatingId,
      load,
      loadCatalog,
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
    [
      connections,
      dataSource,
      catalog,
      catalogLoading,
      testingId,
      reconnectingId,
      rotatingId,
      load,
      loadCatalog,
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
    ],
  )

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>
}

export function useMcp() {
  const ctx = useContext(McpContext)
  if (!ctx) throw new Error("useMcp must be used within a McpProvider")
  return ctx
}
