import { requireCurrentContext } from "@/lib/session";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export default async function OnboardingPage() {
  const ctx = await requireCurrentContext();

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center py-10">
      <OnboardingWizard userName={ctx.userName} />
    </div>
  );
}
