import { requireCurrentContext } from "@/lib/session";
import { messagingRepo, agentsRepo } from "@ai-agent/storage";

const KIND_STYLES: Record<string, string> = {
  notification: "bg-accent/15 text-accent",
  query: "bg-warning/15 text-warning",
  response: "bg-success/15 text-success",
  event: "bg-ink-faint/15 text-ink-faint",
  task: "bg-warning/15 text-warning",
};

function summarize(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.summary === "string") return record.summary;
    if (typeof record.question === "string") return record.question;
    if (typeof record.title === "string") return record.title;
  }
  return JSON.stringify(payload);
}

export default async function MessagesPage() {
  const ctx = await requireCurrentContext();
  const messages = await messagingRepo.listMessagesForRecipient("human", ctx.userId);
  const agentIds = [...new Set(messages.filter((m) => m.fromType === "agent").map((m) => m.fromId))];
  const agents = await Promise.all(agentIds.map((id) => agentsRepo.getAgentById(ctx.orgId, id)));
  const agentNameById = new Map(agents.filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Messages</h1>
        <p className="mt-1 text-sm text-ink-muted">Notifications, questions, and escalations sent to you by your agents.</p>
      </div>

      {messages.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-muted">Nothing here yet. Agents message you when they have something to report.</div>
      ) : (
        <div className="card divide-y divide-border-subtle">
          {messages.map((m) => (
            <div key={m.id} className="space-y-1.5 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{m.fromType === "agent" ? (agentNameById.get(m.fromId) ?? "Unknown agent") : "You"}</span>
                  <span className={`badge ${KIND_STYLES[m.kind] ?? "bg-surface-raised text-ink-muted"}`}>{m.kind}</span>
                  {m.priority !== "normal" && <span className="badge bg-danger/15 text-danger">{m.priority}</span>}
                </div>
                <span className="text-xs text-ink-faint">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-ink-muted">{summarize(m.payload)}</p>
              <details className="text-xs text-ink-faint">
                <summary className="cursor-pointer select-none">Full payload</summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-canvas p-2 font-mono text-[11px] text-ink-muted">
                  {JSON.stringify(m.payload, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
