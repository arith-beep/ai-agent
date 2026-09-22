import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ClipboardList, ShieldAlert, ListChecks, Plus, Sparkles } from "lucide-react";
import { requireManagerAccess } from "@/lib/manager-access";
import { managerRepo } from "@ai-agent/storage";
import type { CoachingPrep } from "@ai-agent/manager-agent";
import { RepStatusBadge, SeedDataBadge, CoachingOutcomeBadge, ThreadStatusBadge, ComplianceStatusBadge, ComplianceSeverityBadge } from "../../_components/badges";
import { CoachingPrepView } from "../../_components/coaching-prep-view";
import {
  logSnapshotAction,
  createCoachingSessionAction,
  updateCoachingOutcomeAction,
  createOpenThreadAction,
  setThreadStatusAction,
  createComplianceCaseAction,
  updateRepStatusAction,
} from "@/lib/actions/manager-actions";
import { generateCoachingPrepAction } from "@/lib/actions/manager-agent-actions";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function fmtDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function RepDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const ctx = await requireManagerAccess();

  const rep = await managerRepo.getRep(ctx.orgId, id);
  if (!rep) notFound();

  const [snapshots, coachingSessions, threads, complianceCases, agentConfig, latestCoachingPrep] = await Promise.all([
    managerRepo.listSnapshotsForRep(id, daysAgo(14)),
    managerRepo.listCoachingSessionsForRep(id),
    managerRepo.listOpenThreads(ctx.orgId, { repId: id }),
    managerRepo.listComplianceCases(ctx.orgId, { repId: id }),
    managerRepo.getManagerAgentConfig(ctx.orgId),
    managerRepo.getLatestBrief(ctx.orgId, "coaching_prep", id),
  ]);

  const maxSales = Math.max(1, ...snapshots.map((s) => s.sales));
  const today = fmtDate(new Date());

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Link href="/manager/reps" className="text-[12px] text-fg-faint hover:text-fg-muted">
          Team Roster
        </Link>
        <span className="text-fg-faint">/</span>
        <h1 className="font-display text-[18px] font-semibold tracking-tight text-fg">{rep.name}</h1>
        <RepStatusBadge status={rep.status} />
        {rep.isSeed && <SeedDataBadge />}
        <div className="ml-auto">
          <form action={updateRepStatusAction}>
            <input type="hidden" name="repId" value={rep.id} />
            <input type="hidden" name="status" value={rep.status === "active" ? "inactive" : "active"} />
            <button type="submit" className="btn-outline text-[12.5px]">
              Mark {rep.status === "active" ? "inactive" : "active"}
            </button>
          </form>
        </div>
      </div>
      <p className="mb-6 text-[13px] text-fg-muted">{rep.team ?? "No team assigned"}{rep.email ? ` · ${rep.email}` : ""}</p>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Performance trend */}
          <div className="surface p-5">
            <h2 className="mb-4 text-[13.5px] font-medium text-fg">Sales, last 14 days</h2>
            {snapshots.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-fg-faint">No performance data logged yet.</p>
            ) : (
              <div className="flex items-end gap-1" style={{ height: 100 }}>
                {snapshots.map((s) => (
                  <div key={s.id} className="group relative flex-1">
                    <div className="flex flex-col-reverse" style={{ height: 100 }}>
                      <div className="w-full rounded-t-sm bg-brand" style={{ height: `${Math.max(2, (s.sales / maxSales) * 100)}px` }} />
                    </div>
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-pnl border border-hairline bg-panel px-2 py-1 text-[11.5px] opacity-0 shadow-elevate-md group-hover:opacity-100">
                      {fmtDate(s.date)}: {s.sales} sale{s.sales === 1 ? "" : "s"}, {s.dials} dials
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log a snapshot */}
          <div className="surface p-5">
            <h2 className="mb-4 text-[13.5px] font-medium text-fg">Log daily performance</h2>
            <form action={logSnapshotAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <input type="hidden" name="repId" value={rep.id} />
              <div>
                <label className="field-label">Date</label>
                <input className="field" type="date" name="date" defaultValue={today} required />
              </div>
              <div>
                <label className="field-label">Dials</label>
                <input className="field" type="number" min={0} name="dials" defaultValue={0} />
              </div>
              <div>
                <label className="field-label">Connects</label>
                <input className="field" type="number" min={0} name="connects" defaultValue={0} />
              </div>
              <div>
                <label className="field-label">Appointments</label>
                <input className="field" type="number" min={0} name="appointments" defaultValue={0} />
              </div>
              <div>
                <label className="field-label">Sales</label>
                <input className="field" type="number" min={0} name="sales" defaultValue={0} />
              </div>
              <div>
                <label className="field-label">Talk time (min)</label>
                <input className="field" type="number" min={0} name="talkTimeMinutes" defaultValue={0} />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <button type="submit" className="btn-brand gap-1.5">
                  <Plus size={14} />
                  Log day
                </button>
              </div>
            </form>
          </div>

          {/* AI Coaching Prep — draft only; the manager still runs and logs the real session below */}
          <div className="surface p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-fg">
                <Sparkles size={16} className="text-brand" />
                <h2 className="text-[13.5px] font-medium">AI Coaching Prep</h2>
              </div>
              {agentConfig ? (
                <form action={generateCoachingPrepAction}>
                  <input type="hidden" name="repId" value={rep.id} />
                  <button type="submit" className="btn-outline gap-1.5 text-[12px]">
                    <Sparkles size={13} />
                    Prepare with AI
                  </button>
                </form>
              ) : (
                <Link href="/manager" className="text-[12px] text-brand hover:underline">
                  Set up a model first
                </Link>
              )}
            </div>
            {latestCoachingPrep ? (
              <CoachingPrepView prep={latestCoachingPrep.content as unknown as CoachingPrep} generatedAt={latestCoachingPrep.generatedAt} droppedClaimsCount={latestCoachingPrep.droppedClaimsCount} />
            ) : (
              <p className="text-[13px] text-fg-faint">No AI prep generated yet for this rep — the coaching history below is what you've actually logged.</p>
            )}
          </div>

          {/* Coaching history */}
          <div className="surface p-5">
            <div className="mb-4 flex items-center gap-2 text-fg">
              <ClipboardList size={16} />
              <h2 className="text-[13.5px] font-medium">Coaching history</h2>
            </div>
            {coachingSessions.length === 0 ? (
              <p className="mb-4 text-[13px] text-fg-faint">No coaching sessions logged yet.</p>
            ) : (
              <div className="mb-5 space-y-3">
                {coachingSessions.map((s) => (
                  <div key={s.id} className="rounded-pnl border border-hairline p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-fg-faint">{fmtDate(s.sessionDate)}{s.diagnosedCause ? ` · ${s.diagnosedCause.replace("_", " ")}` : ""}</span>
                      <CoachingOutcomeBadge outcome={s.outcome} />
                    </div>
                    <div className="mt-1.5 text-[13.5px] font-medium text-fg">{s.agreedFocus}</div>
                    {s.summary && <p className="mt-1 text-[13px] text-fg-muted">{s.summary}</p>}
                    {s.followUpDate && <p className="mt-1 text-[12px] text-fg-faint">Follow up: {fmtDate(s.followUpDate)}</p>}
                    {s.outcome === "pending" && (
                      <form action={updateCoachingOutcomeAction} className="mt-2.5 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="sessionId" value={s.id} />
                        <input type="hidden" name="repId" value={rep.id} />
                        {(["worked", "partially_worked", "not_worked"] as const).map((o) => (
                          <button key={o} type="submit" name="outcome" value={o} className="btn-subtle !py-1 text-[11.5px]">
                            Mark {o.replace("_", " ")}
                          </button>
                        ))}
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
            <form action={createCoachingSessionAction} className="space-y-3 border-t border-hairline-soft pt-4">
              <input type="hidden" name="repId" value={rep.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Diagnosed cause</label>
                  <select className="field" name="diagnosedCause" defaultValue="">
                    <option value="">Not sure yet</option>
                    <option value="effort">Effort</option>
                    <option value="leads">Lead quality</option>
                    <option value="confidence">Confidence</option>
                    <option value="skill">Skill gap</option>
                    <option value="script">Script/technique</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Follow-up date</label>
                  <input className="field" type="date" name="followUpDate" />
                </div>
              </div>
              <div>
                <label className="field-label">What we discussed</label>
                <textarea className="field min-h-[60px]" name="summary" placeholder="What the call review showed, what we listened to together..." />
              </div>
              <div>
                <label className="field-label">The one thing we agreed to focus on</label>
                <input className="field" name="agreedFocus" required placeholder="Let objections breathe before responding" />
              </div>
              <button type="submit" className="btn-brand gap-1.5">
                <Plus size={14} />
                Log coaching session
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          {/* Open threads for this rep */}
          <div className="surface p-5">
            <div className="mb-3 flex items-center gap-2 text-fg">
              <ListChecks size={16} />
              <h2 className="text-[13.5px] font-medium">Open threads</h2>
            </div>
            {threads.length === 0 ? (
              <p className="mb-3 text-[13px] text-fg-faint">Nothing open for this rep.</p>
            ) : (
              <div className="mb-3 space-y-2">
                {threads.map((t) => (
                  <div key={t.id} className="rounded-pnl border border-hairline p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12.5px] text-fg">{t.description}</span>
                      <ThreadStatusBadge status={t.status} />
                    </div>
                    {t.status === "open" && (
                      <form action={setThreadStatusAction} className="mt-2 flex gap-1.5">
                        <input type="hidden" name="threadId" value={t.id} />
                        <input type="hidden" name="repId" value={rep.id} />
                        <button type="submit" name="status" value="done" className="btn-subtle !py-1 text-[11px]">
                          Done
                        </button>
                        <button type="submit" name="status" value="dropped" className="btn-subtle !py-1 text-[11px]">
                          Drop
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
            <form action={createOpenThreadAction} className="space-y-2 border-t border-hairline-soft pt-3">
              <input type="hidden" name="repId" value={rep.id} />
              <input className="field text-[12.5px]" name="description" placeholder="e.g. Check back in 10 minutes" required />
              <button type="submit" className="btn-outline w-full text-[12px]">
                Add thread
              </button>
            </form>
          </div>

          {/* Compliance cases for this rep */}
          <div className="surface p-5">
            <div className="mb-3 flex items-center gap-2 text-fg">
              <ShieldAlert size={16} />
              <h2 className="text-[13.5px] font-medium">Compliance</h2>
            </div>
            {complianceCases.length === 0 ? (
              <p className="mb-3 text-[13px] text-fg-faint">No cases for this rep.</p>
            ) : (
              <div className="mb-3 space-y-2">
                {complianceCases.map((c) => (
                  <Link key={c.id} href="/manager/compliance" className="block rounded-pnl border border-hairline p-3 hover:bg-sunken">
                    <div className="flex items-center justify-between gap-2">
                      <ComplianceSeverityBadge severity={c.severity} />
                      <ComplianceStatusBadge status={c.status} />
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-fg">{c.description}</p>
                  </Link>
                ))}
              </div>
            )}
            <form action={createComplianceCaseAction} className="space-y-2 border-t border-hairline-soft pt-3">
              <input type="hidden" name="repId" value={rep.id} />
              <select className="field text-[12.5px]" name="severity" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <textarea className="field min-h-[50px] text-[12.5px]" name="description" placeholder="What was flagged, and why" required />
              <button type="submit" className="btn-outline w-full text-[12px]">
                Flag for review
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
