"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2.5 text-[13px] text-critical">
          This reset link is missing its token. Request a new one.
        </div>
        <Link href="/forgot-password" className="btn-outline block w-full text-center">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return <p className="text-center text-[13.5px] text-fg-muted">Password updated — taking you to sign in...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2.5 text-[13px] text-critical">{error}</div>}
      <div>
        <label className="field-label" htmlFor="password">
          New password
        </label>
        <input
          className="field"
          id="password"
          type="password"
          minLength={8}
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-brand h-11 w-full" disabled={submitting}>
        {submitting ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
