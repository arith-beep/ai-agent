import Link from "next/link";
import { ShieldAlert, Plus } from "lucide-react";
import { requireManagerAccess } from "@/lib/manager-access";
import { managerRepo } from "@ai-agent/storage";
import { ComplianceStatusBadge, ComplianceSeverityBadge } from "../_components/badges";
import { createComplianceCaseAction, setComplianceCaseStatusAction, resolveComplianceCaseAction } from "@/lib/actions/manager-actions";

function fmtDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function CompliancePage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const ctx = await requireManagerAccess();
  const { status, error } = await searchParams;
  const activeStatus = status as "open" | "under_review" | "resolved" | "escalated" | undefined;

  const [cases, reps] = await Promise.all([
    managerRepo.listComplianceCases(ctx.orgId, activeStatus ? { status: activeStatus } : {}),
    managerRepo.listReps(ctx.orgId),
  ]);
  const repById = new Map(reps.map((r) => [r.id, r]));

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Compliance</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">
          The AI Manager can flag a case for you. Only you can resolve one — resolution always requires notes and is attributed to you.
        </p>
      </div>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/manager/compliance" className={`rounded-pnl px-3 py-1.5 text-[12.5px] ${!activeStatus ? "bg-brand-soft font-medium text-brand" : "text-fg-muted hover:bg-sunken"}`}>
          All
        </Link>
        {(["open", "under_review", "resolved", "escalated"] as const).map((s) => (
          <Link
            key={s}
            href={`/manager/compliance?status=${s}`}
            className={`rounded-pnl px-3 py-1.5 text-[12.5px] capitalize ${activeStatus === s ? "bg-brand-soft font-medium text-brand" : "text-fg-muted hover:bg-sunken"}`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {cases.length === 0 ? (
            <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-pnl-lg bg-brand-soft text-brand">
                <ShieldAlert size={20} />
              </div>
              <div className="text-[14.5px] font-medium text-fg">No cases here</div>
            </div>
          ) : (
            cases.map((c) => (
              <div key={c.id} className="surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-fg">{repById.get(c.repId)?.name ?? "Unknown rep"}</span>
                    <ComplianceSeverityBadge severity={c.severity} />
                    <span className="text-[11.5px] text-fg-faint capitalize">{c.source.replace("_", " ")}</span>
                  </div>
                  <ComplianceStatusBadge status={c.status} />
                </div>
                <p className="mt-2 text-[13px] text-fg">{c.description}</p>
                <p className="mt-1 text-[11.5px] text-fg-faint">Flagged {fmtDate(c.flaggedAt)}</p>

                {c.status === "resolved" && c.resolutionNotes && (
                  <div className="mt-2.5 rounded-pnl bg-positive-soft px-3 py-2 text-[12.5px] text-fg">
                    <span className="font-medium text-positive">Resolved:</span> {c.resolutionNotes}
                  </div>
                )}

                {(c.status === "open" || c.status === "under_review") && (
                  <div className="mt-3 space-y-2 border-t border-hairline-soft pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {c.status === "open" && (
                        <form action={setComplianceCaseStatusAction}>
                          <input type="hidden" name="caseId" value={c.id} />
                          <input type="hidden" name="repId" value={c.repId} />
                          <button type="submit" name="status" value="under_review" className="btn-subtle !py-1 text-[11.5px]">
                            Start review
                          </button>
                        </form>
                      )}
                      <form action={setComplianceCaseStatusAction}>
                        <input type="hidden" name="caseId" value={c.id} />
                        <input type="hidden" name="repId" value={c.repId} />
                        <button type="submit" name="status" value="escalated" className="btn-subtle !py-1 text-[11.5px] text-critical">
                          Escalate
                        </button>
                      </form>
                    </div>
                    <form action={resolveComplianceCaseAction} className="flex flex-col gap-2 sm:flex-row">
                      <input type="hidden" name="caseId" value={c.id} />
                      <input type="hidden" name="repId" value={c.repId} />
                      <input className="field flex-1 text-[12.5px]" name="resolutionNotes" placeholder="Resolution notes (required to close)" required />
                      <button type="submit" className="btn-brand shrink-0 text-[12.5px]">
                        Resolve
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="surface h-fit p-5">
          <div className="mb-4 flex items-center gap-2 text-fg">
            <Plus size={16} />
            <h2 className="text-[13.5px] font-semibold">Flag a case</h2>
          </div>
          <form action={createComplianceCaseAction} className="space-y-3">
            <div>
              <label className="field-label">Rep</label>
              <select className="field" name="repId" required defaultValue="">
                <option value="" disabled>
                  Select a rep
                </option>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Source</label>
              <select className="field" name="source" defaultValue="manual">
                <option value="manual">Manual review</option>
                <option value="qa_review">QA review</option>
                <option value="complaint">Customer complaint</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="field-label">Severity</label>
              <select className="field" name="severity" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea className="field min-h-[70px]" name="description" required placeholder="What was flagged, and why" />
            </div>
            <button type="submit" className="btn-brand w-full gap-1.5">
              <Plus size={14} />
              Flag for review
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
