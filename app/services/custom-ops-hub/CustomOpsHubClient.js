"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildOpsTeardownThankYouUrl,
  isOpsTeardownContinuation,
} from "../../../lib/ops-audit-handoff";
import {
  loadLeadAttribution,
  loadPreQualSession,
  mergeLeadAttribution,
  parseLeadAttribution,
  resolveQualifiedOpsAuditRedirect,
  toIngestAttribution,
  toIngestPreQual,
} from "../../../lib/lead-attribution";
import { evaluateQualification } from "../../../lib/qualify-custom-ops-hub";
import { trackConversionEvent } from "../../../lib/analytics-events";
import {
  QualifierAtmosphere,
  QUALIFIER_PAGE,
  Q_BODY,
  Q_CARD,
  Q_CTA_PRIMARY,
  Q_EYEBROW,
  Q_HEADLINE,
  Q_INPUT,
  Q_OPTION_ACTIVE,
  Q_OPTION_IDLE,
} from "../../../components/qualifier/qualifier-theme";

const QUIZ_SECTIONS = [
  {
    id: "company-context",
    title: "Start with how your business actually runs",
    challenger:
      "We map your operating model first so recommendations match how work really moves — not how the org chart says it should.",
    fields: [
      {
        name: "businessModel",
        label: "What best describes your business model?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Service business", "Agency", "Consultancy", "B2B SaaS", "Hybrid model"],
      },
      {
        name: "companyStage",
        label: "Which stage best matches your company right now?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Early traction", "Growing team", "Scaling operations", "Mature and optimizing"],
      },
    ],
  },
  {
    id: "pain-area",
    title: "Pinpoint where drag is costing you most",
    challenger:
      "Pick the area where delays, rework, or founder firefighting show up every week — that is the constraint we design against.",
    fields: [
      {
        name: "primaryPainArea",
        label: "Where is operational complexity hurting the most today?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Client delivery", "Sales to onboarding handoff", "Team coordination", "Reporting and visibility", "Billing and fulfillment"],
      },
    ],
  },
  {
    id: "bottleneck",
    title: "Name the bottleneck you want gone first",
    challenger:
      "One primary bottleneck per engagement — the pattern that keeps compounding cost until something breaks in front of a client.",
    fields: [
      {
        name: "highestCostBottleneck",
        label: "What is the highest-cost bottleneck you want fixed first?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Manual handoffs causing delays",
          "No clear ownership per workflow stage",
          "Fragmented tools and duplicate work",
          "Execution quality varies by person",
          "Leadership lacks real-time control",
        ],
      },
      {
        name: "highestCostBottleneckOther",
        label: "Anything to add about this bottleneck? (optional)",
        type: "text",
        required: false,
        placeholder: "One sentence is enough.",
      },
    ],
  },
  {
    id: "workflow-handling",
    title: "Show how work actually moves today",
    challenger:
      "Tell us which tools and habits carry the workflow today so we know what to connect, replace, or simplify.",
    fields: [
      {
        name: "workflowManagement",
        label: "How are you currently managing this workflow? (select all that apply)",
        type: "multi",
        required: true,
        options: ["Spreadsheets", "CRM", "Project management tool", "Slack and email", "Manual SOPs", "Custom internal tools"],
      },
    ],
  },
  {
    id: "breakdown",
    title: "What breaks on repeat",
    challenger: "Choose the pattern you see most weeks, not a one-off fire drill.",
    fields: [
      {
        name: "frequentBreakdown",
        label: "What breaks most often in your current process?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Missed deadlines", "Dropped handoffs", "Rework and quality drift", "Incomplete visibility", "Slow decision cycles"],
      },
      {
        name: "frequentBreakdownDetail",
        sectionTitle: "What it costs when it breaks again",
        challenger:
          "Be specific about the business hit: delayed revenue, rework, client trust, margin, or leadership time stuck in triage.",
        label: "What is the business consequence when this breaks?",
        type: "textarea",
        required: true,
        placeholder: "Example: we lose 2-3 days per month to rework, or deals stall until I personally unblock them.",
      },
    ],
  },
  {
    id: "urgency",
    title: "Timeline and risk if nothing changes",
    challenger:
      "Be honest about the window you are operating in — it tells us whether to design for immediate execution or a phased rollout.",
    fields: [
      {
        name: "urgencyWindow",
        label: "What urgency window are you operating under?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Now (0-30 days)", "Near term (1-3 months)", "This quarter", "This year"],
      },
      {
        name: "quarterRisk",
        label: "What happens if this is not solved this quarter?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Revenue risk increases",
          "Delivery quality degrades",
          "Hiring pressure increases",
          "Leadership throughput slows",
          "Strategic initiatives stall",
        ],
      },
    ],
  },
  {
    id: "ownership",
    title: "How hands-on you want us during the build",
    challenger:
      "Clarify how much execution you want StudioFlows to own versus collaborate on — it shapes team shape and delivery cadence.",
    fields: [
      {
        name: "implementationOwnership",
        label: "How hands-on do you want to be during implementation?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Low involvement: I want StudioFlows to handle most of it",
          "Shared involvement: we collaborate with weekly checkpoints",
          "High involvement: I want a strategy/blueprint first, then decide next steps",
        ],
      },
    ],
  },
  {
    id: "budget-approval",
    title: "Platform access pricing and who can say yes",
    challenger:
      "Founding members get platform access at the launch rate, locked for life. Confirm it works and who signs off so we route you to onboarding, not a sales cycle.",
    fields: [
      {
        name: "budgetRange",
        sectionTitle: "Platform access pricing",
        challenger:
          "To gain platform access, the following pricing applies: $99 your first month, then $199/month — 5 seats included, additional seats $15/mo per user. Your founder rate is locked for life as an early member. Custom build work and separate products are priced on their own.",
        label: "Are you comfortable with this platform access pricing?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Yes — that works for us",
          "Yes, with a couple of questions",
          "Need to confirm with a partner first",
          "Not the right time",
        ],
      },
      {
        name: "approvalInvolvement",
        sectionTitle: "Who can say yes",
        challenger: "So we know who to bring the founder plan to and how fast you can start.",
        label: "Who signs off on getting started?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Owner can approve immediately",
          "Owner + one stakeholder",
          "Needs team review this month",
          "Needs quarter planning cycle",
        ],
      },
    ],
  },
  {
    id: "contact",
    title: "Lock your details for the audit handoff",
    challenger:
      "Last step — work email and company site so we can route you to the right next step without another intake form.",
    fields: [
      { name: "fullName", label: "Full name", type: "text", required: true, placeholder: "Jane Smith" },
      { name: "workEmail", label: "Work email", type: "email", required: true, placeholder: "jane@company.com" },
      { name: "companyName", label: "Company name", type: "text", required: true, placeholder: "Company Inc." },
      { name: "companyWebsite", label: "Company website", type: "url", required: true, placeholder: "https://company.com" },
    ],
  },
];

const INITIAL_ANSWERS = {
  businessModel: "",
  companyStage: "",
  primaryPainArea: "",
  highestCostBottleneck: "",
  highestCostBottleneckOther: "",
  workflowManagement: [],
  frequentBreakdown: "",
  frequentBreakdownDetail: "",
  urgencyWindow: "",
  quarterRisk: "",
  implementationOwnership: "",
  budgetRange: "",
  approvalInvolvement: "",
  fullName: "",
  workEmail: "",
  companyName: "",
  companyWebsite: "",
};

const FAQ_ITEMS = [
  {
    question: "What is a custom ops hub solution?",
    answer:
      "A custom ops hub is the command layer for your operation: one system that connects work, ownership, and decision flow so execution stays controlled as you grow.",
  },
  {
    question: "Who is this for?",
    answer:
      "Founder-led SMB teams with repeatable delivery, rising complexity, and too much operational drag. If you need cleaner execution, this is for you.",
  },
  {
    question: "Who is this not for?",
    answer:
      "Teams looking for a quick automation patch, a single Zap, or broad advisory with no implementation ownership.",
  },
  {
    question: "How long does implementation take?",
    answer:
      "Most implementations are delivered in 2-4 weeks. Exact timing depends on scope, existing systems, and decision speed.",
  },
  {
    question: "What does pricing look like?",
    answer:
      "Platform access is $99 your first month, then $199/month — 5 seats included, with additional seats at $15/mo per user. That founder rate is locked for life as an early member. Custom build work and separate products are priced on their own.",
  },
  {
    question: "What happens after I submit?",
    answer:
      "We turn your answers into a clear Ops Teardown you can keep. If you are a fit, you can book a quick call next.",
  },
];

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "yandex.com",
  "zoho.com",
]);

function isMissingValue(field, value) {
  if (!field.required) return false;
  if (field.type === "multi") return !Array.isArray(value) || value.length === 0;
  return typeof value !== "string" || value.trim().length === 0;
}

function isBusinessEmail(value) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailPattern.test(normalized)) return false;
  const emailParts = normalized.split("@");
  const domain = emailParts[1] || "";
  return !PERSONAL_EMAIL_DOMAINS.has(domain);
}

function getEmailDomain(value) {
  if (!value || typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  const emailParts = normalized.split("@");
  if (emailParts.length !== 2) return "";
  const rawDomain = emailParts[1] || "";
  const cleanedDomain = rawDomain.replace(/^www\./, "").replace(/\.+$/, "");
  const domainPattern = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
  if (!domainPattern.test(cleanedDomain)) {
    return "";
  }
  return cleanedDomain;
}

function getProgressMilestone(questionIndex, totalQuestions) {
  const completed = questionIndex + 1;
  const ratio = completed / totalQuestions;
  if (ratio < 0.34) return "Fast start. Build momentum.";
  if (ratio < 0.67) return "You are halfway. Keep going.";
  if (ratio < 1) return "Final stretch. Lock your call.";
  return "Ready for your booking step.";
}

function shouldAutoAdvanceQuestion(question) {
  return question.autoAdvance === true;
}

function parseAttributionFromWindow() {
  if (typeof window === "undefined") {
    return toIngestAttribution(
      mergeLeadAttribution(parseLeadAttribution(""), null)
    );
  }

  const urlAttribution = parseLeadAttribution(window.location.search);
  const storedAttribution = loadLeadAttribution();
  return toIngestAttribution(mergeLeadAttribution(urlAttribution, storedAttribution));
}

function getInitialAttribution() {
  return toIngestAttribution(parseLeadAttribution(""));
}

export default function CustomOpsHubClient() {
  const router = useRouter();
  const QUIZ_QUESTIONS = useMemo(
    () =>
      QUIZ_SECTIONS.flatMap((section) =>
        section.fields.map((field) => ({
          ...field,
          questionId: `${section.id}-${field.name}`,
          sectionTitle: field.sectionTitle ?? section.title,
          sectionChallenger: field.challenger ?? section.challenger,
        }))
      ),
    []
  );

  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stepError, setStepError] = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [attribution, setAttribution] = useState(getInitialAttribution);
  const preQualBanner =
    attribution.pq_score != null
      ? `Your Ops Check hit ${attribution.pq_score}/18. This picks up where that left off.`
      : null;
  const [outreachNextSteps, setOutreachNextSteps] = useState([]);
  const [marketingBucket, setMarketingBucket] = useState(null);
  const [showDisqualifiedStep, setShowDisqualifiedStep] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [hasEditedCompanyWebsite, setHasEditedCompanyWebsite] = useState(false);
  const activeTextInputRef = useRef(null);
  const hasTrackedApplicationStart = useRef(false);

  const currentQuestion = QUIZ_QUESTIONS[questionIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;
  const requiredQuestionCount = QUIZ_QUESTIONS.filter((question) => question.required).length;
  const completedRequiredQuestions = QUIZ_QUESTIONS.filter(
    (question) => question.required && !isMissingValue(question, answers[question.name])
  ).length;
  const progressPercent = Math.round((completedRequiredQuestions / requiredQuestionCount) * 100);
  const progressMilestone = getProgressMilestone(questionIndex, totalQuestions);
  const currentQuestionAutoAdvances = shouldAutoAdvanceQuestion(currentQuestion);
  const currentQuestionValue = answers[currentQuestion.name];
  const currentQuestionNeedsInputBlock =
    !currentQuestionAutoAdvances && currentQuestion.required && isMissingValue(currentQuestion, currentQuestionValue);
  const currentQuestionHasInvalidBusinessEmail =
    currentQuestion.type === "email" &&
    typeof currentQuestionValue === "string" &&
    currentQuestionValue.trim().length > 0 &&
    !isBusinessEmail(currentQuestionValue);

  useEffect(() => {
    setAttribution(parseAttributionFromWindow());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOpsTeardownContinuation(window.location.search)) return;

    const params = new URLSearchParams(window.location.search);
    const teardownUrl = buildOpsTeardownThankYouUrl({
      leadId: params.get("lead_id"),
      email: params.get("email"),
      from: params.get("from") ?? "homepage-ops-check-qualified",
      siteOrigin: window.location.origin,
    });
    router.replace(teardownUrl);
  }, [router]);

  useEffect(() => {
    const workEmail = answers.workEmail;
    if (hasEditedCompanyWebsite || !workEmail) {
      return;
    }

    if (!isBusinessEmail(workEmail)) {
      return;
    }

    const domain = getEmailDomain(workEmail);
    if (!domain) {
      return;
    }

    const nextWebsite = `https://${domain}`;
    setAnswers((prev) => {
      if (prev.companyWebsite === nextWebsite) {
        return prev;
      }
      return {
        ...prev,
        companyWebsite: nextWebsite,
      };
    });
  }, [answers.workEmail, hasEditedCompanyWebsite]);

  const attachAndFocusTextInput = useCallback((node) => {
    activeTextInputRef.current = node;
    if (!node) {
      return;
    }

    const focusNode = () => {
      node.focus();
      const inputLength = node.value?.length || 0;
      if (typeof node.setSelectionRange === "function") {
        try {
          node.setSelectionRange(inputLength, inputLength);
        } catch {
          // Some input types (e.g. email) reject setSelectionRange.
        }
      }
    };

    window.requestAnimationFrame(focusNode);
    window.setTimeout(focusNode, 320);
  }, []);

  const disqualificationSummary = useMemo(
    () => [
      `Timeline: ${answers.urgencyWindow || "Not provided"}`,
      `Pricing fit: ${answers.budgetRange || "Not provided"}`,
      `Approval path: ${answers.approvalInvolvement || "Not provided"}`,
    ],
    [answers]
  );

  const trackApplicationStart = () => {
    if (hasTrackedApplicationStart.current) {
      return;
    }

    hasTrackedApplicationStart.current = true;
    trackConversionEvent({
      event: "application_start",
      application_id: "custom_ops_hub",
      source: "/services/custom-ops-hub",
    });
  };

  const updateSingleValue = (name, value) => {
    trackApplicationStart();
    setStepError("");
    const nextAnswers = { ...answers, [name]: value };
    setAnswers(nextAnswers);

    if (currentQuestionAutoAdvances) {
      window.setTimeout(() => {
        if (questionIndex === totalQuestions - 1) {
          handleSubmitLead();
        } else {
          setQuestionIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
        }
      }, 220);
    }
  };

  const toggleMultiValue = (name, value) => {
    trackApplicationStart();
    setStepError("");
    setAnswers((prev) => {
      const currentValues = prev[name] || [];
      const exists = currentValues.includes(value);
      return {
        ...prev,
        [name]: exists ? currentValues.filter((item) => item !== value) : [...currentValues, value],
      };
    });
  };

  const updateInputValue = (name, value) => {
    trackApplicationStart();
    setStepError("");
    if (name === "companyWebsite") {
      setHasEditedCompanyWebsite(true);
    }
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const validateCurrentStep = () => {
    const value = answers[currentQuestion.name];
    if (isMissingValue(currentQuestion, value)) {
      return `${currentQuestion.label} is required.`;
    }
    if (currentQuestion.type === "email" && value && !isBusinessEmail(String(value))) {
      return "Please use your company email (personal domains like Gmail/Yahoo are not accepted).";
    }
    return "";
  };

  const handleNext = () => {
    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setStepError(validationMessage);
      return;
    }

    if (questionIndex === totalQuestions - 1) {
      handleSubmitLead();
      return;
    }

    setStepError("");
    setQuestionIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
  };

  const handleBack = () => {
    setStepError("");
    setQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleQuestionKeyDown = (event) => {
    if (event.key !== "Enter" || isSubmitting || currentQuestionAutoAdvances) {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    handleNext();
  };

  const handleSubmitLead = async () => {
    setSubmitState("idle");
    setSubmitMessage("");

    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setStepError(validationMessage);
      return;
    }

    if (!consentAccepted) {
      setStepError("Please confirm consent to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const preQual = toIngestPreQual(loadPreQualSession());
      const response = await fetch("/api/studioflows/ingest-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          form_payload: answers,
          from: "custom-ops-hub",
          ...attribution,
          ...(preQual ? { pre_qual: preQual } : {}),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSubmitState("error");
        setSubmitMessage(result.error || "Unable to submit your qualification right now.");
        return;
      }

      if (result.qualified) {
        trackConversionEvent({
          event: "qualified_submission",
          application_id: "custom_ops_hub",
          source: "/services/custom-ops-hub",
        });
        const opsAuditBookUrl = resolveQualifiedOpsAuditRedirect(
          result,
          attribution,
          answers.workEmail
        );
        if (opsAuditBookUrl) {
          window.location.assign(opsAuditBookUrl);
          return;
        }

        setSubmitState("error");
        setSubmitMessage("Unable to continue to booking right now. Please try again.");
        return;
      }

      setMarketingBucket(result.marketing_bucket || null);
      setOutreachNextSteps(Array.isArray(result.outreach_next_steps) ? result.outreach_next_steps : []);
      setSubmitState("success");
      setSubmitMessage("Thanks for sharing your details. We saved your request and will follow up with next steps.");
      setShowDisqualifiedStep(true);
    } catch {
      setSubmitState("error");
      setSubmitMessage("Unable to submit your qualification right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = answers[field.name];

    if (field.type === "single") {
      return (
        <div className="mt-3 grid gap-2">
          {field.options.map((option) => {
            const isActive = value === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => updateSingleValue(field.name, option)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  isActive ? Q_OPTION_ACTIVE : Q_OPTION_IDLE
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    if (field.type === "multi") {
      return (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {field.options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleMultiValue(field.name, option)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  selected ? Q_OPTION_ACTIVE : Q_OPTION_IDLE
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          ref={attachAndFocusTextInput}
          value={value}
          onChange={(event) => updateInputValue(field.name, event.target.value)}
          rows={3}
          placeholder={field.placeholder}
          className={`mt-3 ${Q_INPUT}`}
        />
      );
    }

    return (
      <input
        ref={attachAndFocusTextInput}
        type={field.type === "email" || field.type === "url" ? field.type : "text"}
        autoComplete={
          field.name === "fullName"
            ? "name"
            : field.name === "workEmail"
              ? "email"
              : field.name === "companyName"
                ? "organization"
                : field.name === "companyWebsite"
                  ? "off"
                  : "off"
        }
        value={value}
        onChange={(event) => updateInputValue(field.name, event.target.value)}
        placeholder={field.placeholder}
        className={`mt-3 ${Q_INPUT}`}
      />
    );
  };

  if (showDisqualifiedStep) {
    return (
      <main className={QUALIFIER_PAGE}>
        <QualifierAtmosphere />
        <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 py-8 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-center py-4 sm:py-5">
          <img
            src="/StudioFlows logo (1200 x 675 px) (1).png"
            alt="StudioFlows"
            className="h-12 w-auto object-contain sm:h-14"
          />
        </nav>

        {preQualBanner && (
          <p className="mt-4 rounded-xl border border-[#8A6A1F]/45 bg-[#D4A853]/20 px-4 py-3 text-center text-sm font-medium text-[#4A3608]">
            {preQualBanner}
          </p>
        )}

        <section className={`mt-8 p-7 sm:p-10 ${Q_CARD}`}>
            <p className={Q_EYEBROW}>Thank You</p>
            <h1 className={`mt-4 text-3xl sm:text-5xl ${Q_HEADLINE}`}>
              We received your request.
              <br />
              <span className="text-[#4E483D]">At this stage, it may not be the ideal fit for an immediate build.</span>
            </h1>
            <p className={`mt-5 max-w-[760px] text-sm leading-7 ${Q_BODY}`}>
              We saved your details and will keep you in our priority update circuit as we open additional implementation
              windows.
            </p>
            <div className="mt-8 grid gap-2 sm:grid-cols-3">
              {disqualificationSummary.map((item) => (
                <div key={item} className="rounded-xl border border-black/10 bg-white/85 px-4 py-3 text-sm text-[#2A2722]">
                  {item}
                </div>
              ))}
            </div>
            {outreachNextSteps.length > 0 && (
              <ul className="mt-8 space-y-3 rounded-2xl border border-black/10 bg-white/85 p-5 text-sm leading-7 text-[#2A2722]">
                {outreachNextSteps.map((step) => (
                  <li key={step} className="flex gap-2">
                    <span className="text-[#8A6A1F]">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            )}
            {marketingBucket && (
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#4E483D]/80">Outreach track: {marketingBucket}</p>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={QUALIFIER_PAGE}>
      <QualifierAtmosphere />

      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 py-8 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-center py-4 sm:py-5">
          <img
            src="/StudioFlows logo (1200 x 675 px) (1).png"
            alt="StudioFlows"
            className="h-12 w-auto object-contain sm:h-14"
          />
        </nav>

        {preQualBanner && (
          <p className="mt-4 rounded-xl border border-[#8A6A1F]/45 bg-[#D4A853]/20 px-4 py-3 text-center text-sm font-medium text-[#4A3608]">
            {preQualBanner}
          </p>
        )}

        <section className="py-10 text-center sm:py-14">
          <p className={Q_EYEBROW}>ops teardown</p>
          <h1 className={`mx-auto mt-6 max-w-[900px] text-balance text-[2.2rem] sm:text-[3rem] lg:text-[4.4rem] ${Q_HEADLINE}`}>
            Let&apos;s build your Ops Teardown
          </h1>
          <p className={`mx-auto mt-6 max-w-[780px] text-balance sm:text-[17px] ${Q_BODY}`}>
            Tell us how work actually moves day to day and we&apos;ll give you back a specific breakdown of where the drag is
            showing up. Most people finish in about 2 minutes.
          </p>
        </section>

        <section className={`p-6 sm:p-8 ${Q_CARD}`}>
          <p className={`text-sm leading-7 ${Q_BODY}`}>
            We start with how things really happen so the teardown lines up with your actual operation.
          </p>
          <div className="sticky top-2 z-20 -mx-2 mt-5 rounded-xl border border-black/12 bg-[#FBF9F4]/96 px-3 py-2.5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={Q_EYEBROW}>
                Question {questionIndex + 1} of {totalQuestions}
              </p>
              <p className="text-xs font-medium text-[#4E483D]">{progressMilestone}</p>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-black/15">
              <div className="h-2 rounded-full bg-[#8A6A1F] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#4E483D]">{progressPercent}% complete</p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentQuestion.questionId}
              initial={{ opacity: 0, x: 34 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -34 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mt-4 rounded-xl border border-[#8A6A1F]/35 bg-[#D4A853]/[0.18] px-3.5 py-3">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B5212]">{currentQuestion.sectionTitle}</p>
                <p className="mt-1 text-xs leading-5 text-[#3A352C]">{currentQuestion.sectionChallenger}</p>
              </div>

              <div className="mt-5 space-y-6">
                <div key={currentQuestion.name} onKeyDown={handleQuestionKeyDown}>
                  <p className="text-sm font-medium text-[#0B0B0C]">
                    {currentQuestion.label}
                    {currentQuestion.required ? " *" : ""}
                  </p>
                  {renderField(currentQuestion)}
                </div>
              </div>

              {stepError && (
                <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
                  {stepError}
                </div>
              )}

              {submitState !== "idle" && (
                <div
                  className={`mt-5 rounded-lg border px-3 py-2 text-sm ${
                    submitState === "success"
                      ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800"
                      : "border-red-500/30 bg-red-500/10 text-red-700"
                  }`}
                >
                  {submitMessage}
                </div>
              )}

              {currentQuestionHasInvalidBusinessEmail && (
                <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
                  Please use your company email (personal domains like Gmail/Yahoo are not accepted).
                </div>
              )}

              {questionIndex === totalQuestions - 1 && (
                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-black/12 bg-white/85 px-4 py-3 text-sm leading-6 text-[#3A352C]">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(event) => {
                      setConsentAccepted(event.target.checked);
                      setStepError("");
                    }}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-black/25 bg-white accent-[#8A6A1F]"
                  />
                  <span>
                    I agree to be contacted about my request and accept the{" "}
                    <a href="/privacy-policy" className="font-medium text-[#8A6A1F] underline underline-offset-2">
                      Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a href="/terms-of-service" className="font-medium text-[#8A6A1F] underline underline-offset-2">
                      Terms of Service
                    </a>
                    .
                  </span>
                </label>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-black/10 pt-5">
            <button
              type="button"
              onClick={handleBack}
              disabled={questionIndex === 0 || isSubmitting}
              className="rounded-full border border-black/20 px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#3A352C] transition hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Back
            </button>
            {!currentQuestionAutoAdvances && (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  isSubmitting ||
                  currentQuestionNeedsInputBlock ||
                  currentQuestionHasInvalidBusinessEmail ||
                  (questionIndex === totalQuestions - 1 && !consentAccepted)
                }
                className={Q_CTA_PRIMARY}
              >
                {questionIndex === totalQuestions - 1
                  ? isSubmitting
                    ? "Submitting..."
                    : "Submit answers & book a quick call"
                  : "Continue"}
              </button>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-black/10 bg-white/70 p-3 sm:p-4">
          <p className={`px-1 ${Q_EYEBROW}`}>FAQ</p>
          <div className="mt-2 space-y-2">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={item.question} className="rounded-lg border border-black/10 bg-white/85 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-3 py-1 text-left"
                  >
                    <p className="text-sm font-medium leading-6 text-[#0B0B0C]">{item.question}</p>
                    <span className="text-[13px] text-[#8A6A1F]">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && <p className="pb-1 text-xs leading-6 text-[#3A352C]">{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
