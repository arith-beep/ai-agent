import Link from "next/link";
import { ShieldAlert, ListChecks, TrendingUp, TrendingDown, Users, Target, ArrowUpRight, Sparkles, AlertTriangle } from "lucide-react";
import { requireManagerAccess } from "@/lib/manager-access";
import { managerRepo, managerInsights, credentialsRepo } from "@ai-agent/storage";
import type { MorningBrief } from "@ai-agent/manager-agent";
import { RepStatusBadge, ComplianceSeverityBadge } from "./_components/badges";
import { ManagerBriefView } from "./_components/manager-brief-view";
import { setManagerAgentConfigAction, generateMorningBriefAction } from "@/lib/actions/manager-agent-actions";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const PROVIDER_ENV_VAR: Record<"openai" | "anthropic" | "google" | "openrouter", string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export default async function ManagerOverviewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ctx = await requireManagerAccess();
  const { error } = await searchParams;

  const [reps, openCompliance, openThreads, currentFocus, snapshots, agentConfig, configuredCredentials, latestBrief] = await Promise.all([
    managerRepo.listReps(ctx.orgId, { status: "active" }),
    managerRepo.listComplianceCases(ctx.orgId, { status: "open" }),
    managerRepo.listOpenThreads(ctx.orgId, { status: "open" }),
    managerRepo.getCurrentFocusArea(ctx.orgId),
    managerRepo.listSnapshotsForOrg(ctx.orgId, daysAgo(14)),
    managerRepo.getManagerAgentConfig(ctx.orgId),
    credentialsRepo.listConfiguredProviders(ctx.orgId),
    managerRepo.getLatestBrief(ctx.orgId, "morning_brief"),
  ]);

  // A provider is offered in the config form if this org has a stored credential for it,
  // OR a server-side env var is set for local dev / a shared deployment key — the same
  // two sources resolveModel() itself checks, so the dropdown never offers a provider
  // that would immediately fail as "credential missing".
  const availableProviders = (["openai", "anthropic", "google", "openrouter"] as const).filter(
    (p) => configuredCredentials.some((c) => c.provider === p) || Boolean(process.env[PROVIDER_ENV_VAR[p]]),
  );

  const repById = new Map(reps.map((r) => [r.id, r]));
  const byRep = managerInsights.groupByRep(snapshots);
  const insights = reps
    .map((r) => managerInsights.analyzeRepTrend(byRep.get(r.id) ?? []))
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const needsAttention = insights.filter((i) => i.flag === "below_own_baseline" || i.flag === "zero_recent_output");
  const strongWeek = insights.filter((i) => i.flag === "strong_week");

  const team = snapshots.reduce(
    (acc, s) => {
      acc.dials += s.dials;
      acc.connects += s.connects;
      acc.appointments += s.appointments;
      acc.sales += s.sales;
      return acc;
    },
    { dials: 0, connects: 0, appointments: 0, sales: 0 },
  );

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Sales Manager</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Ranked by what needs attention — compliance first, then individual signals, then recognition.</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Manager Agent — draft-only, human-approved; see card body for the guardrail note */}
      <div className="surface mb-5 p-5">
        <div className="mb-3 flex items-center gap-2 text-fg">
          <Sparkles size={16} className="text-brand" />
          <h2 className="text-[13.5px] font-semibold">Manager Agent</h2>
        </div>

        {!agentConfig ? (
          availableProviders.length === 0 ? (
            <p className="text-[13px] text-fg-muted">
              No model provider is configured for this organization yet. Add an API key under <span className="font-medium text-fg">Settings &gt; Models</span> first, then come back here to choose a model.
            </p>
          ) : (
            <div>
              <p className="mb-3 text-[13px] text-fg-muted">Choose which model the Manager Agent uses — this is a deliberate choice, never inferred automatically.</p>
              <form action={setManagerAgentConfigAction} className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="field-label">Provider</label>
                  <select className="field" name="modelProvider" defaultValue={availableProviders[0]}>
                    {availableProviders.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Model name</label>
                  <input className="field" name="modelName" placeholder="gpt-4o-mini" required />
                </div>
                <button type="submit" className="btn-brand">
                  Save
                </button>
              </form>
              {availableProviders.includes("openrouter") && (
                <p className="mt-2 text-[12px] text-fg-muted">
                  If using OpenRouter, model names are vendor-prefixed, e.g. <code className="font-mono">openai/gpt-4o-mini</code> or{" "}
                  <code className="font-mono">anthropic/claude-3.5-sonnet</code> — see{" "}
                  <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="underline">
                    openrouter.ai/models
                  </a>
                  .
                </p>
              )}
            </div>
          )
        ) : (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] text-fg-muted">
                Configured: <span className="font-medium text-fg">{agentConfig.modelProvider}/{agentConfig.modelName}</span>
              </span>
              <form action={generateMorningBriefAction}>
                <button type="submit" className="btn-brand gap-1.5 text-[12.5px]">
                  <Sparkles size={13} />
                  Generate Morning Brief
                </button>
              </form>
            </div>

            {latestBrief ? (
              <ManagerBriefView brief={latestBrief.content as unknown as MorningBrief} generatedAt={latestBrief.generatedAt} droppedClaimsCount={latestBrief.droppedClaimsCount} repById={repById} />
            ) : (
              <p className="text-[13px] text-fg-faint">No brief generated yet — click "Generate Morning Brief" to produce one from real data.</p>
            )}
          </div>
        )}
      </div>

      {/* Priority 1: compliance — never buried */}
      {openCompliance.length > 0 && (
        <div className="surface mb-5 border-critical/30 bg-critical-soft/40 p-5">
          <div className="mb-3 flex items-center gap-2 text-critical">
            <ShieldAlert size={16} />
            <h2 className="text-[13.5px] font-semibold">Open compliance cases — review before anything else</h2>
          </div>
          <div className="space-y-2">
            {openCompliance.map((c) => (
              <Link key={c.id} href="/manager/compliance" className="flex items-center justify-between rounded-pnl border border-hairline bg-panel px-3.5 py-2.5 text-[13px] hover:shadow-elevate-sm">
                <div className="min-w-0">
                  <span className="font-medium text-fg">{repById.get(c.repId)?.name ?? "Unknown rep"}</span>
                  <span className="ml-2 text-fg-muted">{c.description}</span>
                </div>
                <ComplianceSeverityBadge severity={c.severity} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="surface p-4">
          <div className="text-[11px] font-medium text-fg-faint">Team dials (14d)</div>
          <div className="mt-1 font-display text-[20px] font-semibold text-fg">{team.dials}</div>
        </div>
        <div className="surface p-4">
          <div className="text-[11px] font-medium text-fg-faint">Connects</div>
          <div className="mt-1 font-display text-[20px] font-semibold text-fg">{team.connects}</div>
        </div>
        <div className="surface p-4">
          <div className="text-[11px] font-medium text-fg-faint">Appointments</div>
          <div className="mt-1 font-display text-[20px] font-semibold text-fg">{team.appointments}</div>
        </div>
        <div className="surface p-4">
          <div className="text-[11px] font-medium text-fg-faint">Sales</div>
          <div className="mt-1 font-display text-[20px] font-semibold text-fg">{team.sales}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Priority 2: individuals needing attention */}
        <div className="surface p-5">
          <div className="mb-3 flex items-center gap-2 text-fg">
            <TrendingDown size={16} className="text-caution" />
            <h2 className="text-[13.5px] font-semibold">Needs a look</h2>
          </div>
          {needsAttention.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-fg-faint">No one's trending below their own baseline right now.</p>
          ) : (
            <div className="space-y-2">
              {needsAttention.map((i) => (
                <Link key={i.repId} href={`/manager/reps/${i.repId}`} className="flex items-center justify-between rounded-pnl border border-hairline px-3.5 py-2.5 text-[13px] hover:bg-sunken">
                  <span className="font-medium text-fg">{repById.get(i.repId)?.name}</span>
                  <span className="text-[12px] text-fg-muted">
                    {i.flag === "zero_recent_output" ? "Zero sales, normal activity" : `${i.recentSalesPerDay.toFixed(1)}/day vs. own ${i.baselineSalesPerDay.toFixed(1)}/day baseline`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Priority 4: recognition */}
        <div className="surface p-5">
          <div className="mb-3 flex items-center gap-2 text-fg">
            <TrendingUp size={16} className="text-positive" />
            <h2 className="text-[13.5px] font-semibold">Strong week</h2>
          </div>
          {strongWeek.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-fg-faint">Nothing standing out above baseline yet.</p>
          ) : (
            <div className="space-y-2">
              {strongWeek.map((i) => (
                <Link key={i.repId} href={`/manager/reps/${i.repId}`} className="flex items-center justify-between rounded-pnl border border-hairline px-3.5 py-2.5 text-[13px] hover:bg-sunken">
                  <span className="font-medium text-fg">{repById.get(i.repId)?.name}</span>
                  <span className="text-[12px] text-positive">{i.recentSalesPerDay.toFixed(1)}/day vs. own {i.baselineSalesPerDay.toFixed(1)}/day baseline</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Open threads widget */}
        <div className="surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-fg">
              <ListChecks size={16} />
              <h2 className="text-[13.5px] font-semibold">Open threads ({openThreads.length})</h2>
            </div>
            <Link href="/manager/threads" className="flex items-center gap-1 text-[12px] text-brand hover:underline">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {openThreads.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-fg-faint">Nothing open — everything's been closed out.</p>
          ) : (
            <div className="space-y-2">
              {openThreads.slice(0, 5).map((t) => (
                <div key={t.id} className="rounded-pnl border border-hairline px-3.5 py-2.5 text-[13px]">
                  <div className="text-fg">{t.description}</div>
                  {t.repId && repById.get(t.repId) && <div className="mt-0.5 text-[11.5px] text-fg-faint">{repById.get(t.repId)?.name}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* This week's focus */}
        <div className="surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-fg">
              <Target size={16} />
              <h2 className="text-[13.5px] font-semibold">This week's focus</h2>
            </div>
            <Link href="/manager/focus" className="flex items-center gap-1 text-[12px] text-brand hover:underline">
              Manage <ArrowUpRight size={12} />
            </Link>
          </div>
          {currentFocus ? (
            <div>
              <div className="text-[14.5px] font-medium text-fg">{currentFocus.theme}</div>
              {currentFocus.rationale && <p className="mt-1.5 text-[13px] text-fg-muted">{currentFocus.rationale}</p>}
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] text-fg-faint">No focus area set for this week yet.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-pnl border border-hairline bg-panel px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] text-fg-muted">
          <Users size={14} />
          {reps.length} active rep{reps.length === 1 ? "" : "s"} on the roster
        </div>
        <Link href="/manager/reps" className="flex items-center gap-1 text-[12.5px] text-brand hover:underline">
          View roster <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}
