"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagListEditor } from "./tag-list-editor";

export interface QualificationCriterion {
  name: string;
  description?: string;
}
export interface ObjectionEntry {
  objection: string;
  response: string;
}
export interface PlaybookValue {
  primaryObjective: string;
  targetCustomer: string;
  salesProcess: string;
  qualificationCriteria: QualificationCriterion[];
  qualificationQuestions: string[];
  discoveryQuestions: string[];
  valueProposition: string;
  productPositioning: string;
  objectionHandling: ObjectionEntry[];
  cta: string;
  closingBehavior: string;
  followUpBehavior: string;
}

function CriteriaEditor({ items, onChange }: { items: QualificationCriterion[]; onChange: (v: QualificationCriterion[]) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start justify-between rounded-md border border-border-subtle px-3 py-2 text-sm">
              <div>
                <div className="font-medium text-ink">{item.name}</div>
                {item.description && <div className="text-xs text-ink-faint">{item.description}</div>}
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
          <input className="input" placeholder="Criterion name (e.g. Budget)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex-[2]">
          <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => {
            if (!name.trim()) return;
            onChange([...items, { name: name.trim(), description: description.trim() || undefined }]);
            setName("");
            setDescription("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ObjectionsEditor({ items, onChange }: { items: ObjectionEntry[]; onChange: (v: ObjectionEntry[]) => void }) {
  const [objection, setObjection] = useState("");
  const [response, setResponse] = useState("");

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="rounded-md border border-border-subtle px-3 py-2 text-sm">
              <div className="flex items-start justify-between">
                <div className="font-medium text-ink">"{item.objection}"</div>
                <button type="button" className="btn-ghost text-danger" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                  Remove
                </button>
              </div>
              <div className="mt-1 text-xs text-ink-muted">{item.response}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <input className="input" placeholder="Objection the lead might raise" value={objection} onChange={(e) => setObjection(e.target.value)} />
        <textarea className="input" rows={2} placeholder="How the agent should respond" value={response} onChange={(e) => setResponse(e.target.value)} />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (!objection.trim() || !response.trim()) return;
            onChange([...items, { objection: objection.trim(), response: response.trim() }]);
            setObjection("");
            setResponse("");
          }}
        >
          Add objection
        </button>
      </div>
    </div>
  );
}

export function PlaybookTab({ agentId, initial }: { agentId: string; initial: PlaybookValue }) {
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
      body: JSON.stringify({ playbook: value }),
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
        <h2 className="text-sm font-medium text-ink">Objective &amp; process</h2>
        <div>
          <label className="label">Primary objective</label>
          <textarea className="input" rows={2} value={value.primaryObjective} onChange={(e) => setValue({ ...value, primaryObjective: e.target.value })} />
        </div>
        <div>
          <label className="label">Target customer / ICP</label>
          <textarea className="input" rows={2} value={value.targetCustomer} onChange={(e) => setValue({ ...value, targetCustomer: e.target.value })} />
        </div>
        <div>
          <label className="label">Sales process</label>
          <textarea className="input" rows={3} value={value.salesProcess} onChange={(e) => setValue({ ...value, salesProcess: e.target.value })} />
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Qualification</h2>
        <label className="label">Criteria</label>
        <CriteriaEditor items={value.qualificationCriteria} onChange={(qualificationCriteria) => setValue({ ...value, qualificationCriteria })} />
        <label className="label mt-3">Qualification questions</label>
        <TagListEditor
          items={value.qualificationQuestions}
          onChange={(qualificationQuestions) => setValue({ ...value, qualificationQuestions })}
          placeholder="e.g. What's your timeline for making a decision?"
        />
        <label className="label mt-3">Discovery questions</label>
        <TagListEditor
          items={value.discoveryQuestions}
          onChange={(discoveryQuestions) => setValue({ ...value, discoveryQuestions })}
          placeholder="e.g. What's driving you to look into this now?"
        />
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Positioning</h2>
        <div>
          <label className="label">Value proposition</label>
          <textarea className="input" rows={2} value={value.valueProposition} onChange={(e) => setValue({ ...value, valueProposition: e.target.value })} />
        </div>
        <div>
          <label className="label">Product positioning</label>
          <textarea className="input" rows={2} value={value.productPositioning} onChange={(e) => setValue({ ...value, productPositioning: e.target.value })} />
        </div>
        <label className="label">Objection handling</label>
        <ObjectionsEditor items={value.objectionHandling} onChange={(objectionHandling) => setValue({ ...value, objectionHandling })} />
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Moving forward</h2>
        <div>
          <label className="label">Call to action</label>
          <input className="input" value={value.cta} onChange={(e) => setValue({ ...value, cta: e.target.value })} />
        </div>
        <div>
          <label className="label">Closing behavior</label>
          <textarea className="input" rows={2} value={value.closingBehavior} onChange={(e) => setValue({ ...value, closingBehavior: e.target.value })} />
        </div>
        <div>
          <label className="label">Follow-up behavior</label>
          <textarea className="input" rows={2} value={value.followUpBehavior} onChange={(e) => setValue({ ...value, followUpBehavior: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save Playbook"}
        </button>
        {saved && <span className="text-xs text-success">Saved.</span>}
      </div>
    </div>
  );
}
