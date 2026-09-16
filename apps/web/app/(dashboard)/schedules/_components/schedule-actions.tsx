"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScheduleActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(path: string, method: string) {
    setBusy(true);
    await fetch(`/api/schedules/${id}${path}`, { method });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {status === "active" ? (
        <button className="btn-ghost" disabled={busy} onClick={() => call("/pause", "POST")}>
          Pause
        </button>
      ) : status === "paused" ? (
        <button className="btn-ghost" disabled={busy} onClick={() => call("/resume", "POST")}>
          Resume
        </button>
      ) : null}
      <button className="btn-ghost text-danger" disabled={busy} onClick={() => call("", "DELETE")}>
        Delete
      </button>
    </div>
  );
}
