"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AgentOption {
  id: string;
  name: string;
}
interface TaskOption {
  id: string;
  title: string;
}

export function CreateTaskForm({ agents, tasks, currentUserId }: { agents: AgentOption[]; tasks: TaskOption[]; currentUserId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerType, setOwnerType] = useState<"human" | "agent">("human");
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [priority, setPriority] = useState("normal");
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggleDependency(id: string) {
    setDependsOn((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        ownerType,
        ownerId: ownerType === "human" ? currentUserId : ownerId,
        priority,
        dependsOnTaskIds: dependsOn,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setDescription("");
      setDependsOn([]);
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Create task
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Owner</label>
          <select
            className="input"
            value={ownerType === "human" ? "me" : ownerId}
            onChange={(e) => {
              if (e.target.value === "me") {
                setOwnerType("human");
                setOwnerId(currentUserId);
              } else {
                setOwnerType("agent");
                setOwnerId(e.target.value);
              }
            }}
          >
            <option value="me">Me</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      {tasks.length > 0 && (
        <div>
          <label className="label">Depends on (must be done first)</label>
          <div className="flex flex-wrap gap-2">
            {tasks.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-xs text-ink">
                <input type="checkbox" checked={dependsOn.includes(t.id)} onChange={() => toggleDependency(t.id)} />
                {t.title}
              </label>
            ))}
          </div>
        </div>
      )}
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
