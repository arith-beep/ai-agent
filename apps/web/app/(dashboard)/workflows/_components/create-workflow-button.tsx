"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateWorkflowButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    const name = prompt("Workflow name");
    if (!name) return;
    setBusy(true);
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/workflows/${data.workflow.id}`);
    }
  }

  return (
    <button className="btn-primary" onClick={create} disabled={busy}>
      + New workflow
    </button>
  );
}
