"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal, RotateCcw, Sparkles, Paperclip, Mail } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { SUGGESTED_PROMPTS } from "@/lib/copilotEngine";
import { ChatMessage } from "./ChatMessage";
import { FileDropzone } from "./FileDropzone";

export function CopilotConsole() {
  const { messages, sendMessage, isThinking, resetChat, openEmail, focusedEmployee } = useWorkspace();
  const [input, setInput] = useState("");
  const [showDropzone, setShowDropzone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const showSuggestions = messages.length <= 1;

  return (
    <aside className="hidden w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white xl:flex">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Bot size={18} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">Copilot Console</p>
            <p className="text-[11px] text-slate-500">Agent Orchestration Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              openEmail({
                to: focusedEmployee?.email ?? "recipient@closedai.com",
                subject: "HR Copilot — Shared Update",
                body: "Hi,\n\nSharing the latest from the HR Copilot Workspace.\n\nBest,\nHR Operations",
                context: "Email Studio · Microsoft Graph API",
              })
            }
            title="Email Studio"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Mail size={16} />
          </button>
          <button
            type="button"
            onClick={resetChat}
            title="New conversation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}

        {showSuggestions && (
          <div className="pt-1">
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Sparkles size={12} /> Demo scenarios
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendMessage(p)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[13px] text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 p-3">
        {showDropzone && (
          <div className="mb-2">
            <FileDropzone />
          </div>
        )}
        <form onSubmit={submit}>
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <button
              type="button"
              onClick={() => setShowDropzone((v) => !v)}
              title="Attach files"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                showDropzone ? "bg-brand-100 text-brand-600" : "text-slate-400 hover:bg-slate-200"
              }`}
            >
              <Paperclip size={17} />
            </button>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) submit(e);
              }}
              placeholder="Ask about employees, policy, payroll, hiring…"
              className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal size={17} />
            </button>
          </div>
        </form>
        <p className="mt-1.5 text-center text-[11px] text-slate-400">
          Guardrailed to HR tasks · Azure SQL · AI Search · Graph API
        </p>
      </div>
    </aside>
  );
}
