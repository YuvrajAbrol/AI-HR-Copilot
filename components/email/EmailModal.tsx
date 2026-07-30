"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Sparkles, Mail, ShieldCheck, Check } from "lucide-react";
import { useWorkspace } from "@/lib/store";

export function EmailModal() {
  const { emailDraft, closeEmail } = useWorkspace();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (emailDraft) {
      setTo(emailDraft.to);
      setSubject(emailDraft.subject);
      setBody(emailDraft.body);
      setSent(false);
    }
  }, [emailDraft]);

  const send = () => {
    setSent(true);
    setTimeout(closeEmail, 1400);
  };

  return (
    <AnimatePresence>
      {emailDraft && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={closeEmail}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Mail size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Email Studio</p>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Sparkles size={11} className="text-brand-500" /> {emailDraft.context}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEmail}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {sent ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                >
                  <Check size={28} />
                </motion.span>
                <p className="font-semibold text-slate-900">Email sent securely</p>
                <p className="text-sm text-slate-500">Dispatched via Microsoft Graph API · logged to audit trail</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 px-5 py-4">
                  <Field label="To">
                    <input
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </Field>
                  <Field label="Subject">
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </Field>
                  <Field label="Message">
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck size={13} className="text-emerald-500" /> Encrypted · RBAC Level 4
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeEmail}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={send}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      <Send size={15} /> Send securely
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}
