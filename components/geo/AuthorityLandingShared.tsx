import type { ReactNode } from "react";
import Link from "next/link";

import { TrackedResourceLink } from "@/components/analytics/TrackedResourceLink";
import { buildAuthorityPageJsonLd } from "@/lib/geo/authority-page-schema";
import type { ModernAuthorityPageDefinition } from "@/lib/geo/authority-pages";

type AuthorityLandingShellProps = {
  page: ModernAuthorityPageDefinition;
  children: ReactNode;
  sectionTone: "noir" | "editorial";
};

type MidpointActionProps = {
  page: ModernAuthorityPageDefinition;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]";

const sectionLinks: ReadonlyArray<readonly [string, string]> = [
  ["Answer", "#answer"],
  ["Artifact", "#artifact"],
  ["Example", "#example"],
  ["Evidence", "#evidence"],
  ["Action", "#action"],
];

const footerLinks: ReadonlyArray<readonly [string, string]> = [
  ["Resources", "/resources"],
  ["Privacy", "/privacy-policy"],
  ["Terms", "/terms-of-service"],
];

function formatReviewDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function MidpointAction({ page }: MidpointActionProps) {
  return (
    <aside
      aria-label="Midpoint action"
      className="border-y border-[#D4A853]/25 bg-[#D4A853]/[0.08]"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#D4A853]">
            Put the artifact to work
          </p>
          <p className="mt-2 text-lg leading-7 text-white/75">{page.action.description}</p>
        </div>
        <TrackedResourceLink
          href={page.action.href}
          eventLabel={page.title}
          eventLocation={`authority_${page.slug}_midpoint`}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#D4A853] px-6 text-sm font-semibold text-[#17130B] transition-colors hover:bg-[#E2BE77] ${focusRing}`}
        >
          {page.action.label}
        </TrackedResourceLink>
      </div>
    </aside>
  );
}

export function AuthorityLandingShell({
  page,
  children,
  sectionTone,
}: AuthorityLandingShellProps) {
  const jsonLd = buildAuthorityPageJsonLd(page);
  const isEditorial = sectionTone === "editorial";

  return (
    <main className="min-h-screen overflow-x-clip bg-[#080808] text-[#F2EFE8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="relative z-10 border-b border-white/10 bg-[#080808]">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            className={`inline-flex min-h-11 items-center text-sm font-semibold tracking-[0.18em] text-white ${focusRing}`}
          >
            STUDIOFLOWS
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-2 text-sm text-white/70">
            <Link
              href="/resources"
              className={`inline-flex min-h-11 items-center rounded-full px-3 transition-colors hover:text-white ${focusRing}`}
            >
              Resources
            </Link>
            <Link
              href="/silent-collapse"
              className={`hidden min-h-11 items-center rounded-full px-3 transition-colors hover:text-white sm:inline-flex ${focusRing}`}
            >
              Diagnostic
            </Link>
          </nav>
        </div>
      </header>

      <article>
        <header className="relative isolate border-b border-white/10 bg-[#0A0A09]">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_8%,rgba(212,168,83,0.16),transparent_34%),radial-gradient(circle_at_12%_28%,rgba(99,102,241,0.08),transparent_28%)]"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-7xl px-5 pb-10 pt-7 sm:px-8 sm:pb-12 sm:pt-9 lg:px-12 lg:pb-14">
            <nav
              aria-label="Breadcrumb"
              className="flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50"
            >
              <Link href="/resources" className={`inline-flex min-h-11 items-center hover:text-white ${focusRing}`}>
                Resources
              </Link>
              <span aria-hidden="true">/</span>
              <span>{page.eyebrow}</span>
            </nav>

            <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:gap-12">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#D4A853]">
                  {page.eyebrow}
                </p>
                <h1 className="mt-4 max-w-5xl text-[clamp(2.55rem,5vw,4.6rem)] leading-[0.94] tracking-[-0.045em] text-white">
                  {page.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-7 text-white/82 sm:text-xl sm:leading-8">
                  {page.heroAnswer}
                </p>
                <TrackedResourceLink
                  href={page.action.href}
                  eventLabel={page.title}
                  eventLocation={`authority_${page.slug}_hero`}
                  className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#D4A853] px-6 text-sm font-semibold text-[#17130B] transition-colors hover:bg-[#E2BE77] ${focusRing}`}
                >
                  {page.action.label}
                </TrackedResourceLink>
              </div>

              <div>
                <aside className="border-l border-[#D4A853]/45 pl-5" aria-label="Review evidence">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                    Evidence review
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Public sources and the StudioFlows public route registry
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    Reviewed <time dateTime={page.modifiedOn}>{formatReviewDate(page.modifiedOn)}</time>
                  </p>
                </aside>

                <section id="answer" aria-labelledby="answer-heading" className="mt-7 border-t border-white/10 pt-6">
                <h2
                  id="answer-heading"
                  className="font-mono text-xs uppercase tracking-[0.22em] text-[#D4A853]"
                >
                  Direct answer
                </h2>
                  <p className="mt-4 max-w-4xl text-lg leading-7 tracking-[-0.015em] text-white sm:text-xl sm:leading-8">
                    {page.directAnswer}
                  </p>
                  <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                    {page.answerPoints.map((point, index) => (
                      <li
                        key={point}
                        className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-white/68"
                      >
                        <span className="mr-2 font-mono text-[10px] text-[#D4A853]">
                          0{index + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </header>

        <nav
          aria-label="On this page"
          className="sticky top-0 z-20 border-b border-white/10 bg-[#080808]/95 backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-6 lg:px-10">
            {sectionLinks.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/60 transition-colors hover:text-white ${focusRing}`}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        {children}

        <section
          className={
            isEditorial
              ? "bg-[#F2EFE8] text-[#17130B]"
              : "border-t border-white/10 bg-[#080808] text-[#F2EFE8]"
          }
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-20">
            <div>
              <h2 className={`text-3xl sm:text-4xl ${isEditorial ? "text-[#17130B]" : "text-white"}`}>
                Signals the repair is incomplete
              </h2>
              <ul className="mt-7 space-y-3">
                {page.failureSignals.map((signal) => (
                  <li
                    key={signal}
                    className={`flex gap-4 border-b pb-4 text-base leading-7 ${
                      isEditorial ? "border-black/10 text-black/65" : "border-white/10 text-white/65"
                    }`}
                  >
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#B78329]" aria-hidden="true" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className={`text-3xl sm:text-4xl ${isEditorial ? "text-[#17130B]" : "text-white"}`}>
                Limitations and controls
              </h2>
              <ul className="mt-7 space-y-3">
                {page.limitations.map((limitation) => (
                  <li
                    key={limitation}
                    className={`rounded-xl border p-5 text-base leading-7 ${
                      isEditorial
                        ? "border-black/10 bg-white/55 text-black/65"
                        : "border-white/10 bg-white/[0.025] text-white/65"
                    }`}
                  >
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="evidence" aria-labelledby="evidence-heading" className="border-t border-white/10 bg-[#080808]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/50">Source ledger</p>
            <h2 id="evidence-heading" className="mt-4 max-w-3xl text-3xl text-white sm:text-4xl">
              Evidence behind this framework
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
              The framework is original. These sources define the authority, traceability, and control principles used here.
            </p>
            <div className="mt-9 grid gap-4 lg:grid-cols-2">
              {page.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  className={`min-h-11 rounded-xl border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-[#D4A853]/50 hover:bg-white/[0.04] ${focusRing}`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">
                    {source.organization}
                  </p>
                  <h3 className="mt-3 text-lg text-white">{source.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/58">{source.relevance}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="related-heading" className="border-t border-white/10 bg-[#0C0C0B]">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
            <h2 id="related-heading" className="text-2xl text-white">Continue the operating trace</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group min-h-11 rounded-xl border border-white/10 p-5 transition-colors hover:border-white/25 ${focusRing}`}
                >
                  <p className="text-lg text-white">{link.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{link.description}</p>
                  <span className="mt-4 inline-flex text-sm text-[#D4A853]">Open resource →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="action" aria-labelledby="action-heading" className="bg-[#D4A853] text-[#17130B]">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:px-12 lg:py-16">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#3B2B13]">Relevant action</p>
              <h2 id="action-heading" className="mt-3 text-4xl leading-tight tracking-[-0.03em] text-[#17130B] sm:text-5xl">
                {page.action.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-black/65">{page.action.description}</p>
            </div>
            <TrackedResourceLink
              href={page.action.href}
              eventLabel={page.title}
              eventLocation={`authority_${page.slug}_final`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#17130B] px-6 text-sm font-semibold text-[#F2EFE8] transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#D4A853]"
            >
              {page.action.label}
            </TrackedResourceLink>
          </div>
        </section>
      </article>

      <footer className="border-t border-white/10 bg-[#080808]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <p>© {new Date().getFullYear()} StudioFlows</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-2">
            {footerLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex min-h-11 items-center rounded-md px-2 transition-colors hover:text-white ${focusRing}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}
