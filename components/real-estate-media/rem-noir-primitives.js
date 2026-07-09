"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { buildRemScoreHref } from "@/lib/real-estate-media/remLeadAttribution";
import { REM_DEMO_HREF, REM_SCORE_HREF } from "@/lib/real-estate-media/rem-landing-content";
import {
  REM_CTA,
  REM_CTA_SECONDARY,
  REM_NOIR_BG,
  REM_PANEL,
} from "@/components/real-estate-media/rem-noir-tokens";

function appendCtaId(href, ctaId) {
  if (!ctaId) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}cta_id=${encodeURIComponent(ctaId)}`;
}

export function RemScanlineOverlay() {
  return (
    <>
      <div className="rem-scanlines pointer-events-none absolute inset-0 z-[1] opacity-[0.14]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)",
        }}
        aria-hidden="true"
      />
    </>
  );
}

export function RemTerminalChrome({ title, right, children, className = "" }) {
  return (
    <div className={`${REM_PANEL} overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
        <span>{title}</span>
        {right ? <span className="text-red-400/70">{right}</span> : null}
      </div>
      <div className="relative p-3 sm:p-4">{children}</div>
    </div>
  );
}

export function RemPrimaryCta({ children, ctaId, href, className = "" }) {
  const resolvedHref = href
    ? appendCtaId(href, ctaId)
    : ctaId
      ? buildRemScoreHref(ctaId)
      : REM_SCORE_HREF;

  return (
    <Link href={resolvedHref} className={`${REM_CTA} ${className}`}>
      {children}
    </Link>
  );
}

export function RemSecondaryCta({ children, href = REM_SCORE_HREF, ctaId, className = "" }) {
  return (
    <Link href={appendCtaId(href, ctaId)} className={`${REM_CTA_SECONDARY} ${className}`}>
      {children}
    </Link>
  );
}

export function RemSection({ id, children, className = "" }) {
  return (
    <section id={id} className={`relative border-t border-zinc-800/80 py-10 lg:py-16 ${className}`}>
      {children}
    </section>
  );
}

export function useRemReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated && prefersReduced;
}

export function RemNoirPageShell({ children }) {
  return (
    <main className={`${REM_NOIR_BG} rem-noir-terminal relative min-h-screen overflow-x-hidden`}>
      <RemScanlineOverlay />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.04),transparent_55%)]" />
      <div className="relative z-10 mx-auto w-full max-w-md px-4 md:max-w-3xl md:px-8 lg:max-w-[1120px] lg:px-10">
        {children}
      </div>
    </main>
  );
}

export function RemStickyMobileCta() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 pt-8 md:hidden [background:linear-gradient(to_top,rgba(9,9,11,0.97)_60%,transparent)]">
      <Link
        href={appendCtaId(REM_DEMO_HREF, "sticky_mobile_demo")}
        className={`${REM_CTA} pointer-events-auto w-full shadow-[0_-8px_32px_rgba(0,0,0,0.5)]`}
      >
        Step Into the Live Demo
      </Link>
    </div>
  );
}
