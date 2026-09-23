"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { generateMorningBriefAction } from "@/lib/actions/manager-agent-actions";

// Real LLM generation (evidence-gathering tool calls, then structured synthesis)
// genuinely takes longer than a normal form submit — long enough that this Server
// Action's own completion previously went unnoticed by the browser with no visible
// feedback (the same class of bug fixed in the login flow). 60s gives a real model
// call room to finish before we tell the user something's wrong.
const TIMEOUT_MS = 60000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function GenerateBriefButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    setPending(true);
    try {
      const result = await withTimeout(generateMorningBriefAction(), TIMEOUT_MS);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "TIMEOUT"
          ? "This is taking longer than expected. The model may still be responding — try refreshing in a moment, or try again."
          : "Something went wrong generating the brief. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={pending} className="btn-brand gap-1.5 text-[12.5px]">
        <Sparkles size={13} className={pending ? "animate-pulse" : undefined} />
        {pending ? "Generating…" : "Generate Morning Brief"}
      </button>
      {error && <p className="mt-2 max-w-sm text-[12px] text-critical">{error}</p>}
    </div>
  );
}
