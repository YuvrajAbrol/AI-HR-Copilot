import { Bot, FileText } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { AgentTrace } from "./AgentTrace.jsx";
import { currentUser } from "../../data/mockData.js";

// Minimal inline formatter: **bold**, *italic*, and line breaks. Enough for the
// mock synthesized answers without pulling in a markdown dependency.
function renderRichText(text) {
  return text.split("\n").map((line, lineIdx) => {
    const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
    return (
      <span key={lineIdx} className="block">
        {tokens.map((token, i) => {
          if (token.startsWith("**") && token.endsWith("**")) {
            return (
              <strong key={i} className="font-semibold text-slate-900">
                {token.slice(2, -2)}
              </strong>
            );
          }
          if (token.startsWith("*") && token.endsWith("*")) {
            return (
              <em key={i} className="italic text-slate-600">
                {token.slice(1, -1)}
              </em>
            );
          }
          return <span key={i}>{token}</span>;
        })}
      </span>
    );
  });
}

export function ChatMessage({ message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white shadow-sm">
          {message.text}
        </div>
        <Avatar initials={currentUser.avatarInitials} name={currentUser.name} size="sm" />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
        <Bot size={16} />
      </span>
      <div className="max-w-[85%] space-y-2">
        {message.trace?.length > 0 && <AgentTrace trace={message.trace} />}

        {message.text && (
          <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm">
            <div className="space-y-2">{renderRichText(message.text)}</div>

            {message.citations?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                {message.citations.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                  >
                    <FileText size={11} /> {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
