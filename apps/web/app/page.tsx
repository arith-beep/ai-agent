import Link from "next/link";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { LandingNav } from "./_components/landing/landing-nav";
import { Hero } from "./_components/landing/hero";
import { HowItWorks } from "./_components/landing/how-it-works";
import { Showcase } from "./_components/landing/showcase";
import { CtaSection, LandingFooter } from "./_components/landing/cta-section";

export default async function RootPage() {
  const demo = isDemoMode();
  const session = demo ? null : await auth();
  const authed = Boolean(session?.user?.id);

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
      <LandingNav authed={authed} />
      <Hero authed={authed} />
      <HowItWorks />
      <Showcase />
      <CtaSection authed={authed} />
      <LandingFooter />
    </div>
  );
}
