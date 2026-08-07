"use client"

import { useState } from "react"
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  X,
  Zap,
  ExternalLink,
  Lock,
  Server,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OptionMenu } from "@/components/option-menu"
import { DrawerShell, Tag } from "@/components/management/shared"
import { uid } from "@/lib/mcp-util"
import * as mcpApi from "@/lib/mcp-api"
import {
  AUTH_METHODS,
  SERVER_TYPES,
  type EnvVar,
  type LibraryServer,
  type McpConnection,
  type ServerType,
} from "./mcp-types"

/* UI auth label -> settings mcp_config auth strategy. */
const AUTH_LABEL_TO_STRATEGY: Record<string, string> = {
  "API Key": "api_key",
  "Bearer Token": "bearer",
  Basic: "basic",
  Header: "header",
  "OAuth 2.0": "oauth2",
}

/* ------------------------------------------------------------------ */
/*  Shared form pieces                                                 */
/* ------------------------------------------------------------------ */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[13px] font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-3 focus-within:border-border">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={show ? "Hide value" : "Show value"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function EnvVarsField({
  value,
  onChange,
}: {
  value: EnvVar[]
  onChange: (rows: EnvVar[]) => void
}) {
  const updateRow = (i: number, patch: Partial<EnvVar>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="flex flex-col gap-2">
      {value.map((row, i) => (
        <div key={`${row.key}-${i}`} className="flex items-center gap-2">
          <Input
            value={row.key}
            onChange={(e) => updateRow(i, { key: e.target.value })}
            placeholder="KEY"
            className="h-9 w-36 bg-secondary/40 font-mono text-[12px]"
          />
          <Input
            value={row.value}
            onChange={(e) => updateRow(i, { value: e.target.value })}
            placeholder="value"
            className="h-9 flex-1 bg-secondary/40 font-mono text-[12px]"
          />
          <button
            type="button"
            onClick={() => updateRow(i, { secret: !row.secret })}
            className={
              row.secret
                ? "flex h-9 shrink-0 items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 text-[11px] font-medium text-violet-400"
                : "flex h-9 shrink-0 items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border"
            }
            aria-label="Toggle secret"
          >
            <Lock className="h-3 w-3" />
            {row.secret ? "Secret" : "Plain"}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            aria-label={`Remove ${row.key}`}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange([...value, { key: "", value: "", secret: true }])}
        className="w-fit gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add variable
      </Button>
    </div>
  )
}

function TestConnectionButton({
  testing,
  onTest,
}: {
  testing: boolean
  onTest: () => Promise<{ ok: boolean; detail: string }>
}) {
  const [busy, setBusy] = useState(false)
  const handleTest = async () => {
    if (busy) return
    setBusy(true)
    try {
      const result = await onTest()
      if (result.ok) toast.success(result.detail)
      else toast.error(result.detail)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection test failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleTest}
      disabled={busy || testing}
      className="gap-2 border border-border/60 bg-secondary/60 hover:bg-secondary"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
      Test
    </Button>
  )
}

/** Real probe for the dialog forms: builds a remote server spec from the form
 *  state and calls POST /api/mcp/test. Never fabricates a result. */
async function probeDialogServer(opts: {
  url: string
  serverType: ServerType
  apiKey?: string
}): Promise<{ ok: boolean; detail: string }> {
  if (!opts.url.trim()) return { ok: false, detail: "Enter a server URL first" }
  if (opts.serverType === "Stdio") {
    return { ok: false, detail: "Stdio servers are tested from the MCP server list after saving." }
  }
  const spec: mcpApi.McpTestServerSpec = opts.serverType === "SSE" ? { type: "sse", url: opts.url.trim() } : { type: "http", url: opts.url.trim() }
  if (opts.apiKey) spec.api_key = opts.apiKey
  const result = await mcpApi.testServer({ server: spec, timeout: 15 })
  if (result.ok) {
    return { ok: true, detail: `Connection successful. ${result.tools.length} tools discovered` }
  }
  return { ok: false, detail: result.error }
}

/* ------------------------------------------------------------------ */
/*  Create / Edit connection                                           */
/* ------------------------------------------------------------------ */

export function McpConnectionDialog({
  open,
  connection,
  onOpenChange,
  onSave,
}: {
  open: boolean
  connection: McpConnection | null
  onOpenChange: (open: boolean) => void
  onSave: (conn: McpConnection) => void
}) {
  const isEditing = connection !== null
  const [name, setName] = useState(connection?.name ?? "")
  const [description, setDescription] = useState(connection?.description ?? "")
  const [url, setUrl] = useState(connection?.url ?? "")
  const [serverType, setServerType] = useState<ServerType>(connection?.serverType ?? "HTTP")
  const [authMethod, setAuthMethod] = useState(connection?.auth ?? AUTH_METHODS[1])
  const [apiKey, setApiKey] = useState("")
  const [envVars, setEnvVars] = useState<EnvVar[]>(connection?.envVars ?? [])
  const [connectAfterSave, setConnectAfterSave] = useState(connection?.connected ?? true)
  const [testState, setTestState] = useState<{ state: "idle" | "testing" | "ok" | "fail"; detail?: string }>({
    state: "idle",
  })

  const handleTestResult = (ok: boolean, detail: string) =>
    setTestState(ok ? { state: "ok", detail } : { state: "fail", detail })

  const handleSave = () => {
    if (!name.trim() || !url.trim()) {
      toast.error("Server name and URL are required")
      return
    }
    if (authMethod !== "None" && apiKey.trim() === "" && !connection?.authConfigured) {
      toast.error("Enter an API key or token for the selected auth method")
      return
    }

    // Only form-derived fields are emitted. Tools, health, uptime and history
    // are never fabricated here — the store rebuilds connections from the
    // backend response, so placeholders are immediately superseded.
    const config: Record<string, unknown> = { ...(connection?.config ?? {}) }
    if (authMethod !== "None" && apiKey.trim()) {
      config.auth = { strategy: AUTH_LABEL_TO_STRATEGY[authMethod] ?? "bearer", value: apiKey.trim() }
    }

    onSave({
      id: connection?.id ?? name.trim(),
      name: name.trim(),
      description: description.trim() || "Custom MCP connection.",
      connected: connectAfterSave,
      serverType,
      url: url.trim(),
      auth: authMethod,
      authConfigured: authMethod !== "None" ? Boolean(apiKey) || Boolean(connection?.authConfigured) : false,
      authTokenPreview: apiKey ? `••••••••••••••••••${apiKey.slice(-4)}` : connection?.authTokenPreview,
      envVars: envVars.filter((v) => v.key.trim() !== ""),
      tools: connection?.tools ?? [],
      category: connection?.category ?? "Custom",
      latencyMs: connection?.latencyMs ?? 0,
      health: "unknown",
      lastUsed: connection?.lastUsed ?? "never",
      created: connection?.created ?? "",
      icon: connection?.icon ?? Server,
      uptimePercent: 0,
      lastHealthCheck: "never",
      errorCount24h: 0,
      latencyTrend: "stable",
      totalCalls: 0,
      calls24h: 0,
      serverVersion: "",
      protocolVersion: "",
      eventLog: connection?.eventLog ?? [],
      history: connection?.history ?? [],
      config,
    })
    toast.success(isEditing ? `${name.trim()} updated` : `${name.trim()} saved`)
    onOpenChange(false)
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="MCP Server"
      icon={<Server className="h-5 w-5" />}
      title={isEditing ? "Edit MCP Configuration" : "Add Custom MCP Server"}
      description="Point the agent at any MCP-compatible server and expose its tools."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2 bg-primary text-primary-foreground hover:opacity-90">
            {isEditing ? "Save changes" : "Add Server"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 px-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Server type">
              <OptionMenu
                label="Server type"
                options={SERVER_TYPES}
                value={serverType}
                onChange={(v) => setServerType(v as ServerType)}
                trigger={
                  <button className="flex h-9 w-full items-center justify-between rounded-md border border-border/60 bg-secondary/40 px-3 text-sm text-foreground">
                    {serverType}
                    <span className="text-muted-foreground">▾</span>
                  </button>
                }
              />
            </Field>
            <Field label="Authentication">
              <OptionMenu
                label="Auth method"
                options={AUTH_METHODS}
                value={authMethod}
                onChange={setAuthMethod}
                trigger={
                  <button className="flex h-9 w-full items-center justify-between rounded-md border border-border/60 bg-secondary/40 px-3 text-sm text-foreground">
                    {authMethod}
                    <span className="text-muted-foreground">▾</span>
                  </button>
                }
              />
            </Field>
          </div>

          <Field label="Server name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Internal Wiki"
              className="bg-secondary/40"
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this server give the agent access to?"
              className="min-h-[64px] resize-none bg-secondary/40"
            />
          </Field>

          <Field label="Server URL">
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setTestState((s) => (s.state === "idle" || s.state === "ok" ? { state: "idle" } : s))
              }}
              placeholder="https://api.example.com"
              className="bg-secondary/40 font-mono text-[13px]"
            />
          </Field>

          {authMethod !== "None" && (
            <Field
              label={authMethod === "OAuth 2.0" ? "Client secret" : "API key / token"}
              hint={
                connection?.authConfigured && !apiKey
                  ? "A credential is already stored for this server. Leave blank to keep it."
                  : undefined
              }
            >
              <PasswordInput
                value={apiKey}
                onChange={setApiKey}
                placeholder="••••••••••••••••"
              />
            </Field>
          )}

          <Field label="Environment variables" hint="Injected into the server process at startup.">
            <EnvVarsField value={envVars} onChange={setEnvVars} />
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">Connect after saving</p>
              <p className="text-xs text-muted-foreground">
                {connectAfterSave ? "The agent will use this server immediately." : "Saved but left disconnected."}
              </p>
            </div>
            <Switch checked={connectAfterSave} onCheckedChange={setConnectAfterSave} aria-label="Connect after saving" />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">Test connection</p>
              <p className="truncate text-xs text-muted-foreground">
                {testState.state === "ok" && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {testState.detail}
                  </span>
                )}
                {testState.state === "fail" && <span className="text-red-400">{testState.detail}</span>}
                {testState.state === "idle" && "Verify the server before saving"}
                {testState.state === "testing" && "Connecting…"}
              </p>
            </div>
            {testState.state === "testing" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <TestConnectionButton
                testing={false}
                onTest={() =>
                  probeDialogServer({ url, serverType, apiKey: apiKey || undefined }).then((r) => {
                    handleTestResult(r.ok, r.detail)
                    return r
                  })
                }
              />
            )}
          </div>
      </div>
    </DrawerShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Install from library                                               */
/* ------------------------------------------------------------------ */

export function McpInstallDialog({
  server,
  onOpenChange,
  onInstall,
}: {
  server: LibraryServer | null
  onOpenChange: (open: boolean) => void
  onInstall: (lib: LibraryServer, apiKey: string, envVars: EnvVar[]) => void
}) {
  const isOpen = server !== null
  const [apiKey, setApiKey] = useState("")
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [testState, setTestState] = useState<{ state: "idle" | "testing" | "ok" | "fail"; detail?: string }>({ state: "idle" })

  if (!server) return null
  const Icon = server.icon
  const needsAuth = server.auth !== "None"
  const secretEnvName = `${server.name.toUpperCase().replace(/\s+/g, "_")}_ACCESS_TOKEN`

  const handleTestResult = (ok: boolean, detail: string) =>
    setTestState(ok ? { state: "ok", detail } : { state: "fail", detail })

  const handleInstall = () => {
    if (needsAuth && apiKey.trim() === "") {
      toast.error(`Enter the ${server.auth === "OAuth 2.0" ? "personal access token" : "API key"} first`)
      return
    }
    onInstall(server, apiKey.trim(), envVars.filter((v) => v.key.trim() !== ""))
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto border-border/60 bg-card p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-secondary/60">
              <Icon className="h-5 w-5 text-foreground" />
            </span>
            <div>
              <DialogTitle className="font-heading text-lg">{server.name}</DialogTitle>
              <DialogDescription className="text-muted-foreground">{server.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-6">
          {server.docUrl && (
            <a
              href={server.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View documentation ↗
            </a>
          )}

          <Field label="URL">
            <Input value={server.url} readOnly className="bg-secondary/40 font-mono text-[13px]" />
          </Field>

          {needsAuth && (
            <>
              <Field
                label={server.auth === "OAuth 2.0" ? "Personal access token" : "API key / token"}
                hint={
                  server.auth === "OAuth 2.0"
                    ? "Create a token in the provider's settings. Classic tokens need the repo and user scopes."
                    : "Stored encrypted and used only when the agent calls this server."
                }
              >
                <PasswordInput value={apiKey} onChange={setApiKey} placeholder="••••••••••••••••" />
              </Field>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Also save as secret</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Tag className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{secretEnvName}</Tag>
                  </div>
                </div>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            </>
          )}

          <Field label="Environment variables" hint="Injected into the server process at startup.">
            <EnvVarsField value={envVars} onChange={setEnvVars} />
          </Field>

          <div className="flex flex-col gap-2">
            <Label className="text-[13px] font-medium text-foreground">
              Available tools <span className="text-muted-foreground">({server.tools.length})</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {server.tools.map((tool) => (
                <Tag key={tool}>{tool}</Tag>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">Test connection</p>
              <p className="truncate text-xs text-muted-foreground">
                {testState.state === "ok" && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {testState.detail}
                  </span>
                )}
                {testState.state === "fail" && <span className="text-red-400">{testState.detail}</span>}
                {testState.state === "idle" && "Verify the server before installing"}
                {testState.state === "testing" && "Connecting…"}
              </p>
            </div>
            {testState.state === "testing" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <TestConnectionButton
                testing={false}
                onTest={() =>
                  probeDialogServer({ url: server.url, serverType: server.serverType, apiKey: apiKey || undefined }).then((r) => {
                    handleTestResult(r.ok, r.detail)
                    return r
                  })
                }
              />
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInstall} className="gap-2 bg-primary text-primary-foreground hover:opacity-90">
            <Server className="h-4 w-4" />
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
