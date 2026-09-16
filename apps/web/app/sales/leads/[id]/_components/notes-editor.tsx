"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      {error && <div className="mb-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</div>}
      <textarea
        className="input"
        rows={4}
        placeholder="Internal notes about this lead..."
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className="btn-secondary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save notes"}
        </button>
        {saved && <span className="text-xs text-success">Saved.</span>}
      </div>
    </div>
  );
}
