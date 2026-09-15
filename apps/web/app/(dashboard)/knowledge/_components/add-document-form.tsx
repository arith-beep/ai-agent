"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddDocumentForm({ knowledgeBaseId }: { knowledgeBaseId: string }) {
  const router = useRouter();
  const [sourceUri, setSourceUri] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceUri }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Failed to add document. Make sure it's a valid, reachable URL.");
      return;
    }
    setSourceUri("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <div className="flex-1">
        <label className="label">Document URL</label>
        <input
          className="input"
          type="url"
          value={sourceUri}
          onChange={(e) => setSourceUri(e.target.value)}
          required
          placeholder="https://example.com/handbook.pdf"
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Adding..." : "Ingest"}
      </button>
    </form>
  );
}
