"use client";

import { useState } from "react";
import { BookText, FileText, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useWorkspace } from "@/lib/store";
import { POLICY_DOCS } from "@/lib/mockData";
import { formatDate } from "@/lib/format";

export function PolicyKnowledgeBase() {
  const { sendMessage } = useWorkspace();
  const [query, setQuery] = useState("");

  const filtered = POLICY_DOCS.filter(
    (d) =>
      !query ||
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.snippet.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        icon={BookText}
        title="Policy Knowledge Base"
        description="Grounded HR policy retrieval — indexed by Azure AI Search (RAG)."
        actions={<Badge tone="indigo"><Sparkles size={12} /> {POLICY_DOCS.length} documents indexed</Badge>}
      />

      <div className="relative mb-5">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Semantic search across policy documents…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((doc) => (
          <Card key={doc.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <FileText size={18} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{doc.title}</p>
                  <p className="text-xs text-slate-400">
                    {doc.filename} · {doc.section}
                  </p>
                </div>
              </div>
              <Badge tone="slate">Updated {formatDate(doc.updated)}</Badge>
            </div>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
              {doc.snippet}
            </p>
            <button
              type="button"
              onClick={() => sendMessage(`Summarize the ${doc.title} policy`)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-800"
            >
              <Sparkles size={14} /> Ask Copilot about this
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
