import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { LeadStatusBadge, ConversationStatusBadge } from "../../_components/status-badge";
import { NotesEditor } from "./_components/notes-editor";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="mt-0.5 text-sm text-ink">{value ? value : <span className="text-ink-faint">—</span>}</div>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const lead = await salesRepo.getLead(ctx.orgId, id);
  if (!lead) notFound();

  const [qualificationHistory, meetings, allConversations] = await Promise.all([
    salesRepo.listQualificationHistory(id),
    salesRepo.listMeetingsForLead(id),
    salesRepo.listConversations(ctx.orgId, {}),
  ]);
  const conversations = allConversations.filter((c) => c.conversation.leadId === id);

  return (
    <div>
      <div className="mb-6">
        <Link href="/sales/leads" className="text-xs text-ink-faint hover:text-ink-muted">
          ← All leads
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-xl font-semibold text-ink">{lead.name ?? lead.email ?? "Unnamed lead"}</h1>
          <LeadStatusBadge status={lead.status} />
        </div>
        {lead.statusReason && <p className="mt-1 text-sm text-ink-muted">{lead.statusReason}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-medium text-ink">Contact information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" value={lead.name} />
              <Field label="Email" value={lead.email} />
              <Field label="Phone" value={lead.phone} />
              <Field label="Company" value={lead.company} />
              <Field label="Interest" value={lead.interest} />
              <Field label="Budget" value={lead.budget} />
              <Field label="Timeline" value={lead.timeline} />
              <Field label="Source" value={lead.source} />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-medium text-ink">Agent notes</h2>
            <NotesEditor leadId={lead.id} initialNotes={lead.notes ?? ""} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-medium text-ink">Qualification history</h2>
            {qualificationHistory.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-faint">No qualification events recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {qualificationHistory.map((q) => {
                  const criteriaEntries = Object.entries(q.criteria ?? {});
                  return (
                    <div key={q.id} className="border-l-2 border-border-subtle pl-3">
                      <div className="flex items-center gap-2">
                        <LeadStatusBadge status={q.status} />
                        <span className="text-[11px] text-ink-faint">{new Date(q.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{q.reason}</p>
                      {criteriaEntries.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {criteriaEntries.map(([key, value]) => (
                            <span key={key} className="rounded border border-border-subtle px-1.5 py-0.5 text-[11px] text-ink-faint">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-medium text-ink">Conversation history</h2>
            {conversations.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-faint">No conversations linked to this lead yet.</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((row) => (
                  <Link
                    key={row.conversation.id}
                    href={`/sales/conversations/${row.conversation.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-surface-raised"
                  >
                    <div>
                      <div className="text-ink">with {row.agentName}</div>
                      <div className="text-[11px] text-ink-faint">{row.conversation.channel}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ConversationStatusBadge status={row.conversation.status} />
                      <span className="text-[11px] text-ink-faint">{new Date(row.conversation.lastMessageAt).toLocaleString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-medium text-ink">Meetings</h2>
            {meetings.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-faint">No meetings requested yet.</p>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div key={m.id} className="rounded-md border border-border-subtle p-3">
                    <div className="flex items-center justify-between">
                      <span className="badge bg-accent/15 text-accent">{m.status}</span>
                      <span className="text-[11px] text-ink-faint">{m.durationMinutes ?? 30}m</span>
                    </div>
                    <div className="mt-1.5 text-sm text-ink">
                      {m.proposedTime ? new Date(m.proposedTime).toLocaleString() : "No time proposed"}
                    </div>
                    {m.notes && <div className="mt-1 text-xs text-ink-muted">{m.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-medium text-ink">Activity timeline</h2>
            <div className="space-y-2 text-xs text-ink-faint">
              <div>Created {new Date(lead.createdAt).toLocaleString()}</div>
              <div>Last updated {new Date(lead.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
