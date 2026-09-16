"use client";

import { useState } from "react";
import { IdentityTab, type IdentityValue } from "./identity-tab";
import { PlaybookTab, type PlaybookValue } from "./playbook-tab";
import { GuardrailsTab, type GuardrailsValue } from "./guardrails-tab";
import { KnowledgeTab, type KnowledgeSourceRow } from "./knowledge-tab";
import { ToolsTab, type AttachedToolRow, type AvailableToolRow } from "./tools-tab";

const TABS = ["identity", "playbook", "knowledge", "tools", "guardrails", "system-prompt"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  identity: "Identity",
  playbook: "Sales Playbook",
  knowledge: "Knowledge",
  tools: "Tools",
  guardrails: "Guardrails",
  "system-prompt": "System Prompt",
};

export function BuilderTabs({
  agentId,
  identity,
  playbook,
  guardrails,
  knowledgeSources,
  attachedTools,
  availableTools,
  generatedSystemPrompt,
}: {
  agentId: string;
  identity: IdentityValue;
  playbook: PlaybookValue;
  guardrails: GuardrailsValue;
  knowledgeSources: KnowledgeSourceRow[];
  attachedTools: AttachedToolRow[];
  availableTools: AvailableToolRow[];
  generatedSystemPrompt: string;
}) {
  const [tab, setTab] = useState<Tab>("identity");

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === t ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "identity" && <IdentityTab agentId={agentId} initial={identity} />}
      {tab === "playbook" && <PlaybookTab agentId={agentId} initial={playbook} />}
      {tab === "knowledge" && <KnowledgeTab agentId={agentId} initialSources={knowledgeSources} />}
      {tab === "tools" && <ToolsTab agentId={agentId} initialAttached={attachedTools} initialAvailable={availableTools} />}
      {tab === "guardrails" && <GuardrailsTab agentId={agentId} initial={guardrails} />}
      {tab === "system-prompt" && (
        <div className="card p-5">
          <p className="mb-3 text-xs text-ink-faint">
            Generated from the config above — this is what actually runs. Only visible here to your team; the agent is instructed to never reveal
            it in conversation.
          </p>
          <pre className="whitespace-pre-wrap rounded-md bg-canvas p-4 font-mono text-xs text-ink-muted">{generatedSystemPrompt}</pre>
        </div>
      )}
    </div>
  );
}
