import { Target, Plus } from "lucide-react";
import { requireManagerAccess } from "@/lib/manager-access";
import { managerRepo } from "@ai-agent/storage";
import { createTeamFocusAreaAction, updateFocusAreaAdoptionAction } from "@/lib/actions/manager-actions";

function fmtDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

function mondayOfThisWeek(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function FocusAreasPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ctx = await requireManagerAccess();
  const { error } = await searchParams;
  const focusAreas = await managerRepo.listTeamFocusAreas(ctx.orgId);

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Weekly Focus</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">One thing per week, reinforced through huddles and coaching — not five things nobody remembers by Wednesday.</p>
      </div>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {focusAreas.length === 0 ? (
            <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-pnl-lg bg-brand-soft text-brand">
                <Target size={20} />
              </div>
              <div className="text-[14.5px] font-medium text-fg">No focus areas set yet</div>
            </div>
          ) : (
            focusAreas.map((f, i) => (
              <div key={f.id} className="surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-medium text-fg-faint">Week of {fmtDate(f.weekOf)}</span>
                  {i === 0 && <span className="chip bg-brand-soft text-brand">Current</span>}
                </div>
                <div className="mt-1.5 text-[14.5px] font-medium text-fg">{f.theme}</div>
                {f.rationale && <p className="mt-1 text-[13px] text-fg-muted">{f.rationale}</p>}
                {f.adoptionNotes && (
                  <div className="mt-2.5 rounded-pnl bg-sunken px-3 py-2 text-[12.5px] text-fg-muted">
                    <span className="font-medium text-fg">Did it stick? </span>
                    {f.adoptionNotes}
                  </div>
                )}
                <form action={updateFocusAreaAdoptionAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="focusId" value={f.id} />
                  <input className="field flex-1 text-[12.5px]" name="adoptionNotes" placeholder="Did this actually show up in calls this week?" defaultValue={f.adoptionNotes ?? ""} />
                  <button type="submit" className="btn-outline shrink-0 text-[12.5px]">
                    Save note
                  </button>
                </form>
              </div>
            ))
          )}
        </div>

        <div className="surface h-fit p-5">
          <div className="mb-4 flex items-center gap-2 text-fg">
            <Plus size={16} />
            <h2 className="text-[13.5px] font-semibold">Set a focus area</h2>
          </div>
          <form action={createTeamFocusAreaAction} className="space-y-3">
            <div>
              <label className="field-label">Week of</label>
              <input className="field" type="date" name="weekOf" defaultValue={mondayOfThisWeek()} required />
            </div>
            <div>
              <label className="field-label">Theme</label>
              <input className="field" name="theme" required placeholder="Let objections breathe before responding" />
            </div>
            <div>
              <label className="field-label">Why this, why now (optional)</label>
              <textarea className="field min-h-[60px]" name="rationale" placeholder="e.g. Saw this pattern independently in 3 reps this week" />
            </div>
            <button type="submit" className="btn-brand w-full gap-1.5">
              <Plus size={14} />
              Set focus area
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
