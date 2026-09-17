import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { ArrowLeft, CalendarCheck2, History, MessageSquareText, ClipboardList } from "lucide-react";
import { LeadStatusBadge, ConversationStatusBadge } from "../../_components/status-badge";
import { NotesEditor } from "./_components/notes-editor";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-fg-faint">{label}</div>
      <div className="mt-0.5 text-[13.5px] text-fg">{value ? value : <span className="text-fg-faint">—</span>}</div>
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: typeof History; title: string; children: React.ReactNode }) {
  return (
    <div className="surface p-5">
      <h2 className="mb-4 flex items-center gap-1.5 text-[13.5px] font-medium text-fg">
        <Icon size={14} strokeWidth={1.75} className="text-fg-faint" />
        {title}
      </h2>
      {children}
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
      <div className="mb-7">
        <Link href="/sales/leads" className="inline-flex items-center gap-1 text-[12px] text-fg-faint transition-colors hover:text-fg-muted">
          <ArrowLeft size={12} strokeWidth={2} />
          All leads
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">{lead.name ?? lead.email ?? "Unnamed lead"}</h1>
          <LeadStatusBadge status={lead.status} />
        </div>
        {lead.statusReason && <p className="mt-1 text-[13.5px] text-fg-muted">{lead.statusReason}</p>}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel icon={ClipboardList} title="Contact information">
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
          </Panel>

          <div className="surface p-5">
            <h2 className="mb-3 text-[13.5px] font-medium text-fg">Agent notes</h2>
            <NotesEditor leadId={lead.id} initialNotes={lead.notes ?? ""} />
          </div>

          <Panel icon={History} title="Qualification history">
            {qualificationHistory.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-fg-faint">No qualification events recorded yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute bottom-1.5 left-[5px] top-1.5 w-px bg-hairline" />
                <div className="space-y-5">
                  {qualificationHistory.map((q) => {
                    const criteriaEntries = Object.entries(q.criteria ?? {});
                    return (
                      <div key={q.id} className="relative pl-6">
                        <span className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-panel bg-brand shadow-elevate-sm" />
                        <div className="flex flex-wrap items-center gap-2">
                          <LeadStatusBadge status={q.status} />
                          <span className="text-[11px] text-fg-faint">{new Date(q.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] text-fg-muted">{q.reason}</p>
                        {criteriaEntries.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {criteriaEntries.map(([key, value]) => (
                              <span key={key} className="rounded-pnl border border-hairline-soft bg-sunken px-1.5 py-0.5 text-[11px] text-fg-faint">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>

          <Panel icon={MessageSquareText} title="Conversation history">
            {conversations.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-fg-faint">No conversations linked to this lead yet.</p>
            ) : (
              <div className="-mx-2 space-y-0.5">
                {conversations.map((row) => (
                  <Link
                    key={row.conversation.id}
                    href={`/sales/conversations/${row.conversation.id}`}
                    className="flex items-center justify-between gap-3 rounded-pnl px-2 py-2.5 transition-colors duration-150 hover:bg-sunken"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] text-fg">with {row.agentName}</div>
                      <div className="text-[11px] text-fg-faint">{row.conversation.channel}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ConversationStatusBadge status={row.conversation.status} />
                      <span className="text-[11px] text-fg-faint">{new Date(row.conversation.lastMessageAt).toLocaleString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel icon={CalendarCheck2} title="Meetings">
            {meetings.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-fg-faint">No meetings requested yet.</p>
            ) : (
              <div className="space-y-2.5">
                {meetings.map((m) => (
                  <div key={m.id} className="surface-sunken p-3">
                    <div className="flex items-center justify-between">
                      <span className="chip bg-brand-soft text-brand">{m.status}</span>
                      <span className="text-[11px] text-fg-faint">{m.durationMinutes ?? 30}m</span>
                    </div>
                    <div className="mt-1.5 text-[13px] text-fg">{m.proposedTime ? new Date(m.proposedTime).toLocaleString() : "No time proposed"}</div>
                    {m.notes && <div className="mt-1 text-[12px] text-fg-muted">{m.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel icon={History} title="Activity timeline">
            <div className="space-y-2 text-[12px] text-fg-faint">
              <div>Created {new Date(lead.createdAt).toLocaleString()}</div>
              <div>Last updated {new Date(lead.updatedAt).toLocaleString()}</div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
