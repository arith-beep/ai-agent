"use client";

import { useState } from "react";
import { User, Target, BookOpen, Plug, ShieldCheck, Code2, PanelRightOpen, PanelRightClose } from "lucide-react";
import { IdentityTab, type IdentityValue } from "./identity-tab";
import { PlaybookTab, type PlaybookValue } from "./playbook-tab";
import { GuardrailsTab, type GuardrailsValue } from "./guardrails-tab";
import { KnowledgeTab, type KnowledgeSourceRow } from "./knowledge-tab";
import { ToolsTab, type AttachedToolRow, type AvailableToolRow } from "./tools-tab";
import { SystemPromptDrawer } from "./system-prompt-drawer";
import { LivePreview } from "./live-preview";

const SECTIONS = [
  { key: "identity", label: "Identity", icon: User },
  { key: "playbook", label: "Sales Playbook", icon: Target },
  { key: "knowledge", label: "Knowledge", icon: BookOpen },
  { key: "tools", label: "Tools", icon: Plug },
  { key: "guardrails", label: "Guardrails", icon: ShieldCheck },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

export function BuilderWorkspace({
  agentId,
  agentName,
  identity,
  playbook,
  guardrails,
  knowledgeSources,
  attachedTools,
  availableTools,
  generatedSystemPrompt,
  urlIngestionAvailable,
}: {
  agentId: string;
  agentName: string;
  identity: IdentityValue;
  playbook: PlaybookValue;
  guardrails: GuardrailsValue;
  knowledgeSources: KnowledgeSourceRow[];
  attachedTools: AttachedToolRow[];
  availableTools: AvailableToolRow[];
  generatedSystemPrompt: string;
  urlIngestionAvailable: boolean;
}) {
  const [section, setSection] = useState<SectionKey>("identity");
  const [promptOpen, setPromptOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const completion: Record<SectionKey, boolean> = {
    identity: Boolean(identity.description || identity.personality.length > 0),
    playbook: Boolean(playbook.primaryObjective && playbook.qualificationCriteria.length > 0),
    knowledge: knowledgeSources.length > 0,
    tools: attachedTools.length > 0,
    guardrails: guardrails.allowedTopics.length > 0 || guardrails.disallowedTopics.length > 0 || guardrails.escalationTriggers.length > 0,
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-3 sm:h-[calc(100vh-9.5rem)] lg:flex-row lg:gap-5">
      {/* LEFT: section nav */}
      <div className="hidden w-56 shrink-0 flex-col lg:flex">
        <nav className="surface flex-1 space-y-0.5 p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={`flex w-full items-center gap-2.5 rounded-pnl px-3 py-2.5 text-left text-[13.5px] transition-colors duration-150 ease-premium ${
                section === s.key ? "bg-brand-soft font-medium text-brand" : "text-fg-muted hover:bg-sunken hover:text-fg"
              }`}
            >
              <s.icon size={16} strokeWidth={1.75} />
              <span className="flex-1">{s.label}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${completion[s.key] ? "bg-positive" : "bg-hairline"}`} />
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setPromptOpen(true)}
          className="mt-2 flex items-center gap-2.5 rounded-pnl px-3 py-2.5 text-left text-[12.5px] text-fg-faint transition-colors hover:bg-sunken hover:text-fg-muted"
        >
          <Code2 size={14} strokeWidth={1.75} />
          System prompt
          <span className="chip ml-auto bg-sunken text-fg-faint">Advanced</span>
        </button>
      </div>

      {/* Mobile section select */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] ${
              section === s.key ? "border-brand bg-brand-soft text-brand" : "border-hairline text-fg-muted"
            }`}
          >
            <s.icon size={13} />
            {s.label}
          </button>
        ))}
      </div>

      {/* CENTER: workspace */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-4 pr-1">
        {section === "identity" && <IdentityTab agentId={agentId} initial={identity} />}
        {section === "playbook" && <PlaybookTab agentId={agentId} initial={playbook} />}
        {section === "knowledge" && <KnowledgeTab agentId={agentId} initialSources={knowledgeSources} urlIngestionAvailable={urlIngestionAvailable} />}
        {section === "tools" && <ToolsTab agentId={agentId} initialAttached={attachedTools} initialAvailable={availableTools} />}
        {section === "guardrails" && <GuardrailsTab agentId={agentId} initial={guardrails} />}
      </div>

      {/* RIGHT: live preview */}
      <div className={`surface hidden w-[360px] shrink-0 flex-col overflow-hidden xl:flex`}>
        <LivePreview agentId={agentId} agentName={agentName} />
      </div>

      {/* Mobile/tablet preview toggle */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-fg text-paper shadow-elevate-lg xl:hidden"
        aria-label="Open live preview"
      >
        <PanelRightOpen size={18} />
      </button>
      {previewOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-fg/40" onClick={() => setPreviewOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-panel shadow-elevate-lg">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <span className="text-[13px] font-medium text-fg">Live preview</span>
              <button type="button" onClick={() => setPreviewOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-pnl text-fg-muted hover:bg-sunken">
                <PanelRightClose size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <LivePreview agentId={agentId} agentName={agentName} />
            </div>
          </div>
        </div>
      )}

      <SystemPromptDrawer open={promptOpen} onClose={() => setPromptOpen(false)} prompt={generatedSystemPrompt} />
    </div>
  );
}
