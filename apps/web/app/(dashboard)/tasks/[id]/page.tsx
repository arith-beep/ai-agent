import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { tasksRepo, agentsRepo } from "@ai-agent/storage";
import { TaskStatusControl } from "../_components/task-status-control";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-accent/15 text-accent",
  in_progress: "bg-accent/15 text-accent",
  blocked: "bg-warning/15 text-warning",
  in_review: "bg-warning/15 text-warning",
  done: "bg-success/15 text-success",
  cancelled: "bg-ink-faint/15 text-ink-faint",
};

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const task = await tasksRepo.getTask(id);
  if (!task || task.orgId !== ctx.orgId) notFound();

  const [agents, dependencies] = await Promise.all([
    agentsRepo.listAgents(ctx.orgId),
    task.dependsOnTaskIds.length > 0 ? tasksRepo.getTasksByIds(task.dependsOnTaskIds) : Promise.resolve([]),
  ]);
  const agentNames = new Map(agents.map((a) => [a.id, a.name]));
  const unfinishedDeps = dependencies.filter((d) => d.status !== "done");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-ink">{task.title}</h1>
          <span className={`badge ${STATUS_STYLES[task.status]}`}>{task.status.replace("_", " ")}</span>
        </div>
        {task.description && <p className="mt-2 text-sm text-ink-muted">{task.description}</p>}
      </div>

      <div className="card grid grid-cols-2 gap-4 p-5 text-sm">
        <div>
          <div className="text-xs text-ink-faint">Owner</div>
          <div className="text-ink">{task.ownerType === "agent" ? (agentNames.get(task.ownerId) ?? "agent") : "Human"}</div>
        </div>
        <div>
          <div className="text-xs text-ink-faint">Created by</div>
          <div className="text-ink">{task.createdByType === "agent" ? (agentNames.get(task.createdById) ?? "agent") : "Human"}</div>
        </div>
        <div>
          <div className="text-xs text-ink-faint">Priority</div>
          <div className="text-ink">{task.priority}</div>
        </div>
        <div>
          <div className="text-xs text-ink-faint">Due date</div>
          <div className="text-ink">{task.dueDate ?? "—"}</div>
        </div>
      </div>

      {dependencies.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-medium text-ink">Dependencies</h2>
          {unfinishedDeps.length > 0 && (
            <p className="mb-2 text-xs text-warning">
              {unfinishedDeps.length} of {dependencies.length} dependencies are not done yet — this task can&apos;t move to in_progress or done
              until they are.
            </p>
          )}
          <ul className="space-y-1.5">
            {dependencies.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-md border border-border-subtle px-3 py-2 text-sm">
                <Link href={`/tasks/${d.id}`} className="text-ink hover:underline">
                  {d.title}
                </Link>
                <span className={`badge ${STATUS_STYLES[d.status]}`}>{d.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Change status</h2>
        <TaskStatusControl taskId={task.id} currentStatus={task.status} />
      </div>
    </div>
  );
}
