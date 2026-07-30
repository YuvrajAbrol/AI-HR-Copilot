"use client";

import { Mail, LayoutGrid, MessageSquareText, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import type { FollowUp } from "@/lib/types";

function chipIcon(chip: FollowUp) {
  if (chip.kind === "action" && chip.payload === "email") return Mail;
  if (chip.kind === "action") return LayoutGrid;
  return MessageSquareText;
}

export function FollowUpChips({ chips }: { chips: FollowUp[] }) {
  const { runFollowUp } = useWorkspace();
  if (!chips.length) return null;

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const Icon = chipIcon(chip);
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => runFollowUp(chip)}
            className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
          >
            <Icon size={13} />
            {chip.label}
            <ArrowUpRight size={12} className="opacity-40 transition-opacity group-hover:opacity-80" />
          </button>
        );
      })}
    </div>
  );
}
