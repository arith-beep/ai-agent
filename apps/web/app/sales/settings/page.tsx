import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { Building2, KeyRound, ShieldCheck } from "lucide-react";

export default async function SalesSettingsPage() {
  const ctx = await requireCurrentContext();

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Settings</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Organization-level settings for the Sales Agent Builder.</p>
      </div>

      <div className="space-y-5">
        <div className="surface p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-[13.5px] font-medium text-fg">
            <Building2 size={14} strokeWidth={1.75} className="text-fg-faint" />
            Organization
          </h2>
          <div>
            <div className="text-[11.5px] font-medium uppercase tracking-wide text-fg-faint">Name</div>
            <div className="mt-0.5 text-[13.5px] text-fg">{ctx.orgName}</div>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13.5px] font-medium text-fg">
            <KeyRound size={14} strokeWidth={1.75} className="text-fg-faint" />
            Model provider API keys
          </h2>
          <p className="text-[13.5px] text-fg-muted">
            OpenAI, Anthropic and Google credentials are shared across the whole platform and configured under Models — not here.
          </p>
          <Link href="/models" className="btn-outline mt-3.5 inline-flex !py-1.5 text-[12.5px]">
            Go to Models
          </Link>
        </div>

        <div className="surface p-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13.5px] font-medium text-fg">
            <ShieldCheck size={14} strokeWidth={1.75} className="text-fg-faint" />
            Playbook &amp; guardrails
          </h2>
          <p className="text-[13.5px] text-fg-muted">
            Each sales agent has its own sales playbook and guardrails, configured from that agent&rsquo;s builder — there is no org-wide
            default yet.
          </p>
          <Link href="/sales/agents" className="btn-outline mt-3.5 inline-flex !py-1.5 text-[12.5px]">
            Go to Sales Agents
          </Link>
        </div>
      </div>
    </div>
  );
}
