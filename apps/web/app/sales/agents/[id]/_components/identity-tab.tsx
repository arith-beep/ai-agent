"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagListEditor } from "./tag-list-editor";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/sales/agents/${agentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identity: value }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-5">
      {error && <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Agent name</label>
          <input className="input" value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Company</label>
          <input className="input" value={value.companyName} onChange={(e) => setValue({ ...value, companyName: e.target.value })} />
        </div>
        <div>
          <label className="label">Role</label>
          <input className="input" value={value.role} onChange={(e) => setValue({ ...value, role: e.target.value })} />
        </div>
        <div>
          <label className="label">Language</label>
          <input className="input" value={value.language} onChange={(e) => setValue({ ...value, language: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={2} value={value.description} onChange={(e) => setValue({ ...value, description: e.target.value })} />
      </div>
      <div>
        <label className="label">Tone</label>
        <select className="input" value={value.tone} onChange={(e) => setValue({ ...value, tone: e.target.value })}>
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Personality traits</label>
        <TagListEditor
          items={value.personality}
          onChange={(personality) => setValue({ ...value, personality })}
          placeholder="e.g. warm, concise, curious"
        />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save Identity"}
        </button>
        {saved && <span className="text-xs text-success">Saved.</span>}
      </div>
    </div>
  );
}
