import { requireCurrentContext } from "@/lib/session";
import { tasksRepo, agentsRepo } from "@ai-agent/storage";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-accent/15 text-accent",
  in_progress: "bg-accent/15 text-accent",
  blocked: "bg-warning/15 text-warning",
  in_review: "bg-warning/15 text-warning",
  done: "bg-success/15 text-success",
  cancelled: "bg-ink-faint/15 text-ink-faint",
};

export default async function TasksPage() {
  const ctx = await requireCurrentContext();
  const [tasks, agents] = await Promise.all([tasksRepo.listTasksForOrg(ctx.orgId), agentsRepo.listAgents(ctx.orgId)]);
  const agentNames = new Map(agents.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Tasks</h1>
        <p className="mt-1 text-sm text-ink-muted">Work created by humans or autonomously by agents.</p>
      </div>

      <div className="card divide-y divide-border-subtle">
        {tasks.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No tasks yet.</div>}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{task.title}</span>
                <span className={`badge ${STATUS_STYLES[task.status]}`}>{task.status.replace("_", " ")}</span>
                <span className="badge bg-surface-raised text-ink-muted">{task.priority}</span>
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">
                Owner: {task.ownerType === "agent" ? (agentNames.get(task.ownerId) ?? "agent") : "human"} · Created by{" "}
                {task.createdByType === "agent" ? (agentNames.get(task.createdById) ?? "agent") : "you"}
              </div>
            </div>
            <span className="text-xs text-ink-faint">{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
