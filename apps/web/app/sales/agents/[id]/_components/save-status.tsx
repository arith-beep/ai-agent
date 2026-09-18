"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";
import type { SaveStatus as SaveStatusValue } from "../_hooks/use-autosave";

export function SaveStatusIndicator({ status }: { status: SaveStatusValue }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-faint">
        <Loader2 size={13} className="animate-spin" /> Saving...
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-critical">
        <AlertCircle size={13} /> Couldn&rsquo;t save
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-positive">
      <Check size={13} /> Saved
    </span>
  );
}
