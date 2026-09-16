"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  name: string;
}

const PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at 8am UTC", value: "0 8 * * *" },
  { label: "Every Monday at 9am UTC", value: "0 9 * * 1" },
  { label: "Custom...", value: "custom" },
];

export function CreateScheduleForm({ agents, workflows }: { agents: Option[]; workflows: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState<"agent" | "workflow">("agent");
  const [targetId, setTargetId] = useState(agents[0]?.id ?? "");
  const [mode, setMode] = useState<"cron" | "once">("cron");
  const [preset, setPreset] = useState(PRESETS[0]?.value ?? "0 * * * *");
  const [customCron, setCustomCron] = useState("0 * * * *");
  const [runOnceAt, setRunOnceAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = targetType === "agent" ? agents : workflows;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) {
      setError("Select a target first.");
      return;
    }
    setBusy(true);
    setError(null);
    const cronExpression = mode === "cron" ? (preset === "custom" ? customCron : preset) : undefined;
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        cronExpression,
        runOnceAt: mode === "once" && runOnceAt ? new Date(runOnceAt).toISOString() : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create schedule.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + New schedule
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Target type</label>
          <select
            className="input"
            value={targetType}
            onChange={(e) => {
              const t = e.target.value as "agent" | "workflow";
              setTargetType(t);
              setTargetId((t === "agent" ? agents : workflows)[0]?.id ?? "");
            }}
          >
            <option value="agent">Agent</option>
            <option value="workflow">Workflow</option>
          </select>
        </div>
        <div>
          <label className="label">Target</label>
          <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {options.length === 0 && <option value="">None available</option>}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Schedule</label>
        <div className="mb-2 flex gap-2 text-xs">
          <button type="button" className={mode === "cron" ? "btn-secondary" : "btn-ghost"} onClick={() => setMode("cron")}>
            Recurring
          </button>
          <button type="button" className={mode === "once" ? "btn-secondary" : "btn-ghost"} onClick={() => setMode("once")}>
            One-time
          </button>
        </div>
        {mode === "cron" ? (
          <div className="space-y-2">
            <select className="input" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {preset === "custom" && (
              <input
                className="input font-mono"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 * * * * (cron, UTC)"
              />
            )}
          </div>
        ) : (
          <input className="input" type="datetime-local" value={runOnceAt} onChange={(e) => setRunOnceAt(e.target.value)} required />
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy || !targetId}>
          Create
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
