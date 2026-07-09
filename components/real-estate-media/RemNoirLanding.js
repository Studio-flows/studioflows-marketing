"use client";

import { useEffect } from "react";

import { RemNoirDemoWorkspaceSection } from "@/components/real-estate-media/RemNoirDemoWorkspaceSection";
import { RemNoirFieldFlowSection } from "@/components/real-estate-media/RemNoirFieldFlowSection";
import { RemNoirFrictionSection } from "@/components/real-estate-media/RemNoirFrictionSection";
import { RemNoirHeroSection } from "@/components/real-estate-media/RemNoirHeroSection";
import { RemNoirRecognizeSection } from "@/components/real-estate-media/RemNoirRecognizeSection";
import {
  RemNoirCategoryStrip,
  RemNoirFinalCtaSection,
  RemNoirFitSection,
  RemNoirPricingSection,
  RemNoirProofSection,
  RemNoirResultSection,
  RemNoirScoreSection,
  RemNoirToolsSection,
  RemNoirVoiceSection,
} from "@/components/real-estate-media/RemNoirSupportSections";
import {
  RemNoirPageShell,
  RemStickyMobileCta,
} from "@/components/real-estate-media/rem-noir-primitives";
import {
  captureRemAttributionForPath,
  REM_LANDING_PATH,
} from "@/lib/real-estate-media/remLeadAttribution";

export function RemNoirLanding() {
  useEffect(() => {
    captureRemAttributionForPath(REM_LANDING_PATH);
  }, []);

  return (
    <RemNoirPageShell>
      <RemNoirHeroSection />
      <RemNoirCategoryStrip />
      <RemNoirRecognizeSection />
      <RemNoirFrictionSection />
      <RemNoirDemoWorkspaceSection />
      <RemNoirToolsSection />
      <RemNoirFieldFlowSection />
      <RemNoirFitSection />
      <RemNoirPricingSection />
      <RemNoirScoreSection />
      <RemNoirVoiceSection />
      <RemNoirResultSection />
      <RemNoirProofSection />
      <RemNoirFinalCtaSection />
      <RemStickyMobileCta />
    </RemNoirPageShell>
  );
}
