"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagListEditor } from "./tag-list-editor";

export interface RequiredInfoEntry {
  action: string;
  requiredFields: string[];
}
export interface GuardrailsValue {
  allowedTopics: string[];
  disallowedTopics: string[];
  escalationTriggers: string[];
  prohibitedClaims: string[];
  requiredInfoBeforeActions: RequiredInfoEntry[];
  maxAutonomy: "suggest_only" | "act_with_confirmation" | "full_autonomy";
}

const AUTONOMY_OPTIONS: { value: GuardrailsValue["maxAutonomy"]; label: string; description: string }[] = [
  { value: "suggest_only", label: "Suggest only", description: "Never takes an action without the lead explicitly agreeing in the same turn." },
  { value: "act_with_confirmation", label: "Act with confirmation", description: "Confirms in plain language before booking a meeting or similar." },
  { value: "full_autonomy", label: "Full autonomy", description: "Takes actions as soon as it has the information it needs." },
];

function RequiredInfoEditor({ items, onChange }: { items: RequiredInfoEntry[]; onChange: (v: RequiredInfoEntry[]) => void }) {
  const [action, setAction] = useState("");
  const [fields, setFields] = useState("");

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start justify-between rounded-md border border-border-subtle px-3 py-2 text-sm">
              <div>
                <div className="font-medium text-ink">Before: {item.action}</div>
                <div className="text-xs text-ink-faint">Requires: {item.requiredFields.join(", ")}</div>
              </div>
              <button type="button" className="btn-ghost text-danger" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <input className="input" placeholder="Action (e.g. book a meeting)" value={action} onChange={(e) => setAction(e.target.value)} />
        </div>
        <div className="flex-1">
          <input className="input" placeholder="Required fields, comma-separated" value={fields} onChange={(e) => setFields(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => {
            const requiredFields = fields.split(",").map((f) => f.trim()).filter(Boolean);
            if (!action.trim() || requiredFields.length === 0) return;
            onChange([...items, { action: action.trim(), requiredFields }]);
            setAction("");
            setFields("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function GuardrailsTab({ agentId, initial }: { agentId: string; initial: GuardrailsValue }) {
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
      body: JSON.stringify({ guardrails: value }),
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
    <div className="space-y-4">
      {error && <div className="card border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Topics</h2>
        <div>
          <label className="label">Can discuss</label>
          <TagListEditor items={value.allowedTopics} onChange={(allowedTopics) => setValue({ ...value, allowedTopics })} placeholder="e.g. pricing tiers, integrations" />
        </div>
        <div>
          <label className="label">Cannot discuss</label>
          <TagListEditor items={value.disallowedTopics} onChange={(disallowedTopics) => setValue({ ...value, disallowedTopics })} placeholder="e.g. competitor comparisons" />
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Escalation &amp; claims</h2>
        <div>
          <label className="label">Escalate to a human when...</label>
          <TagListEditor
            items={value.escalationTriggers}
            onChange={(escalationTriggers) => setValue({ ...value, escalationTriggers })}
            placeholder="e.g. the lead is frustrated"
          />
        </div>
        <div>
          <label className="label">Claims it must never make</label>
          <TagListEditor
            items={value.prohibitedClaims}
            onChange={(prohibitedClaims) => setValue({ ...value, prohibitedClaims })}
            placeholder="e.g. guaranteed ROI figures"
          />
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Required information before actions</h2>
        <RequiredInfoEditor items={value.requiredInfoBeforeActions} onChange={(requiredInfoBeforeActions) => setValue({ ...value, requiredInfoBeforeActions })} />
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Maximum autonomy</h2>
        <div className="space-y-2">
          {AUTONOMY_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-3 rounded-md border border-border-subtle px-3 py-2 text-sm">
              <input type="radio" className="mt-1" checked={value.maxAutonomy === opt.value} onChange={() => setValue({ ...value, maxAutonomy: opt.value })} />
              <div>
                <div className="font-medium text-ink">{opt.label}</div>
                <div className="text-xs text-ink-faint">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save Guardrails"}
        </button>
        {saved && <span className="text-xs text-success">Saved.</span>}
      </div>
    </div>
  );
}
