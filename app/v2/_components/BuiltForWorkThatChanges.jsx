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
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MessageSquareText,
  Route,
  ShieldCheck,
  UserRoundCheck,
  Users2,
} from "lucide-react";

const RESOLUTION_STEPS = [
  {
    label: "Change received",
    title: "Customer requested a new date",
    detail: "The work stays intact while the schedule changes.",
    icon: CircleAlert,
    tone: "attention",
  },
  {
    label: "Impact checked",
    title: "Availability and team impact reviewed",
    detail: "The affected people and timing are identified before anything moves.",
    icon: Users2,
    tone: "neutral",
  },
  {
    label: "Prepared",
    title: "Customer update and calendar change ready",
    detail: "Eva and Vessa prepare the coordination around the change.",
    icon: MessageSquareText,
    tone: "neutral",
  },
  {
    label: "Human decision",
    title: "Approval requested",
    detail: "The change pauses where human authority is required.",
    icon: ShieldCheck,
    tone: "decision",
  },
  {
    label: "Reconnected",
    title: "Schedule updated. Work continues.",
    detail: "The same customer work resumes with its context preserved.",
    icon: CheckCircle2,
    tone: "resolved",
  },
];

const EXCEPTION_CHIPS = [
  "Schedule change",
  "Missing information",
  "Scope change",
  "Closeout follow-up",
];

function StatusPill({ tone, children }) {
  const classes =
    tone === "attention"
      ? "border-[#665124] bg-[#2A2111] text-[#E0C06F]"
      : tone === "decision"
        ? "border-[#5A4724] bg-[#241C10] text-[#D9B967]"
        : tone === "resolved"
          ? "border-[#28523B] bg-[#10271C] text-[#94D7B0]"
          : "border-white/[0.07] bg-white/[0.025] text-[#8E99A5]";

  return (
    <span className={"rounded-full border px-2.5 py-1 text-[9px] font-medium " + classes}>
      {children}
    </span>
  );
}

function OperationLine({ active, reducedMotion }) {
  const exceptionResolved = active >= 4;

  return (
    <div className="relative mx-auto mt-8 hidden h-[130px] max-w-[900px] lg:block">
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 900 130"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M60 65 H345"
          stroke="rgba(255,255,255,.11)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M555 65 H840"
          stroke="rgba(255,255,255,.11)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M345 65 C390 65 390 102 450 102 C510 102 510 65 555 65"
          stroke="rgba(255,255,255,.08)"
          strokeWidth="2"
          strokeDasharray="5 8"
          strokeLinecap="round"
        />
        <motion.path
          d="M60 65 H345 C390 65 390 102 450 102 C510 102 510 65 555 65 H840"
          stroke="url(#sf-change-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={false}
          animate={{
            pathLength: exceptionResolved ? 1 : Math.min(0.73, 0.18 + active * 0.14),
            opacity: active === 0 ? 0.4 : 0.95,
          }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
          }
        />
        <defs>
          <linearGradient id="sf-change-gradient" x1="60" y1="65" x2="840" y2="65">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="42%" stopColor="#818CF8" />
            <stop offset="68%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#67D7A0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute left-[6.5%] top-[43px] -translate-x-1/2">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.10] bg-[#0D1218] text-[#83909D]">
          <Route className="h-4 w-4" />
        </div>
        <p className="mt-2 whitespace-nowrap text-center text-[9px] text-[#5E6974]">Normal path</p>
      </div>

      <motion.div
        className="absolute left-1/2 top-[80px] -translate-x-1/2"
        animate={{
          y: active >= 1 ? 0 : -9,
          scale: active >= 1 ? 1 : 0.92,
          opacity: active >= 1 ? 1 : 0.62,
        }}
        transition={{ duration: reducedMotion ? 0 : 0.35 }}
      >
        <div className="grid h-11 w-11 place-items-center rounded-full border border-[#665124] bg-[#2A2111] text-[#E0C06F] shadow-[0_0_30px_rgba(224,192,111,.12)]">
          <CalendarClock className="h-4 w-4" />
        </div>
        <p className="mt-2 whitespace-nowrap text-center text-[9px] text-[#9E8750]">Schedule changed</p>
      </motion.div>

      <motion.div
        className="absolute right-[6.5%] top-[43px] translate-x-1/2"
        animate={{
          borderColor: exceptionResolved ? "rgba(68,141,101,.55)" : "rgba(255,255,255,.10)",
          backgroundColor: exceptionResolved ? "rgba(16,39,28,.96)" : "rgba(13,18,24,.96)",
          color: exceptionResolved ? "#96D8B2" : "#77838F",
          boxShadow: exceptionResolved
            ? "0 0 28px rgba(103,215,160,.10)"
            : "0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ duration: reducedMotion ? 0 : 0.45 }}
        style={{ borderWidth: 1, borderStyle: "solid" }}
        className="absolute right-[6.5%] top-[43px] grid h-11 w-11 translate-x-1/2 place-items-center rounded-full"
      >
        <CheckCircle2 className="h-4 w-4" />
      </motion.div>
      <p
        className={[
          "absolute right-[6.5%] top-[96px] translate-x-1/2 whitespace-nowrap text-center text-[9px]",
          exceptionResolved ? "text-[#78A98D]" : "text-[#5E6974]",
        ].join(" ")}
      >
        Work continues
      </p>
    </div>
  );
}

function ResolutionPanel({ active, reducedMotion }) {
  const stage = RESOLUTION_STEPS[active];
  const Icon = stage.icon;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0A0E13]/96 p-5 shadow-[0_30px_100px_rgba(0,0,0,.38)] sm:p-6 lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(129,140,248,.07),transparent_28%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,.05),transparent_26%)]" />

      <div className="relative flex items-center justify-between gap-4 border-b border-white/[0.055] pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[12px] border border-white/[0.07] bg-white/[0.025] text-[#9CADBE]">
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#DDE3E9]">Customer work #2048</p>
            <p className="mt-0.5 text-[9px] text-[#626D78]">Northstar Services · active work</p>
          </div>
        </div>

        <StatusPill tone={stage.tone}>{stage.label}</StatusPill>
      </div>

      <div className="relative grid gap-6 pt-6 lg:grid-cols-[.88fr_1.12fr] lg:gap-8">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#5D6873]">
            What changed
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stage.label}
              initial={reducedMotion ? false : { opacity: 0, y: 10, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -7, filter: "blur(2px)" }}
              transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border",
                    stage.tone === "attention" || stage.tone === "decision"
                      ? "border-[#5D4C29] bg-[#251E12] text-[#D7B968]"
                      : stage.tone === "resolved"
                        ? "border-[#28523B] bg-[#10271C] text-[#94D7B0]"
                        : "border-white/[0.07] bg-white/[0.025] text-[#97A4B0]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[17px] font-medium leading-6 tracking-[-0.025em] text-[#E7EBEF]">
                    {stage.title}
                  </p>
                  <p className="mt-2 max-w-[360px] text-[11px] leading-5 text-[#707B86]">
                    {stage.detail}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 flex flex-wrap gap-1.5">
            {EXCEPTION_CHIPS.map((chip, index) => (
              <span
                key={chip}
                className={[
                  "rounded-full border px-2.5 py-1 text-[8.5px]",
                  index === 0
                    ? "border-[#594825] bg-[#241D11] text-[#CBAE62]"
                    : "border-white/[0.055] bg-white/[0.018] text-[#626D78]",
                ].join(" ")}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/[0.055] bg-[#080C10]/80 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#5C6772]">
              Coordination
            </p>
            <span className="text-[8.5px] text-[#56616C]">Vessa + Eva</span>
          </div>

          <div className="mt-4 space-y-2">
            {RESOLUTION_STEPS.slice(1).map((item, index) => {
              const stepIndex = index + 1;
              const complete = active >= stepIndex;
              const current = active === stepIndex;
              return (
                <motion.div
                  key={item.label}
                  className={[
                    "flex items-center gap-3 rounded-[12px] border px-3 py-2.5",
                    current
                      ? "border-[#3B5065] bg-[#101A24]"
                      : complete
                        ? "border-[#274735] bg-[#0E1E16]"
                        : "border-white/[0.045] bg-white/[0.012]",
                  ].join(" ")}
                  animate={{
                    opacity: active === 0 ? 0.52 : complete || current ? 1 : 0.58,
                    x: current && !reducedMotion ? [0, 3, 0] : 0,
                  }}
                  transition={{ duration: reducedMotion ? 0 : 0.35 }}
                >
                  <div
                    className={[
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                      complete
                        ? "border-[#356147] bg-[#10271C] text-[#8AD0A7]"
                        : current
                          ? "border-[#4C657C] bg-[#11202D] text-[#A5C7E5]"
                          : "border-white/[0.06] bg-white/[0.015] text-[#59636E]",
                    ].join(" ")}
                  >
                    {complete ? <Check className="h-3 w-3" /> : <span className="text-[8px]">{stepIndex}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "truncate text-[9.5px] font-medium",
                        complete || current ? "text-[#C9D1D9]" : "text-[#646F7A]",
                      ].join(" ")}
                    >
                      {item.title}
                    </p>
                  </div>
                  {current && item.tone === "decision" ? (
                    <span className="rounded-full border border-[#594825] bg-[#241D11] px-2 py-1 text-[8px] text-[#D1B366]">
                      Needs you
                    </span>
                  ) : null}
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="mt-4 rounded-[12px] border p-3"
            animate={{
              borderColor: active >= 4 ? "rgba(54,107,77,.65)" : "rgba(255,255,255,.05)",
              backgroundColor: active >= 4 ? "rgba(14,30,22,.9)" : "rgba(255,255,255,.012)",
            }}
            transition={{ duration: reducedMotion ? 0 : 0.45 }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-medium text-[#87939E]">Operational state</span>
              <span
                className={[
                  "text-[9px] font-medium",
                  active >= 4 ? "text-[#8CCBA5]" : "text-[#737E89]",
                ].join(" ")}
              >
                {active >= 4 ? "Reconnected" : "Resolving"}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function DesktopExceptionStory() {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["center 58%", "end 18%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (reducedMotion) return;

    let next = 0;
    if (value >= 0.28) next = 1;
    if (value >= 0.48) next = 2;
    if (value >= 0.67) next = 3;
    if (value >= 0.84) next = 4;

    setActive((current) => (current === next ? current : next));
  });

  return (
    <div ref={ref} className="mt-14 hidden min-h-[700px] lg:block">
      <OperationLine active={active} reducedMotion={reducedMotion} />
      <div className="mx-auto mt-4 max-w-[980px]">
        <ResolutionPanel active={active} reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}

function MobileExceptionStory() {
  return (
    <div className="mt-10 space-y-4 lg:hidden">
      <div className="rounded-[18px] border border-[#5E4A26] bg-[#211A0E] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-[11px] border border-[#665124] bg-[#2A2111] text-[#E0C06F]">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#8E7743]">Schedule changed</p>
            <p className="mt-1 text-[13px] font-medium text-[#DFE4E8]">Customer requested a new date</p>
          </div>
        </div>
      </div>

      {RESOLUTION_STEPS.slice(1).map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
            transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="relative ml-4 border-l border-white/[0.07] pl-6"
          >
            <div
              className={[
                "absolute -left-[17px] top-3 grid h-8 w-8 place-items-center rounded-full border",
                item.tone === "decision"
                  ? "border-[#5A4724] bg-[#241C10] text-[#D9B967]"
                  : item.tone === "resolved"
                    ? "border-[#28523B] bg-[#10271C] text-[#94D7B0]"
                    : "border-[#374959] bg-[#101922] text-[#9CB7CF]",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-[16px] border border-white/[0.055] bg-[#0B0F14] p-4">
              <p className="text-[9px] font-medium text-[#6A7580]">{item.label}</p>
              <p className="mt-1 text-[12px] font-medium text-[#D4DAE0]">{item.title}</p>
              <p className="mt-1.5 text-[10px] leading-5 text-[#6D7883]">{item.detail}</p>
            </div>
          </motion.div>
        );
      })}

      <div className="mt-5 flex items-center gap-2 rounded-[16px] border border-[#28523B] bg-[#0E1D16] px-4 py-3 text-[10px] text-[#83B99A]">
        <CheckCircle2 className="h-4 w-4" />
        Same work. Updated context. Moving again.
      </div>
    </div>
  );
}

export default function BuiltForWorkThatChanges() {
  return (
    <section
      id="work-that-changes"
      className="relative overflow-hidden border-t border-white/[0.045] bg-[#07090D] py-24 sm:py-28 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(217,185,103,.055),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(168,85,247,.065),transparent_30%),radial-gradient(circle_at_70%_75%,rgba(34,211,238,.045),transparent_28%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(to bottom, black, transparent 88%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-[840px] text-center">
          <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/[0.065] bg-white/[0.02] px-3 py-1.5">
            <CircleAlert className="h-3.5 w-3.5 text-[#B3975A]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#746A54]">
              Built for real operations
            </span>
          </div>

          <h2 className="font-sans text-[38px] font-medium leading-[1.02] tracking-[-0.045em] text-[#F0F3F6] sm:text-[48px] lg:text-[56px]">
            Work changes.
            <span className="block bg-[linear-gradient(100deg,#E7D49B_0%,#B7C7E6_35%,#8FAEEA_64%,#A855F7_100%)] bg-clip-text text-transparent">
              StudioFlows stays with it.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-[760px] text-[15px] leading-7 text-[#7F8994] sm:text-[16px]">
            Schedules move. Information goes missing. Customers ask for updates. Scope changes.
            StudioFlows keeps the work, people, and next steps connected as operations change around them.
          </p>

          <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.018] px-3.5 py-2 text-[10px] text-[#7A8590]">
            <span>The workflow handles the expected path.</span>
            <ArrowRight className="h-3 w-3 text-[#58636E]" />
            <span className="text-[#A8B5C2]">AI helps coordinate the messy path.</span>
          </div>
        </div>

        <DesktopExceptionStory />
        <MobileExceptionStory />

        <div className="mx-auto mt-12 flex max-w-[760px] items-center justify-center gap-2 border-t border-white/[0.055] pt-6 text-center text-[11px] text-[#6B7681]">
          <UserRoundCheck className="h-3.5 w-3.5 text-[#7892A9]" />
          <span>The plan can change without losing the thread.</span>
        </div>
      </div>
    </section>
  );
}
