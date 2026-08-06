import Link from "next/link";

import { INITIATION_HOMEPAGE_CONTENT } from "@/lib/initiation-homepage-content";
import {
  InitiationAICategorySection,
  InitiationContinuityReframeSection,
  InitiationDependencySelectorSection,
  InitiationEntryPathsSection,
  InitiationFinalCtaSection,
  InitiationFounderPainSection,
  InitiationFounderStorySection,
  InitiationFridayReportSection,
  InitiationHeroSection,
  InitiationOperationalDiagnosticSection,
  InitiationServiceLoopsSection,
  InitiationStudioFlowsRevealSection,
  InitiationWhatYouGetSection,
  InlineCtaAnchor,
  MobileStickyPrimaryCta,
  ProgressionProvider,
  SystemResetTransition,
} from "@/components/home/InitiationHomeSections";

export const metadata = {
  alternates: {
    canonical: "/",
  },
};

const C = INITIATION_HOMEPAGE_CONTENT;
const LIVE_DEMO_URL = "https://os.studioflows.co/demo/access";
const LOGIN_URL = "https://os.studioflows.co/login";

const HOME_HERO = {
  ...C.hero,
  secondaryCta: "See It Live",
  secondaryCtaTarget: LIVE_DEMO_URL,
  funnelHelperCopy:
    "New here? Start with the Ops Check. Want to see the workspace first? Open the live demo.",
};

function SubscriberNav() {
  return (
    <nav
      aria-label="Subscriber access"
      className="absolute right-4 top-5 z-[70] flex items-center gap-1 rounded-full border border-white/10 bg-[#05070B]/88 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:right-8 lg:right-20"
    >
      <Link
        href="/resources"
        className="hidden min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-white/68 transition hover:bg-white/[0.06] hover:text-white md:inline-flex"
      >
        Resources
      </Link>
      <Link
        href={LIVE_DEMO_URL}
        className="hidden min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-[#D4A853] transition hover:bg-white/[0.06] hover:text-[#F2D79B] sm:inline-flex"
        prefetch={false}
      >
        Live Demo
      </Link>
      <Link
        href={LOGIN_URL}
        className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#E8E6E3] px-4 text-xs font-semibold text-[#030304] transition hover:bg-white"
        prefetch={false}
      >
        Log in
      </Link>
    </nav>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#030304] pb-[calc(5rem+env(safe-area-inset-bottom))] text-[#E8E6E3] lg:pb-0">
      <ProgressionProvider>
        <div className="home-hero-access-cleanup relative">
          <style>{`.home-hero-access-cleanup section > header > div:last-child { display: none; }`}</style>
          <SubscriberNav />
          <InitiationHeroSection content={HOME_HERO} />
        </div>
        <MobileStickyPrimaryCta href={C.hero.primaryCtaTarget} label={C.hero.primaryCta} />
        <InitiationFounderPainSection content={C.founderPain} />
        <InitiationDependencySelectorSection content={C.dependencySelector} />
        <InitiationFounderStorySection content={C.founderStory} />
        <InitiationContinuityReframeSection
          content={C.continuityReframe}
          inlineCta={{ href: C.warmAuditCtaTarget, label: C.warmAuditCta }}
        />
        <InitiationAICategorySection content={C.aiCategorySeparation} />

        <InitiationStudioFlowsRevealSection content={C.studioFlowsReveal} />

        <InitiationFridayReportSection content={C.fridayReportSimulation} />
        <InitiationWhatYouGetSection content={C.whatYouGet} />
        <InitiationServiceLoopsSection content={C.serviceLoops} />
        {/* lightly-sprinkled anchor after the service-loops fit check (dark) */}
        <InlineCtaAnchor
          href={C.warmAuditCtaTarget}
          label={C.warmAuditCta}
          tone="dark"
        />

        {/* THE TURN — the noir is killed and the page is reborn in light. */}
        <SystemResetTransition />

        <InitiationOperationalDiagnosticSection content={C.operationalDiagnostic} />

        <InitiationEntryPathsSection content={C.entryPaths} />
        <InitiationFinalCtaSection content={C.finalCta} />
      </ProgressionProvider>
    </main>
  );
}
