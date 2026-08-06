"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { buildOpsHubUrl } from "@/lib/lead-attribution";
import { trackConversionEvent } from "@/lib/analytics-events";
import { INTERCEPT_QUESTIONS } from "../data";

export default function InterceptDiagnosticSection() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const hasTrackedStart = useRef(false);

  const isComplete = questionIndex >= INTERCEPT_QUESTIONS.length;
  const score = answers.reduce((sum, value) => sum + value, 0);
  const maxScore = INTERCEPT_QUESTIONS.length * 5;
  const currentQuestion = INTERCEPT_QUESTIONS[questionIndex];

  const opsHubUrl = useMemo(
    () =>
      buildOpsHubUrl({
        source: "silent-collapse-intercept",
        pqScore: score,
        pqQualified: score >= 15,
        pqBand: score >= 20 ? "high" : score >= 12 ? "moderate" : "low",
      }),
    [score],
  );

  const selectAnswer = (optionScore: number) => {
    const next = [...answers];
    next[questionIndex] = optionScore;

    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true;
      trackConversionEvent({
        event: "diagnostic_start",
        diagnostic_id: "silent_collapse",
        source: "/silent-collapse",
      });
    }

    if (questionIndex === INTERCEPT_QUESTIONS.length - 1) {
      const nextScore = next.reduce((sum, value) => sum + value, 0);
      trackConversionEvent({
        event: "diagnostic_complete",
        diagnostic_id: "silent_collapse",
        source: "/silent-collapse",
        score: nextScore,
        result_band: nextScore >= 20 ? "high" : nextScore >= 12 ? "moderate" : "low",
        qualified: nextScore >= 15,
      });
    }

    setAnswers(next);
    setQuestionIndex((prev) => prev + 1);
  };

  return (
    <section id="intercept-diagnostic" className="scroll-mt-24 pb-8 pt-24 sm:pt-28">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#C4B5FD]">Silent Collapse Diagnostic</p>
      <h2 className="mt-3 max-w-[900px] text-[clamp(1.8rem,3.6vw,3rem)] font-bold leading-tight tracking-[-0.02em]">
        Five signals. One collapse score.
      </h2>

      {isComplete ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl border border-[#FACC15]/35 bg-black/40 p-6 sm:p-8"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#FACC15]">Signal lock complete</p>
          <p className="mt-3 text-2xl font-semibold">Collapse index: {score} / {maxScore}</p>
          <p className="mt-3 max-w-[720px] text-sm leading-7 text-white/78">
            High-signal teams move to the OPS Drag Audit qualifier next. Your intercept score travels with you — it
            does not auto-qualify you.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={opsHubUrl}
              className="rounded-xl bg-[#FACC15] px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:brightness-105"
            >
              Continue to OPS Drag Audit
            </Link>
            <button
              type="button"
              onClick={() => {
                setQuestionIndex(0);
                setAnswers([]);
                hasTrackedStart.current = false;
              }}
              className="rounded-xl border border-white/30 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/[0.08]"
            >
              Retake diagnostic
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="mt-8 rounded-2xl border border-white/12 bg-black/35 p-5 sm:p-7">
          <div className="flex items-center justify-between text-xs text-white/65">
            <span>
              Signal {questionIndex + 1} of {INTERCEPT_QUESTIONS.length}
            </span>
            <span>{Math.round((questionIndex / INTERCEPT_QUESTIONS.length) * 100)}%</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
              className="mt-6"
            >
              <h3 className="text-xl font-semibold sm:text-2xl">{currentQuestion.prompt}</h3>
              <div className="mt-5 grid gap-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => selectAnswer(option.score)}
                    className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-left text-sm text-white/85 transition hover:border-[#FACC15]/45 hover:bg-[#FACC15]/10"
                  >
                    <span className="font-medium text-white">{option.label}</span>
                    <span className="mt-1 block text-xs text-white/55">{option.confidence}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
