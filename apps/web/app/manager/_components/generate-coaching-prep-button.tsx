"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { generateCoachingPrepAction } from "@/lib/actions/manager-agent-actions";

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

export function GenerateCoachingPrepButton({ repId }: { repId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("repId", repId);
      const result = await withTimeout(generateCoachingPrepAction(formData), TIMEOUT_MS);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "TIMEOUT"
          ? "This is taking longer than expected. The model may still be responding — try refreshing in a moment, or try again."
          : "Something went wrong generating the coaching prep. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button type="button" onClick={handleClick} disabled={pending} className="btn-outline gap-1.5 text-[12px]">
        <Sparkles size={13} className={pending ? "animate-pulse" : undefined} />
        {pending ? "Preparing…" : "Prepare with AI"}
      </button>
      {error && <p className="mt-2 max-w-xs text-[12px] text-critical">{error}</p>}
    </div>
  );
}
