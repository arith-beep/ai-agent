"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { BrowserFrame } from "./browser-frame";
import { HeroDemo } from "./hero-demo";

export function Hero({ authed, dashboardHref }: { authed: boolean; dashboardHref: string }) {
  return (
    <section className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pb-28 md:pt-24">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col justify-center"
      >
        <div className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-hairline bg-panel px-3 py-1 text-[12px] font-medium text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          Built for telesales operations
        </div>
        <h1 className="font-display text-balance text-[40px] font-semibold leading-[1.08] tracking-tight text-fg sm:text-[52px]">
          An AI Sales Manager for your telesales team
        </h1>
        <p className="mt-5 max-w-lg text-balance text-[16.5px] leading-relaxed text-fg-muted">
          A daily assistant for the human manager running the floor. It reads real team activity, drafts a ranked
          morning brief, prepares evidence-backed coaching, and surfaces compliance cases for your review — every
          claim traceable to an actual record, nothing invented.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={authed ? dashboardHref : "/signup"} className="btn-brand h-11 gap-2 px-5 text-[14.5px]">
            {authed ? "Open dashboard" : "Get started"}
            <ArrowRight size={16} strokeWidth={2.25} />
          </Link>
          <a href="#how-it-works" className="btn-outline h-11 gap-2 px-5 text-[14.5px]">
            <PlayCircle size={16} strokeWidth={2.25} />
            See how it works
          </a>
        </div>
        <div className="mt-9 flex items-center gap-5 text-[12.5px] text-fg-faint">
          <span>Compliance always reviewed by a human</span>
          <span className="h-1 w-1 rounded-full bg-hairline" />
          <span>Every claim cites its source</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative"
      >
        <div className="absolute -inset-6 -z-10 rounded-[36px] bg-gradient-to-br from-brand-soft via-transparent to-transparent opacity-70 blur-2xl" />
        <BrowserFrame title="AI Sales Manager">
          <div className="h-[360px] sm:h-[400px]">
            <HeroDemo />
          </div>
        </BrowserFrame>
      </motion.div>
    </section>
  );
}
