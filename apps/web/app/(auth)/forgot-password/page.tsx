import { AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter the email on your account.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
