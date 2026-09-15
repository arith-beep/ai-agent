"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApprovalInlineAction({ approvalId, actionType }: { approvalId: string; actionType: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  async function resolve(decision: "approved" | "rejected") {
    setBusy(true);
    const res = await fetch(`/api/approvals/${approvalId}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, note: note || undefined }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(decision);
      router.refresh();
    }
  }

  if (done) {
    return <p className="text-sm text-ink-muted">Marked as {done}.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-ink-muted">Action: {actionType}</div>
      <input className="input" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy} onClick={() => resolve("approved")}>
          Approve
        </button>
        <button className="btn-ghost text-danger" disabled={busy} onClick={() => resolve("rejected")}>
          Reject
        </button>
      </div>
    </div>
  );
}
