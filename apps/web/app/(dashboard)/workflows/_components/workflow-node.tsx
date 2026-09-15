"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_COLORS, NODE_LABELS, type NodeTypeId } from "./node-types";

export interface WorkflowNodeData {
  nodeType: NodeTypeId;
  config: Record<string, unknown>;
  isEntry?: boolean;
  [key: string]: unknown;
}

export function WorkflowNodeView({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const color = NODE_COLORS[nodeData.nodeType];

  return (
    <div
      className="rounded-md border bg-surface-raised px-3 py-2 text-xs shadow-sm"
      style={{ borderColor: selected ? color : "#26262c", minWidth: 160, boxShadow: selected ? `0 0 0 1px ${color}` : undefined }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span className="font-medium text-ink">{NODE_LABELS[nodeData.nodeType]}</span>
        {nodeData.isEntry && <span className="badge bg-success/15 text-success">entry</span>}
      </div>
      <div className="mt-0.5 truncate font-mono text-[10px] text-ink-faint">{id}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}
