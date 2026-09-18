"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";

export function NotesEditor({ leadId, initialNotes }: { leadId: string; initialNotes: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/sales/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save notes.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      {error && (
        <div className="mb-2.5 flex items-center gap-1.5 rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2 text-[12.5px] text-critical">
          <AlertCircle size={13} strokeWidth={2} />
          {error}
        </div>
      )}
      <textarea
        className="field"
        rows={4}
        placeholder="Internal notes about this lead..."
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
      />
      <div className="mt-2.5 flex items-center gap-3">
        <button type="button" className="btn-outline !py-1.5 text-[12.5px]" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save notes"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[12px] text-positive">
            <Check size={13} strokeWidth={2.5} />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
