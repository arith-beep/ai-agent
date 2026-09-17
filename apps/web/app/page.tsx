import { auth } from "@/lib/auth";
import { LandingNav } from "./_components/landing/landing-nav";
import { Hero } from "./_components/landing/hero";
import { HowItWorks } from "./_components/landing/how-it-works";
import { Showcase } from "./_components/landing/showcase";
import { CtaSection, LandingFooter } from "./_components/landing/cta-section";

export default async function RootPage() {
  const session = await auth();
  const authed = Boolean(session?.user?.id);

  return (
    <div className="min-h-screen bg-paper text-fg">
      <LandingNav authed={authed} />
      <Hero authed={authed} />
      <HowItWorks />
      <Showcase />
      <CtaSection authed={authed} />
      <LandingFooter />
    </div>
  );
}
