import Link from "next/link";

import EngagementPathsSection from "@/components/EngagementPathsSection";
import PlatformWaitlistClient from "./PlatformWaitlistClient";
import { PLATFORM_VERTICAL_MOLDS } from "@/lib/platform-molds";

export const metadata = {
  title: "Accelerate Waitlist",
  description:
    "Join the Accelerate waitlist — StudioFlows OS plus the AI suite built in. Pre-built vertical molds for service businesses ready to run system-driven operations.",
  alternates: {
    canonical: "/platform",
  },
  openGraph: {
    title: "Accelerate Waitlist | StudioFlows",
    description:
      "Accelerate your operations with pre-built vertical molds. Subscribe and run a complete system shaped for how your team works.",
    url: "https://www.studioflows.co/platform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Accelerate Waitlist | StudioFlows",
    description: "System-driven results — join the waitlist for StudioFlows OS plus the AI suite.",
  },
};

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] pb-24 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.12),transparent_32%)]" />

      <header className="border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/">
            <img src="/StudioFlows logo white (1200 x 675 px).png" alt="StudioFlows" className="h-10 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-white/70 transition hover:text-white">
            Back to home
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pt-16 sm:px-8 lg:px-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#FACC15]">Accelerate</p>
        <p className="mt-2 text-sm font-medium text-[#C4B5FD]/95">System-driven results.</p>
        <h1 className="mt-5 max-w-[980px] text-[clamp(2.2rem,5vw,4.5rem)] font-bold leading-tight tracking-[-0.03em]">
          Accelerate your operations — not just your tools.
        </h1>
        <p className="mt-6 max-w-[820px] text-lg leading-8 text-white/78">
          StudioFlows OS plus the AI suite built in. Pick a vertical mold for your business type, subscribe when slots
          open, and run a complete system that drives results — not another layer on the stack you already have.
        </p>

        <section className="mt-14" aria-labelledby="waitlist-form">
          <h2 id="waitlist-form" className="text-xl font-semibold text-white">
            Join the Accelerate waitlist
          </h2>
          <p className="mt-2 max-w-[720px] text-sm text-white/65">
            Waitlist only — not immediate access. Tell us your business type and we&apos;ll notify you when your mold opens.
          </p>
          <div className="mt-6 max-w-3xl">
            <PlatformWaitlistClient />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="vertical-molds">
          <h2 id="vertical-molds" className="text-xl font-semibold text-white">
            Vertical molds in development
          </h2>
          <p className="mt-2 max-w-[720px] text-sm text-white/65">
            Out-of-the-box systems tailored to service-business operating patterns — derived from real deployment fit maps.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_VERTICAL_MOLDS.map((group) => (
              <article key={group.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-white">{group.category}</h3>
                <p className="mt-1 text-sm text-white/60">{group.tagline}</p>
                <ul className="mt-3 space-y-1 text-sm text-white/75">
                  {group.examples.slice(0, 3).map((name) => (
                    <li key={name}>• {name}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 pb-8">
          <EngagementPathsSection highlightId="accelerate" />
        </section>
      </div>
    </main>
  );
}
