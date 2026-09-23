"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CtaSection({ authed, dashboardHref }: { authed: boolean; dashboardHref: string }) {
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
          Give your sales managers a daily edge, grounded in real data
        </h2>
        <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted">
          Morning briefs, coaching prep, and compliance visibility — every claim traceable to a real record, every
          decision still yours.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href={authed ? dashboardHref : "/signup"} className="btn-brand h-11 gap-2 px-6 text-[14.5px]">
            {authed ? "Open dashboard" : "Get started"}
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
        <span>© {new Date().getFullYear()} AI Sales Manager</span>
        <span>Built for sales managers who need the real numbers, not a summary.</span>
      </div>
    </footer>
  );
}
