import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "../_components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to keep building your sales agent.">
      <LoginForm initialError={error} />
    </AuthShell>
  );
}
