"use client";

import { motion } from "framer-motion";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-sunken text-fg-muted" },
  processing: { label: "Processing", className: "bg-brand-soft text-brand" },
  ready: { label: "Ready", className: "bg-positive-soft text-positive" },
  failed: { label: "Failed", className: "bg-critical-soft text-critical" },
};

function PulseDot({ className }: { className: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5 items-center justify-center">
      <motion.span
        className={`absolute h-1.5 w-1.5 rounded-full ${className}`}
        animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.2, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className={`h-1.5 w-1.5 rounded-full ${className}`} />
    </span>
  );
}

export function SourceStatusChip({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-sunken text-fg-muted" };
  return (
    <span className={`chip ${config.className}`}>
      {status === "processing" && <PulseDot className="bg-brand" />}
      {config.label}
    </span>
  );
}

const COUNT_TONE: Record<string, string> = {
  ready: "bg-positive-soft text-positive",
  processing: "bg-brand-soft text-brand",
  pending: "bg-sunken text-fg-muted",
  failed: "bg-critical-soft text-critical",
};

export function SourceCountChip({
  tone,
  count,
  label,
}: {
  tone: "ready" | "processing" | "pending" | "failed";
  count: number;
  label: string;
}) {
  return (
    <span className={`chip ${COUNT_TONE[tone]}`}>
      {tone === "processing" && <PulseDot className="bg-brand" />}
      {count} {label}
    </span>
  );
}
