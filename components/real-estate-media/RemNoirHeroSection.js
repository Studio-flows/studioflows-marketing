"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { REM_COPY, REM_HERO_JOBS } from "@/lib/real-estate-media/rem-landing-content";
import {
  RemPrimaryCta,
  RemSecondaryCta,
  RemTerminalChrome,
  useRemReducedMotion,
} from "@/components/real-estate-media/rem-noir-primitives";
import {
  REM_BODY,
  REM_BODY_SM,
  REM_EYEBROW,
  REM_FLAG_PRESSURE,
  REM_FLAG_WARN,
} from "@/components/real-estate-media/rem-noir-tokens";

function HeroJobCard({ job, pulse }) {
  const border =
    job.tone === "warn"
      ? "border-red-900/50"
      : job.tone === "pressure"
        ? "border-red-800/40"
        : "border-zinc-800";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded border ${border} bg-zinc-950/90 px-3 py-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-100">{job.address}</p>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
          {job.hoursLeft}h
        </span>
      </div>
      <p className={`mt-1 ${REM_BODY_SM}`}>{job.package}</p>
      <p className="mt-2 text-xs text-zinc-500">{job.status}</p>
      {job.flag ? (
        <motion.p
          className={`mt-2 font-mono text-[10px] uppercase tracking-[0.14em] ${
            job.tone === "warn" ? REM_FLAG_WARN : REM_FLAG_PRESSURE
          }`}
          animate={pulse ? { opacity: [0.55, 1, 0.55] } : { opacity: 1 }}
          transition={pulse ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
        >
          ▲ {job.flag}
        </motion.p>
      ) : null}
    </motion.div>
  );
}

function HeroCtas({ mobile = false }) {
  return (
    <div className={mobile ? "space-y-3" : "flex flex-col gap-3 sm:flex-row sm:items-center"}>
      <RemPrimaryCta
        href={REM_COPY.hero.ctaHref}
        ctaId="hero_start_demo"
        className={mobile ? "w-full" : ""}
      >
        {REM_COPY.hero.cta}
      </RemPrimaryCta>
      <RemSecondaryCta
        href={REM_COPY.hero.secondaryHref}
        ctaId="hero_ops_teardown"
        className={mobile ? "block text-center" : ""}
      >
        {REM_COPY.hero.secondaryCta}
      </RemSecondaryCta>
    </div>
  );
}

export function RemNoirHeroSection() {
  const reduce = useRemReducedMotion();
  const [jobIndex, setJobIndex] = useState(0);
  const [waitingCount, setWaitingCount] = useState(2);

  useEffect(() => {
    if (reduce) return undefined;
    const tick = window.setInterval(() => {
      setJobIndex((i) => (i + 1) % REM_HERO_JOBS.length);
      setWaitingCount((c) => (c >= 4 ? 2 : c + 1));
    }, 4200);
    return () => window.clearInterval(tick);
  }, [reduce]);

  const activeJob = REM_HERO_JOBS[jobIndex];

  return (
    <section id="hero" className="pb-8 pt-6 lg:pb-12 lg:pt-10">
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-12 xl:gap-16">
        <div className="order-1 max-w-xl">
          <p className={REM_EYEBROW}>{REM_COPY.hero.eyebrow}</p>
          <h1 className="mt-4 text-[1.45rem] font-medium leading-[1.12] tracking-tight text-zinc-50 lg:text-[2.65rem] lg:leading-[1.06]">
            {REM_COPY.hero.headline}
          </h1>
          <div className={`mt-4 space-y-3 lg:mt-5 ${REM_BODY}`}>
            {REM_COPY.hero.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="mt-6 hidden lg:mt-8 lg:block">
            <HeroCtas />
            <p className="mt-3 text-xs text-zinc-600">{REM_COPY.hero.ctaNote}</p>
          </div>
        </div>

        <div className="order-2 mt-6 lg:order-none lg:mt-0">
          <RemTerminalChrome
            title="media_ops.queue"
            right={`${waitingCount} ${REM_COPY.hero.jobsLabel}`}
          >
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {REM_HERO_JOBS.map((job) => (
                  <HeroJobCard
                    key={job.id}
                    job={job}
                    pulse={!reduce && job.id === activeJob.id && Boolean(job.flag)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </RemTerminalChrome>
        </div>

        <div className="order-3 mt-6 lg:hidden">
          <HeroCtas mobile />
          <p className="mt-3 text-center text-xs text-zinc-600">{REM_COPY.hero.ctaNote}</p>
        </div>
      </div>
    </section>
  );
}
