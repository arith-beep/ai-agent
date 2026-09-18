"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagListEditor } from "./tag-list-editor";
import { SaveStatusIndicator } from "./save-status";
import { useAutosave } from "../_hooks/use-autosave";

export interface IdentityValue {
  name: string;
  companyName: string;
  role: string;
  description: string;
  language: string;
  tone: string;
  personality: string[];
}

const TONES = ["professional", "friendly", "consultative", "direct", "enthusiastic"];

export function IdentityTab({ agentId, initial }: { agentId: string; initial: IdentityValue }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const status = useAutosave(value, async (v) => {
    const res = await fetch(`/api/sales/agents/${agentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identity: v }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to save.");
    }
    setError(null);
    router.refresh();
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[17px] font-semibold text-fg">Identity</h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">Who your agent is, and how it sounds.</p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Agent name</label>
            <input className="field" value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Company</label>
            <input className="field" value={value.companyName} onChange={(e) => setValue({ ...value, companyName: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Role</label>
            <input className="field" value={value.role} onChange={(e) => setValue({ ...value, role: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Language</label>
            <input className="field" value={value.language} onChange={(e) => setValue({ ...value, language: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="field-label">Description</label>
          <textarea className="field min-h-[72px]" value={value.description} onChange={(e) => setValue({ ...value, description: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue({ ...value, tone: t })}
                className={`chip border px-3 py-1.5 capitalize transition-colors duration-150 ${
                  value.tone === t ? "border-brand bg-brand-soft text-brand" : "border-hairline text-fg-muted hover:border-fg-faint"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Personality traits</label>
          <TagListEditor items={value.personality} onChange={(personality) => setValue({ ...value, personality })} placeholder="e.g. warm, concise, curious" />
        </div>
      </div>
    </div>
  );
}
