const REP_STATUS_STYLES: Record<string, string> = {
  active: "bg-positive-soft text-positive",
  inactive: "bg-sunken text-fg-faint",
};

export function RepStatusBadge({ status }: { status: string }) {
  return <span className={`chip ${REP_STATUS_STYLES[status] ?? "bg-sunken text-fg-muted"}`}>{status}</span>;
}

const THREAD_STATUS_STYLES: Record<string, string> = {
  open: "bg-caution-soft text-caution",
  done: "bg-positive-soft text-positive",
  dropped: "bg-sunken text-fg-faint",
};

export function ThreadStatusBadge({ status }: { status: string }) {
  return <span className={`chip ${THREAD_STATUS_STYLES[status] ?? "bg-sunken text-fg-muted"}`}>{status.replace("_", " ")}</span>;
}

const COMPLIANCE_STATUS_STYLES: Record<string, string> = {
  open: "bg-critical-soft text-critical",
  under_review: "bg-caution-soft text-caution",
  resolved: "bg-positive-soft text-positive",
  escalated: "bg-critical-soft text-critical",
};

export function ComplianceStatusBadge({ status }: { status: string }) {
  return <span className={`chip ${COMPLIANCE_STATUS_STYLES[status] ?? "bg-sunken text-fg-muted"}`}>{status.replace("_", " ")}</span>;
}

const COMPLIANCE_SEVERITY_STYLES: Record<string, string> = {
  low: "bg-sunken text-fg-muted",
  medium: "bg-caution-soft text-caution",
  high: "bg-critical-soft text-critical",
  critical: "bg-critical-soft text-critical",
};

export function ComplianceSeverityBadge({ severity }: { severity: string }) {
  return <span className={`chip ${COMPLIANCE_SEVERITY_STYLES[severity] ?? "bg-sunken text-fg-muted"}`}>{severity}</span>;
}

const COACHING_OUTCOME_STYLES: Record<string, string> = {
  pending: "bg-sunken text-fg-muted",
  worked: "bg-positive-soft text-positive",
  partially_worked: "bg-caution-soft text-caution",
  not_worked: "bg-critical-soft text-critical",
  escalated: "bg-critical-soft text-critical",
};

export function CoachingOutcomeBadge({ outcome }: { outcome: string }) {
  return <span className={`chip ${COACHING_OUTCOME_STYLES[outcome] ?? "bg-sunken text-fg-muted"}`}>{outcome.replace("_", " ")}</span>;
}

export function SeedDataBadge() {
  return <span className="chip bg-caution-soft text-caution" title="Seed/demo data — not a real record">Seed data</span>;
}
