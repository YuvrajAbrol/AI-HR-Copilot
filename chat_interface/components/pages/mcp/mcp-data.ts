import {
  GitBranch,
  Database,
  Search as SearchIcon,
  Terminal,
  MessageSquare,
  Boxes,
  FileText,
  Zap,
  BarChart3,
} from "lucide-react"
import type {
  EventLogItem,
  HistoryEvent,
  LibraryServer,
  LogStatus,
  McpConnection,
  McpTool,
} from "./mcp-types"

const now = Date.now()

/* ---------- small helpers ---------- */

function tool(name: string, description: string, calls24h: number, enabled = true): McpTool {
  return { name, description, enabled, permission: "allow", calls24h }
}

function ev(
  title: string,
  detail: string,
  minutesAgo: number,
  status: LogStatus,
  iconName: string,
  id: string,
): EventLogItem {
  return { id, title, detail, time: rel(minutesAgo), ts: now - minutesAgo * 60_000, status, iconName }
}

function hist(
  kind: HistoryEvent["kind"],
  title: string,
  detail: string,
  minutesAgo: number,
  id: string,
): HistoryEvent {
  return { id, kind, title, detail, time: rel(minutesAgo), ts: now - minutesAgo * 60_000 }
}

export function rel(minutesAgo: number): string {
  if (minutesAgo < 1) return "just now"
  if (minutesAgo < 60) return `${minutesAgo} min ago`
  const hours = Math.floor(minutesAgo / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} d ago`
}

export function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  const mins = Math.floor(diff / 60_000)
  return rel(mins)
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/* ---------- initial connections ---------- */

export const INITIAL_CONNECTIONS: McpConnection[] = [
  {
    id: "mcp-github",
    name: "GitHub",
    description:
      "Repository access, issues, pull requests, and code search across your organization.",
    connected: true,
    serverType: "HTTP",
    url: "https://mcp.github.com/v1",
    auth: "OAuth 2.0",
    authConfigured: true,
    authTokenPreview: "••••••••••••••••a1b2",
    envVars: [
      { key: "GITHUB_ORG", value: "northwind-labs", secret: false },
      { key: "GITHUB_ACCESS_TOKEN", value: "••••••••(rotated)", secret: true },
    ],
    tools: [
      tool("list_repos", "List repositories in an organization", 312),
      tool("create_issue", "Open a new issue on a repository", 44),
      tool("search_code", "Search code across the organization", 1280),
      tool("open_pr", "Open a pull request between two branches", 27),
      tool("read_file", "Read a file from the default branch", 96),
    ],
    category: "Engineering",
    latencyMs: 142,
    health: "healthy",
    lastUsed: "2 min ago",
    created: "Jan 12, 2026",
    icon: GitBranch,
    uptimePercent: 99.8,
    lastHealthCheck: "2 min ago",
    errorCount24h: 0,
    latencyTrend: "down",
    totalCalls: 42103,
    calls24h: 1759,
    serverVersion: "2.4.1",
    protocolVersion: "2025-03-26",
    eventLog: [
      ev("Connection established", "GitHub MCP server connected", 2, "success", "plug", "g1"),
      ev("Health check passed", "Response time 42ms", 5, "success", "activity", "g2"),
      ev("Tool call: search_code", "Completed in 128ms", 18, "default", "zap", "g3"),
      ev("Health check passed", "Response time 38ms", 35, "success", "activity", "g4"),
      ev("Tool call: list_repos", "Completed in 210ms", 61, "default", "zap", "g5"),
      ev("Connection re-established", "Auto-reconnect after timeout", 122, "warning", "refresh", "g6"),
      ev("Connection timeout", "No response for 30s", 123, "error", "wifi-off", "g7"),
      ev("Connection established", "Initial handshake successful", 1440, "success", "plug", "g8"),
    ],
    history: [
      hist("connect", "Connected", "Handshake completed in 318ms", 1440, "gh1"),
      hist("error", "Connection timeout", "No response for 30s, retried automatically", 123, "gh2"),
      hist("reconnect", "Reconnected", "Auto-reconnect succeeded after 4s backoff", 122, "gh3"),
      hist("connect", "Connected", "Handshake completed in 264ms", 2880, "gh4"),
    ],
  },
  {
    id: "mcp-postgres",
    name: "Postgres Database",
    description: "Query and inspect the production Postgres cluster with read-scoped credentials.",
    connected: true,
    serverType: "Stdio",
    url: "stdio://mcp-postgres",
    auth: "API Key",
    authConfigured: true,
    authTokenPreview: "pg_••••••••••••9f3e",
    envVars: [
      { key: "PG_HOST", value: "db.northwind.internal", secret: false },
      { key: "PG_PORT", value: "5432", secret: false },
      { key: "PG_READONLY", value: "true", secret: false },
      { key: "PG_PASSWORD", value: "••••••••••", secret: true },
    ],
    tools: [
      tool("run_query", "Execute a read-only SQL query", 982),
      tool("list_tables", "List tables and schemas", 141),
      tool("describe_table", "Describe columns and indexes", 88),
      tool("explain", "Explain a query plan without running it", 56),
    ],
    category: "Data",
    latencyMs: 38,
    health: "healthy",
    lastUsed: "18 min ago",
    created: "Jan 09, 2026",
    icon: Database,
    uptimePercent: 99.9,
    lastHealthCheck: "5 min ago",
    errorCount24h: 0,
    latencyTrend: "stable",
    totalCalls: 23144,
    calls24h: 1267,
    serverVersion: "0.7.3",
    protocolVersion: "2025-03-26",
    eventLog: [
      ev("Connection established", "Postgres MCP server connected", 18, "success", "plug", "p1"),
      ev("Health check passed", "Response time 38ms", 5, "success", "activity", "p2"),
      ev("Tool call: run_query", "Completed in 64ms", 22, "default", "zap", "p3"),
      ev("Health check passed", "Response time 41ms", 65, "success", "activity", "p4"),
      ev("Tool call: list_tables", "Completed in 31ms", 240, "default", "zap", "p5"),
    ],
    history: [
      hist("connect", "Connected", "Process spawned and handshake completed", 2880, "ph1"),
      hist("config", "Configuration updated", "Added PG_PORT environment variable", 4320, "ph2"),
      hist("connect", "Connected", "Process spawned and handshake completed", 7200, "ph3"),
    ],
  },
  {
    id: "mcp-websearch",
    name: "Web Search",
    description: "Live web search and page retrieval for grounding responses in current information.",
    connected: true,
    serverType: "SSE",
    url: "https://mcp.search.dev/sse",
    auth: "Bearer Token",
    authConfigured: true,
    authTokenPreview: "sk-••••••••••••77cd",
    envVars: [{ key: "SEARCH_REGION", value: "us-east-1", secret: false }],
    tools: [
      tool("web_search", "Search the web and return ranked results", 2401),
      tool("fetch_page", "Fetch and extract the main content of a URL", 512),
      tool("summarize_url", "Summarize a page in a few sentences", 133),
    ],
    category: "Research",
    latencyMs: 210,
    health: "degraded",
    lastUsed: "1 hr ago",
    created: "Dec 28, 2025",
    icon: SearchIcon,
    uptimePercent: 94.2,
    lastHealthCheck: "8 min ago",
    errorCount24h: 3,
    latencyTrend: "up",
    totalCalls: 51203,
    calls24h: 3418,
    serverVersion: "1.9.0",
    protocolVersion: "2025-03-26",
    errorMessage: "3 of the last 10 health checks timed out. Uptime is below the 99% threshold.",
    eventLog: [
      ev("Health check degraded", "Response time 890ms — above threshold", 8, "warning", "activity", "w1"),
      ev("Health check timed out", "Request exceeded 30s budget", 32, "error", "wifi-off", "w2"),
      ev("Tool call: web_search", "Completed in 2.4s", 54, "default", "zap", "w3"),
      ev("Health check passed", "Response time 205ms", 90, "success", "activity", "w4"),
      ev("Health check timed out", "Request exceeded 30s budget", 180, "error", "wifi-off", "w5"),
      ev("Connection re-established", "SSE stream reconnected after gap", 260, "warning", "refresh", "w6"),
    ],
    history: [
      hist("connect", "Connected", "SSE stream established", 4320, "wh1"),
      hist("error", "Stream interrupted", "SSE stream dropped after 12h idle", 260, "wh2"),
      hist("reconnect", "Reconnected", "Stream resumed with backoff", 259, "wh3"),
      hist("connect", "Connected", "SSE stream established", 10080, "wh4"),
    ],
  },
  {
    id: "mcp-filesystem",
    name: "Filesystem",
    description: "Sandboxed read and write access to the agent's working directory.",
    connected: false,
    serverType: "Stdio",
    url: "stdio://mcp-fs",
    auth: "None",
    authConfigured: false,
    envVars: [
      { key: "FS_ALLOWED_DIR", value: "/workspace/agents", secret: false },
      { key: "FS_READONLY", value: "false", secret: false },
    ],
    tools: [
      tool("read_file", "Read a file from the sandbox", 86),
      tool("write_file", "Write a file into the sandbox", 12),
      tool("list_dir", "List a directory's contents", 40),
      tool("move", "Move or rename a file", 3),
      tool("delete", "Delete a file (sandbox only)", 0, false),
    ],
    category: "System",
    latencyMs: 12,
    health: "unknown",
    lastUsed: "3 d ago",
    created: "Dec 15, 2025",
    icon: Terminal,
    uptimePercent: 0,
    lastHealthCheck: "never",
    errorCount24h: 0,
    latencyTrend: "stable",
    totalCalls: 320,
    calls24h: 0,
    serverVersion: "0.5.2",
    protocolVersion: "2025-03-26",
    eventLog: [],
    history: [
      hist("disconnect", "Disconnected", "Server disabled by workspace owner", 4320, "fh1"),
      hist("connect", "Connected", "Process spawned and handshake completed", 10080, "fh2"),
    ],
  },
]

/* ---------- library ---------- */

export const LIBRARY: LibraryServer[] = [
  {
    id: "lib-slack",
    name: "Slack",
    description: "Post messages, read channels, and search workspace history from your agent.",
    serverType: "HTTP",
    category: "Communication",
    url: "https://mcp.slack.com/v1",
    auth: "OAuth 2.0",
    tools: ["send_message", "list_channels", "read_thread", "search"],
    icon: MessageSquare,
    docUrl: "https://api.slack.com/docs",
  },
  {
    id: "lib-linear",
    name: "Linear",
    description: "Browse and update Linear issues, cycles, and projects from the agent.",
    serverType: "HTTP",
    category: "Engineering",
    url: "https://mcp.linear.app/v1",
    auth: "API Key",
    tools: ["list_issues", "create_issue", "update_issue", "list_cycles"],
    icon: Boxes,
    docUrl: "https://linear.app/docs/api",
  },
  {
    id: "lib-notion",
    name: "Notion",
    description: "Read and edit Notion pages, databases, and blocks via Notion's MCP server.",
    serverType: "SSE",
    category: "Productivity",
    url: "https://mcp.notion.so/sse",
    auth: "OAuth 2.0",
    tools: ["search", "read_page", "update_page", "query_database"],
    icon: FileText,
    docUrl: "https://developers.notion.com",
  },
  {
    id: "lib-sentry",
    name: "Sentry",
    description: "Triage issues, inspect events, and surface stack traces from your Sentry org.",
    serverType: "HTTP",
    category: "Engineering",
    url: "https://mcp.sentry.io/v1",
    auth: "Bearer Token",
    tools: ["list_issues", "get_event", "resolve_issue"],
    icon: Zap,
    docUrl: "https://docs.sentry.io/api",
  },
  {
    id: "lib-posthog",
    name: "PostHog",
    description: "Product analytics, feature flags, and session insights for the agent.",
    serverType: "HTTP",
    category: "Data",
    url: "https://mcp.posthog.com/v1",
    auth: "API Key",
    tools: ["run_query", "list_flags", "get_insight"],
    icon: BarChart3,
    docUrl: "https://posthog.com/docs/api",
  },
  {
    id: "lib-supabase",
    name: "Supabase",
    description: "Query and manage your Supabase project, including database, auth, and storage.",
    serverType: "Stdio",
    category: "Data",
    url: "stdio://mcp-supabase",
    auth: "API Key",
    tools: ["run_sql", "list_tables", "manage_auth", "storage_list"],
    icon: Database,
    docUrl: "https://supabase.com/docs/reference",
  },
]
