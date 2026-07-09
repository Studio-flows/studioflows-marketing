"use client";

import { useEffect } from "react";
import Link from "next/link";

import { REM_DEMO_HREF, REM_OPS_TEARDOWN_HREF } from "@/lib/real-estate-media/rem-landing-content";
import {
  captureRemAttributionForPath,
  REM_LANDING_PATH,
} from "@/lib/real-estate-media/remLeadAttribution";

const ctaClasses =
  "inline-flex items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-zinc-800";

const secondaryCtaClasses =
  "inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50";

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
    body: "See shoot windows, split interior/exterior visits, travel buffers, service duration, and crew coverage in one place.",
  },
  {
    title: "Crew assignments",
    body: "Assign photographers, drone operators, videographers, editors, and QC owners without running the day from texts.",
  },
  {
    title: "Job cockpit",
    body: "Every listing has the property details, agent, package, notes, files, status, comments, payment, and timeline.",
  },
  {
    title: "FieldFlow mobile",
    body: "Field teams get the job, address, access notes, package, and update buttons without needing the full back office.",
  },
  {
    title: "Post-production queue",
    body: "Track raw uploads, editor handoff, QC, delivery readiness, missing assets, and client update status.",
  },
  {
    title: "Client delivery loop",
    body: "Keep agents informed with status, deliverables, invoices, and follow-up without the founder becoming the help desk.",
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

function Pill({ children, tone = "default" }) {
  const styles = {
    default: "border-zinc-200 bg-white text-zinc-600",
    dark: "border-zinc-800 bg-zinc-950 text-zinc-100",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, body }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{title}</h2>
      {body ? <p className="mt-4 text-base leading-7 text-zinc-600">{body}</p> : null}
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-3 shadow-[0_30px_100px_rgba(15,23,42,0.16)]">
      <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-950">Studio command center</p>
            <p className="text-xs text-zinc-500">Wednesday · 24 active listing jobs</p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Pill tone="good">8 on schedule</Pill>
            <Pill tone="warn">3 need owner</Pill>
          </div>
        </div>

        <div className="grid min-h-[520px] lg:grid-cols-[190px_1fr]">
          <aside className="hidden border-r border-zinc-200 bg-zinc-950 p-4 text-white lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">StudioFlows</p>
            <nav className="mt-6 space-y-2 text-sm">
              {["Jobs", "Schedule", "Crew", "Post", "Delivery", "Payments"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-xl px-3 py-2 ${index === 0 ? "bg-white text-zinc-950" : "text-zinc-400"}`}
                >
                  {item}
                </div>
              ))}
            </nav>
          </aside>

          <div className="p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Today", "11 shoots", "2 split visits"],
                ["Post queue", "12 jobs", "4 waiting files"],
                ["Delivery", "5 due", "48h clock active"],
              ].map(([label, value, note]) => (
                <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">Today’s listing jobs</p>
                    <p className="text-xs text-zinc-500">Schedule, crew, package, and field status.</p>
                  </div>
                  <Pill tone="blue">Live board</Pill>
                </div>
                <div className="mt-4 space-y-3">
                  {todayJobs.map((job) => (
                    <div key={job.address} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-zinc-500">{job.time}</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-950">{job.address}</p>
                          <p className="mt-1 text-xs text-zinc-500">{job.services}</p>
                        </div>
                        <Pill tone={job.tone}>{job.status}</Pill>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs text-zinc-500">
                        <span>Owner</span>
                        <span className="font-medium text-zinc-800">{job.owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {workQueues.map((queue) => (
                  <div key={queue.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-950">{queue.label}</p>
                      <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white">
                        {queue.count}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                      {queue.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowRail() {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid gap-2 md:grid-cols-5 lg:grid-cols-10">
        {lifecycle.map((step, index) => (
          <div key={step} className="relative rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">{step}</p>
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
    <main className="min-h-screen bg-[#f6f3ee] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-[#f6f3ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-bold text-white">
              SF
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-zinc-950">StudioFlows</p>
              <p className="mt-1 text-xs text-zinc-500">Real Estate Media OS</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
            <a href="#workspace" className="hover:text-zinc-950">Workspace</a>
            <a href="#modules" className="hover:text-zinc-950">Modules</a>
            <a href="#replace-stack" className="hover:text-zinc-950">Stack</a>
            <a href="#start-paths" className="hover:text-zinc-950">Start</a>
          </div>
          <Link href={REM_DEMO_HREF} className="hidden rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white md:inline-flex">
            View demo
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-zinc-200/70">
        <div className="absolute left-1/2 top-0 h-[560px] w-[920px] -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[0.88fr_1.12fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="dark">Built for real estate media studios</Pill>
                <Pill>Photo · Drone · Video · Floor plans · 3D</Pill>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-5xl lg:text-6xl">
                Run every listing-media job from booked to delivered.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-650">
                StudioFlows gives real estate media companies one operating system for scheduling,
                crew coverage, field updates, post-production, delivery, payments, and agent status —
                so the owner stops being dispatch.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={REM_DEMO_HREF} className={ctaClasses}>
                  Step Into the Live Demo
                </Link>
                <Link href={REM_OPS_TEARDOWN_HREF} className={secondaryCtaClasses}>
                  Get an Ops Teardown
                </Link>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                Demo-first for media teams that need to see the workspace. Teardown path for complex operators.
              </p>
            </div>
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section id="workspace" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeader
          eyebrow="The operating problem"
          title="The job is booked. The company still routes through you."
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
            <div key={question} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-base font-semibold leading-6 text-zinc-950">{question}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="One job record"
            title="From request to invoice, the listing has one place to live."
            body="The page should feel like an operating system because that is what the product is: a command layer for every handoff after the listing order comes in."
          />
          <div className="mt-10">
            <WorkflowRail />
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] bg-zinc-950 p-7 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Owner relief</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight">Your team can answer without asking you first.</h3>
              <p className="mt-4 leading-7 text-zinc-300">
                The point is not another blank project board. The point is a real estate media workspace where
                the address, package, crew, access notes, raw files, editing status, QC, delivery, and payment
                all sit on the same job.
              </p>
            </div>
            <div className="rounded-[2rem] border border-zinc-200 bg-[#f6f3ee] p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Real estate media density</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["Photo", "Drone", "Video", "Reels", "Floor plans", "3D tours", "Twilight", "Virtual staging"].map((service) => (
                  <div key={service} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900">
                    {service}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeader
          eyebrow="Software surface"
          title="The modules your studio actually runs on."
          body="This needs to feel less like a questionnaire and more like the back office of a serious media studio."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div key={module.title} className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sm font-bold text-sky-700">
                {module.title.slice(0, 2)}
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-950">{module.title}</h3>
              <p className="mt-3 leading-7 text-zinc-600">{module.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="replace-stack" className="border-y border-zinc-200 bg-zinc-950 py-16 text-white lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Stack consolidation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Not rip-and-replace. Stop making the founder the integration layer.
            </h2>
            <p className="mt-5 leading-7 text-zinc-300">
              Some tools can stay. Some will eventually disappear. The immediate win is that your team no longer has
              to check five places, two calendars, three text threads, and your memory to know what is happening with a listing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {replacedTools.map((tool) => (
              <div key={tool} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-zinc-200">
                {tool}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo-workspace" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Live demo path</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
              Show them a successful media studio workspace, not an empty account.
            </h2>
            <p className="mt-5 leading-7 text-zinc-600">
              The demo should load with sample listing jobs, crew assignments, field updates, post-production queues,
              deliverables, payment status, and agent-facing clarity already in place. They should feel the operating model
              before they are asked to build anything.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={REM_DEMO_HREF} className={ctaClasses}>
                Step Into the Live Demo
              </Link>
              <Link href={REM_OPS_TEARDOWN_HREF} className={secondaryCtaClasses}>
                Get an Ops Teardown
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-zinc-950">Demo workspace should include</p>
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
                <div key={item} className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="media-ops-score" className="border-t border-zinc-200 bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Ops Teardown path</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
            For studios with unusual complexity, diagnose before the call.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl leading-7 text-zinc-600">
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

      <footer className="bg-zinc-950 px-4 py-10 text-center text-sm text-zinc-500 sm:px-6 lg:px-8">
        StudioFlows OS for real estate media studios · Built around the job from booked to delivered.
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 p-3 shadow-[0_-12px_40px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
        <Link href={REM_DEMO_HREF} className="flex w-full items-center justify-center rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white">
          Step Into the Live Demo
        </Link>
      </div>
    </main>
  );
}
