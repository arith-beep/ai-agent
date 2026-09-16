import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";

export default async function SalesSettingsPage() {
  const ctx = await requireCurrentContext();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Organization-level settings for the Sales Agent Builder.</p>
      </div>

      <div className="space-y-6">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-medium text-ink">Organization</h2>
          <div>
            <div className="text-xs font-medium text-ink-muted">Name</div>
            <div className="mt-0.5 text-sm text-ink">{ctx.orgName}</div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-2 text-sm font-medium text-ink">Model provider API keys</h2>
          <p className="text-sm text-ink-muted">
            OpenAI, Anthropic and Google credentials are shared across the whole platform and configured under Models — not here.
          </p>
          <Link href="/models" className="btn-secondary mt-3 inline-flex">
            Go to Models
          </Link>
        </div>

        <div className="card p-5">
          <h2 className="mb-2 text-sm font-medium text-ink">Playbook &amp; guardrails</h2>
          <p className="text-sm text-ink-muted">
            Each sales agent has its own sales playbook and guardrails, configured from that agent's builder — there is no org-wide
            default yet.
          </p>
          <Link href="/sales/agents" className="btn-secondary mt-3 inline-flex">
            Go to Sales Agents
          </Link>
        </div>
      </div>
    </div>
  );
}
