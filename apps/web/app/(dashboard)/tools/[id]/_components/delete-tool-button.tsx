"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteToolButton({ toolId }: { toolId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this custom tool? Agents and workflows using it will start failing until you update them.")) return;
    setBusy(true);
    const res = await fetch(`/api/tools/${toolId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/tools");
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn-ghost text-danger" onClick={remove} disabled={busy}>
      {busy ? "Deleting..." : "Delete tool"}
    </button>
  );
}
