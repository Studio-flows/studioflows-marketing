"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  loadLeadAttribution,
  mergeLeadAttribution,
  parseLeadAttribution,
  resolveQualifiedOpsAuditRedirect,
  toIngestAttribution,
} from "../../../lib/lead-attribution";
import { evaluateQualification } from "../../../lib/qualify-custom-ops-hub";
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
    id: "business-snapshot",
    title: "Business Snapshot",
    challenger: "Ground the teardown in how the business actually runs — size, volume, and stage shape where drag shows up.",
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
      {
        name: "annualRevenue",
        label: "What annual revenue range best describes the business today?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Under $500K", "$500K–$1M", "$1M–$3M", "$3M–$5M", "$5M–$10M", "$10M+"],
      },
      {
        name: "deliveryTeamSize",
        label: "How many people are involved in delivering the work?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Just me", "2–4", "5–9", "10–14", "15–24", "25+"],
      },
      {
        name: "monthlyWorkflowVolume",
        label: "How many jobs, projects, service requests, client requests, or deals move through this workflow each month?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["1–10", "11–25", "26–50", "51–100", "100+"],
      },
    ],
  },
  {
    id: "operating-loop",
    title: "The Operating Loop",
    challenger: "Map where work enters, where it should land, and what breaks between those points.",
    fields: [
      {
        name: "primaryPainArea",
        label: "Where is operational complexity hurting the most today?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Client delivery", "Sales to onboarding handoff", "Team coordination", "Reporting and visibility", "Billing and fulfillment"],
      },
      {
        name: "workflowStart",
        label: "Where does this workflow usually start?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "New lead or inquiry",
          "Signed client or booked job",
          "Internal request",
          "Service call or support request",
          "Scheduled project/event",
          "Something else",
        ],
      },
      {
        name: "workflowEnd",
        label: "Where should this workflow end?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Job completed",
          "Client deliverable sent",
          "Invoice-ready",
          "Payment collected",
          "Follow-up completed",
          "Reporting updated",
        ],
      },
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
        label: "What is the business consequence when this breaks?",
        type: "textarea",
        required: true,
        placeholder:
          "Example: we lose 2–3 days per month to rework, jobs stall until I personally unblock them, or billing gets delayed because closeout details are missing.",
      },
    ],
  },
  {
    id: "founder-bottleneck",
    title: "Founder Bottleneck",
    challenger: "Name where the founder or lead operator still carries the operation — and what breaks when they step away.",
    fields: [
      {
        name: "founderRoutesHandoffs",
        label: "Does the founder or owner still route most handoffs, approvals, or escalations?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["No", "Sometimes", "Yes", "Yes, and it is becoming a growth constraint"],
      },
      {
        name: "founderWeeklyHours",
        label: "How many hours per week does the founder or lead operator personally spend routing, checking, chasing, approving, scheduling, or unblocking work?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["0–2 hours", "3–5 hours", "6–10 hours", "11–20 hours", "20+ hours"],
      },
      {
        name: "founderAwayBreaks",
        label: "If the founder stepped away for 7 business days, what would most likely break first?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "New requests would pile up",
          "Scheduling or assignment would slow down",
          "Client communication would slip",
          "Delivery quality would vary",
          "Billing or closeout would get delayed",
          "The team would mostly run fine",
        ],
      },
      {
        name: "hiddenBottleneck",
        label: "Who else acts as a hidden bottleneck today?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "One key admin or coordinator",
          "One operations lead",
          "One salesperson or account manager",
          "One field/team lead",
          "No single person, the process itself is the bottleneck",
          "Not sure",
        ],
      },
      {
        name: "leadershipApprovalRequired",
        label: "What decisions still require founder or leadership approval?",
        type: "multi",
        required: true,
        options: [
          "Scheduling changes",
          "Pricing or scope changes",
          "Client communication",
          "Work completion or quality review",
          "Billing or invoice readiness",
          "Hiring or contractor assignment",
          "Exceptions/escalations",
          "Almost everything",
          "Very little",
        ],
      },
    ],
  },
  {
    id: "tool-fragmentation",
    title: "Tool Fragmentation and Software Trust",
    challenger: "Show where work actually lives today and whether past tools earned trust or created resistance.",
    fields: [
      {
        name: "workflowManagement",
        label: "Where does work currently live? Select all that apply.",
        type: "multi",
        required: true,
        options: [
          "CRM",
          "Project management tool",
          "Scheduling tool",
          "Spreadsheets",
          "Paper forms",
          "Shared drives",
          "Text messages",
          "Email",
          "Slack or Teams",
          "Founder's head",
          "One key admin/team member's head",
          "Custom/internal tools",
        ],
      },
      {
        name: "softwareTrust",
        label: "What best describes your relationship with past software or tools?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "We use tools well",
          "We use tools, but they do not match how we work",
          "We tried tools and the team resisted them",
          "We paid for tools that never really got adopted",
          "We avoid new software unless it is clearly custom-fit",
        ],
      },
      {
        name: "duplicateWork",
        label: "Where does duplicate work happen most often?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Entering the same information into multiple tools",
          "Rewriting client/job details from messages",
          "Updating status in more than one place",
          "Rebuilding checklists or plans from memory",
          "Manually preparing reports",
          "Duplicate work is not a major issue",
        ],
      },
      {
        name: "hardToFindInfo",
        label: "What information is hardest to find quickly?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Current job/project status",
          "Who owns the next step",
          "Client history or context",
          "Photos, documents, or closeout details",
          "Billing or payment readiness",
          "Team capacity or schedule",
          "Nothing major",
        ],
      },
    ],
  },
  {
    id: "cost-risk-urgency",
    title: "Cost, Risk, and Urgency",
    challenger: "Quantify what breakage costs, how fast you need relief, and what fixing this unlocks in the next 90 days.",
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
        label: "Anything to add about this bottleneck?",
        type: "text",
        required: false,
        placeholder: "One sentence is enough.",
      },
      {
        name: "breakageCost",
        label: "When this workflow breaks, what does it usually cost you? Select all that apply.",
        type: "multi",
        required: true,
        options: [
          "Founder time",
          "Staff overtime",
          "Delayed revenue",
          "Missed follow-up",
          "Client frustration",
          "Rework",
          "Refunds or discounts",
          "Lost repeat business",
          "Slower billing/payment",
          "Team confusion",
          "Strategic projects get delayed",
        ],
      },
      {
        name: "lastBreakageExample",
        label: "In plain English, describe the last time this broke.",
        type: "textarea",
        required: false,
        placeholder:
          "Example: a job was completed, but photos/notes were missing, so billing waited three days and I had to chase two people.",
      },
      {
        name: "urgencyWindow",
        label: "What urgency window are you operating under?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: ["Now: 0–30 days", "Near term: 1–3 months", "This quarter", "This year"],
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
      {
        name: "workflowUnlock90Days",
        label: "What would improving this workflow unlock in the next 90 days?",
        type: "single",
        autoAdvance: true,
        required: true,
        options: [
          "Founder gets meaningful time back",
          "Team can execute with less chasing",
          "More jobs/projects can move through the system",
          "Billing or closeout gets faster",
          "Client experience becomes more consistent",
          "We can scale without adding unnecessary headcount",
          "We can finally trust the operation enough to grow",
        ],
      },
    ],
  },
  {
    id: "implementation-readiness",
    title: "Implementation Readiness",
    challenger: "Confirm how hands-on you want StudioFlows during implementation, pricing fit, and who can approve.",
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
    title: "Contact Details",
    challenger: "Lock your details so we can deliver your private teardown and route follow-up without another intake form.",
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
  annualRevenue: "",
  deliveryTeamSize: "",
  monthlyWorkflowVolume: "",
  primaryPainArea: "",
  workflowStart: "",
  workflowEnd: "",
  frequentBreakdown: "",
  frequentBreakdownDetail: "",
  founderRoutesHandoffs: "",
  founderWeeklyHours: "",
  founderAwayBreaks: "",
  hiddenBottleneck: "",
  leadershipApprovalRequired: [],
  workflowManagement: [],
  softwareTrust: "",
  duplicateWork: "",
  hardToFindInfo: "",
  highestCostBottleneck: "",
  highestCostBottleneckOther: "",
  breakageCost: [],
  lastBreakageExample: "",
  urgencyWindow: "",
  quarterRisk: "",
  workflowUnlock90Days: "",
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
  if (ratio < 0.34) return "Building your operating snapshot.";
  if (ratio < 0.67) return "Halfway through the audit.";
  if (ratio < 1) return "Final questions before your teardown.";
  return "Ready to generate your teardown.";
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

export default function CustomOpsHubClient() {
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
  const [attribution, setAttribution] = useState(parseAttributionFromWindow);
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

  const currentQuestion = QUIZ_QUESTIONS[questionIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;
  const currentSectionIndex = QUIZ_SECTIONS.findIndex((section) =>
    section.fields.some((field) => field.name === currentQuestion.name)
  );
  const currentSection = QUIZ_SECTIONS[currentSectionIndex];
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

  const updateSingleValue = (name, value) => {
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
      const response = await fetch("/api/studioflows/ingest-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          form_payload: answers,
          ...attribution,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSubmitState("error");
        setSubmitMessage(result.error || "Unable to submit your qualification right now.");
        return;
      }

      if (result.qualified) {
        const opsAuditBookUrl = resolveQualifiedOpsAuditRedirect(result, attribution);
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
          className={`mt-3 ${Q_INPUT}${field.required ? "" : " border-black/8 bg-white/60"}`}
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
        className={`mt-3 ${Q_INPUT}${field.required ? "" : " border-black/8 bg-white/60"}`}
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
            Build Your Private Ops Teardown
          </h1>
          <p className={`mx-auto mt-6 max-w-[780px] text-balance sm:text-[17px] ${Q_BODY}`}>
            This audit asks direct questions about how work really moves through your business — where the founder gets pulled
            in, where handoffs break, where tools are failing, and what delays cost. The better your answers, the sharper your
            teardown.
          </p>
          <p className={`mx-auto mt-4 max-w-[720px] text-balance text-sm ${Q_BODY}`}>
            Takes about 5–7 minutes. Best answered by the owner, founder, or operator closest to daily execution.
          </p>
        </section>

        <section className={`p-6 sm:p-8 ${Q_CARD}`}>
          <div className="sticky top-2 z-20 -mx-2 mt-2 rounded-xl border border-black/12 bg-[#FBF9F4]/96 px-3 py-2.5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={Q_EYEBROW}>
                Section {currentSectionIndex + 1} of {QUIZ_SECTIONS.length} — {currentSection?.title}
              </p>
              <p className="text-xs font-medium text-[#4E483D]">{progressMilestone}</p>
            </div>
            <p className="mt-2 text-xs text-[#4E483D]">
              Question {questionIndex + 1} of {totalQuestions}
            </p>
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
                    {currentQuestion.required ? " *" : " (optional)"}
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
                    : "Generate My Private Ops Teardown"
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
