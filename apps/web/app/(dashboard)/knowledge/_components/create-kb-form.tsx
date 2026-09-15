"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateKnowledgeBaseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("url");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/knowledge-bases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined, sourceType }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/knowledge/${data.knowledgeBase.id}`);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + New knowledge base
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div>
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label">Default source type</label>
        <select className="input" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
          <option value="url">URL / web page</option>
          <option value="website">Website</option>
          <option value="txt">Text file</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="csv">CSV</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          Create
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
