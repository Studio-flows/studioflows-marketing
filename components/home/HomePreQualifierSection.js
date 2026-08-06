"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  Q_BODY,
  Q_CARD,
  Q_CTA_PRIMARY,
  Q_CTA_SECONDARY,
  Q_EYEBROW,
  Q_HEADLINE,
  Q_OPTION_IDLE,
} from "@/components/qualifier/qualifier-theme";
import { SECTION_REVEAL } from "@/components/home/section-reveal";
import { BookQuickCallButton } from "@/components/home/BookQuickCallButton";
import { buildOpsHubUrl, buildPreQualAnswerPayload, getPreQualBand } from "@/lib/lead-attribution";
import {
  HOMEPAGE_CTA,
  OPS_CHECK_LOW_FIT_COPY,
  OPS_CHECK_QUALIFIED_BRIDGE,
  PRE_QUALIFIER,
  QUIZ_QUESTIONS,
} from "@/lib/homepage-content";

function getAssessment(score) {
  if (score >= 13) {
    return {
      title: "High Operational Drag",
      body: `${score}/18. Some things are structured but handoffs and exceptions still end up back on your plate.`,
      qualified: true,
    };
  }
  if (score >= 8) {
    return {
      title: "Moderate Operational Drag",
      body: `${score}/18. Some things are structured but handoffs and exceptions still end up back on your plate.`,
      qualified: true,
    };
  }
  return {
    title: "Low to Moderate Drag",
    body: "You may not need a full audit slot yet. We recommend waitlist and follow-up first.",
    qualified: false,
  };
}

function getLowFitResult(score) {
  const band =
    OPS_CHECK_LOW_FIT_COPY.byScoreBand.find((entry) => score <= entry.maxScore) ??
    OPS_CHECK_LOW_FIT_COPY.byScoreBand[OPS_CHECK_LOW_FIT_COPY.byScoreBand.length - 1];

  return {
    title: band.title,
    body: band.body,
    guidance: band.guidance,
  };
}

function DiagnosisQuiz() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const isComplete = questionIndex >= QUIZ_QUESTIONS.length;
  const score = answers.reduce((sum, item) => sum + item.score, 0);
  const assessment = getAssessment(score);
  const currentQuestion = QUIZ_QUESTIONS[questionIndex];

  const selectAnswer = (option) => {
    const next = [...answers];
    next[questionIndex] = option;
    setAnswers(next);
    setQuestionIndex((prev) => prev + 1);
  };

  const opsHubHandoffUrl = assessment.qualified
    ? (() => {
        const preQualSession = buildPreQualAnswerPayload(
          QUIZ_QUESTIONS,
          answers,
          score,
          getPreQualBand(score),
          assessment.qualified
        );
        return buildOpsHubUrl({
          source: "homepage-diagnosis",
          pqSessionId: preQualSession.session_id,
          pqScore: score,
          pqQualified: assessment.qualified,
          pqBand: getPreQualBand(score),
          preQualSession,
        });
      })()
    : null;
  const lowFitResult = assessment.qualified ? null : getLowFitResult(score);

  if (isComplete) {
    if (assessment.qualified) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`${Q_CARD} p-6 sm:p-8`}
        >
          <p className={Q_EYEBROW}>{OPS_CHECK_QUALIFIED_BRIDGE.eyebrow}</p>
          <h3 className={`mt-3 text-2xl sm:text-3xl ${Q_HEADLINE}`}>{OPS_CHECK_QUALIFIED_BRIDGE.headline}</h3>
          <p className={`mt-3 text-sm leading-7 ${Q_BODY}`}>{OPS_CHECK_QUALIFIED_BRIDGE.subheadline}</p>
          <p className="mt-2 text-sm text-[#4E483D]">Ops Drag Snapshot: {score} / 18</p>

          <p className={`mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A6A1F]`}>
            {OPS_CHECK_QUALIFIED_BRIDGE.pathsHeading}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex h-full flex-col rounded-2xl border border-black/10 bg-white/85 p-5 sm:p-6">
              <h4 className="text-lg font-semibold text-[#0B0B0C]">{OPS_CHECK_QUALIFIED_BRIDGE.bookCall.title}</h4>
              <p className={`mt-3 flex-1 text-sm leading-7 ${Q_BODY}`}>{OPS_CHECK_QUALIFIED_BRIDGE.bookCall.body}</p>
              <BookQuickCallButton
                className={`${Q_CTA_PRIMARY} mt-5 w-full`}
                label={OPS_CHECK_QUALIFIED_BRIDGE.bookCall.cta}
                pqScore={score}
                pqBand={getPreQualBand(score)}
                opsCheckAnswers={answers.map((item) => item.label)}
              />
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-black/10 bg-white/85 p-5 sm:p-6">
              <h4 className="text-lg font-semibold text-[#0B0B0C]">{OPS_CHECK_QUALIFIED_BRIDGE.teardown.title}</h4>
              <p className={`mt-3 flex-1 text-sm leading-7 ${Q_BODY}`}>{OPS_CHECK_QUALIFIED_BRIDGE.teardown.body}</p>
              <Link href={opsHubHandoffUrl} className={`${Q_CTA_SECONDARY} mt-5 w-full`}>
                {OPS_CHECK_QUALIFIED_BRIDGE.teardown.cta}
              </Link>
            </div>
          </div>

          <p className={`mt-6 text-sm leading-7 ${Q_BODY}`}>{OPS_CHECK_QUALIFIED_BRIDGE.trustNote}</p>
          <p className={`mt-3 text-sm leading-7 ${Q_BODY}`}>{OPS_CHECK_QUALIFIED_BRIDGE.privacyNote}</p>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setQuestionIndex(0);
                setAnswers([]);
              }}
              className="rounded-full border border-black/20 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-[#3A352C] transition hover:bg-black/[0.05]"
            >
              Retake Pre-Qualifier
            </button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${Q_CARD} p-6 sm:p-8`}
      >
        <p className={Q_EYEBROW}>
          {OPS_CHECK_LOW_FIT_COPY.eyebrow}
        </p>
        <h3 className={`mt-3 text-2xl sm:text-3xl ${Q_HEADLINE}`}>
          {lowFitResult.title}
        </h3>
        <p className={`mt-3 text-sm leading-7 ${Q_BODY}`}>
          {lowFitResult.body}
        </p>
        <p className="mt-2 text-sm text-[#4E483D]">Ops Drag Snapshot: {score} / 18</p>
        <>
          <p className={`mt-3 text-sm leading-7 ${Q_BODY}`}>{lowFitResult.guidance}</p>
          <p className={`mt-3 text-sm leading-7 ${Q_BODY}`}>{OPS_CHECK_LOW_FIT_COPY.helper}</p>
        </>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={HOMEPAGE_CTA.vessaWaitlistHref} className={Q_CTA_SECONDARY}>
            {HOMEPAGE_CTA.vessaWaitlistLabel}
          </Link>
          <button
            type="button"
            onClick={() => {
              setQuestionIndex(0);
              setAnswers([]);
            }}
            className={Q_CTA_PRIMARY}
          >
            Retake Pre-Qualifier
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`${Q_CARD} p-6 sm:p-8`}>
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A6A1F]">
        <span>
          Question {questionIndex + 1} of {QUIZ_QUESTIONS.length}
        </span>
        <span>{Math.round((questionIndex / QUIZ_QUESTIONS.length) * 100)}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-black/10">
        <motion.div
          className="h-1.5 rounded-full bg-[#8A6A1F]"
          animate={{ width: `${(questionIndex / QUIZ_QUESTIONS.length) * 100}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3 className="mt-5 text-xl font-semibold leading-8 text-[#0B0B0C]">{currentQuestion.prompt}</h3>
          <div className="mt-4 space-y-2.5">
            {currentQuestion.options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => selectAnswer(option)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${Q_OPTION_IDLE}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-5">
        <button
          type="button"
          disabled={questionIndex === 0}
          onClick={() => setQuestionIndex((prev) => Math.max(prev - 1, 0))}
          className="rounded-full border border-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[#3A352C] transition hover:bg-black/[0.05] disabled:opacity-45"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default function HomePreQualifierSection() {
  return (
    <motion.section id="diagnosis" className="scroll-mt-24" {...SECTION_REVEAL}>
      <p className={Q_EYEBROW}>{HOMEPAGE_CTA.diagnosisLabel}</p>
      <h2 className={`mt-4 max-w-[980px] text-left text-[clamp(2rem,4vw,3.4rem)] ${Q_HEADLINE}`}>
        {PRE_QUALIFIER.heading}
      </h2>
      <p className={`mt-4 max-w-[980px] text-left text-lg leading-8 ${Q_BODY}`}>{PRE_QUALIFIER.subcopy}</p>
      <div className="mt-7">
        <DiagnosisQuiz />
      </div>
      <p className="mt-4 text-sm text-[#4E483D]">{PRE_QUALIFIER.footnote}</p>
    </motion.section>
  );
}
