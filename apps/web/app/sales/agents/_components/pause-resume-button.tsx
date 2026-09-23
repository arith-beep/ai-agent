"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";

export function PauseResumeButton({ agentId, status }: { agentId: string; status: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  if (status !== "active" && status !== "paused") return null;
  const nextStatus = status === "active" ? "paused" : "active";

  async function toggle() {
    setSubmitting(true);
    await fetch(`/api/sales/agents/${agentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={submitting}
      className="btn-outline gap-1.5 !py-1.5 px-2.5 text-[12.5px]"
      title={status === "active" ? "Pause agent" : "Resume agent"}
    >
      {status === "active" ? <Pause size={13} /> : <Play size={13} />}
    </button>
  );
}
