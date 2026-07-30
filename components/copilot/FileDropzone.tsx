"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface UploadedFile {
  name: string;
  size: string;
}

// Mock dropzone: captures file names locally so the demo can show pay slips /
// resumes / policy PDFs "attached" to the agent. Wire to Azure Blob + AI Search
// ingestion later.
export function FileDropzone() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const mapped = Array.from(list).map((f) => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-3 text-center transition-colors ${
          dragging ? "border-brand-400 bg-brand-50" : "border-slate-300 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/50"
        }`}
      >
        <UploadCloud size={18} className="text-brand-500" />
        <p className="text-[11px] text-slate-500">
          Drop pay slips, resumes, or policy PDFs
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-1 overflow-hidden"
          >
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
                <FileText size={13} className="shrink-0 text-brand-500" />
                <span className="flex-1 truncate text-slate-600">{f.name}</span>
                <span className="text-slate-400">{f.size}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
