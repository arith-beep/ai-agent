import Link from "next/link";
import { signupAction } from "@/lib/actions/auth-actions";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">A</div>
          <h1 className="text-lg font-semibold text-ink">Create your organization</h1>
          <p className="mt-1 text-sm text-ink-muted">Set up your AI Agent Operating Platform</p>
        </div>
        <form action={signupAction} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="orgName">Organization name</label>
            <input className="input" id="orgName" name="orgName" placeholder="Acme Inc." required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input className="input" id="name" name="name" required />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" minLength={8} required />
          </div>
          <button type="submit" className="btn-primary w-full">Create organization</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
