"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import {
  ArrowDown,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  MessageSquareText,
  Paperclip,
  Route,
  UserRoundCheck,
} from "lucide-react";

const STAGES = [
  {
    label: "Intake",
    eyebrow: "New customer request",
    title: "Customer work #2048",
    meta: "Northstar Services",
    status: "Ready to coordinate",
    icon: MessageSquareText,
    details: ["Service selected", "Preferred date", "Customer details"],
    note: "Quotes, bookings, intake forms, requests, and service plans become real work.",
  },
  {
    label: "Coordinate",
    eyebrow: "Work scheduled",
    title: "Customer work #2048",
    meta: "Northstar Services",
    status: "Team confirmed",
    icon: CalendarDays,
    details: ["Owner assigned", "Time confirmed", "Missing info resolved"],
    note: "Schedule the work, assign the right people, and resolve what is missing.",
  },
  {
    label: "Deliver",
    eyebrow: "Work in progress",
    title: "Customer work #2048",
    meta: "Northstar Services",
    status: "In motion",
    icon: UserRoundCheck,
    details: ["Team active", "Evidence attached", "Customer updated"],
    note: "Execution, communication, evidence, and deliverables stay connected.",
  },
  {
    label: "Complete",
    eyebrow: "Completed",
    title: "Customer work #2048",
    meta: "Northstar Services",
    status: "Closed out",
    icon: CheckCircle2,
    details: ["Outcome confirmed", "Closeout recorded", "History preserved"],
    note: "Confirm the result, finish closeout, and preserve what happened.",
  },
];

function WorkCard({ stage, reducedMotion }) {
  const Icon = stage.icon;

  return (
    <motion.div
      layout
      className="w-[248px] rounded-[20px] border border-white/[0.09] bg-[#0B1016]/96 p-4 shadow-[0_24px_75px_rgba(0,0,0,.48),0_0_0_1px_rgba(255,255,255,.015)] backdrop-blur-xl"
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 145, damping: 24, mass: 0.9 }
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-[11px] border border-white/[0.075] bg-white/[0.03] text-[#9FB8D0]">
          <Icon className="h-4 w-4" />
        </div>
        <span className="rounded-full border border-[#31506B] bg-[#101C28] px-2.5 py-1 text-[9px] font-medium text-[#A8CBEA]">
          {stage.status}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage.label}
          initial={reducedMotion ? false : { opacity: 0, y: 7, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -5, filter: "blur(2px)" }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#66717D]">
            {stage.eyebrow}
          </p>
          <p className="mt-1.5 text-[15px] font-medium tracking-[-0.025em] text-[#E9EDF1]">
            {stage.title}
          </p>
          <p className="mt-0.5 text-[10px] text-[#6D7884]">{stage.meta}</p>

          <div className="mt-4 space-y-2">
            {stage.details.map((detail) => (
              <div
                key={detail}
                className="flex items-center gap-2 rounded-[10px] border border-white/[0.045] bg-white/[0.018] px-2.5 py-2"
              >
                <CheckCircle2 className="h-3 w-3 text-[#6D9F84]" />
                <span className="text-[9px] text-[#9AA5B0]">{detail}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function DesktopJourney() {
  const journeyRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: journeyRef,
    offset: ["start 78%", "end 32%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (reducedMotion) return;

    // Hold Intake on screen longer so the first state has time to register
    // before the journey advances.
    let next = 0;
    if (value >= 0.36) next = 1;
    if (value >= 0.59) next = 2;
    if (value >= 0.81) next = 3;

    setActive((current) => (current === next ? current : next));
  });

  const activeLeft = 12.5 + active * 25;

  return (
    <div ref={journeyRef} className="relative mt-14 hidden min-h-[540px] lg:block">
      <div className="pointer-events-none absolute inset-x-[4%] top-[106px] h-[260px] rounded-[34px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,.006))]" />
      <div
        className="pointer-events-none absolute inset-x-[4%] top-[106px] h-[260px] rounded-[34px] opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <div className="relative mx-[8%] grid grid-cols-4">
        <div className="absolute left-[12.5%] right-[12.5%] top-[31px] h-px bg-white/[0.085]" />
        <motion.div
          className="absolute left-[12.5%] top-[30px] h-[2px] origin-left bg-[linear-gradient(90deg,#67E8F9,#818CF8_45%,#A855F7_72%,#DB2777)] shadow-[0_0_18px_rgba(129,140,248,.20)]"
          animate={{ width: `${active * 25}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />

        {STAGES.map((stage, index) => (
          <div key={stage.label} className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              className="grid h-[62px] w-[62px] place-items-center rounded-full border"
              animate={
                index <= active
                  ? {
                      borderColor: "rgba(129,140,248,.48)",
                      backgroundColor: "rgba(24,28,40,.96)",
                      boxShadow: "0 0 0 5px rgba(129,140,248,.035), 0 0 26px rgba(129,140,248,.10)",
                    }
                  : {
                      borderColor: "rgba(255,255,255,.08)",
                      backgroundColor: "rgba(11,14,18,.92)",
                      boxShadow: "0 0 0 0 rgba(0,0,0,0)",
                    }
              }
              transition={{ duration: reducedMotion ? 0 : 0.35 }}
            >
              <span
                className={[
                  "text-[12px] font-semibold",
                  index <= active ? "text-[#C7D7E8]" : "text-[#5B6570]",
                ].join(" ")}
              >
                0{index + 1}
              </span>
            </motion.div>
            <p
              className={[
                "mt-3 text-[11px] font-medium transition-colors",
                index <= active ? "text-[#D7DDE4]" : "text-[#66717C]",
              ].join(" ")}
            >
              {stage.label}
            </p>
          </div>
        ))}
      </div>

      <motion.div
        className="absolute top-[164px] -translate-x-1/2"
        animate={{ left: `${activeLeft}%` }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 125, damping: 23, mass: 0.85 }
        }
      >
        <WorkCard stage={STAGES[active]} reducedMotion={reducedMotion} />
      </motion.div>

      <div className="absolute inset-x-[8%] bottom-0 grid grid-cols-4 gap-6">
        {STAGES.map((stage, index) => (
          <motion.p
            key={stage.label}
            className="mx-auto max-w-[220px] text-center text-[10px] leading-5"
            animate={{ color: index === active ? "#9AA6B2" : "#525D68" }}
            transition={{ duration: reducedMotion ? 0 : 0.25 }}
          >
            {stage.note}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

function MobileJourney() {
  return (
    <div className="relative mt-10 space-y-0 lg:hidden">
      <div className="absolute bottom-8 left-[19px] top-8 w-px bg-white/[0.08]" />

      {STAGES.map((stage, index) => {
        const Icon = stage.icon;
        return (
          <motion.div
            key={stage.label}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
            transition={{ duration: 0.42, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid grid-cols-[40px_1fr] gap-4 pb-8"
          >
            <div className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-[#35485B] bg-[#0C131A] text-[#98B4CD]">
              <Icon className="h-4 w-4" />
            </div>
            <div className="rounded-[18px] border border-white/[0.065] bg-[#0B0F14]/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium text-[#E0E5EA]">
                  {stage.label}
                </p>
                <span className="text-[9px] text-[#5F6974]">0{index + 1}</span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-[#C7CFD7]">{stage.eyebrow}</p>
              <p className="mt-1.5 text-[10px] leading-5 text-[#737E89]">{stage.note}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {stage.details.map((detail) => (
                  <span
                    key={detail}
                    className="rounded-full border border-white/[0.055] bg-white/[0.02] px-2 py-1 text-[8.5px] text-[#76818C]"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}

      <div className="ml-14 flex items-center gap-2 text-[10px] text-[#6B7681]">
        <ArrowDown className="h-3.5 w-3.5" />
        One continuous path forward
      </div>
    </div>
  );
}

export default function WhatStudioFlowsIs() {
  return (
    <section
      id="what-it-is"
      className="relative overflow-hidden border-t border-white/[0.045] bg-[#080A0E] py-24 sm:py-28 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(99,102,241,.09),transparent_32%),radial-gradient(circle_at_82%_48%,rgba(34,211,238,.055),transparent_28%),radial-gradient(circle_at_12%_72%,rgba(219,39,119,.045),transparent_30%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.075]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,.24) 0.55px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-[820px] text-center">
          <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/[0.065] bg-white/[0.02] px-3 py-1.5">
            <Route className="h-3.5 w-3.5 text-[#7EA6C8]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#697684]">
              One continuous path
            </span>
          </div>

          <h2 className="font-sans text-[38px] font-medium leading-[1.02] tracking-[-0.045em] text-[#F0F3F6] sm:text-[48px] lg:text-[56px]">
            From intake to completion,
            <span className="block text-[#AAB5C0]">in one system.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-[700px] text-[15px] leading-7 text-[#7E8994] sm:text-[16px]">
            Bring customer work in, coordinate the people and details around it, and carry it through delivery and closeout with the context intact.
          </p>
        </div>

        <DesktopJourney />
        <MobileJourney />

        <div className="mx-auto mt-14 flex max-w-[760px] items-center justify-center gap-2 border-t border-white/[0.055] pt-6 text-center text-[11px] text-[#69747F] lg:mt-12">
          <Paperclip className="h-3.5 w-3.5 text-[#72869A]" />
          <span>
            However your business defines the work, the context stays connected as it moves forward.
          </span>
        </div>
      </div>
    </section>
  );
}
