"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { REM_DEMO_HREF, REM_OPS_TEARDOWN_HREF } from "@/lib/real-estate-media/rem-landing-content";
import { captureRemAttributionForPath, REM_LANDING_PATH } from "@/lib/real-estate-media/remLeadAttribution";
import { HERO_STUDIO_TEAM } from "@/lib/real-estate-media/media-assets/hero-studio-team";
import { CLIENT_ONSITE } from "@/lib/real-estate-media/media-assets/client-onsite";
import { CALENDAR } from "@/lib/real-estate-media/media-assets/calendar";
import { FIELD_DRONE } from "@/lib/real-estate-media/media-assets/field-drone";
import { TEAM_JOB_HANDOFF } from "@/lib/real-estate-media/media-assets/team-job-handoff";
import { EDITING_BAY } from "@/lib/real-estate-media/media-assets/editing-bay";
import { JOB_COCKPIT } from "@/lib/real-estate-media/media-assets/job-cockpit";

const LOGO = "/StudioFlows logo white (1200 x 675 px).png";
const PRODUCT_DASHBOARD = "/product/dashboard.png";

const primary = "inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(251,146,60,.25)] transition hover:-translate-y-0.5 hover:bg-orange-50";
const darkPrimary = "inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(15,23,42,.22)] transition hover:-translate-y-0.5 hover:bg-slate-800";
const secondary = "inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15";

const pain = [
  "Agent texts again: are the photos going out today?",
  "Editor is blocked because drone clips never landed.",
  "Who owns tomorrow's twilight shoot?",
  "The floor plan is missing and delivery is due.",
  "The split shoot moved. Crew coverage did not.",
  "The package changed. Post is working from old notes.",
  "You are still the only person who knows if payment cleared.",
];

const journey = [
  {
    id: "booked",
    step: "01",
    label: "Booked",
    image: CLIENT_ONSITE,
    eyebrow: "The client moment",
    title: "The agent books once. The job record carries the truth forward.",
    body: "Client, property, package, appointment, access notes, special requests, and payment status start on the same record.",
    facts: ["Dayna Restaino", "350 Barbados Drive", "Photo · Drone · Video · Floor plan"],
  },
  {
    id: "scheduled",
    step: "02",
    label: "Scheduled",
    image: CALENDAR,
    eyebrow: "Scheduling and coverage",
    title: "The calendar knows more than the appointment time.",
    body: "It shows who is assigned, which roles the package requires, drive time, shoot duration, split visits, and coverage gaps.",
    facts: ["Crew assigned", "Travel buffer included", "No silent conflicts"],
    inspectable: true,
    fit: "contain",
  },
  {
    id: "field",
    step: "03",
    label: "Field",
    image: FIELD_DRONE,
    eyebrow: "Field production",
    title: "The field team sees what it needs. The owner sees what actually happened.",
    body: "Crew checks the brief, confirms equipment, updates status, starts raw upload, and flags missing work from the property.",
    facts: ["Drone required", "Field owner confirmed", "Raw upload started"],
  },
  {
    id: "handoff",
    step: "04",
    label: "Handoff",
    image: TEAM_JOB_HANDOFF,
    eyebrow: "Team handoff",
    title: "Every handoff stays attached to the job—not buried in another thread.",
    body: "Phase ownership, comments, customer notes, files, activity, and the next action remain visible to the whole team.",
    facts: ["Field complete", "Post owner assigned", "Next action visible"],
  },
  {
    id: "post",
    step: "05",
    label: "Post",
    image: EDITING_BAY,
    eyebrow: "Post-production",
    title: "Editors do not start by asking where everything is.",
    body: "Raw upload, editor handoff, draft review, internal QC, revisions, and delivery readiness move through one visible pipeline.",
    facts: ["27 raw files", "Editor drafts ready", "QC pending"],
  },
  {
    id: "delivery",
    step: "06",
    label: "Delivery",
    image: JOB_COCKPIT,
    eyebrow: "Delivery and completion",
    title: "One job record shows what is done, what is waiting, and who owns the next move.",
    body: "The team can see lifecycle stage, deliverables, client status, comments, activity, invoice state, and final release without reconstructing the story.",
    facts: ["QC approved", "Agent updated", "Ready for release"],
    inspectable: true,
    fit: "contain",
  },
];

const mobileScreens = [
  "/img_1426_720.png",
  "/img_1427_720.png",
  "/img_1428_720.png",
  "/img_1429_720.png",
  "/img_1430_720.png",
  "/img_1431_720.png",
  "/img_1432_720.png",
  "/img_1433_720.png",
  "/img_1434_720.png",
  "/img_1436_720.png",
  "/img_1437_720.png",
  "/img_1438_720.png",
];

function useReveal() {
  const reduce = useReducedMotion();
  return useMemo(() => ({
    initial: reduce ? false : { opacity: 0, y: 30 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-90px" },
    transition: { duration: .72, ease: [0.22, 1, 0.36, 1] },
  }), [reduce]);
}

function Reveal({ children, className = "", delay = 0 }) {
  const props = useReveal();
  return <motion.div {...props} transition={{ ...props.transition, delay }} className={className}>{children}</motion.div>;
}

function MagnifyIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  );
}

function ProductMedia({ src, alt, fit = "cover", onInspect, className = "" }) {
  return (
    <button
      type="button"
      onClick={() => onInspect({ src, alt, fit })}
      className={`group relative block w-full cursor-zoom-in overflow-hidden text-left ${className}`}
      aria-label={`Enlarge ${alt}`}
    >
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain bg-slate-950" : "object-cover"}`}
      />
      <div className="absolute inset-0 bg-slate-950/0 transition duration-300 group-hover:bg-slate-950/22" />
      <div className="absolute right-4 top-4 flex h-11 w-11 translate-y-1 items-center justify-center rounded-full border border-white/20 bg-slate-950/70 text-white opacity-0 shadow-xl backdrop-blur-xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <MagnifyIcon className="h-5 w-5" />
      </div>
      <div className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-white opacity-0 backdrop-blur-xl transition group-hover:opacity-100 group-focus-visible:opacity-100">
        Inspect product
      </div>
    </button>
  );
}

function Lightbox({ image, onClose }) {
  useEffect(() => {
    if (!image) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [image, onClose]);

  return (
    <AnimatePresence>
      {image ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/94 p-3 backdrop-blur-xl sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={image.alt}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: .96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .98, y: 10 }}
            transition={{ duration: .28 }}
            className="relative flex max-h-[92vh] w-full max-w-[1500px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/12 bg-black shadow-[0_40px_140px_rgba(0,0,0,.65)]"
          >
            <img src={image.src} alt={image.alt} className="max-h-[92vh] w-full object-contain" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-xl text-white backdrop-blur-xl transition hover:bg-slate-900"
              aria-label="Close enlarged product image"
            >
              ×
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/82 shadow-[0_14px_44px_rgba(15,23,42,.08)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="StudioFlows home">
          <span className="flex h-16 w-28 items-center justify-center rounded-[1.35rem] bg-slate-950 p-2 shadow-lg sm:h-20 sm:w-36">
            <Image src={LOGO} alt="StudioFlows" width={1200} height={675} className="h-full w-full object-contain" priority />
          </span>
          <span className="hidden sm:block">
            <span className="block text-sm font-semibold text-slate-950">StudioFlows</span>
            <span className="block text-xs text-slate-500">Real Estate Media OS</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 md:flex">
          <a href="#journey" className="hover:text-slate-950">Workflow</a>
          <a href="#fieldflow-pwa" className="hover:text-slate-950">FieldFlow</a>
          <a href="#owner-layer" className="hover:text-slate-950">Why it works</a>
          <a href="#demo-workspace" className="hover:text-slate-950">Demo</a>
        </nav>
        <Link href={REM_DEMO_HREF} className="hidden rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:inline-flex">View demo</Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[760px] overflow-hidden bg-slate-950 lg:min-h-[820px]">
      <motion.img src={HERO_STUDIO_TEAM} alt="Real estate media team operating inside StudioFlows" className="absolute inset-0 h-full w-full object-cover object-center" initial={{ scale: 1.03 }} animate={{ scale: 1.07 }} transition={{ duration: 14, ease: "easeOut" }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.96)_0%,rgba(2,6,23,.82)_42%,rgba(2,6,23,.28)_72%,rgba(2,6,23,.20)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-slate-950 to-transparent" />
      <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-center px-4 py-16 sm:px-6 lg:min-h-[820px] lg:px-8">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, ease: [0.22,1,.36,1] }} className="max-w-3xl">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">Built for real estate media studios</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">Photo · Drone · Video · Floor plans · 3D</span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">Real estate media studios should not run through the owner’s phone.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">One operating system for every listing job—from booking and crew scheduling to raw uploads, editing, delivery, and payment.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={REM_DEMO_HREF} className={primary}>Step Into the Live Demo</Link>
            <Link href={REM_OPS_TEARDOWN_HREF} className={secondary}>Get an Ops Teardown</Link>
          </div>
          <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            {["Crew assigned", "Raw files uploaded", "Editor in progress"].map((item, index) => (
              <motion.div key={item} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55 + index * .18 }} className="rounded-2xl border border-white/12 bg-slate-950/55 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-300" />{item}</motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PainTicker() {
  const reduce = useReducedMotion();
  const items = [...pain, ...pain];
  return (
    <section className="overflow-hidden bg-[#f7f1e8] py-16 text-slate-950 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-orange-700">The operating problem</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] !text-slate-950 sm:text-5xl">The shoot is booked. Somehow, you’re still involved in everything.</h2>
      </div>
      <div className="mt-10 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]">
        <motion.div className="flex w-max gap-4" animate={reduce ? undefined : { x: ["0%", "-50%"] }} transition={reduce ? undefined : { duration: 42, repeat: Infinity, ease: "linear" }}>
          {items.map((item, index) => <div key={`${item}-${index}`} className="flex min-h-[150px] w-[84vw] max-w-[700px] shrink-0 items-center rounded-[2rem] border border-slate-200 bg-white/90 p-7 shadow-[0_22px_70px_rgba(15,23,42,.10)] sm:w-[620px] sm:p-9"><p className="text-2xl font-semibold leading-tight tracking-[-.035em] !text-slate-800 sm:text-4xl">{item}</p></div>)}
        </motion.div>
      </div>
    </section>
  );
}

function JourneyStage({ stage, index, onInspect }) {
  const imageClass = `relative min-h-[320px] overflow-hidden rounded-[1.5rem] ${index % 2 ? "lg:order-2" : ""}`;
  return (
    <Reveal className="scroll-mt-28" delay={index * .03}>
      <article id={stage.id} className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[.06] p-4 shadow-[0_30px_100px_rgba(2,6,23,.32)] backdrop-blur-xl sm:p-6 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
        {stage.inspectable ? (
          <ProductMedia src={stage.image} alt={stage.title} fit={stage.fit} onInspect={onInspect} className={imageClass} />
        ) : (
          <div className={imageClass}>
            <img src={stage.image} alt={stage.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/18 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">{stage.facts.map((fact) => <span key={fact} className="rounded-full border border-white/15 bg-slate-950/65 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">{fact}</span>)}</div>
          </div>
        )}
        <div className={`p-2 sm:p-4 ${index % 2 ? "lg:order-1" : ""}`}>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-orange-200">{stage.step} · {stage.eyebrow}</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">{stage.title}</h3>
          <p className="mt-5 text-base leading-7 text-slate-300">{stage.body}</p>
          <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-cyan-200"><span className="h-px w-10 bg-cyan-300" />Job #10111 · 350 Barbados Drive</div>
          {stage.inspectable ? <p className="mt-3 text-xs font-medium uppercase tracking-[.16em] text-slate-500">Hover or tap the screenshot to inspect the product.</p> : null}
        </div>
      </article>
    </Reveal>
  );
}

function Journey({ onInspect }) {
  return (
    <section id="journey" className="relative overflow-hidden bg-slate-950 py-16 lg:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(14,165,233,.15),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(251,146,60,.18),transparent_26%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.22em] text-orange-200">One listing · one visual journey</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-5xl">Meet the agent. Schedule the crew. Capture the property. Deliver the job.</h2><p className="mt-5 text-base leading-7 text-slate-300">All without the owner stitching the operation together.</p></div>
        <div className="mt-12 grid gap-8 lg:grid-cols-[190px_1fr]">
          <aside className="hidden lg:block"><div className="sticky top-28 rounded-[1.5rem] border border-white/10 bg-white/[.06] p-4 backdrop-blur-xl"><p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-400">Job #10111</p><p className="mt-2 text-sm font-semibold text-white">350 Barbados Drive</p><nav className="mt-6 space-y-2">{journey.map((stage) => <a key={stage.id} href={`#${stage.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"><span className="text-xs text-orange-200">{stage.step}</span>{stage.label}</a>)}</nav></div></aside>
          <div className="space-y-8">{journey.map((stage, index) => <JourneyStage key={stage.id} stage={stage} index={index} onInspect={onInspect} />)}</div>
        </div>
      </div>
    </section>
  );
}

function PhoneCarousel() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const goTo = (index) => {
    const normalized = (index + mobileScreens.length) % mobileScreens.length;
    setActive(normalized);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: normalized * track.clientWidth, behavior: "smooth" });
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track?.clientWidth) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next !== active && next >= 0 && next < mobileScreens.length) setActive(next);
  };

  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="relative rounded-[3.5rem] border-[10px] border-slate-950 bg-slate-950 p-1.5 shadow-[0_40px_100px_rgba(15,23,42,.28)] ring-1 ring-white/10">
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex aspect-[9/19.4] snap-x snap-mandatory overflow-x-auto rounded-[2.65rem] bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Swipe through the StudioFlows mobile PWA"
        >
          {mobileScreens.map((src, index) => (
            <div key={src} className="relative h-full w-full shrink-0 snap-center overflow-hidden bg-black">
              <img src={src} alt={`StudioFlows mobile PWA screen ${index + 1}`} className="h-full w-full object-cover" loading={index < 2 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <button type="button" onClick={() => goTo(active - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg text-slate-900 shadow-sm transition hover:-translate-y-0.5" aria-label="Previous mobile screen">←</button>
        <div className="flex flex-wrap justify-center gap-1.5" aria-label={`Mobile screen ${active + 1} of ${mobileScreens.length}`}>
          {mobileScreens.map((src, index) => <button key={src} type="button" onClick={() => goTo(index)} aria-label={`Open mobile screen ${index + 1}`} className={`h-2 rounded-full transition-all ${active === index ? "w-6 bg-slate-950" : "w-2 bg-slate-300 hover:bg-slate-400"}`} />)}
        </div>
        <button type="button" onClick={() => goTo(active + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg text-slate-900 shadow-sm transition hover:-translate-y-0.5" aria-label="Next mobile screen">→</button>
      </div>
    </div>
  );
}

function FieldFlowPwa() {
  return (
    <section id="fieldflow-pwa" className="relative overflow-hidden bg-[#f7f1e8] py-20 text-slate-950 lg:py-28">
      <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-cyan-200/25 blur-3xl" />
      <div className="absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-orange-200/25 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-orange-700">FieldFlow PWA</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-.05em] !text-slate-950 sm:text-6xl">The field team carries the job—not the whole back office.</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 !text-slate-700">Open the address, package, access notes, crew assignment, upload status, and next action from a phone. No desktop training. No hunting through texts.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Job brief in pocket", "Field updates on the job", "Raw upload visibility", "Next action stays clear"].map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-sm font-semibold !text-slate-800 shadow-sm backdrop-blur">{item}</div>)}
          </div>
          <p className="mt-6 text-sm font-medium !text-slate-600">Swipe the phone to move through the real PWA screens.</p>
        </Reveal>
        <Reveal delay={.08}><PhoneCarousel /></Reveal>
      </div>
    </section>
  );
}

function OwnerLayer() {
  return (
    <section id="owner-layer" className="relative overflow-hidden bg-[#f7f1e8] py-20 text-slate-950 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:px-8">
        <Reveal><p className="text-xs font-semibold uppercase tracking-[.22em] text-orange-700">The identity trap</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.05em] !text-slate-950 sm:text-6xl">Your business has a team. Your brain is still the operating system.</h2><div className="mt-6 space-y-2 text-lg leading-8 !text-slate-700"><p>The photographer knows the shoot.</p><p>The editor knows the files.</p><p>The coordinator knows the calendar.</p><p>The agent knows what they asked for.</p></div><p className="mt-6 text-xl font-semibold !text-slate-950">You are still the only person connecting all of it.</p></Reveal>
        <Reveal className="relative min-h-[480px] overflow-hidden rounded-[2rem] shadow-[0_30px_90px_rgba(15,23,42,.18)]"><img src={TEAM_JOB_HANDOFF} alt="Real estate media team reviewing a StudioFlows job" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/86 via-transparent to-transparent" /><div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] border border-white/15 bg-slate-950/65 p-5 text-white backdrop-blur-xl"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-200">StudioFlows changes the role</p><p className="mt-2 text-xl font-semibold">The job connects the team. The owner stops becoming the router.</p></div></Reveal>
      </div>
    </section>
  );
}

function DemoSection({ onInspect }) {
  return (
    <section id="demo-workspace" className="relative overflow-hidden bg-slate-950 py-20 text-white lg:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(251,146,60,.20),transparent_30%),radial-gradient(circle_at_15%_80%,rgba(14,165,233,.14),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:px-8">
        <Reveal><p className="text-xs font-semibold uppercase tracking-[.22em] text-orange-200">Live demo path</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">Do not watch another software tour. Run the operation yourself.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Open a sample listing job. Assign a crew member. Move the job through Field, Post, and Delivery. Inspect ownership, comments, files, activity, and status.</p><div className="mt-7 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">{["Sample company", "Fictitious listing jobs", "Nothing to configure", "Successful workspace loaded"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3">{item}</div>)}</div><div className="mt-8"><Link href={REM_DEMO_HREF} className={primary}>Enter the Demo Workspace</Link></div></Reveal>
        <Reveal className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.05] p-3 shadow-[0_35px_110px_rgba(2,6,23,.45)]">
          <ProductMedia src={PRODUCT_DASHBOARD} alt="StudioFlows sample workspace" fit="contain" onInspect={onInspect} className="min-h-[330px] rounded-[1.5rem] sm:min-h-[460px]" />
        </Reveal>
      </div>
    </section>
  );
}

function Teardown() {
  return <section id="media-ops-score" className="bg-[#f7f1e8] py-16 text-slate-950 lg:py-20"><div className="mx-auto max-w-4xl px-4 text-center sm:px-6"><p className="text-xs font-semibold uppercase tracking-[.22em] text-orange-700">Complex operation?</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] !text-slate-950 sm:text-5xl">Your workflow more complicated than the sample?</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 !text-slate-700">Map the handoffs, scheduling rules, crew structure, and owner dependencies that may require a custom StudioFlows OS.</p><div className="mt-8"><Link href={REM_OPS_TEARDOWN_HREF} className={darkPrimary}>Start the Ops Teardown</Link></div></div></section>;
}

export function RemNoirLanding() {
  const [lightbox, setLightbox] = useState(null);
  useEffect(() => { captureRemAttributionForPath(REM_LANDING_PATH); }, []);
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 pb-20 md:pb-0">
      <Header />
      <Hero />
      <PainTicker />
      <Journey onInspect={setLightbox} />
      <FieldFlowPwa />
      <OwnerLayer />
      <DemoSection onInspect={setLightbox} />
      <Teardown />
      <footer className="bg-slate-950 px-4 py-10 text-center text-sm text-slate-500">
        <p>StudioFlows OS for real estate media studios · Booked to delivered without the owner becoming dispatch.</p>
        <Link href="/resources" className="mt-3 inline-flex text-slate-300 transition hover:text-white">Explore all operational resources</Link>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/92 p-3 shadow-[0_-12px_40px_rgba(2,6,23,.42)] backdrop-blur md:hidden"><Link href={REM_DEMO_HREF} className="flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950">Step Into the Live Demo</Link></div>
      <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
    </main>
  );
}
