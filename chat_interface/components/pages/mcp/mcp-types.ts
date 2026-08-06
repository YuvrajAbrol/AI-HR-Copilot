import type { LucideIcon } from "lucide-react"

export type ServerType = "HTTP" | "SSE" | "Stdio" | "WebSocket"
export type Health = "healthy" | "degraded" | "unknown" | "error"
export type ToolPermission = "allow" | "deny" | "ask"
export type LogStatus = "default" | "success" | "warning" | "error"

export interface McpTool {
  name: string
  description: string
  enabled: boolean
  permission: ToolPermission
  calls24h: number
}

export interface EnvVar {
  key: string
  value: string
  secret: boolean
}

export interface EventLogItem {
  id: string
  title: string
  detail?: string
  time: string
  ts: number
  status: LogStatus
  iconName: string
}

export type HistoryKind = "connect" | "disconnect" | "reconnect" | "error" | "config" | "auth"

export interface HistoryEvent {
  id: string
  kind: HistoryKind
  title: string
  detail: string
  time: string
  ts: number
}

export interface McpConnection {
  id: string
  name: string
  description: string
  connected: boolean
  serverType: ServerType
  url: string
  auth: string
  authConfigured: boolean
  authTokenPreview?: string
  envVars: EnvVar[]
  tools: McpTool[]
  category: string
  latencyMs: number
  health: Health
  lastUsed: string
  created: string
  icon: LucideIcon
  uptimePercent: number
  lastHealthCheck: string
  errorCount24h: number
  latencyTrend: "up" | "down" | "stable"
  totalCalls: number
  calls24h: number
  serverVersion: string
  protocolVersion: string
  errorMessage?: string
  eventLog: EventLogItem[]
  history: HistoryEvent[]
}

export interface LibraryServer {
  id: string
  name: string
  description: string
  serverType: ServerType
  category: string
  url: string
  auth: string
  tools: string[]
  icon: LucideIcon
  docUrl?: string
}

export const SERVER_TYPES: ServerType[] = ["HTTP", "SSE", "Stdio", "WebSocket"]
export const AUTH_METHODS = ["None", "API Key", "Bearer Token", "OAuth 2.0"]
export const TYPE_FILTERS = ["All types", ...SERVER_TYPES]
export const CATEGORY_FILTERS = [
  "All categories",
  "Engineering",
  "Data",
  "Research",
  "System",
  "Communication",
  "Productivity",
  "Custom",
]
export const STATUS_FILTERS = ["All", "Connected", "Disconnected", "Degraded", "Error"]
export const SORT_OPTIONS = ["Name", "Latency", "Last used", "Errors (24h)", "Tools"]

export const HEALTH_META: Record<Health, { label: string; className: string; tone: "success" | "warning" | "error" | "neutral" }> = {
  healthy: { label: "Healthy", className: "text-emerald-400", tone: "success" },
  degraded: { label: "Degraded", className: "text-amber-400", tone: "warning" },
  unknown: { label: "Unknown", className: "text-muted-foreground", tone: "neutral" },
  error: { label: "Error", className: "text-red-400", tone: "error" },
}

export const PERMISSION_META: Record<ToolPermission, { label: string; className: string; tone: "success" | "error" | "warning" }> = {
  allow: { label: "Allowed", className: "text-emerald-400", tone: "success" },
  deny: { label: "Denied", className: "text-muted-foreground", tone: "error" },
  ask: { label: "Ask", className: "text-amber-400", tone: "warning" },
}

export function toolPermissionLabel(p: ToolPermission): string {
  return PERMISSION_META[p].label
}
