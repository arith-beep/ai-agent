import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { requireManagerAccess } from "@/lib/manager-access";
import { managerRepo } from "@ai-agent/storage";
import { RepStatusBadge, SeedDataBadge } from "../_components/badges";
import { createRepAction } from "@/lib/actions/manager-actions";

export default async function RosterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ctx = await requireManagerAccess();
  const { error } = await searchParams;
  const reps = await managerRepo.listReps(ctx.orgId);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Team Roster</h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">Your telesales reps. Add each one so their performance and coaching history can be tracked over time.</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {reps.length === 0 ? (
            <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-pnl-lg bg-brand-soft text-brand">
                <Users size={20} />
              </div>
              <div className="text-[14.5px] font-medium text-fg">No reps on the roster yet</div>
              <p className="max-w-sm text-[13.5px] text-fg-muted">Add your first telesales rep using the form to start tracking their performance and coaching history.</p>
            </div>
          ) : (
            <div className="surface divide-y divide-hairline-soft">
              {reps.map((rep) => (
                <Link key={rep.id} href={`/manager/reps/${rep.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-sunken">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-fg">{rep.name}</span>
                      {rep.isSeed && <SeedDataBadge />}
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] text-fg-muted">{rep.team ?? "No team assigned"}{rep.email ? ` · ${rep.email}` : ""}</div>
                  </div>
                  <RepStatusBadge status={rep.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="surface h-fit p-5">
          <div className="mb-4 flex items-center gap-2 text-fg">
            <UserPlus size={16} />
            <h2 className="text-[13.5px] font-semibold">Add a rep</h2>
          </div>
          <form action={createRepAction} className="space-y-3.5">
            <div>
              <label className="field-label">Name</label>
              <input className="field" name="name" required placeholder="Priya Anand" />
            </div>
            <div>
              <label className="field-label">Email (optional)</label>
              <input className="field" name="email" type="email" placeholder="priya@company.com" />
            </div>
            <div>
              <label className="field-label">Team (optional)</label>
              <input className="field" name="team" placeholder="Team A" />
            </div>
            <button type="submit" className="btn-brand w-full gap-1.5">
              <UserPlus size={14} />
              Add rep
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
