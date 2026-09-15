import { requireCurrentContext } from "@/lib/session";
import { tenancyRepo } from "@ai-agent/storage";

export default async function SettingsPage() {
  const ctx = await requireCurrentContext();
  const members = await tenancyRepo.listOrgMembers(ctx.orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Organization and account settings.</p>
      </div>

      <div className="card space-y-2 p-5">
        <h2 className="text-sm font-medium text-ink">Organization</h2>
        <div className="text-sm text-ink-muted">{ctx.orgName}</div>
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Members</div>
        <div className="divide-y divide-border-subtle">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <div className="text-ink">{m.name || m.email}</div>
                <div className="text-xs text-ink-faint">{m.email}</div>
              </div>
              <span className="badge bg-surface-raised text-ink-muted">{m.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
