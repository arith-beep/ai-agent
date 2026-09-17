"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ShieldCheck } from "lucide-react";
import { TagListEditor } from "./tag-list-editor";
import { SaveStatusIndicator } from "./save-status";
import { useAutosave } from "../_hooks/use-autosave";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface p-5">
      <h3 className="text-[13.5px] font-semibold text-fg">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function RequiredInfoEditor({ items, onChange }: { items: RequiredInfoEntry[]; onChange: (v: RequiredInfoEntry[]) => void }) {
  const [action, setAction] = useState("");
  const [fields, setFields] = useState("");
  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-3 rounded-pnl border border-hairline bg-panel px-3.5 py-2.5">
              <div>
                <div className="text-[13px] font-medium text-fg">Before: {item.action}</div>
                <div className="text-[12px] text-fg-faint">Requires: {item.requiredFields.join(", ")}</div>
              </div>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="shrink-0 rounded-pnl p-1 text-fg-faint hover:bg-critical-soft hover:text-critical">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="field" placeholder="Action (e.g. book a meeting)" value={action} onChange={(e) => setAction(e.target.value)} />
        <input className="field" placeholder="Required fields, comma-separated" value={fields} onChange={(e) => setFields(e.target.value)} />
        <button
          type="button"
          className="btn-outline shrink-0 px-3"
          onClick={() => {
            const requiredFields = fields.split(",").map((f) => f.trim()).filter(Boolean);
            if (!action.trim() || requiredFields.length === 0) return;
            onChange([...items, { action: action.trim(), requiredFields }]);
            setAction("");
            setFields("");
          }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export function GuardrailsTab({ agentId, initial }: { agentId: string; initial: GuardrailsValue }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const status = useAutosave(value, async (v) => {
    const res = await fetch(`/api/sales/agents/${agentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guardrails: v }),
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
          <h2 className="font-display text-[17px] font-semibold text-fg">Guardrails</h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">Boundaries your agent will never cross, and when it should escalate.</p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="space-y-5">
        <Section title="Topics">
          <div>
            <label className="field-label">Can discuss</label>
            <TagListEditor items={value.allowedTopics} onChange={(allowedTopics) => setValue({ ...value, allowedTopics })} placeholder="e.g. pricing tiers, integrations" />
          </div>
          <div>
            <label className="field-label">Cannot discuss</label>
            <TagListEditor items={value.disallowedTopics} onChange={(disallowedTopics) => setValue({ ...value, disallowedTopics })} placeholder="e.g. competitor comparisons" />
          </div>
        </Section>

        <Section title="Escalation & claims">
          <div>
            <label className="field-label">Escalate to a human when...</label>
            <TagListEditor items={value.escalationTriggers} onChange={(escalationTriggers) => setValue({ ...value, escalationTriggers })} placeholder="e.g. the lead is frustrated" />
          </div>
          <div>
            <label className="field-label">Claims it must never make</label>
            <TagListEditor items={value.prohibitedClaims} onChange={(prohibitedClaims) => setValue({ ...value, prohibitedClaims })} placeholder="e.g. guaranteed ROI figures" />
          </div>
        </Section>

        <Section title="Required information before actions">
          <RequiredInfoEditor items={value.requiredInfoBeforeActions} onChange={(requiredInfoBeforeActions) => setValue({ ...value, requiredInfoBeforeActions })} />
        </Section>

        <Section title="Maximum autonomy">
          <div className="space-y-2">
            {AUTONOMY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-pnl border px-3.5 py-3 transition-colors duration-150 ${
                  value.maxAutonomy === opt.value ? "border-brand bg-brand-soft" : "border-hairline hover:border-fg-faint"
                }`}
              >
                <input type="radio" className="mt-1 accent-[rgb(var(--brand))]" checked={value.maxAutonomy === opt.value} onChange={() => setValue({ ...value, maxAutonomy: opt.value })} />
                <div>
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
                    {value.maxAutonomy === opt.value && <ShieldCheck size={13} className="text-brand" />}
                    {opt.label}
                  </div>
                  <div className="text-[12px] text-fg-faint">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
