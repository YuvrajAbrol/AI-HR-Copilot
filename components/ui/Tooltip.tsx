import type { ReactNode } from "react";

// Lightweight CSS hover tooltip. Renders a floating card above the trigger.
// Used for rich employee/leave hover cards across modules.
export function Tooltip({
  content,
  children,
  side = "top",
  className = "",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const pos =
    side === "top"
      ? "bottom-full mb-1.5"
      : "top-full mt-1.5";
  return (
    <span className={`group/tt relative inline-flex ${className}`}>
      {children}
      <span
        className={`pointer-events-none absolute left-1/2 z-[70] hidden -translate-x-1/2 group-hover/tt:block ${pos}`}
      >
        <span className="block w-max max-w-[240px] rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-left shadow-xl">
          {content}
        </span>
      </span>
    </span>
  );
}
