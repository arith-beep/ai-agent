"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ToolOption {
  id: string;
  name: string;
  category: string;
}
export interface KnowledgeBaseOption {
  id: string;
  name: string;
}

export interface AgentFormInitial {
  id?: string;
  name?: string;
  role?: string;
  description?: string;
  objective?: string;
  systemPrompt?: string;
  modelProvider?: "openai" | "anthropic" | "google";
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  toolIds?: string[];
  knowledgeBaseIds?: string[];
}

const MODEL_OPTIONS: Record<"openai" | "anthropic" | "google", string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "o1"],
  anthropic: ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5"],
  google: ["gemini-2.0-pro", "gemini-2.0-flash"],
};

export function AgentForm({
  initial,
  tools,
  knowledgeBases,
}: {
  initial?: AgentFormInitial;
  tools: ToolOption[];
  knowledgeBases: KnowledgeBaseOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [objective, setObjective] = useState(initial?.objective ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? "");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "google">(initial?.modelProvider ?? "openai");
  const [model, setModel] = useState(initial?.modelName ?? MODEL_OPTIONS.openai[0] ?? "gpt-4o");
  const [temperature, setTemperature] = useState(initial?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(initial?.maxTokens ?? 4096);
  const [toolIds, setToolIds] = useState<string[]>(initial?.toolIds ?? []);
  const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<string[]>(initial?.knowledgeBaseIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name,
      role,
      description: description || undefined,
      objective: objective || undefined,
      systemPrompt,
      model: { provider, model, temperature, maxTokens },
      toolIds,
      knowledgeBaseIds,
      permissions: [],
    };

    const url = isEdit ? `/api/agents/${initial?.id}` : "/api/agents";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    router.push(`/agents/${data.agent.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="card border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-medium text-ink">Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sales Manager AI" />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} required placeholder="Sales Operations" />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Objective</label>
          <textarea className="input" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-medium text-ink">Instructions</h2>
        <div>
          <label className="label">System prompt</label>
          <textarea
            className="input font-mono text-xs"
            rows={8}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            required
            placeholder="You are the Sales Manager AI. Your job is to..."
          />
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-medium text-ink">Model</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Provider</label>
            <select
              className="input"
              value={provider}
              onChange={(e) => {
                const p = e.target.value as typeof provider;
                setProvider(p);
                setModel(MODEL_OPTIONS[p][0] ?? "");
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div>
            <label className="label">Model</label>
            <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODEL_OPTIONS[provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Temperature ({temperature})</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="label">Max tokens</label>
            <input
              type="number"
              className="input"
              value={maxTokens}
              min={256}
              max={200000}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Tools</h2>
        {tools.length === 0 ? (
          <p className="text-xs text-ink-faint">
            No tools available yet. Seed the built-in tools from the <a href="/tools" className="text-accent hover:underline">Tools</a> page.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {tools.map((tool) => (
              <label key={tool.id} className="flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-sm text-ink">
                <input type="checkbox" checked={toolIds.includes(tool.id)} onChange={() => toggle(toolIds, setToolIds, tool.id)} />
                {tool.name}
                <span className="text-xs text-ink-faint">({tool.category})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Knowledge</h2>
        {knowledgeBases.length === 0 ? (
          <p className="text-xs text-ink-faint">
            No knowledge bases yet. Create one from the <a href="/knowledge" className="text-accent hover:underline">Knowledge</a> page.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {knowledgeBases.map((kb) => (
              <label key={kb.id} className="flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={knowledgeBaseIds.includes(kb.id)}
                  onChange={() => toggle(knowledgeBaseIds, setKnowledgeBaseIds, kb.id)}
                />
                {kb.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create agent"}
        </button>
      </div>
    </form>
  );
}
