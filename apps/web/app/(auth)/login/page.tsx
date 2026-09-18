import Link from "next/link";
import { loginAction } from "@/lib/actions/auth-actions";
import { AuthShell } from "../_components/auth-shell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to keep building your sales agent.">
      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2.5 text-[13px] text-critical">{error}</div>}
      <form action={loginAction} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input className="field" id="email" name="email" type="email" required autoFocus autoComplete="email" />
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
          <input className="field" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button type="submit" className="btn-brand h-11 w-full">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-[13.5px] text-fg-muted">
        No account?{" "}
        <Link href="/signup" className="font-medium text-brand hover:text-brand-hover">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
