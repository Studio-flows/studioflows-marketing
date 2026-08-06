"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import {
  buildScoreHandoffPayload,
  SFP_SCORE_INTAKE_URL,
} from "@/lib/real-estate-media/buildScoreHandoffPayload";
import { trackConversionEvent } from "@/lib/analytics-events";
import {
  captureRemAttributionForPath,
  getRemAttributionForHandoff,
  REM_SCORE_PATH,
} from "@/lib/real-estate-media/remLeadAttribution";
import {
  VESSA_BG,
  VESSA_BODY,
  VESSA_BODY_SM,
  VESSA_CTA,
  VESSA_CTA_BLOCK,
  VESSA_PANEL,
} from "@/components/vessa/vessa-tokens";

const TOTAL_STEPS = 9;

const VOLUME_OPTIONS = ["Under 10", "10–25", "26–50", "51–100", "100+"];

const PEOPLE_OPTIONS = [
  "Just me",
  "Me plus one helper",
  "Photographers",
  "Photographers and editors",
  "Field team and post team",
];

const SERVICE_OPTIONS = [
  "Photos",
  "Video",
  "Drone",
  "Floor plans",
  "3D tours",
  "Reels or social clips",
  "Twilight",
  "Virtual staging",
];

const UNCLEAR_OPTIONS = [
  "New booking details",
  "Crew assignment",
  "Schedule changes",
  "Access notes",
  "Editing status",
  "Delivery timing",
  "Client updates",
  "Payment or invoice status",
];

const OWNER_DRAG_OPTIONS = [
  "Who is assigned?",
  "Where are the files?",
  "Did the agent get updated?",
  "Is editing done?",
  "Can we move this shoot?",
  "What package did they order?",
  "Too many of these",
];

function OptionButton({ label, selected, onClick, multi = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[52px] w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
        selected
          ? "border-[#D4A853]/40 bg-[#D4A853]/10 text-white"
          : "border-white/10 bg-black/25 text-white/72 hover:border-white/20"
      }`}
      aria-pressed={selected}
    >
      {multi && selected ? "✓ " : ""}
      {label}
    </button>
  );
}

function StepPanel({ active, children }) {
  return (
    <div className={active ? "" : "hidden"} aria-hidden={!active}>
      {children}
    </div>
  );
}
function ProgressBar({ step }) {
  const pct = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
        <span>Media Ops Score</span>
        <span>
          {step + 1} / {TOTAL_STEPS}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-[#D4A853]/80 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MediaOpsScoreFlow() {
  const [step, setStep] = useState(0);
  const [volume, setVolume] = useState("");
  const [people, setPeople] = useState("");
  const [services, setServices] = useState([]);
  const [unclear, setUnclear] = useState([]);
  const [ownerDrag, setOwnerDrag] = useState([]);
  const [messyAnswer, setMessyAnswer] = useState("");
  const [lead, setLead] = useState({ name: "", company: "", email: "", website: "" });
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [scoreSessionId] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    captureRemAttributionForPath(REM_SCORE_PATH);
  }, []);

  const toggleMulti = (value, list, setter) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(volume);
    if (step === 2) return Boolean(people);
    if (step === 3) return services.length > 0;
    if (step === 4) return unclear.length > 0;
    if (step === 5) return ownerDrag.length > 0;
    if (step === 7) {
      return (
        lead.name.trim() &&
        lead.company.trim() &&
        lead.email.trim() &&
        consentAccepted &&
        !isSubmitting
      );
    }
    return true;
  }, [step, volume, people, services, unclear, ownerDrag, lead, consentAccepted, isSubmitting]);

  const nextLabel = useMemo(() => {
    if (step === 0) return "Start";
    if (step === 7) return "Show My Score";
    if (step === 8) return null;
    return "Continue";
  }, [step]);

  const submitScore = async () => {
    setSubmitError("");
    setIsSubmitting(true);

    if (!scoreSessionId) {
      setSubmitError("Unable to start a score session. Refresh the page and try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = buildScoreHandoffPayload({
        lead,
        volume,
        people,
        services,
        unclear,
        ownerDrag,
        messyAnswer,
        scoreSessionId,
        attribution: getRemAttributionForHandoff(),
        consent: consentAccepted,
      });

      const response = await fetch(SFP_SCORE_INTAKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSubmitError(
          typeof result.error === "string"
            ? result.error
            : "Unable to submit your score right now. Try again in a moment."
        );
        return;
      }

      trackConversionEvent({
        event: "diagnostic_complete",
        diagnostic_id: "media_ops_score",
        source: "/real-estate-media/score",
      });

      if (typeof result.next_url === "string" && result.next_url) {
        window.location.assign(result.next_url);
        return;
      }

      setStep(8);
    } catch {
      setSubmitError("Unable to submit your score right now. Try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === 0 && !hasTrackedStart.current) {
      hasTrackedStart.current = true;
      trackConversionEvent({
        event: "diagnostic_start",
        diagnostic_id: "media_ops_score",
        source: "/real-estate-media/score",
      });
    }

    if (step === 7) {
      void submitScore();
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <main className={`${VESSA_BG} min-h-screen pb-28`}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative z-10 mx-auto w-full max-w-md px-5 py-6">
        <Link
          href="/real-estate-media"
          className="mb-4 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 hover:text-white/60"
        >
          ← Back to overview
        </Link>

        {step < 8 ? <ProgressBar step={step} /> : null}

        <StepPanel active={step === 0}>
          <h1 className="text-2xl font-semibold leading-tight text-white">Media Ops Score</h1>
          <div className={`mt-4 space-y-3 ${VESSA_BODY}`}>
            <p>A short check for real estate media teams.</p>
            <p>Mostly tap answers. One optional messy answer.</p>
          </div>
        </StepPanel>

        <StepPanel active={step === 1}>
          <h2 className="text-xl font-semibold leading-snug text-white">
            About how many shoots or jobs move through your company in a normal month?
          </h2>
          <div className="mt-6 space-y-2">
            {VOLUME_OPTIONS.map((opt) => (
              <OptionButton key={opt} label={opt} selected={volume === opt} onClick={() => setVolume(opt)} />
            ))}
          </div>
        </StepPanel>

        <StepPanel active={step === 2}>
          <h2 className="text-xl font-semibold leading-snug text-white">
            Who touches a typical job before it is delivered?
          </h2>
          <div className="mt-6 space-y-2">
            {PEOPLE_OPTIONS.map((opt) => (
              <OptionButton key={opt} label={opt} selected={people === opt} onClick={() => setPeople(opt)} />
            ))}
          </div>
        </StepPanel>

        <StepPanel active={step === 3}>
          <h2 className="text-xl font-semibold leading-snug text-white">What do you sell regularly?</h2>
          <p className={`mt-3 ${VESSA_BODY_SM}`}>Tap all that apply.</p>
          <div className="mt-5 space-y-2">
            {SERVICE_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={services.includes(opt)}
                multi
                onClick={() => toggleMulti(opt, services, setServices)}
              />
            ))}
          </div>
        </StepPanel>

        <StepPanel active={step === 4}>
          <h2 className="text-xl font-semibold leading-snug text-white">Where do jobs get fuzzy?</h2>
          <p className={`mt-3 ${VESSA_BODY_SM}`}>Tap all that apply.</p>
          <div className="mt-5 space-y-2">
            {UNCLEAR_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={unclear.includes(opt)}
                multi
                onClick={() => toggleMulti(opt, unclear, setUnclear)}
              />
            ))}
          </div>
        </StepPanel>

        <StepPanel active={step === 5}>
          <h2 className="text-xl font-semibold leading-snug text-white">What still comes back to you?</h2>
          <p className={`mt-3 ${VESSA_BODY_SM}`}>Tap all that apply.</p>
          <div className="mt-5 space-y-2">
            {OWNER_DRAG_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={ownerDrag.includes(opt)}
                multi
                onClick={() => toggleMulti(opt, ownerDrag, setOwnerDrag)}
              />
            ))}
          </div>
        </StepPanel>

        <StepPanel active={step === 6}>
          <h2 className="text-xl font-semibold leading-snug text-white">
            What happened recently that made you think: &ldquo;Why am I still involved in this?&rdquo;
          </h2>
          <div className={`mt-4 ${VESSA_BODY}`}>
            <p>Optional. Skip if nothing comes to mind.</p>
          </div>
          <textarea
            value={messyAnswer}
            onChange={(e) => setMessyAnswer(e.target.value)}
            placeholder="Type it, or use voice-to-text."
            rows={5}
            className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[#D4A853]/40 focus:outline-none"
          />
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            Messy answer is fine. One sentence works.
          </p>
        </StepPanel>

        <StepPanel active={step === 7}>
          <h2 className="text-xl font-semibold leading-snug text-white">Your score is ready.</h2>
          <p className={`mt-3 ${VESSA_BODY}`}>Where should we send the breakdown?</p>
          <div className="mt-6 space-y-3">
            {[
              ["name", "Name"],
              ["company", "Company"],
              ["email", "Email"],
              ["website", "Website"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                  {label}
                </span>
                <input
                  type={key === "email" ? "email" : "text"}
                  value={lead[key]}
                  onChange={(e) => setLead((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/35 focus:border-[#D4A853]/40 focus:outline-none"
                />
              </label>
            ))}
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#D4A853]"
            />
            <span className={`${VESSA_BODY_SM} text-white/68`}>
              I agree to receive my Media Ops Score breakdown and related follow-up about StudioFlows for
              real estate media teams.
            </span>
          </label>
          {submitError ? (
            <p className="mt-4 rounded-2xl border border-[#DB2777]/30 bg-[#DB2777]/10 px-4 py-3 text-sm text-[#F9A8D4]">
              {submitError}
            </p>
          ) : null}
        </StepPanel>

        <StepPanel active={step === 8}>
          <div id="demo-next">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4A853]/80">Sample Result</p>
            <h2 className="mt-3 text-2xl font-semibold leading-snug text-white">
              Too much status still lives with the owner.
            </h2>
            <div className={`mt-5 space-y-3 ${VESSA_BODY}`}>
              <p>This is placeholder logic for now. The next gate will connect scoring and routing.</p>
            </div>
            <div className={`${VESSA_PANEL} mt-6 border border-white/10 py-4`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Based on your answers</p>
              <ul className={`mt-3 space-y-2 ${VESSA_BODY_SM}`}>
                {volume ? <li>Volume: {volume} jobs/month</li> : null}
                {people ? <li>Team: {people}</li> : null}
                {ownerDrag.length ? <li>Still routing to you: {ownerDrag.slice(0, 3).join(", ")}</li> : null}
              </ul>
            </div>
            <button
              type="button"
              disabled
              className={`${VESSA_CTA_BLOCK} mt-8 min-h-[52px] cursor-not-allowed opacity-45`}
            >
              Open Demo Workspace
            </button>
            <p className="mt-3 text-center text-xs text-white/40">Demo route not connected yet.</p>
          </div>
        </StepPanel>
      </div>

      {step < 8 && nextLabel ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-[#030304]/95 px-4 pb-4 pt-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-md gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="min-h-[52px] shrink-0 rounded-2xl border border-white/15 px-4 text-xs uppercase tracking-[0.14em] text-white/60"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className={`${VESSA_CTA} min-h-[52px] flex-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {isSubmitting ? "Submitting..." : nextLabel}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
