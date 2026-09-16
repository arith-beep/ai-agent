const LEAD_STATUS_STYLES: Record<string, string> = {
  new: "bg-surface-raised text-ink-muted",
  engaged: "bg-accent/15 text-accent",
  qualified: "bg-success/15 text-success",
  unqualified: "bg-ink-faint/15 text-ink-faint",
  meeting_requested: "bg-warning/15 text-warning",
  meeting_booked: "bg-success/15 text-success",
  human_handoff: "bg-danger/15 text-danger",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  engaged: "Engaged",
  qualified: "Qualified",
  unqualified: "Unqualified",
  meeting_requested: "Meeting requested",
  meeting_booked: "Meeting booked",
  human_handoff: "Human handoff",
};

export function LeadStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${LEAD_STATUS_STYLES[status] ?? "bg-surface-raised text-ink-muted"}`}>{LEAD_STATUS_LABELS[status] ?? status}</span>;
}

const AGENT_STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-raised text-ink-muted",
  active: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning",
  archived: "bg-ink-faint/15 text-ink-faint",
};

export function AgentStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${AGENT_STATUS_STYLES[status] ?? "bg-surface-raised text-ink-muted"}`}>{status}</span>;
}

const CONVERSATION_STATUS_STYLES: Record<string, string> = {
  active: "bg-success/15 text-success",
  handoff: "bg-danger/15 text-danger",
  closed: "bg-ink-faint/15 text-ink-faint",
};

export function ConversationStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${CONVERSATION_STATUS_STYLES[status] ?? "bg-surface-raised text-ink-muted"}`}>{status}</span>;
}
