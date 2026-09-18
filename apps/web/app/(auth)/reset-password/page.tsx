import { AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "./_components/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" subtitle="Make it at least 8 characters.">
      <ResetPasswordForm token={token ?? null} />
    </AuthShell>
  );
}
