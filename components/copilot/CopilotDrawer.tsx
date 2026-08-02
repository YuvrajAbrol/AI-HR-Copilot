"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, X, RotateCcw, SendHorizontal, ShieldX, ShieldCheck, ArrowUpRight, Database, Search, Mail, Wrench } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { ROLE_META } from "@/lib/rbac";
import { SUGGESTED_PROMPTS } from "@/lib/copilot";
import { ReasoningStepper } from "./ReasoningStepper";
import type { ChatMessage } from "@/lib/workspace";

const SYSTEM_BADGE: Record<string, { label: string; icon: typeof Database; cls: string }> = {
  sql: { label: "Azure SQL", icon: Database, cls: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  search: { label: "Azure AI Search", icon: Search, cls: "bg-accent-50 text-accent-700 ring-accent-600/20" },
  graph: { label: "Microsoft Graph", icon: Mail, cls: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  mask: { label: "Data Mask", icon: ShieldCheck, cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  rbac: { label: "RBAC", icon: ShieldCheck, cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  guardrail: { label: "Guardrail", icon: ShieldX, cls: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  synth: { label: "LLM Synthesis", icon: Wrench, cls: "bg-violet-50 text-violet-700 ring-violet-600/20" },
};

function renderRich(text: string) {
  return text.split("\n").map((line, li) => {
    const tokens = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <span key={li} className="block">
        {tokens.map((t, i) =>
          t.startsWith("**") && t.endsWith("**") ? (
            <strong key={i} className="font-semibold text-zinc-900">
              {t.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{t}</span>
          )
        )}
      </span>
    );
  });
}

export function CopilotDrawer() {
  const { copilotOpen, setCopilotOpen, messages, sendMessage, isThinking, resetChat, runFollowUp, role } = useWorkspace();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, copilotOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <AnimatePresence>
      {copilotOpen && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
          className="flex h-full w-[380px] shrink-0 flex-col border-l border-zinc-200 bg-white"
        >
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white">
                <Bot size={16} />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white" />
              </span>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-zinc-900">HR Copilot</p>
                <p className="text-[10px] text-emerald-600">Acting as {ROLE_META[role].label}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={resetChat} title="Reset" className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                <RotateCcw size={15} />
              </button>
              <button onClick={() => setCopilotOpen(false)} title="Close" className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onFollowUp={runFollowUp} />
            ))}
            {messages.length <= 1 && (
              <div className="pt-1">
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Try asking</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-left text-xs text-zinc-600 transition-colors hover:border-accent-300 hover:bg-accent-50/50 hover:text-accent-700"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={submit} className="border-t border-zinc-200 p-2.5">
            <div className="flex items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 focus-within:border-accent-400 focus-within:ring-2 focus-within:ring-accent-100">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) submit(e);
                }}
                placeholder="Ask about people, pay, time, hiring…"
                className="max-h-28 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
              >
                <SendHorizontal size={15} />
              </button>
            </div>
            <p className="mt-1 text-center text-[10px] text-zinc-400">RBAC-verified · queries are logged to the audit trail</p>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({ message, onFollowUp }: { message: ChatMessage; onFollowUp: (f: ChatMessage["followUps"][number]) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-zinc-900 px-3 py-2 text-sm text-white">{message.text}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white ${message.blocked || message.denied ? "bg-rose-500" : "bg-zinc-900"}`}>
        {message.blocked || message.denied ? <ShieldX size={14} /> : <Bot size={14} />}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {message.steps.length > 0 && <ReasoningStepper steps={message.steps} />}
        {message.text && (
          <div
            className={`rounded-lg rounded-tl-sm border px-3 py-2 text-sm leading-relaxed ${
              message.blocked || message.denied ? "border-rose-200 bg-rose-50 text-rose-800" : "border-zinc-200 bg-white text-zinc-700"
            }`}
          >
            <div className="space-y-1">{renderRich(message.text)}</div>
            {message.systems.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 border-t border-zinc-100 pt-2">
                {message.systems.map((s) => {
                  const b = SYSTEM_BADGE[s];
                  if (!b) return null;
                  const Icon = b.icon;
                  return (
                    <span key={s} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${b.cls}`}>
                      <Icon size={10} /> {b.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {message.followUps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.followUps.map((f) => (
              <button
                key={f.id}
                onClick={() => onFollowUp(f)}
                className="group inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700"
              >
                {f.label}
                <ArrowUpRight size={11} className="opacity-40 group-hover:opacity-80" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
