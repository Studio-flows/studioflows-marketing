"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { LIVE_SIGNALS, VESSA_FEATURES } from "./data";
import FinalVerdictSection from "./_components/FinalVerdictSection";
import InterceptDiagnosticSection from "./_components/InterceptDiagnosticSection";
import LiveSignalsSection from "./_components/LiveSignalsSection";
import OperatingLayerSection from "./_components/OperatingLayerSection";
import RecControlSurfaceSection from "./_components/RecControlSurfaceSection";
import VessaTeaserSection from "./_components/VessaTeaserSection";

export default function SilentCollapseClient() {
  return (
    <>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505]">
        <div className="absolute inset-0 bg-[radial-gradient(at_center,#1a1a2e_30%,#050505_70%)]" />

        <motion.div
          className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full border border-purple-500/20"
          animate={{ rotate: 360, scale: [1, 1.05, 1] }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative z-10 mx-auto grid h-full max-w-6xl items-center gap-12 px-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="mb-6 font-mono text-xs tracking-[6px] text-purple-400">
              PROTOCOL ACCESS • LEVEL 01 • LIVE SCAN ACTIVE
            </div>

            <h1 className="mb-10 text-6xl font-bold leading-[1.05] tracking-[-4px] md:text-8xl">
              Growth didn&apos;t break your business.
              <br />
              <span className="bg-gradient-to-br from-[#a855f7] via-[#c026d3] to-[#22d3ee] bg-clip-text text-transparent">
                Your operating system is collapsing in silence.
              </span>
            </h1>

            <p className="max-w-lg text-2xl text-zinc-400">
              Most founders never see the collapse until it&apos;s too late.
              <br />
              You just did.
            </p>
          </div>

          <div className="flex flex-col justify-center md:col-span-5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.04, boxShadow: "0 0 60px rgba(168, 85, 247, 0.5)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                document.getElementById("intercept-diagnostic")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="w-full rounded-3xl bg-white px-16 py-8 text-2xl font-semibold text-black shadow-2xl transition-all hover:bg-gradient-to-r hover:from-[#FACC15] hover:to-amber-300 md:w-auto"
            >
              Begin The Silent Collapse Diagnostic
            </motion.button>

            <p className="mt-8 text-center text-sm text-zinc-500 md:text-left">
              2 minutes. Brutally honest. No sales pitch.
            </p>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest text-zinc-600">
          SIGNAL INTEGRITY: HIGH • YOU HAVE BEEN NOTICED
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-20">
        <LiveSignalsSection signals={LIVE_SIGNALS} />
        <OperatingLayerSection />
        <RecControlSurfaceSection />
        <InterceptDiagnosticSection />
        <VessaTeaserSection features={VESSA_FEATURES} />
        <FinalVerdictSection />
        <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-zinc-500">
          Continue through the <Link href="/resources" className="text-purple-300 transition hover:text-purple-200">StudioFlows resource library</Link>.
        </footer>
      </div>
    </>
  );
}
