import { Bot } from "lucide-react";
import { useCopilot } from "../../context/CopilotContext.jsx";

// Floating action button to open the Copilot from anywhere. Hidden while open.
export function CopilotLauncher() {
  const { isOpen, open } = useCopilot();

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open AI HR Copilot"
      className={`fixed bottom-6 right-6 z-30 flex items-center gap-2.5 rounded-full bg-brand-600 py-3.5 pl-4 pr-5 text-white shadow-lg shadow-brand-600/40 transition-all duration-300 hover:bg-brand-700 hover:shadow-xl ${
        isOpen ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"
      }`}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <Bot size={22} />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-brand-600" />
      </span>
      <span className="text-sm font-semibold">Ask Copilot</span>
    </button>
  );
}
