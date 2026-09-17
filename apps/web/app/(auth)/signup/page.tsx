import Link from "next/link";
import { signupAction } from "@/lib/actions/auth-actions";
import { AuthShell } from "../_components/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell title="Build your Sales Agent" subtitle="Create your workspace — takes about a minute.">
      <form action={signupAction} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="orgName">
            Company name
          </label>
          <input className="field" id="orgName" name="orgName" placeholder="Acme Inc." required autoFocus />
        </div>
        <div>
          <label className="field-label" htmlFor="name">
            Your name
          </label>
          <input className="field" id="name" name="name" autoComplete="name" required />
        </div>
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input className="field" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input className="field" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        <button type="submit" className="btn-brand h-11 w-full">
          Create workspace
        </button>
      </form>
      <p className="mt-6 text-center text-[13.5px] text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
