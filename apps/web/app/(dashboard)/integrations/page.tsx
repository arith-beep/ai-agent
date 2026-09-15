export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Integrations</h1>
        <p className="mt-1 text-sm text-ink-muted">CRM, Slack, GitHub, and other external connectors.</p>
      </div>
      <div className="card p-10 text-center text-sm text-ink-muted">
        Built-in tools (HTTP Request, File Reader, Web Search) are available today under{" "}
        <a href="/tools" className="text-accent hover:underline">
          Tools
        </a>
        . First-party connectors for CRM/Slack/GitHub/Calendar are planned for Milestone 4 — see docs/architecture/08-mvp-roadmap.md.
      </div>
    </div>
  );
}
