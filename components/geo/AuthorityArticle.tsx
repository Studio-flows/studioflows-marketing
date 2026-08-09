import Link from "next/link";

import { TrackedResourceLink } from "@/components/analytics/TrackedResourceLink";
import type { AuthorityPageDefinition } from "@/lib/geo/authority-pages";
import { absoluteUrl } from "@/lib/seo";

type AuthorityArticleProps = {
  page: AuthorityPageDefinition;
};

function formatReviewDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function buildArticleJsonLd(page: AuthorityPageDefinition) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: page.title,
        description: page.description,
        mainEntityOfPage: absoluteUrl(page.path),
        url: absoluteUrl(page.path),
        datePublished: page.publishedOn,
        dateModified: page.modifiedOn,
        author: {
          "@type": "Organization",
          name: "StudioFlows",
          url: absoluteUrl("/"),
        },
        publisher: {
          "@type": "Organization",
          name: "StudioFlows",
          url: absoluteUrl("/"),
        },
        about: page.primaryQuery,
        citation: page.sources.map(({ url }) => url),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Resources",
            item: absoluteUrl("/resources"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: page.title,
            item: absoluteUrl(page.path),
          },
        ],
      },
    ],
  };
}

export function AuthorityArticle({ page }: AuthorityArticleProps) {
  const jsonLd = buildArticleJsonLd(page);

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-[#F2EFE8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(circle_at_75%_8%,rgba(212,168,83,0.16),transparent_36%),radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.10),transparent_32%)]"
        aria-hidden="true"
      />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-white">
            STUDIOFLOWS
          </Link>
          <nav aria-label="Article navigation" className="flex items-center gap-5 text-sm text-white/65">
            <Link href="/resources" className="transition hover:text-white">
              Resources
            </Link>
            <Link href="/silent-collapse" className="transition hover:text-white">
              Diagnostic
            </Link>
          </nav>
        </div>
      </header>

      <article className="relative">
        <header className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pb-28">
          <nav aria-label="Breadcrumb" className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/42">
            <Link href="/resources" className="transition hover:text-white">
              Resources
            </Link>
            <span className="px-2" aria-hidden="true">/</span>
            <span>{page.eyebrow}</span>
          </nav>
          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#D4A853]">{page.eyebrow}</p>
              <h1 className="mt-7 max-w-5xl text-[clamp(3rem,7vw,6.6rem)] leading-[0.92] tracking-[-0.05em] text-white">
                {page.title}
              </h1>
              <p className="mt-8 max-w-3xl text-lg leading-8 text-white/64 sm:text-xl sm:leading-9">
                {page.description}
              </p>
            </div>
            <dl className="border-l border-[#D4A853]/45 pl-5 text-sm leading-6 text-white/58">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Content owner</dt>
                <dd className="mt-1 text-white/72">StudioFlows</dd>
              </div>
              <div className="mt-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Evidence review</dt>
                <dd className="mt-1 text-white/72">Public sources and the StudioFlows public route registry</dd>
              </div>
              <div className="mt-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Last reviewed</dt>
                <dd className="mt-1 text-white/72">{formatReviewDate(page.modifiedOn)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section aria-labelledby="direct-answer" className="border-y border-white/10 bg-white/[0.025]">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-14 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-12 lg:py-20">
            <h2 id="direct-answer" className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4A853]">
              Direct answer
            </h2>
            <p className="max-w-4xl text-2xl leading-[1.45] tracking-[-0.02em] text-white sm:text-3xl">
              {page.directAnswer}
            </p>
          </div>
        </section>

        <section aria-labelledby="framework" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/42">Original framework</p>
            <h2 id="framework" className="mt-4 text-4xl tracking-[-0.03em] text-white sm:text-5xl">
              {page.frameworkName}
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/62">{page.frameworkIntroduction}</p>
          </div>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 lg:grid-cols-2">
            {page.framework.map((step) => (
              <li key={step.number} className="bg-[#0D0D0D] p-7 sm:p-9">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-xs tracking-[0.22em] text-[#D4A853]">{step.number}</p>
                  <span className="h-px flex-1 bg-white/8" aria-hidden="true" />
                </div>
                <h3 className="mt-8 text-2xl text-white sm:text-3xl">{step.title}</h3>
                <p className="mt-5 text-base leading-7 text-white/62">{step.instruction}</p>
                <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Proof to collect</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{step.evidence}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="example" className="border-y border-white/10 bg-[#10100E]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-12 lg:py-24">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#D4A853]">{page.exampleLabel}</p>
              <h2 id="example" className="mt-5 text-3xl leading-tight text-white">{page.exampleTitle}</h2>
            </div>
            <div className="space-y-6 text-lg leading-8 text-white/65">
              {page.example.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-28">
          <div>
            <h2 className="text-3xl text-white sm:text-4xl">Signals the repair is incomplete</h2>
            <ul className="mt-8 space-y-4">
              {page.failureSignals.map((signal) => (
                <li key={signal} className="flex gap-4 border-b border-white/8 pb-4 text-base leading-7 text-white/62">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#D4A853]" aria-hidden="true" />
                  {signal}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl text-white sm:text-4xl">Limitations and controls</h2>
            <ul className="mt-8 space-y-4">
              {page.limitations.map((limitation) => (
                <li key={limitation} className="rounded-xl border border-white/10 bg-white/[0.025] p-5 text-base leading-7 text-white/62">
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="sources" className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/42">Evidence sources</p>
            <h2 id="sources" className="mt-4 max-w-3xl text-3xl text-white sm:text-4xl">
              The framework is original. These sources anchor the continuity and control principles behind it.
            </h2>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {page.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-[#D4A853]/45 hover:bg-white/[0.04]"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">{source.organization}</p>
                  <h3 className="mt-3 text-lg text-white">{source.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/55">{source.relevance}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="related" className="border-t border-white/10 bg-white/[0.02]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
            <h2 id="related" className="text-2xl text-white">Continue the operating trace</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {page.relatedLinks.map((link) => (
                <Link key={link.href} href={link.href} className="group rounded-xl border border-white/10 p-5 transition hover:border-white/25">
                  <p className="text-lg text-white">{link.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/52">{link.description}</p>
                  <span className="mt-4 inline-flex text-sm text-[#D4A853] transition-transform group-hover:translate-x-1">Open resource →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#D4A853] text-[#17130B]">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-end lg:px-12 lg:py-20">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-black/55">Relevant action</p>
              <h2 className="mt-4 text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">{page.action.title}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/65">{page.action.description}</p>
            </div>
            <TrackedResourceLink
              href={page.action.href}
              eventLabel={page.title}
              eventLocation={`authority_article_${page.slug}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#17130B] px-6 text-sm font-semibold text-[#F2EFE8] transition hover:bg-black"
            >
              {page.action.label}
            </TrackedResourceLink>
          </div>
        </section>
      </article>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-10 text-sm text-white/42 sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <p>© {new Date().getFullYear()} StudioFlows</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <Link href="/resources" className="transition hover:text-white">Resources</Link>
            <Link href="/privacy-policy" className="transition hover:text-white">Privacy</Link>
            <Link href="/terms-of-service" className="transition hover:text-white">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
