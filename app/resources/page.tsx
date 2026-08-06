import type { Metadata } from "next";
import Link from "next/link";

import { TrackedResourceLink } from "@/components/analytics/TrackedResourceLink";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Operational Resources",
  description:
    "Diagnostics and operating models for finding owner dependency, broken handoffs, and operational drag in service businesses.",
  alternates: {
    canonical: "/resources",
  },
  openGraph: {
    title: "Operational Resources | StudioFlows",
    description:
      "Diagnostics and operating models for finding owner dependency, broken handoffs, and operational drag.",
    url: "/resources",
    type: "website",
  },
};

const RESOURCES = [
  {
    number: "01",
    type: "Field guide",
    title: "Founder Bottleneck",
    description:
      "Trace the decisions, context, and handoffs that still make normal work wait for the founder.",
    href: "/resources/founder-bottleneck",
    cta: "Map the bottleneck",
    featured: true,
  },
  {
    number: "02",
    type: "Continuity guide",
    title: "Business That Runs Without You",
    description:
      "Run a bounded owner-absence test without removing the controls, authority, or evidence the work requires.",
    href: "/resources/business-that-runs-without-you",
    cta: "Build the continuity test",
    featured: true,
  },
  {
    number: "03",
    type: "Diagnostic",
    title: "Silent Collapse Diagnostic",
    description:
      "Surface the founder bottlenecks, stalled decisions, and broken handoffs that hide behind day-to-day activity.",
    href: "/silent-collapse",
    cta: "Run the diagnostic",
    featured: true,
  },
  {
    number: "04",
    type: "Operating model",
    title: "Real Estate Media OS",
    description:
      "See how booking, crew, field work, uploads, editing, delivery, and payments can stay connected in one operation.",
    href: "/real-estate-media",
    cta: "Explore the operating model",
    featured: true,
  },
  {
    number: "05",
    type: "Guided audit",
    title: "Ops Teardown",
    description:
      "Answer questions about how work moves day to day and get a specific breakdown of where operational drag is showing up.",
    href: "/services/custom-ops-hub",
    cta: "Start the teardown",
    featured: false,
  },
  {
    number: "06",
    type: "Execution system",
    title: "Vessa",
    description:
      "Explore a business-intelligence execution system for prepared work, approvals, and recorded outcomes.",
    href: "/vessa",
    cta: "Explore Vessa",
    featured: false,
  },
  {
    number: "07",
    type: "Waitlist",
    title: "StudioFlows OS",
    description:
      "Review the service-business operating models in development and join the Accelerate waitlist.",
    href: "/platform",
    cta: "View the waitlist",
    featured: false,
  },
] as const;

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "StudioFlows Operational Resources",
  description:
    "Diagnostics and operating models for owner-dependent service businesses.",
  url: absoluteUrl("/resources"),
  mainEntity: {
    "@type": "ItemList",
    itemListElement: RESOURCES.map((resource, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: resource.title,
      url: absoluteUrl(resource.href),
    })),
  },
};

export default function ResourcesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-[#F2EFE8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_72%_12%,rgba(212,168,83,0.15),transparent_36%),radial-gradient(circle_at_10%_18%,rgba(34,211,238,0.08),transparent_30%)]"
        aria-hidden="true"
      />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-white">
            STUDIOFLOWS
          </Link>
          <nav aria-label="Resources navigation" className="flex items-center gap-5 text-sm text-white/65">
            <a href="#library" className="transition hover:text-white">
              Library
            </a>
            <Link href="/services/custom-ops-hub" className="transition hover:text-white">
              Ops Teardown
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-8 sm:pt-28 lg:px-12 lg:pb-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#D4A853]">
              Operational resource library
            </p>
            <h1 className="mt-7 max-w-5xl text-[clamp(3.4rem,8vw,7.6rem)] leading-[0.88] tracking-[-0.055em] text-[#F2EFE8]">
              Find where the work still depends on you.
            </h1>
          </div>
          <p className="border-l border-[#D4A853]/50 pl-5 text-base leading-7 text-white/62">
            Diagnostics and operating models for owner-dependent service businesses. Start with the pressure you can
            see, then trace the handoffs underneath it.
          </p>
        </div>
      </section>

      <section id="library" aria-labelledby="library-heading" className="relative border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/45">Current library</p>
              <h2 id="library-heading" className="mt-3 text-3xl text-white sm:text-4xl">
                Start with a diagnosis. Follow the evidence.
              </h2>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/35">07 public resources</p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 lg:grid-cols-2">
            {RESOURCES.map((resource) => (
              <article
                key={resource.href}
                className={`group relative flex min-h-[22rem] flex-col bg-[#0D0D0D] p-7 transition duration-300 hover:bg-[#12110E] sm:p-9 ${
                  resource.featured ? "lg:min-h-[27rem]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-6">
                  <p className="font-mono text-xs tracking-[0.22em] text-[#D4A853]">{resource.number}</p>
                  <p className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/48">
                    {resource.type}
                  </p>
                </div>
                <div className="mt-auto pt-16">
                  <h3 className="text-3xl leading-tight text-white sm:text-4xl">{resource.title}</h3>
                  <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/58">{resource.description}</p>
                  <TrackedResourceLink
                    href={resource.href}
                    eventLabel={resource.title}
                    eventLocation="resources_library"
                    className="mt-8 inline-flex items-center gap-3 text-sm font-semibold text-[#E5C579] transition group-hover:text-[#F4DDA6]"
                  >
                    {resource.cta}
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </TrackedResourceLink>
                </div>
              </article>
            ))}

            <article className="flex min-h-[22rem] flex-col justify-between bg-[#D4A853] p-7 text-[#17130B] sm:p-9">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-black/55">Not sure where to begin?</p>
              <div>
                <h3 className="text-3xl leading-tight text-[#17130B] sm:text-4xl">Start with how work moves today.</h3>
                <p className="mt-5 max-w-xl text-[15px] leading-7 text-black/65">
                  The Ops Teardown maps handoffs, exceptions, and status work before any build conversation.
                </p>
                <TrackedResourceLink
                  href="/services/custom-ops-hub"
                  eventLabel="Ops Teardown"
                  eventLocation="resources_closing_card"
                  className="mt-8 inline-flex items-center gap-3 text-sm font-semibold text-black"
                >
                  Start the Ops Teardown <span aria-hidden="true">→</span>
                </TrackedResourceLink>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 py-10 text-sm text-white/45 sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <p>© {new Date().getFullYear()} StudioFlows</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <Link href="/privacy-policy" className="transition hover:text-white">Privacy</Link>
            <Link href="/terms-of-service" className="transition hover:text-white">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
