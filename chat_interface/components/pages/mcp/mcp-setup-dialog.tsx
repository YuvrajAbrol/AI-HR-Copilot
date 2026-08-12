"use client"

import { useEffect, useState } from "react"
import { Loader2, Server, X, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as mcpApi from "@/lib/mcp-api"
import { substitutePlaceholders, useMcp } from "@/lib/mcp-store"
import { McpSetupForm, setupComplete } from "./mcp-setup-form"
import type { LibraryServer, McpConnection } from "./mcp-types"

/** Convert an integration's .mcp.json server template (after ${VAR}
 *  substitution) into a POST /api/mcp/test spec. Uses the same normalization
 *  the store applies to connections: streamable-http -> http. */
function templateToProbeSpec(
  template: Record<string, unknown>,
  values: Record<string, string | boolean>,
): mcpApi.McpTestServerSpec | null {
  const t = JSON.parse(JSON.stringify(template)) as Record<string, unknown>
  substitutePlaceholders(t, values)
  if (t.transport === "stdio" || (typeof t.command === "string" && t.command)) {
    if (typeof t.command !== "string" || !t.command) return null
    return {
      type: "stdio",
      command: t.command,
      args: Array.isArray(t.args) ? (t.args as string[]) : [],
      ...(t.env && typeof t.env === "object" ? { env: t.env as Record<string, string> } : {}),
    }
  }
  if (typeof t.url !== "string" || !t.url) return null
  const remote: Record<string, unknown> = { type: "http", url: t.url }
  if (t.headers && typeof t.headers === "object" && Object.keys(t.headers as object).length > 0) {
    remote.headers = t.headers
  }
  // Preserve auth (especially strategy: "oauth2" + authentication metadata)
  // so the backend OAuth probe recognizes this as an OAuth server.
  if (t.auth && typeof t.auth === "object") {
    remote.auth = t.auth
  }
  return remote as mcpApi.McpTestServerSpec
}

/* ------------------------------------------------------------------ */
/*  Setup / configure a marketplace MCP                                */
/*                                                                       */
/*  One minimal, consistent popup for every integration: a title, a     */
/*  small Test control next to Close, whatever tiny auth-specific block  */
/*  McpSetupForm renders, and a single "Connect" button that does the    */
/*  right thing for that auth method (start the OAuth redirect, or save  */
/*  the entered token/fields) — see handleConnect below.                 */
/* ------------------------------------------------------------------ */

export function McpSetupDialog({
  server,
  connection,
  onOpenChange,
  onEdit,
}: {
  /** The installed integration (setup schema + .mcp.json templates). */
  server: LibraryServer | null
  /** The provisioned server on the MCP page. */
  connection: McpConnection | null
  onOpenChange: (open: boolean) => void
  /** Opens the existing full-config edit popup for this server. */
  onEdit?: (conn: McpConnection) => void
}) {
  const { saveSecret, patchServerConfig, startOAuth, completeOAuth, load } = useMcp()
  const isOpen = server !== null && connection !== null

  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [oauthState, setOauthState] = useState<Record<string, unknown> | null>(null)
  const [oauthBusy, setOauthBusy] = useState(false)
  // Set when the user explicitly asks to redo an already-saved OAuth session
  // — reveals the connect control again instead of the static "Connected" line.
  const [reauthing, setReauthing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [testing, setTesting] = useState(false)

  // Reset per-target state when the user switches integration/server without
  // closing the dialog in between.
  useEffect(() => {
    setValues({})
    setOauthState(null)
    setReauthing(false)
  }, [server?.id, connection?.id])

  if (!server || !connection) return null

  const schema = server.setup
  const templates = server.servers ?? {}
  const serverNames = Object.keys(templates)
  const firstTemplate = serverNames.length > 0 ? (templates[serverNames[0]] as Record<string, unknown> | undefined) : undefined

  // Whether this server already holds a completed OAuth session (re-setup).
  const savedAuth = connection.config?.auth as Record<string, unknown> | undefined
  const oauthAlready = savedAuth?.strategy === "oauth2" && Boolean(savedAuth.state)
  const isOAuth = schema?.auth?.method === "oauth2"
  const oauthConnectedNow = (oauthState !== null || oauthAlready) && !reauthing
  // Drives the Connect button's disabled state.
  const canConnect = schema ? setupComplete(schema, values, oauthState, oauthAlready) : false

  const runOAuthFlow = async (): Promise<boolean> => {
    if (!firstTemplate) return false
    const spec = templateToProbeSpec(firstTemplate, values)
    if (!spec) return false
    setOauthBusy(true)
    try {
      // No client_id/secret here — those are backend deployment config (see
      // oauth_provider_config.py), resolved server-side from the template's
      // `provider` tag. The frontend only ever asks the provider to connect.
      const jobId = await startOAuth(spec, { verifyToolCall: schema?.auth?.verify_tool_call })
      if (!jobId) return false
      const result = await completeOAuth(jobId, (state) => {
        setOauthState(state)
        void patchServerConfig(connection.id, { auth: { strategy: "oauth2", state } })
      })
      return result === "ok"
    } finally {
      setOauthBusy(false)
    }
  }

  const handleTest = async () => {
    if (!firstTemplate) {
      toast.error("This integration has no MCP server template to probe")
      return
    }
    const spec = templateToProbeSpec(firstTemplate, values)
    if (!spec) {
      toast.error("Complete the required fields, then test")
      return
    }
    setTesting(true)
    try {
      const testTool = (schema as any)?.test_tool as { name: string; arguments?: Record<string, unknown> } | undefined
      const result = await mcpApi.testServer({ server: spec, timeout: 15, tool_call: testTool })
      if (!result.ok) {
        toast.error(result.error ?? "Connection failed")
        return
      }
      if (result.tool_result?.is_error) {
        toast.error(result.tool_result.text ?? "Connection failed")
        return
      }
      toast.success(`Connection successful — ${result.tools.length} tools discovered`)
    } finally {
      setTesting(false)
    }
  }

  /** Save every collected value (token, connection string, …) as a global
   *  secret so ${VAR} placeholders resolve at conversation build time. */
  const saveValues = async () => {
    let persisted = false
    for (const [name, value] of Object.entries(values)) {
      if (typeof value === "string" && value.trim()) {
        try {
          await saveSecret(name, value.trim())
          persisted = true
        } catch (error) {
          console.warn(`Failed to store secret ${name}:`, error)
        }
      }
    }
    return persisted
  }

  const handleConnect = async () => {
    if (!schema) return
    // Re-verify the same check the button's `disabled` state uses, so a
    // stale click (e.g. a field cleared right before submit) still gets a
    // precise message instead of silently doing nothing.
    for (const field of schema.fields ?? []) {
      if (field.required && !String(values[field.name] ?? "").trim()) {
        toast.error(`${field.label} is required`)
        return
      }
    }
    if (schema.auth?.method === "token" && schema.auth.token_field) {
      if (!String(values[schema.auth.token_field] ?? "").trim()) {
        toast.error(`Enter the ${schema.auth.label ?? "access token"} first`)
        return
      }
    }

    setConnecting(true)
    try {
      if (isOAuth) {
        if (oauthConnectedNow) {
          onOpenChange(false)
          return
        }
        const ok = await runOAuthFlow()
        if (!ok) {
          toast.error("Failed to connect — try again")
          return
        }
      }

      const persisted = await saveValues()
      if (!persisted && !isOAuth && connection.setupNeeded) {
        toast.error("Nothing to save — enter the credentials this server needs first")
        return
      }

      await load()
      toast.success(`${connection.name} connected`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to connect ${connection.name}`)
    } finally {
      setConnecting(false)
    }
  }

  const busy = connecting || oauthBusy

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 border-border/60 bg-card p-0 sm:max-w-sm">
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border/60 px-5 py-3.5">
          <DialogTitle className="font-heading text-[15px]">Connect</DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleTest}
              disabled={testing}
              aria-label="Test connection"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
          {schema ? (
            <McpSetupForm
              key={`${server.id}-${connection.id}`}
              schema={schema}
              values={values}
              onValues={setValues}
              oauthConnected={oauthConnectedNow}
              oauthBusy={oauthBusy}
              reauthing={reauthing}
              onReconnect={() => setReauthing(true)}
              disabled={busy}
            />
          ) : (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              No dynamic setup for this server — use Edit for full configuration.
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 px-5 py-3.5 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onEdit?.(connection)}
            disabled={busy}
            className="gap-1.5 text-[12px] text-muted-foreground"
          >
            <Server className="h-3.5 w-3.5" />
            Edit full configuration
          </Button>
          <Button
            onClick={handleConnect}
            disabled={busy || !canConnect}
            title={!canConnect ? "Complete the required fields above first" : undefined}
            className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {oauthConnectedNow ? "Done" : busy ? "Connecting…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
