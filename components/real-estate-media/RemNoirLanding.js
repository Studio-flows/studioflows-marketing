"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { REM_DEMO_HREF, REM_OPS_TEARDOWN_HREF } from "@/lib/real-estate-media/rem-landing-content";
import {
  captureRemAttributionForPath,
  REM_LANDING_PATH,
} from "@/lib/real-estate-media/remLeadAttribution";

const STUDIOFLOWS_LOGO_SRC = "/StudioFlows logo white (1200 x 675 px).png";
const PRODUCT_DASHBOARD_SRC = "/product/dashboard.png";

const primaryCta =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-slate-800";
const lightCta =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(251,146,60,0.22)] transition hover:-translate-y-0.5 hover:bg-orange-50";
const glassCard =
  "rounded-[1.75rem] border border-white/10 bg-white/[0.08] shadow-[0_24px_80px_rgba(2,6,23,0.30)] backdrop-blur-xl";

const stages = [
  {
    key: "schedule",
    label: "Schedule",
    headline: "Split shoots, buffers, drive time, and crew coverage visible before the day breaks.",
    stat: "11 shoots today",
    accent: "from-orange-300 to-sky-300",
    bullets: ["2 split visits", "3 drone-required jobs", "1 weather watch"],
  },
  {
    key: "field",
    label: "Field",
    headline: "The crew sees the job, package, access notes, and update buttons from the phone.",
    stat: "8 field updates",
    accent: "from-sky-300 to-cyan-200",
    bullets: ["Gate code confirmed", "Raw upload started", "Exterior revisit flagged"],
  },
  {
    key: "post",
    label: "Post",
    headline: "Raw uploads, editor handoff, QC, and delivery readiness stop living in side channels.",
    stat: "12 post jobs",
    accent: "from-amber-200 to-orange-300",
    bullets: ["4 waiting files", "5 in edit", "3 ready for QC"],
  },
  {
    key: "delivery",
    label: "Delivery",
    headline: "Agents get a straight answer because the job record already knows where things stand.",
    stat: "5 due today",
    accent: "from-emerald-200 to-sky-200",
    bullets: ["Gallery ready", "Invoice open", "Status sent"],
  },
];

const modules = [
  ["Smart scheduling", "Shoot windows, split visits, buffers, duration, and coverage."],
  ["Crew assignments", "Photographers, drone ops, video, editors, and QC owners."],
  ["Job cockpit", "Agent, property, package, notes, files, payment, and timeline."],
  ["FieldFlow mobile", "Field updates land on the job instead of in texts."],
  ["Post-production", "Raw uploads, editor handoff, missing files, QC, and delivery."],
  ["Agent status", "Delivery and invoice clarity without founder follow-up."],
];

const painTicker = [
  "Agent texts again: are the photos going out today?",
  "Editor is blocked because drone clips never landed.",
  "Photographer asks who owns tomorrow’s twilight shoot.",
  "Floor plan file is missing and nobody caught it before delivery.",
  "Split interior/exterior visit moved, but crew coverage did not.",
  "Client changed the package and the editor is working from old notes.",
  "Owner is the only person who knows if the invoice was handled.",
  "Raw upload started in one place and status got answered in another.",
];

const editorialPanels = [
  {
    kicker: "On-site crew",
    title: "Crew shooting the listing",
    body: "The field team sees the property, package, access notes, and shoot requirements before the first camera comes out.",
    gradient: "from-slate-950 via-sky-950 to-orange-500",
    device: "camera",
  },
  {
    kicker: "FieldFlow mobile",
    title: "Crew member updating the job from the driveway",
    body: "FieldFlow turns field status into a job update instead of another text thread for the owner to interpret.",
    gradient: "from-slate-950 via-cyan-950 to-sky-500",
    device: "phone",
  },
  {
    kicker: "Raw uploads",
    title: "Field team loading files into the job page",
    body: "Photo, video, drone clips, and floor plan assets move into the job record so post-production knows what is ready.",
    gradient: "from-slate-950 via-zinc-900 to-amber-500",
    device: "monitor",
  },
  {
    kicker: "Editing bay",
    title: "Editor working through the delivery queue",
    body: "Editors can see missing files, handoff notes, QC status, and delivery readiness without asking the founder for context.",
    gradient: "from-slate-950 via-indigo-950 to-orange-400",
    device: "timeline",
  },
];

const lifecycle = ["Request", "Package", "Schedule", "Assign", "Shoot", "Upload", "Edit", "QC", "Deliver", "Invoice"];

function useMotionSettings() {
  const reduce = useReducedMotion();
  return useMemo(
    () => ({
      initial: reduce ? false : { opacity: 0, y: 28 },
      whileInView: reduce ? undefined : { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-80px" },
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    }),
    [reduce],
  );
}

function Reveal({ children, className = "", delay = 0 }) {
  const motionProps = useMotionSettings();
  return (
    <motion.div {...motionProps} transition={{ ...motionProps.transition, delay }} className={className}>
      {children}
    </motion.div>
  );
}

function LogoLockup() {
  return (
    <Link href="/" className="flex items-center gap-4" aria-label="StudioFlows home">
      <span className="flex h-16 w-28 items-center justify-center rounded-[1.35rem] bg-slate-950 p-2 shadow-lg sm:h-20 sm:w-36">
        <Image
          src={STUDIOFLOWS_LOGO_SRC}
          alt="StudioFlows"
          width={1200}
          height={675}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      <span className="hidden sm:block">
        <span className="block text-sm font-semibold leading-none text-slate-950">StudioFlows</span>
        <span className="mt-1 block text-xs font-medium text-slate-500">Real Estate Media OS</span>
      </span>
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/82 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/72">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        <LogoLockup />
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 md:flex">
          <a href="#workspace" className="transition hover:text-slate-950">Workspace</a>
          <a href="#fieldflow" className="transition hover:text-slate-950">FieldFlow</a>
          <a href="#post" className="transition hover:text-slate-950">Post</a>
          <a href="#demo-workspace" className="transition hover:text-slate-950">Demo</a>
        </nav>
        <Link href={REM_DEMO_HREF} className="hidden rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:inline-flex">
          View demo
        </Link>
      </div>
    </header>
  );
}

function StatusPill({ children, tone = "default" }) {
  const styles = {
    default: "border-white/15 bg-white/10 text-slate-200",
    good: "border-emerald-300/30 bg-emerald-300/15 text-emerald-100",
    warn: "border-orange-300/35 bg-orange-300/18 text-orange-100",
    neutral: "border-sky-300/30 bg-sky-300/15 text-sky-100",
  };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles[tone] || styles.default}`}>{children}</span>;
}

function SectionHeader({ eyebrow, title, body, light = false }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${light ? "text-orange-200" : "text-orange-700"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl ${light ? "text-white" : "text-slate-950"}`}>{title}</h2>
      {body ? <p className={`mt-4 text-base leading-7 ${light ? "text-slate-300" : "text-slate-600"}`}>{body}</p> : null}
    </div>
  );
}

function HeroProductShot() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      className="relative mx-auto w-full max-w-xl lg:max-w-none"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950 p-3 shadow-[0_40px_120px_rgba(2,6,23,0.50)] sm:rounded-[2.35rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(251,146,60,0.26),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.22),transparent_31%)]" />
        <div className="relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[0.04]">
          <Image
            src={PRODUCT_DASHBOARD_SRC}
            alt="StudioFlows real estate media operations dashboard"
            width={1600}
            height={1000}
            className="h-auto w-full object-cover opacity-95"
            priority
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-5 pt-20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-200">Product workspace</p>
            <p className="mt-2 max-w-md text-xl font-semibold tracking-tight text-white">A real command surface, not a decorative mockup.</p>
          </div>
        </div>
        <div className="relative mt-3 grid gap-3 sm:grid-cols-3">
          {["24 active listing jobs", "4 waiting assets", "5 due today"].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-slate-200">
              {item}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PainTicker() {
  const reduce = useReducedMotion();
  const items = [...painTicker, ...painTicker];

  return (
    <div className="relative mt-10 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]">
      <motion.div
        className="flex w-max gap-4"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={reduce ? undefined : { duration: 38, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex min-h-[140px] w-[82vw] max-w-[720px] shrink-0 items-center rounded-[2rem] border border-slate-200 bg-white/88 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.10)] sm:w-[620px] sm:p-8"
          >
            <p className="text-2xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl">
              {item}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function InteractiveBoard({ compact = false }) {
  const [active, setActive] = useState("field");
  const activeStage = stages.find((stage) => stage.key === active) || stages[0];

  return (
    <div className={`${glassCard} overflow-hidden p-3 text-white`}>
      <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/50">
        <div className="border-b border-white/10 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Studio command center</p>
              <p className="mt-1 text-xs text-slate-400">Wednesday · 24 active listing jobs</p>
            </div>
            <StatusPill tone="good">Live</StatusPill>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stages.map((stage) => (
              <button
                key={stage.key}
                type="button"
                onClick={() => setActive(stage.key)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  active === stage.key
                    ? "border-white/70 bg-white text-slate-950"
                    : "border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.10]"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
        <motion.div
          key={activeStage.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
          className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className={`rounded-2xl bg-gradient-to-br ${activeStage.accent} p-[1px]`}>
            <div className="h-full rounded-2xl bg-slate-950/86 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">{activeStage.label}</p>
              <p className="mt-3 text-lg font-semibold leading-6 text-white">{activeStage.stat}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{activeStage.headline}</p>
            </div>
          </div>
          <div className="grid gap-2">
            {activeStage.bullets.slice(0, compact ? 2 : 3).map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-medium text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ProductShotCard() {
  return (
    <Reveal className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-3 shadow-[0_34px_100px_rgba(2,6,23,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(251,146,60,0.20),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(14,165,233,0.18),transparent_32%)]" />
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04]">
        <Image src={PRODUCT_DASHBOARD_SRC} alt="StudioFlows product dashboard" width={1600} height={1000} className="h-auto w-full object-cover opacity-95" />
      </div>
    </Reveal>
  );
}

function WorkflowRail() {
  return (
    <Reveal className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
        {lifecycle.map((step, index) => (
          <motion.div key={step} whileHover={{ y: -4 }} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-600">{String(index + 1).padStart(2, "0")}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{step}</p>
          </motion.div>
        ))}
      </div>
    </Reveal>
  );
}

function EditorialPanel({ panel, index }) {
  return (
    <Reveal delay={index * 0.06} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_24px_80px_rgba(2,6,23,0.24)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${panel.gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.30),transparent_20%),linear-gradient(to_top,rgba(2,6,23,0.88),rgba(2,6,23,0.14),transparent)]" />
      <motion.div aria-hidden="true" className="absolute -right-16 top-10 h-48 w-48 rounded-full border border-white/20 bg-white/10 backdrop-blur-md" animate={{ y: [0, -12, 0], rotate: [0, 3, 0] }} transition={{ duration: 8 + index, repeat: Infinity, ease: "easeInOut" }} />
      <div className="relative flex min-h-[360px] flex-col justify-end p-5 sm:p-6">
        <div className="mb-auto flex items-center justify-between">
          <StatusPill>{panel.kicker}</StatusPill>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">{panel.device}</span>
        </div>
        <p className="max-w-sm text-2xl font-semibold tracking-tight text-white">{panel.title}</p>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-200">{panel.body}</p>
      </div>
    </Reveal>
  );
}

function ModuleCard({ title, body, index }) {
  const objectPositions = ["object-[72%_22%]", "object-[60%_30%]", "object-[80%_36%]", "object-[58%_18%]", "object-[74%_44%]", "object-[66%_28%]"];

  return (
    <Reveal delay={index * 0.04} className={`${glassCard} group relative min-h-[190px] overflow-hidden p-5`}>
      <div className="absolute inset-y-0 right-0 w-[58%] opacity-[0.20] transition duration-500 group-hover:opacity-[0.30]">
        <Image src={PRODUCT_DASHBOARD_SRC} alt="" fill sizes="(min-width: 1024px) 30vw, 80vw" className={`object-cover ${objectPositions[index % objectPositions.length]}`} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,1)_0%,rgba(15,23,42,0.82)_32%,rgba(15,23,42,0.35)_72%,rgba(15,23,42,0.16)_100%)]" />
      </div>
      <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-orange-300/10 blur-2xl transition group-hover:bg-sky-300/16" />
      <div className="relative z-10 max-w-[76%]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-200 to-sky-200 text-sm font-bold text-slate-950">{String(index + 1).padStart(2, "0")}</div>
        <h3 className="mt-5 text-xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
      </div>
    </Reveal>
  );
}

function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/92 p-3 shadow-[0_-12px_40px_rgba(2,6,23,0.42)] backdrop-blur md:hidden">
      <Link href={REM_DEMO_HREF} className="flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950">Step Into the Live Demo</Link>
    </div>
  );
}

export function RemNoirLanding() {
  useEffect(() => {
    captureRemAttributionForPath(REM_LANDING_PATH);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 pb-20 text-white md:pb-0">
      <Header />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(251,146,60,0.40),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(56,189,248,0.28),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_52%,#1e293b_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(to_top,rgba(251,146,60,0.16),transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-8 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex flex-wrap gap-2">
              <StatusPill>Built for real estate media studios</StatusPill>
              <StatusPill>Photo · Drone · Video · Floor plans · 3D</StatusPill>
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">The ops software behind every high-end listing shoot.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">One command center for scheduling, crew coverage, field updates, raw uploads, editing, delivery, payments, and agent status.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={REM_DEMO_HREF} className={lightCta}>Step Into the Live Demo</Link>
              <Link href={REM_OPS_TEARDOWN_HREF} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">Get an Ops Teardown</Link>
            </div>
          </motion.div>
          <HeroProductShot />
        </div>
      </section>

      <section id="workspace" className="relative bg-[#f7f1e8] py-14 text-slate-950 sm:py-16 lg:py-20">
        <SectionHeader eyebrow="The operating problem" title="The listing looks expensive. The back office still runs through your phone." body="The work is visual. The operation is not. StudioFlows turns status noise into one visible job record." />
        <PainTicker />
      </section>

      <section className="relative overflow-hidden border-y border-white/10 bg-slate-950 py-14 lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(251,146,60,0.20),transparent_26%),radial-gradient(circle_at_20%_85%,rgba(14,165,233,0.16),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="One job record" title="From request to invoice, the listing has one place to live." body="A command surface for every handoff after the listing order comes in." light />
          <div className="mt-9"><WorkflowRail /></div>
          <div className="mt-9 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal className={`${glassCard} p-6`}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">Owner relief</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">Your team can answer without asking you first.</h3>
              <p className="mt-4 leading-7 text-slate-300">Address, package, crew, access notes, raw files, editing, QC, delivery, and payment all sit on the same job.</p>
            </Reveal>
            <ProductShotCard />
          </div>
        </div>
      </section>

      <section id="fieldflow" className="bg-[#f7f1e8] text-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeader eyebrow="Real operations" title="Real estate media work happens around the software." body="Field crews, uploads, editing, QC, and delivery all need one operational thread instead of another round of texts." />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {editorialPanels.map((panel, index) => <EditorialPanel key={panel.title} panel={panel} index={index} />)}
          </div>
        </div>
      </section>

      <section id="modules" className="relative overflow-hidden bg-slate-950 py-14 text-white lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.14),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(251,146,60,0.16),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Software surface" title="The modules your studio actually runs on." body="Short, specific, and tied to how real estate media work moves." light />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(([title, body], index) => <ModuleCard key={title} title={title} body={body} index={index} />)}
          </div>
        </div>
      </section>

      <section id="post" className="bg-[#f7f1e8] text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8 lg:py-20">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">Interactive demo surface</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">Click through the studio flow before creating your workspace.</h2>
            <p className="mt-4 leading-7 text-slate-600">Feel the system working across scheduling, field, post, and delivery before your team ever has to start from a blank account.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={REM_DEMO_HREF} className={primaryCta}>Step Into the Live Demo</Link>
              <Link href={REM_OPS_TEARDOWN_HREF} className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300/70 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-900 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">Get an Ops Teardown</Link>
            </div>
          </Reveal>
          <InteractiveBoard />
        </div>
      </section>

      <section id="demo-workspace" className="border-y border-white/10 bg-slate-950 py-14 text-white lg:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Live demo path" title="Step into a successful media studio workspace, not an empty account." body="Sample listing jobs, crew assignments, field updates, post-production queues, deliverables, payment status, and agent-facing clarity already in place." light />
          <div className="mt-8 flex justify-center"><Link href={REM_DEMO_HREF} className={lightCta}>Step Into the Live Demo</Link></div>
        </div>
      </section>

      <section id="media-ops-score" className="bg-[#f7f1e8] py-14 text-slate-950 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Ops Teardown path" title="For studios with unusual complexity, diagnose before the call." body="Multi-market scheduling, custom crew rules, split shoots, heavy post-production, and unusual delivery loops deserve a deeper teardown." />
          <div className="mt-8 flex justify-center"><Link href={REM_OPS_TEARDOWN_HREF} className={primaryCta}>Start Ops Teardown</Link></div>
        </div>
      </section>

      <footer className="bg-slate-950 px-4 py-10 text-center text-sm text-slate-500 sm:px-6 lg:px-8">StudioFlows OS for real estate media studios · Built around the job from booked to delivered.</footer>
      <MobileStickyCta />
    </main>
  );
}
