"use client";

import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Debounced autosave: calls `save(value)` `delay`ms after the last change, tracking a small status for UI feedback. */
export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, delay = 900) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstRun = useRef(true);
  const latestValue = useRef(value);
  latestValue.current = value;

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    clearTimeout(timerRef.current);
    clearTimeout(savedTimerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await save(latestValue.current);
        setStatus("saved");
        savedTimerRef.current = setTimeout(() => setStatus("idle"), 2200);
      } catch {
        setStatus("error");
      }
    }, delay);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return status;
}
