"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OtherAgent {
  id: string;
  name: string;
}
interface Connection {
  connectedAgent: { id: string; name: string };
  relationshipType: string;
}

export function AgentConnections({ agentId, connections, otherAgents }: { agentId: string; connections: Connection[]; otherAgents: OtherAgent[] }) {
  const router = useRouter();
  const [targetId, setTargetId] = useState(otherAgents[0]?.id ?? "");
  const [relationship, setRelationship] = useState("peer");
  const [busy, setBusy] = useState(false);

  async function connect() {
    if (!targetId) return;
    setBusy(true);
    await fetch(`/api/agents/${agentId}/connections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connectedAgentId: targetId, relationshipType: relationship }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {connections.length === 0 ? (
        <p className="text-xs text-ink-faint">Not connected to any other agents yet. Connected agents can message each other.</p>
      ) : (
        <ul className="space-y-1.5">
          {connections.map((c) => (
            <li key={c.connectedAgent.id} className="flex items-center justify-between rounded-md border border-border-subtle px-3 py-2 text-sm">
              <span className="text-ink">{c.connectedAgent.name}</span>
              <span className="badge bg-surface-raised text-ink-muted">{c.relationshipType}</span>
            </li>
          ))}
        </ul>
      )}

      {otherAgents.length > 0 && (
        <div className="flex items-end gap-2 pt-2">
          <div className="flex-1">
            <label className="label">Connect to</label>
            <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {otherAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Relationship</label>
            <select className="input" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              <option value="peer">Peer</option>
              <option value="reports_to">Reports to</option>
              <option value="manages">Manages</option>
              <option value="delegates_to">Delegates to</option>
            </select>
          </div>
          <button className="btn-secondary" disabled={busy} onClick={connect}>
            Connect
          </button>
        </div>
      )}
    </div>
  );
}
