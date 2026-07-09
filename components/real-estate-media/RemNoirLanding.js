"use client";

import { useEffect } from "react";
import Link from "next/link";

import { REM_DEMO_HREF, REM_OPS_TEARDOWN_HREF } from "@/lib/real-estate-media/rem-landing-content";
import {
  captureRemAttributionForPath,
  REM_LANDING_PATH,
} from "@/lib/real-estate-media/remLeadAttribution";

const ctaClasses =
  "inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(251,146,60,0.22)] transition hover:-translate-y-0.5 hover:bg-orange-50";

const secondaryCtaClasses =
  "inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15";

const darkCard =
  "rounded-[1.75rem] border border-white/12 bg-white/[0.08] shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl";

const lightCard =
  "rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur";

const todayJobs = [
  {
    time: "9:00 AM",
    address: "124 Maple Ave",
    services: "Photo · Drone · Reel · Floor plan",
    owner: "Alex / Maya",
    status: "Crew assigned",
    tone: "good",
  },
  {
    time: "11:30 AM",
    address: "87 Pine Street",
    services: "Photo · Twilight · 3D",
    owner: "Needs coverage",
    status: "Open assignment",
    tone: "warn",
  },
  {
    time: "2:00 PM",
    address: "19 Harbor Lane",
    services: "Video · Drone · Agent reel",
    owner: "Chris",
    status: "Weather watch",
    tone: "neutral",
  },
];

const workQueues = [
  {
    label: "Field",
    count: "8",
    items: ["Gate notes confirmed", "Drone kit required", "Exterior revisit pending"],
  },
  {
    label: "Post",
    count: "12",
    items: ["Drone clips missing", "Editor assigned", "QC due by 4 PM"],
  },
  {
    label: "Delivery",
    count: "5",
    items: ["Agent status sent", "Gallery ready", "Invoice open"],
  },
];

const modules = [
  {
    title: "Smart scheduling",
    body: "Shoot windows, split interior/exterior visits, travel buffers, service duration, and crew coverage in one operational view.",
  },
  {
    title: "Crew assignments",
    body: "Assign photographers, drone operators, videographers, editors, and QC owners without running the day from texts.",
  },
  {
    title: "Job cockpit",
    body: "Every listing carries the address, agent, package, notes, comments, files, payment status, and timeline.",
  },
  {
    title: "FieldFlow mobile",
    body: "Field teams get the job, address, access notes, package, and update buttons without the full back office.",
  },
  {
    title: "Post-production queue",
    body: "Track raw uploads, editor handoff, missing assets, QC, delivery readiness, and client update status.",
  },
  {
    title: "Agent delivery loop",
    body: "Keep agents informed on deliverables, revisions, invoices, and follow-up without making the founder the help desk.",
  },
];

const replacedTools = [
  "Spreadsheet job trackers",
  "Text-thread dispatch",
  "Google Calendar as the source of truth",
  "Calendly-only scheduling gaps",
  "Airtable/Softr-style patched portals",
  "Manual invoice follow-up lists",
  "Drive-folder status hunting",
  "Founder-memory operations",
];

const lifecycle = [
  "Request",
  "Package",
  "Schedule",
  "Assign",
  "Shoot",
  "Upload",
  "Edit",
  "QC",
  "Deliver",
  "Invoice",
];

function StatusPill({ children, tone = "default" }) {
  const styles = {
    default: "border-white/15 bg-white/10 text-slate-200",
    good: "border-emerald-300/30 bg-emerald-300/15 text-emerald-100",
    warn: "border-orange-300/35 bg-orange-300/18 text-orange-100",
    neutral: "border-sky-300/30 bg-sky-300/15 text-sky-100",
    light: "border-slate-200 bg-white text-slate-600",
    amber: "border-orange-200 bg-orange-50 text-orange-700",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, body, light = false }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${light ? "text-orange-200" : "text-orange-700"}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-5xl ${light ? "text-white" : "text-slate-950"}`}>
        {title}
      </h2>
      {body ? <p className={`mt-5 text-base leading-8 ${light ? "text-slate-300" : "text-slate-600"}`}>{body}</p> : null}
    </div>
  );
}

function PropertyImagePanel() {
  return (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-white/15 bg-slate-950 shadow-[0_35px_120px_rgba(2,6,23,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(251,146,60,0.72),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(59,130,246,0.58),transparent_31%),linear-gradient(135deg,#08111f_0%,#10233b_35%,#f97316_72%,#fed7aa_100%)]" />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.18),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(to_top,rgba(2,6,23,0.92),rgba(15,23,42,0.32),transparent)]" />
      <div className="absolute bottom-[27%] left-0 right-0 h-px bg-orange-200/70" />
      <div className="absolute bottom-0 left-0 right-0 h-[29%] bg-[linear-gradient(90deg,rgba(14,165,233,0.22),rgba(251,146,60,0.28),rgba(15,23,42,0.15))]" />
      <div className="absolute right-0 top-0 h-[62%] w-[32%] border-l border-white/20 bg-white/10 backdrop-blur-[2px]">
        <div className="absolute inset-x-4 top-5 h-8 rounded-t-2xl bg-slate-950/45" />
        <div className="absolute bottom-8 left-5 right-0 h-24 rounded-l-[2rem] border border-white/15 bg-slate-950/28" />
      </div>
      <div className="relative min-h-[530px] p-5 md:p-6">
        <div className="flex items-center justify-between">
          <StatusPill>Luxury listing media</StatusPill>
          <StatusPill tone="warn">48h delivery clock</StatusPill>
        </div>
        <div className="absolute bottom-5 left-5 right-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-white/14 bg-slate-950/60 p-4 text-white backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">19 Harbor Lane</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">Photo, drone, reel, floor plan, 3D</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The property looks premium. The operation behind it should feel just as polished.
            </p>
          </div>
          <DashboardPreview compact />
        </div>
      </div>
    </div>
  );
}

function DashboardPreview({ compact = false }) {
  return (
    <div className={`${compact ? "rounded-[1.5rem]" : "rounded-[2rem]"} border border-white/14 bg-slate-950/70 p-3 text-white shadow-[0_30px_100px_rgba(2,6,23,0.34)] backdrop-blur-xl`}>
      <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.06]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.08] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Studio command center</p>
            <p className="text-xs text-slate-400">Wednesday · 24 active listing jobs</p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <StatusPill tone="good">8 on schedule</StatusPill>
            <StatusPill tone="warn">3 need owner</StatusPill>
          </div>
        </div>

        <div className={`grid ${compact ? "min-h-[270px]" : "min-h-[500px] lg:grid-cols-[170px_1fr]"}`}>
          {!compact ? (
            <aside className="hidden border-r border-white/10 bg-slate-950/72 p-4 lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">StudioFlows</p>
              <nav className="mt-6 space-y-2 text-sm">
                {["Jobs", "Schedule", "Crew", "Post", "Delivery", "Payments"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-xl px-3 py-2 ${index === 0 ? "bg-white text-slate-950" : "text-slate-400"}`}
                  >
                    {item}
                  </div>
                ))}
              </nav>
            </aside>
          ) : null}

          <div className="p-4">
            {!compact ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["Today", "11 shoots", "2 split visits"],
                  ["Post queue", "12 jobs", "4 waiting files"],
                  ["Delivery", "5 due", "48h clock active"],
                ].map(([label, value, note]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
                    <p className="mt-1 text-xs text-slate-400">{note}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={`${compact ? "" : "mt-4"} grid gap-4 xl:grid-cols-[1.05fr_0.95fr]`}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Today’s listing jobs</p>
                    <p className="text-xs text-slate-400">Schedule, crew, package, field status.</p>
                  </div>
                  <StatusPill tone="neutral">Live board</StatusPill>
                </div>
                <div className="mt-4 space-y-3">
                  {todayJobs.slice(0, compact ? 2 : 3).map((job) => (
                    <div key={job.address} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">{job.time}</p>
                          <p className="mt-1 text-sm font-semibold text-white">{job.address}</p>
                          <p className="mt-1 text-xs text-slate-400">{job.services}</p>
                        </div>
                        <StatusPill tone={job.tone}>{job.status}</StatusPill>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-slate-400">
                        <span>Owner</span>
                        <span className="font-medium text-slate-100">{job.owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!compact ? (
                <div className="space-y-4">
                  {workQueues.map((queue) => (
                    <div key={queue.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{queue.label}</p>
                        <span className="rounded-full bg-orange-300 px-2.5 py-1 text-xs font-semibold text-slate-950">
                          {queue.count}
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-300">
                        {queue.items.map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowRail() {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur">
      <div className="grid gap-2 md:grid-cols-5 lg:grid-cols-10">
        {lifecycle.map((step, index) => (
          <div key={step} className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-600">
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RemNoirLanding() {
  useEffect(() => {
    captureRemAttributionForPath(REM_LANDING_PATH);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-300 to-sky-300 text-sm font-bold text-slate-950">
              SF
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-white">StudioFlows</p>
              <p className="mt-1 text-xs text-slate-400">Real Estate Media OS</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
            <a href="#workspace" className="hover:text-white">Workspace</a>
            <a href="#modules" className="hover:text-white">Modules</a>
            <a href="#replace-stack" className="hover:text-white">Stack</a>
            <a href="#demo-workspace" className="hover:text-white">Start</a>
          </div>
          <Link href={REM_DEMO_HREF} className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 md:inline-flex">
            View demo
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(251,146,60,0.34),transparent_28%),radial-gradient(circle_at_76%_18%,rgba(56,189,248,0.28),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#1e293b_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(to_top,rgba(251,146,60,0.16),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusPill>Built for real estate media studios</StatusPill>
                <StatusPill>Photo · Drone · Video · Floor plans · 3D</StatusPill>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
                The ops software behind every high-end listing shoot.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                StudioFlows gives real estate media companies one polished command center for scheduling,
                crew coverage, field updates, post-production, delivery, payments, and agent status — so the
                property looks premium and the operation finally does too.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={REM_DEMO_HREF} className={ctaClasses}>
                  Step Into the Live Demo
                </Link>
                <Link href={REM_OPS_TEARDOWN_HREF} className={secondaryCtaClasses}>
                  Get an Ops Teardown
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                Demo-first for media teams that need to see the workspace. Teardown path for complex operators.
              </p>
            </div>
            <PropertyImagePanel />
          </div>
        </div>
      </section>

      <section id="workspace" className="relative overflow-hidden bg-[#f7f1e8] text-slate-950">
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgba(251,146,60,0.16),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeader
            eyebrow="The operating problem"
            title="The listing looks expensive. The back office still runs through your phone."
            body="Real estate media teams do not lose time because one giant task is impossible. They lose it because dozens of small status questions keep coming back to the owner."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              "Who has tomorrow’s shoot?",
              "Did the drone clips upload?",
              "Is the editor waiting on anything?",
              "Can the agent get a real delivery update?",
              "Did the floor plan or 3D file land?",
              "Do we need to split interior and exterior?",
              "Which package did they actually order?",
              "Has payment or invoice status changed?",
            ].map((question) => (
              <div key={question} className={`${lightCard} p-5`}>
                <p className="text-base font-semibold leading-6 text-slate-950">{question}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/10 bg-slate-950 py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(251,146,60,0.22),transparent_26%),radial-gradient(circle_at_20%_85%,rgba(14,165,233,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="One job record"
            title="From request to invoice, the listing has one place to live."
            body="This should feel like the operating layer behind a serious media studio: a command surface for every handoff after the listing order comes in."
            light
          />
          <div className="mt-10">
            <WorkflowRail />
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className={`${darkCard} p-7`}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">Owner relief</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">Your team can answer without asking you first.</h3>
              <p className="mt-4 leading-7 text-slate-300">
                Not another blank project board. A real estate media workspace where the address, package, crew,
                access notes, raw files, editing status, QC, delivery, and payment all sit on the same job.
              </p>
            </div>
            <div className={`${darkCard} p-7`}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Real estate media density</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["Photo", "Drone", "Video", "Reels", "Floor plans", "3D tours", "Twilight", "Virtual staging"].map((service) => (
                  <div key={service} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-slate-100">
                    {service}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="bg-[#f7f1e8] text-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeader
            eyebrow="Software surface"
            title="The modules your studio actually runs on."
            body="Real estate media operators need a workspace that feels as specific as the work: listing jobs, field teams, editors, QC, agents, deliverables, and payments."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div key={module.title} className={`${lightCard} p-6`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-sky-100 text-sm font-bold text-slate-900">
                  {module.title.slice(0, 2)}
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{module.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{module.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="replace-stack" className="border-y border-white/10 bg-slate-950 py-16 text-white lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">Stack consolidation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Not rip-and-replace. Stop making the founder the integration layer.
            </h2>
            <p className="mt-5 leading-7 text-slate-300">
              Some tools can stay. Some will eventually disappear. The immediate win is that your team no longer has
              to check five places, two calendars, three text threads, and your memory to know what is happening with a listing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {replacedTools.map((tool) => (
              <div key={tool} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4 text-sm font-medium text-slate-200 backdrop-blur">
                {tool}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo-workspace" className="bg-[#f7f1e8] text-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">Live demo path</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                Show them a successful media studio workspace, not an empty account.
              </h2>
              <p className="mt-5 leading-7 text-slate-600">
                The demo should load with sample listing jobs, crew assignments, field updates, post-production queues,
                deliverables, payment status, and agent-facing clarity already in place. They should feel the operating model
                before they are asked to build anything.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={REM_DEMO_HREF} className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5 hover:bg-slate-800">
                  Step Into the Live Demo
                </Link>
                <Link href={REM_OPS_TEARDOWN_HREF} className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-50">
                  Get an Ops Teardown
                </Link>
              </div>
            </div>
            <div className={`${lightCard} p-6`}>
              <p className="text-sm font-semibold text-slate-950">Demo workspace should include</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  "Today’s schedule",
                  "Unassigned jobs",
                  "Crew coverage",
                  "Job cockpit",
                  "Field updates",
                  "Raw upload status",
                  "Editing/QC queue",
                  "Agent delivery status",
                ].map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="media-ops-score" className="border-t border-white/10 bg-slate-950 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">Ops Teardown path</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            For studios with unusual complexity, diagnose before the call.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl leading-7 text-slate-300">
            Multi-market scheduling, custom crew rules, split shoots, heavy post-production, and unusual delivery loops
            deserve a deeper teardown. That path should qualify the operator and capture the workflow data before discovery.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href={REM_OPS_TEARDOWN_HREF} className={ctaClasses}>
              Start Ops Teardown
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 px-4 py-10 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
        StudioFlows OS for real estate media studios · Built around the job from booked to delivered.
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/92 p-3 shadow-[0_-12px_40px_rgba(2,6,23,0.42)] backdrop-blur md:hidden">
        <Link href={REM_DEMO_HREF} className="flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950">
          Step Into the Live Demo
        </Link>
      </div>
    </main>
  );
}
