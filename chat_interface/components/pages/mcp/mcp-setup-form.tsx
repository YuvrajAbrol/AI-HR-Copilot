"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { McpSetupSchema, SetupField } from "./mcp-types"
import type { McpSetupValues } from "@/lib/mcp-store"

/* ------------------------------------------------------------------ */
/*  Shared field shell                                                 */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SecretInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-3 focus-within:border-border">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9 w-full bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
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

function HintBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Schema field renderer (text / password / textarea / select / bool) */
/*  Only ever used for genuinely user-owned values now: a personal     */
/*  access token, or a per-deployment connection string. OAuth app     */
/*  credentials never reach this — see provider/provider_configured    */
/*  on SetupAuthConfig.                                                */
/* ------------------------------------------------------------------ */

export function SetupFields({
  fields,
  values,
  onChange,
  disabled,
}: {
  fields: SetupField[]
  values: Record<string, string | boolean>
  onChange: (next: Record<string, string | boolean>) => void
  disabled?: boolean
}) {
  if (!fields || fields.length === 0) return null

  const set = (name: string, value: string | boolean) => onChange({ ...values, [name]: value })

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        const raw = values[field.name]
        const current = typeof raw === "boolean" ? (raw ? "true" : "false") : (raw as string | undefined) ?? ""
        return (
          <Field key={field.name} label={field.label} hint={field.hint} required={field.required}>
            {field.type === "boolean" ? (
              <Switch
                checked={Boolean(raw)}
                onCheckedChange={(b) => set(field.name, b)}
                disabled={disabled}
                aria-label={field.label}
              />
            ) : field.type === "select" ? (
              <Select
                value={current}
                onValueChange={(val) => set(field.name, val)}
                disabled={disabled}
              >
                <SelectTrigger className="bg-secondary/40">
                  <SelectValue placeholder={field.placeholder ?? "Select…"} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "textarea" ? (
              <Textarea
                value={current}
                onChange={(e) => set(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
                className="min-h-[64px] resize-none bg-secondary/40 font-mono text-[13px]"
              />
            ) : field.type === "password" || field.secret ? (
              <SecretInput
                value={current}
                onChange={(v) => set(field.name, v)}
                placeholder={field.placeholder}
                disabled={disabled}
              />
            ) : (
              <Input
                value={current}
                onChange={(e) => set(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
                className="bg-secondary/40 font-mono text-[13px]"
              />
            )}
          </Field>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Validation — exported so the dialog can gate Save/Connect the same */
/*  way the form does, instead of only failing after a click.          */
/* ------------------------------------------------------------------ */

/** Names of every schema field the auth block itself renders (so the
 *  trailing "Additional settings" list doesn't duplicate them). */
function authOwnedFieldNames(schema: McpSetupSchema): Set<string> {
  const auth = schema.auth
  const names = new Set<string>()
  if (auth?.method === "token" && auth.token_field) names.add(auth.token_field)
  return names
}

/** Whether every field the schema marks `required` has a non-empty value. */
function requiredFieldsFilled(fields: SetupField[] | undefined, values: Record<string, string | boolean>): boolean {
  for (const field of fields ?? []) {
    if (!field.required) continue
    const value = values[field.name]
    if (field.type === "boolean") continue
    if (!String(value ?? "").trim()) return false
  }
  return true
}

/** True once this schema's auth requirement is satisfied: a token is
 *  entered, an OAuth session exists (fresh or previously saved), or the
 *  method needs no credentials at all. */
export function authSatisfied(
  schema: McpSetupSchema,
  values: Record<string, string | boolean>,
  oauthState: Record<string, unknown> | null | undefined,
  oauthAlreadyConnected: boolean,
): boolean {
  const auth = schema.auth
  if (!auth || auth.method === "none" || auth.method === "env") return true
  if (auth.method === "token") {
    return Boolean(auth.token_field && String(values[auth.token_field] ?? "").trim())
  }
  if (auth.method === "oauth2") {
    return Boolean(oauthState || oauthAlreadyConnected)
  }
  return true
}

/** True once every schema-required field is filled and, for OAuth, the
 *  session is connected. Drives the Save button. */
export function setupComplete(
  schema: McpSetupSchema,
  values: Record<string, string | boolean>,
  oauthState: Record<string, unknown> | null | undefined,
  oauthAlreadyConnected: boolean,
): boolean {
  return (
    requiredFieldsFilled(schema.fields, values) &&
    authSatisfied(schema, values, oauthState, oauthAlreadyConnected)
  )
}

/** True when this OAuth integration is actually connectable: either it
 *  needs no pre-registered app (dynamic client registration) or the
 *  backend has one configured. False means an administrator still needs
 *  to add this provider to the backend's OAuth provider config — Connect
 *  must be blocked with that message instead of attempting (and failing)
 *  DCR against a provider that doesn't support it. */
export function oauthProviderReady(schema: McpSetupSchema): boolean {
  const auth = schema.auth
  if (!auth || auth.method !== "oauth2") return true
  if (!auth.provider) return true
  return auth.provider_configured === true
}

/* ------------------------------------------------------------------ */
/*  Full per-integration setup form                                    */
/*  Renders one consistent structure for every integration. OAuth app   */
/*  credentials are never collected here — they're backend deployment   */
/*  configuration (see oauth_provider_config.py); this form only ever   */
/*  asks for values that belong to the person setting it up: a personal */
/*  access token, or a per-deployment connection string.                */
/* ------------------------------------------------------------------ */

export function McpSetupForm({
  schema,
  initial = {},
  oauthConnected = false,
  disabled = false,
  onConnectOAuth,
  onCompleteOAuth,
  onValues,
}: {
  schema: McpSetupSchema
  /** Prefill values (e.g. env already saved on a re-install). */
  initial?: Record<string, string>
  /** True when the server already holds a completed OAuth session. */
  oauthConnected?: boolean
  disabled?: boolean
  /** Start the OAuth flow for this integration; resolves with the job id. */
  onConnectOAuth?: () => Promise<string | null>
  /** Poll an OAuth job; the success callback receives the persisted session. */
  onCompleteOAuth?: (jobId: string, onSuccess?: (state: Record<string, unknown>) => void) => Promise<"ok" | "failed">
  /** Emitted on every change so the caller can provision with current values. */
  onValues?: (values: McpSetupValues) => void
}) {
  const auth = schema.auth ?? ({ method: "none" } as McpSetupSchema["auth"])
  const isOAuth = auth?.method === "oauth2"
  const [values, setValues] = useState<Record<string, string | boolean>>(() => ({ ...initial }))
  const [oauthState, setOauthState] = useState<Record<string, unknown> | null>(null)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [oauthStarted, setOauthStarted] = useState(false)
  // Set when the user explicitly asks to redo an already-saved OAuth
  // session (e.g. it went stale and the server started rejecting it) —
  // reveals the Connect button again instead of the static "Connected" pill.
  const [reauthing, setReauthing] = useState(false)

  const connected = (oauthState !== null || oauthConnected) && !reauthing
  const providerReady = oauthProviderReady(schema)

  const emit = (next: Record<string, string | boolean>, state: Record<string, unknown> | null = oauthState) =>
    onValues?.({ values: next, oauthState: state, isOAuth })

  const handleValues = (next: Record<string, string | boolean>) => {
    setValues(next)
    emit(next)
  }

  const handleOAuthState = (state: Record<string, unknown>) => {
    setOauthState(state)
    setOauthBusy(false)
    setReauthing(false)
    emit(values, state)
  }

  const handleConnect = async () => {
    if (!onConnectOAuth || oauthBusy || connected || !providerReady) return
    setOauthBusy(true)
    setOauthStarted(true)
    try {
      const jobId = await onConnectOAuth()
      if (!jobId) {
        setOauthBusy(false)
        return
      }
      // Poll until the browser-coordinated flow settles (success or failure).
      await onCompleteOAuth?.(jobId, handleOAuthState)
      setOauthBusy(false)
    } catch {
      setOauthBusy(false)
    }
  }

  const ownedNames = authOwnedFieldNames(schema)
  const remainingFields = (schema.fields ?? []).filter((f) => !ownedNames.has(f.name))

  return (
    <div className="flex flex-col gap-5">
      {/* --- step: authenticate (token field or OAuth connect) --- */}
      {auth?.method === "token" && auth.token_field && (
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-secondary/20 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
              1
            </span>
            <p className="text-[13px] font-semibold text-foreground">Authenticate</p>
          </div>
          {auth.hint && <p className="pl-7 text-xs leading-relaxed text-muted-foreground">{auth.hint}</p>}
          <div className="pl-7">
            <Field label={auth.label ?? "Access token"} required>
              <SecretInput
                value={(values[auth.token_field] as string | undefined) ?? ""}
                onChange={(v) => handleValues({ ...values, [auth.token_field!]: v })}
                placeholder="••••••••••••••••"
                disabled={disabled}
              />
            </Field>
          </div>
        </div>
      )}

      {isOAuth && !providerReady && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-amber-300">Needs administrator setup</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-300/80">
              This integration requires a {auth?.provider} OAuth application configured on the
              backend before anyone can connect. Ask your administrator to add it to the server's
              OAuth provider configuration.
            </p>
          </div>
        </div>
      )}

      {isOAuth && (
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-secondary/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">{auth?.label ?? "Connect"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {connected ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    Connected
                  </span>
                ) : oauthBusy ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Waiting for authorization…
                  </span>
                ) : oauthStarted ? (
                  "Open the provider tab and approve access."
                ) : !providerReady ? (
                  "Not available until an administrator configures this integration."
                ) : (
                  auth?.hint ?? "Authorize this integration to reach your account."
                )}
              </p>
            </div>
            {connected ? (
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
                {oauthConnected && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReauthing(true)}
                    disabled={disabled}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Re-authenticate
                  </Button>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleConnect}
                disabled={oauthBusy || disabled || !providerReady}
                className="gap-2 border border-border/60 bg-secondary/60 hover:bg-secondary"
              >
                {oauthBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Connect
              </Button>
            )}
          </div>
        </div>
      )}

      {auth?.method === "none" && (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/20 px-4 py-3 text-[13px] text-muted-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
          No credentials needed — this server is ready to use.
        </div>
      )}

      {auth?.method === "env" && auth.hint && <HintBanner text={auth.hint} />}

      {/* --- remaining schema fields (env values, connection strings, …) --- */}
      {remainingFields.length > 0 && (
        <div className="flex flex-col gap-3">
          {(isOAuth || auth?.method === "token") && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Additional settings
            </p>
          )}
          <SetupFields fields={remainingFields} values={values} onChange={handleValues} disabled={disabled} />
        </div>
      )}
    </div>
  )
}
