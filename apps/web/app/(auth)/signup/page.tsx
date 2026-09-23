import { AuthShell } from "../_components/auth-shell";
import { SignupForm } from "../_components/signup-form";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <AuthShell title="Build your Sales Agent" subtitle="Create your workspace — takes about a minute.">
      <SignupForm initialError={error} />
    </AuthShell>
  );
}
