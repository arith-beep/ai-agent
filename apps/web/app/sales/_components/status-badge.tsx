const LEAD_STATUS_STYLES: Record<string, string> = {
  new: "bg-sunken text-fg-muted",
  engaged: "bg-brand-soft text-brand",
  qualified: "bg-positive-soft text-positive",
  unqualified: "bg-sunken text-fg-faint",
  meeting_requested: "bg-caution-soft text-caution",
  meeting_booked: "bg-positive-soft text-positive",
  human_handoff: "bg-critical-soft text-critical",
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
  return <span className={`chip ${LEAD_STATUS_STYLES[status] ?? "bg-sunken text-fg-muted"}`}>{LEAD_STATUS_LABELS[status] ?? status}</span>;
}

const AGENT_STATUS_STYLES: Record<string, string> = {
  draft: "bg-sunken text-fg-muted",
  active: "bg-positive-soft text-positive",
  paused: "bg-caution-soft text-caution",
  archived: "bg-sunken text-fg-faint",
};

export function AgentStatusBadge({ status }: { status: string }) {
  return <span className={`chip ${AGENT_STATUS_STYLES[status] ?? "bg-sunken text-fg-muted"}`}>{status}</span>;
}

const CONVERSATION_STATUS_STYLES: Record<string, string> = {
  active: "bg-positive-soft text-positive",
  handoff: "bg-critical-soft text-critical",
  closed: "bg-sunken text-fg-faint",
};

export function ConversationStatusBadge({ status }: { status: string }) {
  return <span className={`chip ${CONVERSATION_STATUS_STYLES[status] ?? "bg-sunken text-fg-muted"}`}>{status}</span>;
}
