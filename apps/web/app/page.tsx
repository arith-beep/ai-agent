import Link from "next/link";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { tenancyRepo } from "@ai-agent/storage";
import { LandingNav } from "./_components/landing/landing-nav";
import { Hero } from "./_components/landing/hero";
import { HowItWorks } from "./_components/landing/how-it-works";
import { Showcase } from "./_components/landing/showcase";
import { CtaSection, LandingFooter } from "./_components/landing/cta-section";

const MANAGER_ROLES = ["owner", "admin", "manager"];

async function resolveDashboardHref(userId: string): Promise<string> {
  try {
    const memberships = await tenancyRepo.listOrgsForUser(userId);
    return MANAGER_ROLES.includes(memberships[0]?.role ?? "") ? "/manager" : "/sales";
  } catch {
    return "/sales";
  }
}

export default async function RootPage() {
  const demo = isDemoMode();
  const session = demo ? null : await auth();
  const authed = Boolean(session?.user?.id);
  const dashboardHref = authed ? await resolveDashboardHref(session!.user!.id!) : "/sales";

  return (
    <div className="min-h-screen bg-paper text-fg">
      {demo && (
        <Link
          href="/sales"
          className="flex items-center justify-center gap-2 bg-brand px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Live demo — click to enter the dashboard, no signup needed →
        </Link>
      )}
      <LandingNav authed={authed} dashboardHref={dashboardHref} />
      <Hero authed={authed} dashboardHref={dashboardHref} />
      <HowItWorks />
      <Showcase />
      <CtaSection authed={authed} dashboardHref={dashboardHref} />
      <LandingFooter />
    </div>
  );
}
