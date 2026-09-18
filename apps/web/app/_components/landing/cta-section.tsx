"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CtaSection({ authed }: { authed: boolean }) {
  return (
    <section className="border-t border-hairline py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl px-5 text-center"
      >
        <h2 className="font-display text-balance text-[30px] font-semibold tracking-tight text-fg sm:text-[38px]">
          Your next qualified lead shouldn&rsquo;t wait for business hours
        </h2>
        <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted">
          Build an agent that knows your product, qualifies on your terms, and hands off to your team exactly when it should.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href={authed ? "/sales" : "/signup"} className="btn-brand h-11 gap-2 px-6 text-[14.5px]">
            Build your Sales Agent
            <ArrowRight size={16} strokeWidth={2.25} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-hairline py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-[12.5px] text-fg-faint sm:flex-row">
        <span>© {new Date().getFullYear()} Sales Agent Builder</span>
        <span>Built for teams who don&rsquo;t want to lose a lead overnight.</span>
      </div>
    </footer>
  );
}
