"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Policy {
  id: string;
  name: string;
  actionPattern: string;
  requiresApproval: boolean;
  approverRole: string | null;
}

const ROLES = ["owner", "admin", "manager", "member", "viewer"] as const;

export function PoliciesPanel({ policies, canManage }: { policies: Policy[]; canManage: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [actionPattern, setActionPattern] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [approverRole, setApproverRole] = useState<(typeof ROLES)[number] | "">("manager");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, actionPattern, requiresApproval, approverRole: approverRole || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create policy.");
      return;
    }
    setName("");
    setActionPattern("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/policies/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-medium text-ink">Policies</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Org-wide rules gating what agents may do autonomously. An action pattern like <code className="text-ink">task.complete</code> or a
          wildcard like <code className="text-ink">customer.*</code> matched against an agent or workflow action requires approval from the
          given role before it runs.
        </p>
      </div>

      {policies.length > 0 && (
        <div className="divide-y divide-border-subtle rounded-md border border-border-subtle">
          {policies.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-ink">{p.name}</span>
                <span className="ml-2 font-mono text-xs text-ink-muted">{p.actionPattern}</span>
              </div>
              <div className="flex items-center gap-2">
                {p.requiresApproval ? (
                  <span className="badge bg-warning/15 text-warning">requires {p.approverRole ?? "any"} approval</span>
                ) : (
                  <span className="badge bg-success/15 text-success">autonomous</span>
                )}
                {canManage && (
                  <button className="btn-ghost text-danger" disabled={busy} onClick={() => remove(p.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage ? (
        <form onSubmit={create} className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Policy name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            className="input font-mono"
            placeholder="Action pattern, e.g. task.complete"
            value={actionPattern}
            onChange={(e) => setActionPattern(e.target.value)}
            required
          />
          <label className="col-span-2 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
            Requires human approval
          </label>
          {requiresApproval && (
            <select className="input col-span-2" value={approverRole} onChange={(e) => setApproverRole(e.target.value as typeof approverRole)}>
              <option value="">Any org member</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r} or higher
                </option>
              ))}
            </select>
          )}
          {error && <p className="col-span-2 text-xs text-danger">{error}</p>}
          <button type="submit" className="btn-primary col-span-2" disabled={busy}>
            Add policy
          </button>
        </form>
      ) : (
        <p className="text-xs text-ink-faint">Only admins and owners can manage policies.</p>
      )}
    </div>
  );
}
