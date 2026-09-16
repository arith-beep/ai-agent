import { requireCurrentContext } from "@/lib/session";
import { schedulingRepo, agentsRepo, workflowsRepo } from "@ai-agent/storage";
import { CreateScheduleForm } from "./_components/create-schedule-form";
import { ScheduleActions } from "./_components/schedule-actions";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning",
  disabled: "bg-ink-faint/15 text-ink-faint",
};

export default async function SchedulesPage() {
  const ctx = await requireCurrentContext();
  const [schedules, agents, workflows] = await Promise.all([
    schedulingRepo.listScheduledJobs(ctx.orgId),
    agentsRepo.listAgents(ctx.orgId),
    workflowsRepo.listWorkflows(ctx.orgId),
  ]);
  const agentNames = new Map(agents.map((a) => [a.id, a.name]));
  const workflowNames = new Map(workflows.map((w) => [w.id, w.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Schedules</h1>
        <p className="mt-1 text-sm text-ink-muted">Run an agent or workflow on a cron schedule, or once at a specific time — works even when everyone's offline.</p>
      </div>

      <CreateScheduleForm agents={agents.map((a) => ({ id: a.id, name: a.name }))} workflows={workflows.map((w) => ({ id: w.id, name: w.name }))} />

      <div className="card divide-y divide-border-subtle">
        {schedules.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No schedules yet.</div>}
        {schedules.map((s) => {
          const name = s.targetType === "agent" ? (agentNames.get(s.targetId) ?? "unknown agent") : (workflowNames.get(s.targetId) ?? "unknown workflow");
          return (
            <div key={s.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{name}</span>
                  <span className="badge bg-surface-raised text-ink-muted">{s.targetType}</span>
                  <span className={`badge ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                </div>
                <div className="mt-0.5 font-mono text-xs text-ink-muted">
                  {s.cronExpression ?? (s.runOnceAt ? `once at ${new Date(s.runOnceAt).toLocaleString()}` : "—")}
                </div>
                <div className="mt-0.5 text-xs text-ink-faint">
                  {s.lastRunAt && <>Last ran {new Date(s.lastRunAt).toLocaleString()} · </>}
                  {s.nextRunAt && <>Next run {new Date(s.nextRunAt).toLocaleString()}</>}
                </div>
              </div>
              <ScheduleActions id={s.id} status={s.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
