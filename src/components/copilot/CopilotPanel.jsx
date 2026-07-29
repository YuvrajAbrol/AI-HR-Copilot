import { useEffect, useRef, useState } from "react";
import { Bot, X, SendHorizontal, RotateCcw, Sparkles } from "lucide-react";
import { useCopilot } from "../../context/CopilotContext.jsx";
import { SUGGESTED_PROMPTS } from "../../services/copilotEngine.js";
import { ChatMessage } from "./ChatMessage.jsx";

export function CopilotPanel() {
  const { isOpen, close, messages, sendMessage, isThinking, resetChat } = useCopilot();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const showSuggestions = messages.length <= 1;

  return (
    <>
      {/* Backdrop on small screens */}
      <div
        onClick={close}
        className={`fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Bot size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">AI HR Copilot</p>
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online · Multi-tool agent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetChat}
              title="New conversation"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={close}
              title="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}

          {showSuggestions && (
            <div className="pt-2">
              <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold text-slate-400">
                <Sparkles size={12} /> Try asking
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 bg-white p-3"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSubmit(e);
                }
              }}
              placeholder="Ask about leave, benefits, payroll…"
              className="max-h-32 flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal size={17} />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-center text-[11px] text-slate-400">
            Copilot can query Leave, Benefits, Payroll, Training &amp; Directory tools.
          </p>
        </form>
      </aside>
    </>
  );
}
