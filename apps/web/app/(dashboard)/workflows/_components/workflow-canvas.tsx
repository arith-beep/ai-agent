"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { WorkflowNodeView, type WorkflowNodeData } from "./workflow-node";
import { NODE_TYPE_LIST, NODE_LABELS, NODE_TEMPLATES, generateNodeId, type NodeTypeId } from "./node-types";

interface WorkflowDefinitionLike {
  nodes: Array<{ id: string; type: string; [key: string]: unknown }>;
  edges: Array<{ from: string; to: string; condition?: string }>;
  entryNodeId: string;
  layout?: Record<string, { x: number; y: number }>;
}

const nodeTypes = { workflowNode: WorkflowNodeView };

function definitionToFlow(definition: WorkflowDefinitionLike): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = definition.nodes.map((n, i) => {
    const { id, type, ...config } = n;
    const position = definition.layout?.[id] ?? { x: 120 + (i % 4) * 220, y: 100 + Math.floor(i / 4) * 150 };
    return {
      id,
      type: "workflowNode",
      position,
      data: { nodeType: type as NodeTypeId, config, isEntry: id === definition.entryNodeId } satisfies WorkflowNodeData,
    };
  });
  const edges: Edge[] = definition.edges.map((e, i) => ({
    id: `edge-${i}-${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    label: e.condition,
    data: { condition: e.condition },
  }));
  return { nodes, edges };
}

function flowToDefinition(nodes: Node[], edges: Edge[], entryNodeId: string): WorkflowDefinitionLike {
  return {
    entryNodeId,
    nodes: nodes.map((n) => {
      const data = n.data as unknown as WorkflowNodeData;
      return { id: n.id, type: data.nodeType, ...data.config };
    }),
    edges: edges.map((e) => ({ from: e.source, to: e.target, condition: (e.data?.condition as string | undefined) || undefined })),
    layout: Object.fromEntries(nodes.map((n) => [n.id, n.position])),
  };
}

export function WorkflowCanvas({
  workflowId,
  name,
  status,
  initialDefinition,
}: {
  workflowId: string;
  name: string;
  status: string;
  initialDefinition: WorkflowDefinitionLike;
}) {
  const router = useRouter();
  const initial = useMemo(() => definitionToFlow(initialDefinition), [initialDefinition]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [entryNodeId, setEntryNodeId] = useState(initialDefinition.entryNodeId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<"node" | "edge" | null>(null);
  const [configText, setConfigText] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, data: {} }, eds)), [setEdges]);

  function selectNode(node: Node) {
    setSelectedKind("node");
    setSelectedId(node.id);
    const data = node.data as unknown as WorkflowNodeData;
    setConfigText(JSON.stringify(data.config, null, 2));
    setConfigError(null);
  }

  function selectEdge(edge: Edge) {
    setSelectedKind("edge");
    setSelectedId(edge.id);
    setConfigText((edge.data?.condition as string | undefined) ?? "");
    setConfigError(null);
  }

  function addNode(type: NodeTypeId) {
    const id = generateNodeId(type);
    const newNode: Node = {
      id,
      type: "workflowNode",
      position: { x: 160 + Math.random() * 200, y: 160 + Math.random() * 200 },
      data: { nodeType: type, config: structuredClone(NODE_TEMPLATES[type]), isEntry: false } satisfies WorkflowNodeData,
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function applyConfig() {
    if (selectedKind === "node" && selectedId) {
      try {
        const parsed = JSON.parse(configText);
        setNodes((nds) => nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, config: parsed } } : n)));
        setConfigError(null);
      } catch {
        setConfigError("Invalid JSON.");
      }
    } else if (selectedKind === "edge" && selectedId) {
      setEdges((eds) => eds.map((e) => (e.id === selectedId ? { ...e, label: configText || undefined, data: { condition: configText || undefined } } : e)));
    }
  }

  function deleteSelected() {
    if (selectedKind === "node" && selectedId) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedId));
      setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    } else if (selectedKind === "edge" && selectedId) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedId));
    }
    setSelectedId(null);
    setSelectedKind(null);
  }

  function makeEntry() {
    if (selectedKind === "node" && selectedId) setEntryNodeId(selectedId);
  }

  async function save(publish?: boolean) {
    setSaving(true);
    setMessage(null);
    const definition = flowToDefinition(nodes, edges, entryNodeId);
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ definition, ...(publish !== undefined ? { status: publish ? "published" : "draft" } : {}) }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Failed to save.");
      return;
    }
    setMessage(publish === true ? "Published." : publish === false ? "Unpublished." : "Saved.");
    router.refresh();
  }

  async function runNow() {
    await save();
    const res = await fetch(`/api/workflows/${workflowId}/run`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/workflows/${workflowId}/runs/${data.runId}`);
    } else {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Failed to start run.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{name}</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {status === "published" ? <span className="badge bg-success/15 text-success">published</span> : <span className="badge bg-warning/15 text-warning">draft</span>}
            {message && <span className="ml-2 text-ink-faint">{message}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input w-auto"
            value=""
            onChange={(e) => {
              if (e.target.value) addNode(e.target.value as NodeTypeId);
              e.target.value = "";
            }}
          >
            <option value="">+ Add node...</option>
            {NODE_TYPE_LIST.map((t) => (
              <option key={t} value={t}>
                {NODE_LABELS[t]}
              </option>
            ))}
          </select>
          <button className="btn-secondary" disabled={saving} onClick={() => save()}>
            Save
          </button>
          <button className="btn-secondary" disabled={saving} onClick={() => save(status !== "published")}>
            {status === "published" ? "Unpublish" : "Publish"}
          </button>
          <button className="btn-primary" disabled={saving} onClick={runNow}>
            Run
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="card h-[600px] flex-1 overflow-hidden">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_e, node) => selectNode(node)}
              onEdgeClick={(_e, edge) => selectEdge(edge)}
              onPaneClick={() => {
                setSelectedId(null);
                setSelectedKind(null);
              }}
              colorMode="dark"
              fitView
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        <div className="card w-80 shrink-0 p-4">
          {!selectedId && <p className="text-xs text-ink-faint">Click a node or edge to edit it. Drag from a node's edge to connect it to another.</p>}
          {selectedKind === "node" && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-ink">Node: {selectedId}</div>
              <textarea className="input h-64 font-mono text-xs" value={configText} onChange={(e) => setConfigText(e.target.value)} />
              {configError && <p className="text-xs text-danger">{configError}</p>}
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={applyConfig}>
                  Apply
                </button>
                <button className="btn-secondary" onClick={makeEntry} disabled={entryNodeId === selectedId}>
                  Set as entry
                </button>
                <button className="btn-ghost text-danger" onClick={deleteSelected}>
                  Delete node
                </button>
              </div>
            </div>
          )}
          {selectedKind === "edge" && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-ink">Edge condition (JSONata, optional)</div>
              <p className="text-[11px] text-ink-faint">
                Evaluated against the source node&apos;s output. Leave empty for an unconditional/default edge. First matching conditional edge
                wins.
              </p>
              <input className="input font-mono text-xs" value={configText} onChange={(e) => setConfigText(e.target.value)} placeholder="input.approved = true" />
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={applyConfig}>
                  Apply
                </button>
                <button className="btn-ghost text-danger" onClick={deleteSelected}>
                  Delete edge
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
