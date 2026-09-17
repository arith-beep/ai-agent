"use client";

import { Search, Wrench, Gauge, UserCheck, AlertTriangle } from "lucide-react";
import type { TurnDebug } from "../../_hooks/use-agent-chat";

function Row({ icon: Icon, label, children }: { icon: typeof Search; label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-hairline-soft px-4 py-3.5 last:border-b-0">
      <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-medium text-fg-muted">
        <Icon size={13} strokeWidth={1.75} />
        {label}
      </div>
      {children}
    </div>
  );
}

export function InspectorPanel({ debug }: { debug: TurnDebug | null }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Row icon={UserCheck} label="Qualification state">
        {debug?.lead ? (
          <div className="space-y-1">
            <div className="text-[13px] text-fg">{debug.lead.name ?? debug.lead.email ?? "Unnamed lead"}</div>
            <span className="chip bg-brand-soft text-brand">{debug.lead.status}</span>
            {debug.lead.statusReason && <div className="text-[11.5px] text-fg-faint">{debug.lead.statusReason}</div>}
          </div>
        ) : (
          <p className="text-[12px] text-fg-faint">No lead captured yet.</p>
        )}
      </Row>

      <Row icon={Gauge} label="Latency">
        <p className="text-[13px] text-fg">{debug ? `${debug.latencyMs}ms` : "—"}</p>
      </Row>

      <Row icon={Search} label="Retrieved knowledge">
        {debug && debug.retrievedChunks.length > 0 ? (
          <div className="space-y-2">
            {debug.retrievedChunks.map((c) => (
              <div key={c.id} className="rounded-pnl border border-hairline-soft bg-sunken/60 p-2.5 text-[11.5px]">
                <div className="mb-1 font-mono text-fg-faint">score {c.score.toFixed(3)}</div>
                <div className="line-clamp-3 text-fg-muted">{c.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-fg-faint">No retrieval this turn.</p>
        )}
      </Row>

      <Row icon={Wrench} label="Tool calls">
        {debug && debug.toolCalls.length > 0 ? (
          <div className="space-y-2">
            {debug.toolCalls.map((call, i) => (
              <div key={i} className="rounded-pnl border border-hairline-soft bg-sunken/60 p-2.5 text-[11.5px]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-fg">{call.name}</span>
                  <span className={`chip ${call.status === "success" ? "bg-positive-soft text-positive" : "bg-critical-soft text-critical"}`}>{call.status}</span>
                </div>
                <div className="text-fg-faint">in: {JSON.stringify(call.input)}</div>
                <div className="text-fg-faint">out: {JSON.stringify(call.status === "success" ? call.output : call.errorMessage)}</div>
                <div className="mt-1 text-fg-faint">{call.durationMs}ms</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-fg-faint">No tool calls this turn.</p>
        )}
      </Row>

      {debug?.error && (
        <Row icon={AlertTriangle} label="Error">
          <p className="text-[12px] text-critical">{debug.error}</p>
        </Row>
      )}
    </div>
  );
}
