"use client";

import { useState } from "react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSubmitted(true);
      setResetUrl(data.resetUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        {resetUrl ? (
          <>
            <div className="rounded-pnl border border-caution/30 bg-caution-soft p-3.5 text-[13px] leading-relaxed text-fg">
              <p className="mb-1 font-medium text-caution">No email provider is configured in this environment.</p>
              <p className="text-fg-muted">Rather than pretend to send one, here&rsquo;s your real reset link — it works, and expires in 30 minutes:</p>
            </div>
            <a href={resetUrl} className="block break-all rounded-pnl border border-hairline bg-sunken px-3 py-2.5 font-mono text-[12px] text-brand hover:underline">
              {resetUrl}
            </a>
          </>
        ) : (
          <p className="text-[13.5px] leading-relaxed text-fg-muted">
            If an account exists for that email, a reset link has been created. Check with your workspace admin if you don&rsquo;t have
            access to server logs in this environment.
          </p>
        )}
        <Link href="/login" className="btn-outline block w-full text-center">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2.5 text-[13px] text-critical">{error}</div>}
      <div>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input className="field" id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button type="submit" className="btn-brand h-11 w-full" disabled={submitting}>
        {submitting ? "Sending..." : "Send reset link"}
      </button>
      <Link href="/login" className="block text-center text-[13.5px] font-medium text-fg-muted hover:text-fg">
        Back to sign in
      </Link>
    </form>
  );
}
