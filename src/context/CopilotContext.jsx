import { createContext, useCallback, useContext, useRef, useState } from "react";
import { runCopilotTurn } from "../services/copilotEngine.js";

const CopilotContext = createContext(null);

let idCounter = 0;
const nextId = () => `msg-${idCounter++}`;

const WELCOME = {
  id: "welcome",
  role: "assistant",
  text: "👋 Hi! I'm your HR Copilot. I can pull from Leave, Benefits, Payroll, Training, and the Directory — all behind one chat. What can I help you with?",
  trace: [],
  citations: [],
};

export function CopilotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [isThinking, setIsThinking] = useState(false);
  const seededPrompt = useRef(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      const userMsg = { id: nextId(), role: "user", text: trimmed };
      const assistantId = nextId();
      const assistantMsg = {
        id: assistantId,
        role: "assistant",
        text: "",
        trace: [],
        citations: [],
        pending: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsThinking(true);

      try {
        const { answer } = await runCopilotTurn(trimmed, {
          onStep: (trace) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, trace } : m))
            );
          },
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: answer.text,
                  citations: answer.citations,
                  pending: false,
                }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: "Sorry, something went wrong reaching that service. Please try again.",
                  pending: false,
                }
              : m
          )
        );
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking]
  );

  // Lets other pages deep-link a question into the Copilot (e.g. "Ask Copilot").
  const askCopilot = useCallback(
    (text) => {
      open();
      sendMessage(text);
    },
    [open, sendMessage]
  );

  const resetChat = useCallback(() => setMessages([WELCOME]), []);

  const value = {
    isOpen,
    open,
    close,
    toggle,
    messages,
    isThinking,
    sendMessage,
    askCopilot,
    resetChat,
    seededPrompt,
  };

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCopilot() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilot must be used within a CopilotProvider");
  return ctx;
}
