import Link from "next/link";
import { Building2, Wallet, Clock3, Lightbulb, CalendarCheck, UserCheck } from "lucide-react";
import { LeadStatusBadge } from "../../../_components/status-badge";

export interface LeadIntelData {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  statusReason: string | null;
  company: string | null;
  budget: string | null;
  timeline: string | null;
  interest: string | null;
}

export interface MeetingData {
  id: string;
  status: string;
  proposedTime: string | null;
  durationMinutes: number | null;
}

function Row({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-hairline-soft px-4 py-3 last:border-b-0">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-faint">
        <Icon size={11} strokeWidth={1.75} />
        {label}
      </div>
      <div className="text-[13px] text-fg">{value || <span className="text-fg-faint">—</span>}</div>
    </div>
  );
}

export function LeadIntelContent({ lead, meeting }: { lead: LeadIntelData | null; meeting: MeetingData | null }) {
  if (!lead) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <UserCheck size={20} className="text-fg-faint" />
        <p className="text-[12.5px] text-fg-faint">No lead captured in this conversation yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-hairline-soft px-4 py-3.5">
        <Link href={`/sales/leads/${lead.id}`} className="text-[13.5px] font-medium text-brand hover:underline">
          {lead.name ?? lead.email ?? "Unnamed lead"}
        </Link>
        <div className="mt-1.5">
          <LeadStatusBadge status={lead.status} />
        </div>
        {lead.statusReason && <p className="mt-1.5 text-[12px] text-fg-muted">{lead.statusReason}</p>}
      </div>
      <Row icon={Building2} label="Company" value={lead.company} />
      <Row icon={Wallet} label="Budget" value={lead.budget} />
      <Row icon={Clock3} label="Timeline" value={lead.timeline} />
      <Row icon={Lightbulb} label="Interest" value={lead.interest} />
      <Row
        icon={CalendarCheck}
        label="Meeting"
        value={
          meeting ? (
            <div className="flex items-center gap-1.5">
              <span className="chip bg-brand-soft text-brand">{meeting.status}</span>
              <span className="text-fg-muted">{meeting.proposedTime ? new Date(meeting.proposedTime).toLocaleString() : "No time proposed"}</span>
            </div>
          ) : null
        }
      />
    </div>
  );
}
