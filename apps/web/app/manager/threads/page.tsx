import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { requireManagerAccess } from "@/lib/manager-access";
import { managerRepo } from "@ai-agent/storage";
import { ThreadStatusBadge } from "../_components/badges";
import { createOpenThreadAction, setThreadStatusAction } from "@/lib/actions/manager-actions";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "—";
}

export default async function ThreadsPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const ctx = await requireManagerAccess();
  const { status, error } = await searchParams;
  const activeStatus = (status as "open" | "done" | "dropped" | undefined) ?? "open";

  const [threads, reps] = await Promise.all([managerRepo.listOpenThreads(ctx.orgId, { status: activeStatus }), managerRepo.listReps(ctx.orgId)]);
  const repById = new Map(reps.map((r) => [r.id, r]));

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Open Threads</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Commitments and follow-ups that don't get to quietly disappear under floor noise.</p>
      </div>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="mb-4 flex gap-1.5">
        {(["open", "done", "dropped"] as const).map((s) => (
          <Link
            key={s}
            href={`/manager/threads?status=${s}`}
            className={`rounded-pnl px-3 py-1.5 text-[12.5px] transition-colors ${activeStatus === s ? "bg-brand-soft font-medium text-brand" : "text-fg-muted hover:bg-sunken"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {threads.length === 0 ? (
            <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-pnl-lg bg-brand-soft text-brand">
                <ListChecks size={20} />
              </div>
              <div className="text-[14.5px] font-medium text-fg">Nothing here</div>
              <p className="max-w-sm text-[13.5px] text-fg-muted">No threads with this status right now.</p>
            </div>
          ) : (
            <div className="surface divide-y divide-hairline-soft">
              {threads.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="text-[13.5px] text-fg">{t.description}</div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-fg-faint">
                      {t.repId && repById.get(t.repId) && <span>{repById.get(t.repId)?.name}</span>}
                      <span className="capitalize">{t.category.replace("_", " ")}</span>
                      {t.dueAt && <span>Due {fmtDate(t.dueAt)}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ThreadStatusBadge status={t.status} />
                    {t.status === "open" && (
                      <form action={setThreadStatusAction} className="flex gap-1.5">
                        <input type="hidden" name="threadId" value={t.id} />
                        {t.repId && <input type="hidden" name="repId" value={t.repId} />}
                        <button type="submit" name="status" value="done" className="btn-subtle !py-1 text-[11px]">
                          Done
                        </button>
                        <button type="submit" name="status" value="dropped" className="btn-subtle !py-1 text-[11px]">
                          Drop
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface h-fit p-5">
          <div className="mb-4 flex items-center gap-2 text-fg">
            <Plus size={16} />
            <h2 className="text-[13.5px] font-semibold">New thread</h2>
          </div>
          <form action={createOpenThreadAction} className="space-y-3">
            <div>
              <label className="field-label">Description</label>
              <textarea className="field min-h-[60px]" name="description" required placeholder="e.g. Fix the lead batch issue by 10am" />
            </div>
            <div>
              <label className="field-label">Rep (optional)</label>
              <select className="field" name="repId" defaultValue="">
                <option value="">Not rep-specific</option>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="field" name="category" defaultValue="commitment">
                <option value="commitment">Commitment</option>
                <option value="follow_up">Follow-up</option>
                <option value="operational">Operational</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="field-label">Due (optional)</label>
              <input className="field" type="date" name="dueAt" />
            </div>
            <button type="submit" className="btn-brand w-full gap-1.5">
              <Plus size={14} />
              Add thread
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
