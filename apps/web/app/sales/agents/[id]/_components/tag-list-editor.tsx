"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function TagListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className="chip gap-1 border border-hairline bg-panel pr-1 text-fg">
              {item}
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="rounded-full p-0.5 text-fg-faint hover:bg-critical-soft hover:text-critical">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="field"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-outline shrink-0 gap-1 px-3" onClick={add}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
