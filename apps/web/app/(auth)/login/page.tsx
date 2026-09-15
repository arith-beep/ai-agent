import Link from "next/link";
import { loginAction } from "@/lib/actions/auth-actions";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">A</div>
          <h1 className="text-lg font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">to your AI Agent Operating Platform</p>
        </div>
        <form action={loginAction} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required />
          </div>
          <button type="submit" className="btn-primary w-full">Sign in</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          No account? <Link href="/signup" className="text-accent hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
