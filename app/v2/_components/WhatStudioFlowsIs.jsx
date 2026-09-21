"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  MessageSquareText,
  UserRoundCheck,
} from "lucide-react";

const STAGES = [
  {
    number: "01",
    label: "Intake",
    title: "Bring work in.",
    copy: "Quotes, bookings, intake forms, and requests become real work.",
    status: "New request",
    detail: "Customer details captured",
    icon: MessageSquareText,
    image:
      "https://images.unsplash.com/photo-1521579498714-ff08ba4836ab?auto=format&fit=crop&fm=webp&q=78&w=1200",
    imagePosition: "center",
  },
  {
    number: "02",
    label: "Coordinate",
    title: "Get the details aligned.",
    copy: "Schedule it, assign ownership, and resolve what is missing.",
    status: "Owner assigned",
    detail: "Timing + responsibility clear",
    icon: CalendarDays,
    image:
      "https://images.unsplash.com/photo-1758691736872-61a1f75fe2d5?auto=format&fit=crop&fm=webp&q=78&w=1200",
    imagePosition: "center 42%",
  },
  {
    number: "03",
    label: "Deliver",
    title: "Keep work moving.",
    copy: "The team, customer updates, evidence, and deliverables stay connected.",
    status: "In progress",
    detail: "Work + context stay together",
    icon: UserRoundCheck,
    image:
      "https://images.unsplash.com/photo-1758613655322-8dc7822353f0?auto=format&fit=crop&fm=webp&q=78&w=1200",
    imagePosition: "center",
  },
  {
    number: "04",
    label: "Complete",
    title: "Close it out.",
    copy: "Confirm the outcome and keep the full history attached.",
    status: "Completed",
    detail: "Outcome + history preserved",
    icon: CheckCircle2,
    image:
      "https://images.unsplash.com/photo-1744858207706-dd827060504d?auto=format&fit=crop&fm=webp&q=78&w=1200",
    imagePosition: "center",
  },
];

function StageCard({ stage, active = false, desktop = false }) {
  const Icon = stage.icon;

  return (
    <motion.article
      animate={
        desktop
          ? {
              opacity: active ? 1 : 0.38,
              scale: active ? 1 : 0.955,
            }
          : undefined
      }
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "relative shrink-0 snap-center overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0B0F14] shadow-[0_28px_80px_rgba(0,0,0,.28)]",
        desktop ? "w-[520px]" : "w-[82vw] max-w-[360px]",
      ].join(" ")}
    >
      <div className={desktop ? "relative h-[310px]" : "relative h-[250px]"}>
        <img
          src={stage.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ objectPosition: stage.imagePosition }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,10,.04)_0%,rgba(5,7,10,.10)_48%,rgba(7,9,12,.90)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/28 to-transparent" />

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/[0.14] bg-[#080B0F]/72 px-2.5 py-1.5 backdrop-blur-md">
          <span className="text-[10px] font-semibold text-white/92">{stage.number}</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.13em] text-white/62">
            {stage.label}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.10] bg-[#080B0F]/78 px-3 py-2.5 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.09] bg-white/[0.035] text-[#A8C4DC]">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-[#E5EAF0]">{stage.status}</p>
              <p className="mt-0.5 truncate text-[8.5px] text-[#8A96A2]">{stage.detail}</p>
            </div>
          </div>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7EB7E5] shadow-[0_0_10px_rgba(126,183,229,.45)]" />
        </div>
      </div>

      <div className={desktop ? "p-6" : "p-5"}>
        <h3
          className={[
            "font-medium tracking-[-0.035em] text-[#EFF2F5]",
            desktop ? "text-[28px]" : "text-[22px]",
          ].join(" ")}
        >
          {stage.title}
        </h3>
        <p
          className={[
            "mt-2 text-[#7F8994]",
            desktop ? "max-w-[430px] text-[14px] leading-6" : "text-[13px] leading-5",
          ].join(" ")}
        >
          {stage.copy}
        </p>
      </div>
    </motion.article>
  );
}

function Progress({ active }) {
  return (
    <div className="mt-5 flex items-center gap-2" aria-hidden="true">
      {STAGES.map((stage, index) => (
        <div
          key={stage.number}
          className={[
            "h-[2px] flex-1 rounded-full transition-colors duration-300",
            index <= active ? "bg-[#AAB9C7]" : "bg-white/[0.09]",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function MobileJourney() {
  const railRef = useRef(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const node = railRef.current;
    if (!node) return;

    const cards = Array.from(node.querySelectorAll("[data-stage-card]"));
    if (!cards.length) return;

    const center = node.scrollLeft + node.clientWidth / 2;
    let closest = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(center - cardCenter);
      if (distance < closestDistance) {
        closest = index;
        closestDistance = distance;
      }
    });

    setActive((current) => (current === closest ? current : closest));
  }

  return (
    <div className="mt-8 lg:hidden">
      <div
        ref={railRef}
        onScroll={handleScroll}
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STAGES.map((stage, index) => (
          <div key={stage.number} data-stage-card className="shrink-0">
            <StageCard stage={stage} active={index === active} />
          </div>
        ))}
        <div className="w-2 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] tabular-nums text-[#6C7782]">
          {String(active + 1).padStart(2, "0")} / 04
        </span>
        <span className="text-[10px] text-[#59636E]">Swipe</span>
      </div>
      <Progress active={active} />
    </div>
  );
}

function DesktopJourney() {
  const sectionRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (reducedMotion) return;

    let next = 0;
    if (value >= 0.31) next = 1;
    if (value >= 0.53) next = 2;
    if (value >= 0.75) next = 3;

    setActive((current) => (current === next ? current : next));
  });

  return (
    <div ref={sectionRef} className="relative hidden min-h-[145vh] lg:block">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="w-full">
          <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
            <motion.div
              className="flex gap-6"
              style={{
                paddingLeft: "calc(50vw - 260px)",
                paddingRight: "calc(50vw - 260px)",
              }}
              animate={{ x: -(active * 544) }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 115, damping: 25, mass: 0.9 }
              }
            >
              {STAGES.map((stage, index) => (
                <StageCard
                  key={stage.number}
                  stage={stage}
                  active={index === active}
                  desktop
                />
              ))}
            </motion.div>
          </div>

          <div className="mx-auto mt-7 max-w-[520px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tabular-nums text-[#6D7782]">
                {String(active + 1).padStart(2, "0")} / 04
              </span>
              <span className="text-[10px] text-[#59636E]">Customer work moving forward</span>
            </div>
            <Progress active={active} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatStudioFlowsIs() {
  return (
    <section
      id="what-it-is"
      className="relative overflow-hidden border-t border-white/[0.045] bg-[#080A0E] py-20 sm:py-24 lg:pb-0 lg:pt-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(99,102,241,.07),transparent_28%),radial-gradient(circle_at_85%_62%,rgba(34,211,238,.045),transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-10 xl:px-14">
        <div className="max-w-[760px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#64717E]">
            How it works
          </p>

          <h2 className="mt-4 max-w-[720px] font-sans text-[38px] font-medium leading-[1.02] tracking-[-0.045em] text-[#F0F3F6] sm:text-[48px] lg:text-[56px]">
            From intake to completion,
            <span className="block text-[#AAB5C0]">in one system.</span>
          </h2>

          <p className="mt-4 max-w-[610px] text-[14px] leading-6 text-[#7E8994] sm:text-[15px]">
            Customer work comes in, gets coordinated, gets delivered, and gets closed out with the context intact.
          </p>
        </div>

        <MobileJourney />
      </div>

      <DesktopJourney />
    </section>
  );
}
