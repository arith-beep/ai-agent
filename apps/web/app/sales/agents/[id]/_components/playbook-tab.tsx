"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { TagListEditor } from "./tag-list-editor";
import { SaveStatusIndicator } from "./save-status";
import { useAutosave } from "../_hooks/use-autosave";

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

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="surface p-5">
      <h3 className="text-[13.5px] font-semibold text-fg">{title}</h3>
      {hint && <p className="mt-0.5 text-[12.5px] text-fg-faint">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function CriteriaEditor({ items, onChange }: { items: QualificationCriterion[]; onChange: (v: QualificationCriterion[]) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-3 rounded-pnl border border-hairline bg-panel px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-fg">{item.name}</div>
                {item.description && <div className="text-[12px] text-fg-faint">{item.description}</div>}
              </div>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="shrink-0 rounded-pnl p-1 text-fg-faint hover:bg-critical-soft hover:text-critical">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input className="field sm:flex-1" placeholder="Criterion name (e.g. Budget)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field sm:flex-[2]" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button
          type="button"
          className="btn-outline shrink-0 px-3"
          onClick={() => {
            if (!name.trim()) return;
            onChange([...items, { name: name.trim(), description: description.trim() || undefined }]);
            setName("");
            setDescription("");
          }}
        >
          <Plus size={14} />
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
        <ul className="mb-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="rounded-pnl border border-hairline bg-panel px-3.5 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[13px] font-medium text-fg">&ldquo;{item.objection}&rdquo;</div>
                <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="shrink-0 rounded-pnl p-1 text-fg-faint hover:bg-critical-soft hover:text-critical">
                  <X size={13} />
                </button>
              </div>
              <div className="mt-1 text-[12.5px] text-fg-muted">{item.response}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <input className="field" placeholder="Objection the lead might raise" value={objection} onChange={(e) => setObjection(e.target.value)} />
        <textarea className="field min-h-[64px]" placeholder="How the agent should respond" value={response} onChange={(e) => setResponse(e.target.value)} />
        <button
          type="button"
          className="btn-outline"
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
  const [error, setError] = useState<string | null>(null);

  const status = useAutosave(value, async (v) => {
    const res = await fetch(`/api/sales/agents/${agentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playbook: v }),
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
          <h2 className="font-display text-[17px] font-semibold text-fg">Sales Playbook</h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">How your agent qualifies, positions, and moves a conversation forward.</p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="space-y-5">
        <Section title="Objective & process">
          <div>
            <label className="field-label">Primary objective</label>
            <textarea className="field min-h-[64px]" value={value.primaryObjective} onChange={(e) => setValue({ ...value, primaryObjective: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Target customer / ICP</label>
            <textarea className="field min-h-[64px]" value={value.targetCustomer} onChange={(e) => setValue({ ...value, targetCustomer: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Sales process</label>
            <textarea className="field min-h-[80px]" value={value.salesProcess} onChange={(e) => setValue({ ...value, salesProcess: e.target.value })} />
          </div>
        </Section>

        <Section title="Qualification" hint="Gathered progressively over the conversation, not all at once.">
          <div>
            <label className="field-label">Criteria</label>
            <CriteriaEditor items={value.qualificationCriteria} onChange={(qualificationCriteria) => setValue({ ...value, qualificationCriteria })} />
          </div>
          <div>
            <label className="field-label">Qualification questions</label>
            <TagListEditor items={value.qualificationQuestions} onChange={(qualificationQuestions) => setValue({ ...value, qualificationQuestions })} placeholder="e.g. What's your timeline for making a decision?" />
          </div>
          <div>
            <label className="field-label">Discovery questions</label>
            <TagListEditor items={value.discoveryQuestions} onChange={(discoveryQuestions) => setValue({ ...value, discoveryQuestions })} placeholder="e.g. What's driving you to look into this now?" />
          </div>
        </Section>

        <Section title="Positioning">
          <div>
            <label className="field-label">Value proposition</label>
            <textarea className="field min-h-[64px]" value={value.valueProposition} onChange={(e) => setValue({ ...value, valueProposition: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Product positioning</label>
            <textarea className="field min-h-[64px]" value={value.productPositioning} onChange={(e) => setValue({ ...value, productPositioning: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Objection handling</label>
            <ObjectionsEditor items={value.objectionHandling} onChange={(objectionHandling) => setValue({ ...value, objectionHandling })} />
          </div>
        </Section>

        <Section title="Moving forward">
          <div>
            <label className="field-label">Call to action</label>
            <input className="field" value={value.cta} onChange={(e) => setValue({ ...value, cta: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Closing behavior</label>
            <textarea className="field min-h-[64px]" value={value.closingBehavior} onChange={(e) => setValue({ ...value, closingBehavior: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Follow-up behavior</label>
            <textarea className="field min-h-[64px]" value={value.followUpBehavior} onChange={(e) => setValue({ ...value, followUpBehavior: e.target.value })} />
          </div>
        </Section>
      </div>
    </div>
  );
}
