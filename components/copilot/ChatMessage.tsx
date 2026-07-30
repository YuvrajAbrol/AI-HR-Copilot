"use client";

import { Bot, FileText, ShieldX } from "lucide-react";
import { AgentReasoningStepper } from "./AgentReasoningStepper";
import { FollowUpChips } from "./FollowUpChips";
import { ToolBadge } from "./ToolBadge";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

// Inline **bold** + *italic* formatting without a markdown dependency.
function renderRichText(text: string) {
  return text.split("\n").map((line, li) => {
    const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
    return (
      <span key={li} className="block">
        {tokens.map((tok, i) => {
          if (tok.startsWith("**") && tok.endsWith("**"))
            return (
              <strong key={i} className="font-semibold text-slate-900">
                {tok.slice(2, -2)}
              </strong>
            );
          if (tok.startsWith("*") && tok.endsWith("*"))
            return (
              <em key={i} className="italic text-slate-600">
                {tok.slice(1, -1)}
              </em>
            );
          return <span key={i}>{tok}</span>;
        })}
      </span>
    );
  });
}

export function ChatMessage({ message }: { message: ChatMessageType }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
          message.blocked ? "bg-rose-500" : "bg-slate-900"
        }`}
      >
        {message.blocked ? <ShieldX size={16} /> : <Bot size={16} />}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {message.steps.length > 0 && <AgentReasoningStepper steps={message.steps} />}

        {message.text && (
          <div
            className={`rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
              message.blocked
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <div className="space-y-1.5">{renderRichText(message.text)}</div>

            {message.citations.length > 0 && (
              <div className="mt-2.5 space-y-1 border-t border-slate-100 pt-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Grounded citations
                </p>
                {message.citations.map((c) => (
                  <div key={c.filename} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <FileText size={12} className="text-brand-500" />
                    <span className="font-medium text-slate-600">{c.filename}</span>
                    <span className="text-slate-400">· {c.section}</span>
                  </div>
                ))}
              </div>
            )}

            {message.systems.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                {message.systems.map((s) => (
                  <ToolBadge key={s} system={s} />
                ))}
              </div>
            )}
          </div>
        )}

        <FollowUpChips chips={message.followUps} />
      </div>
    </div>
  );
}
