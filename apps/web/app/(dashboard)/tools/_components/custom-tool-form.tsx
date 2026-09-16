"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CustomToolParamInitial {
  name: string;
  type: "string" | "number" | "boolean";
  description?: string;
  required: boolean;
}

export interface CustomToolFormInitial {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  requiresApproval?: boolean;
  params?: CustomToolParamInitial[];
  executionConfig?: { kind: "http"; url: string; method: string; headers?: Record<string, string>; body?: unknown };
}

const CATEGORIES = ["custom", "http", "communication", "database", "search", "file", "knowledge"] as const;
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const PARAM_TYPES = ["string", "number", "boolean"] as const;

function headersToPairs(headers?: Record<string, string>): { key: string; value: string }[] {
  return headers ? Object.entries(headers).map(([key, value]) => ({ key, value })) : [];
}

export function CustomToolForm({ initial }: { initial?: CustomToolFormInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "custom");
  const [requiresApproval, setRequiresApproval] = useState(initial?.requiresApproval ?? false);
  const [params, setParams] = useState<CustomToolParamInitial[]>(initial?.params ?? []);
  const [newParamName, setNewParamName] = useState("");
  const [newParamType, setNewParamType] = useState<(typeof PARAM_TYPES)[number]>("string");
  const [newParamRequired, setNewParamRequired] = useState(true);

  const [method, setMethod] = useState(initial?.executionConfig?.method ?? "GET");
  const [url, setUrl] = useState(initial?.executionConfig?.url ?? "");
  const [headerPairs, setHeaderPairs] = useState(headersToPairs(initial?.executionConfig?.headers));
  const [bodyTemplate, setBodyTemplate] = useState(initial?.executionConfig?.body !== undefined ? JSON.stringify(initial.executionConfig.body, null, 2) : "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addParam() {
    if (!newParamName.trim()) return;
    setParams([...params, { name: newParamName.trim(), type: newParamType, required: newParamRequired }]);
    setNewParamName("");
  }
  function removeParam(index: number) {
    setParams(params.filter((_, i) => i !== index));
  }

  function addHeader() {
    setHeaderPairs([...headerPairs, { key: "", value: "" }]);
  }
  function updateHeader(index: number, field: "key" | "value", value: string) {
    setHeaderPairs(headerPairs.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }
  function removeHeader(index: number) {
    setHeaderPairs(headerPairs.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let body: unknown;
    if (bodyTemplate.trim()) {
      try {
        body = JSON.parse(bodyTemplate);
      } catch {
        setError("Body template must be valid JSON (placeholders like {{input.field}} still work inside JSON strings).");
        return;
      }
    }

    const headers = headerPairs.filter((h) => h.key.trim()).reduce<Record<string, string>>((acc, h) => ({ ...acc, [h.key.trim()]: h.value }), {});

    const payload = {
      name,
      description,
      category,
      requiresApproval,
      params,
      executionConfig: {
        kind: "http" as const,
        url,
        method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body,
      },
    };

    setSubmitting(true);
    const apiUrl = isEdit ? `/api/tools/${initial?.id}` : "/api/tools";
    const res = await fetch(apiUrl, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}));
      setError(resBody.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }
    const data = await res.json();
    setSubmitting(false);
    // A create navigates to a new URL and the page remounts; an edit's URL is unchanged, so
    // nothing else would reset `submitting` back to false and the button would stay stuck on
    // "Saving...". router.refresh() alone re-fetches the server data either way.
    router.push(`/tools/${data.tool.id}`);
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
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Send Order Confirmation" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="What this tool does and when an agent should call it — this is what the agent sees."
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
          Require human approval before this tool ever runs
        </label>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Parameters</h2>
        <p className="text-xs text-ink-faint">What an agent (or workflow) passes in when it calls this tool. Reference these in the request below as <code className="text-ink">{"{{input.fieldName}}"}</code>.</p>
        {params.length > 0 && (
          <ul className="space-y-1.5">
            {params.map((p, i) => (
              <li key={i} className="flex items-center justify-between rounded-md border border-border-subtle px-3 py-2 text-sm">
                <span className="font-mono text-ink">
                  {p.name} <span className="text-ink-faint">({p.type}{p.required ? "" : ", optional"})</span>
                </span>
                <button type="button" className="btn-ghost text-danger" onClick={() => removeParam(i)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="label">Field name</label>
            <input className="input font-mono" placeholder="orderId" value={newParamName} onChange={(e) => setNewParamName(e.target.value)} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={newParamType} onChange={(e) => setNewParamType(e.target.value as typeof newParamType)}>
              {PARAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-xs text-ink-muted">
            <input type="checkbox" checked={newParamRequired} onChange={(e) => setNewParamRequired(e.target.checked)} />
            Required
          </label>
          <button type="button" className="btn-secondary" onClick={addParam}>
            Add
          </button>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">HTTP request</h2>
        <p className="text-xs text-ink-faint">
          Use <code className="text-ink">{"{{input.fieldName}}"}</code> for a parameter above, or <code className="text-ink">{"{{auth.fieldName}}"}</code> for a value from this
          tool&apos;s credentials (set below, after creating it).
        </p>
        <div className="flex gap-2">
          <select className="input w-32 shrink-0" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            className="input flex-1 font-mono text-xs"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://api.example.com/orders/{{input.orderId}}/confirm"
          />
        </div>
        <div className="space-y-2">
          <label className="label">Headers</label>
          {headerPairs.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input className="input font-mono text-xs" placeholder="Authorization" value={h.key} onChange={(e) => updateHeader(i, "key", e.target.value)} />
              <input
                className="input flex-1 font-mono text-xs"
                placeholder="Bearer {{auth.apiKey}}"
                value={h.value}
                onChange={(e) => updateHeader(i, "value", e.target.value)}
              />
              <button type="button" className="btn-ghost text-danger" onClick={() => removeHeader(i)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addHeader}>
            Add header
          </button>
        </div>
        <div>
          <label className="label">Body template (JSON, optional)</label>
          <textarea
            className="input h-24 font-mono text-xs"
            placeholder={'{\n  "orderId": "{{input.orderId}}"\n}'}
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create tool"}
        </button>
      </div>
    </form>
  );
}
