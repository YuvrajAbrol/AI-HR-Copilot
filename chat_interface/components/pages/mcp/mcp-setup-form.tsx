"use client"

import { useState } from "react"
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { McpSetupSchema, SetupField } from "./mcp-types"

/* ------------------------------------------------------------------ */
/*  Shared field shell — small and unstyled beyond the input itself,   */
/*  so every auth method renders at the same visual weight.            */
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
    <div className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
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

/* ------------------------------------------------------------------ */
/*  Schema field renderer (text / password / textarea / select / bool) */
/*  Only ever used for genuinely user-owned values: a personal access  */
/*  token, or a per-deployment connection string. OAuth app credentials*/
/*  never reach this — see provider/provider_configured on             */
/*  SetupAuthConfig.                                                    */
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
    <div className="flex flex-col gap-3">
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
/*  Validation — exported so the dialog can gate the Connect button    */
/*  the same way the form does, instead of only failing after a click. */
/* ------------------------------------------------------------------ */

/** Names of every schema field the auth block itself renders (so the
 *  trailing field list doesn't duplicate them). */
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
 *  session is connected. Drives the Connect button. */
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
/*  One minimal, consistent shell for every integration — the only     */
/*  thing that differs between MCPs is which small block renders here   */
/*  (a token field, an OAuth status line, a couple of env fields, or    */
/*  nothing at all). The actual "Connect" action lives in the dialog's  */
/*  single footer button, not in this form, so every integration shares */
/*  the exact same primary control regardless of auth method.           */
/* ------------------------------------------------------------------ */

export function McpSetupForm({
  schema,
  initial = {},
  values: controlledValues,
  onValues,
  oauthConnected = false,
  oauthBusy = false,
  reauthing = false,
  onReconnect,
  disabled = false,
}: {
  schema: McpSetupSchema
  /** Prefill values (e.g. env already saved on a re-install). */
  initial?: Record<string, string>
  /** Controlled values, owned by the dialog so the footer button can read them. */
  values: Record<string, string | boolean>
  /** Emitted on every change. */
  onValues: (values: Record<string, string | boolean>) => void
  /** True when the server already holds a completed OAuth session. */
  oauthConnected?: boolean
  /** True while an OAuth job is in flight (started by the dialog). */
  oauthBusy?: boolean
  /** True when the user asked to redo an already-connected OAuth session. */
  reauthing?: boolean
  /** Ask the dialog to reset a connected session back to the connect state. */
  onReconnect?: () => void
  disabled?: boolean
}) {
  const auth = schema.auth ?? ({ method: "none" } as McpSetupSchema["auth"])
  const isOAuth = auth?.method === "oauth2"
  const connected = isOAuth && oauthConnected && !reauthing
  const providerReady = oauthProviderReady(schema)

  const handleValues = (next: Record<string, string | boolean>) => onValues(next)

  const ownedNames = authOwnedFieldNames(schema)
  const remainingFields = (schema.fields ?? []).filter((f) => !ownedNames.has(f.name))

  return (
    <div className="flex flex-col gap-4">
      {/* --- auth block: exactly one of these renders --- */}
      {auth?.method === "token" && auth.token_field && (
        <Field label={auth.label ?? "Access token"} hint={auth.hint} required>
          <SecretInput
            value={(controlledValues[auth.token_field] as string | undefined) ?? initial[auth.token_field] ?? ""}
            onChange={(v) => handleValues({ ...controlledValues, [auth.token_field!]: v })}
            placeholder="••••••••••••••••"
            disabled={disabled}
          />
        </Field>
      )}

      {isOAuth && !providerReady && (
        <p className="text-[11px] leading-snug text-amber-400">
          Needs an administrator to configure {auth?.provider} OAuth on the backend first.
        </p>
      )}

      {isOAuth && providerReady && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-muted-foreground">
            {connected ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </span>
            ) : oauthBusy ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for authorization…
              </span>
            ) : (
              auth?.label ?? "Not connected"
            )}
          </p>
          {connected && oauthConnected && onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              disabled={disabled}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Reconnect
            </button>
          )}
        </div>
      )}

      {auth?.method === "none" && <p className="text-[13px] text-muted-foreground">No credentials needed.</p>}

      {auth?.method === "env" && auth.hint && <p className="text-[11px] leading-snug text-muted-foreground">{auth.hint}</p>}

      {/* --- remaining schema fields (env values, connection strings, …) --- */}
      {remainingFields.length > 0 && (
        <SetupFields fields={remainingFields} values={controlledValues} onChange={handleValues} disabled={disabled} />
      )}
    </div>
  )
}
