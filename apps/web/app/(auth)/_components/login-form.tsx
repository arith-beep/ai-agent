"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth-actions";

const TIMEOUT_MS = 15000;

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

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await withTimeout(loginAction(formData), TIMEOUT_MS);
      if (result.ok) {
        router.push(result.destination);
        // Intentionally leave `pending` true — a full navigation is underway,
        // and flipping the button back to its idle state here would flash
        // "Sign in" for a moment before the new page takes over.
      } else {
        setError(result.error);
        setPending(false);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "TIMEOUT"
          ? "This is taking longer than expected. Please check your connection and try again."
          : "Something went wrong. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <>
      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2.5 text-[13px] text-critical">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input className="field" id="email" name="email" type="email" required autoFocus autoComplete="email" disabled={pending} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="mb-1.5 text-[12.5px] font-medium text-brand hover:text-brand-hover">
              Forgot password?
            </Link>
          </div>
          <input className="field" id="password" name="password" type="password" required autoComplete="current-password" disabled={pending} />
        </div>
        <button type="submit" className="btn-brand h-11 w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-[13.5px] text-fg-muted">
        No account?{" "}
        <Link href="/signup" className="font-medium text-brand hover:text-brand-hover">
          Create one
        </Link>
      </p>
    </>
  );
}
