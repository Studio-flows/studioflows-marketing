import { canonicalJson, sha256 } from "./order-foundation.ts";

export {
  OPS_DRAG_BUSINESS_USE_ACKNOWLEDGMENT,
  OPS_DRAG_PRIVACY_DISCLOSURE,
} from "./customer-copy.ts";

export const OPS_DRAG_ACCEPTED_SOURCE_HASHES = {
  positioning: "31A148B04344DE20601EE5A1B4CF7754546DFF217A1128D7BA12220FE3EA453E",
  operations: "2F415BDDCBBD9A690A1CA380811D3A10CD473F8761569F7AB503A14B8116C3B4",
  acquisition: "CBFD5B958538813DDA8769AC4B122D1FDEAEC853FA50AA00887D181908831EB5",
} as const;

export const OPS_DRAG_CUSTOMER_CONTRACT = {
  hero: "See where operational drag may be hiding between request and done.",
  introduction:
    "Answer a short Ops Check and get a focused report that turns your responses into a drag summary, up to three likely workflow-friction hypotheses, and a practical seven-day sequence for testing a possible first repair.",
  price: "$29 one time. No subscription. No sales call. No implementation included.",
  geography: "Initial launch availability: US customers only.",
  cta: "Get My Ops Drag Report — $29",
  supportLine:
    "Built for owner-led service businesses where scheduling, handoffs, approvals, updates, or exceptions still route through one person.",
  receives: [
    "A response-based summary of where work may be waiting, repeating, or losing context.",
    "Up to three likely friction hypotheses tied to the buyer's submitted answers.",
    "A seven-day sequence for testing a possible first repair.",
    "Clear limitations and the operating evidence to collect next.",
  ],
  runtimeReceives: "Secure report access and transactional email delivery after confirmed payment.",
  howItWorks: [
    "Describe how work moves. Complete the short Ops Check using the operation as it runs today.",
    "Purchase one report. Continue to StudioFlows' Stripe-hosted checkout for a one-time $29 payment.",
    "Review the first repair. Receive the report through the gated results page and transactional email.",
  ],
  expectation:
    "The Ops Drag Report is an automated analysis of the information submitted. It is not a human audit, professional advice, implementation service, or guarantee of operational or financial results. Its findings are hypotheses to test against real work, normal exceptions, and current company controls.",
  supportRefund:
    "If StudioFlows cannot verify automated delivery, it will automatically initiate a full refund to the original payment method. Link/Stripe may also issue refunds under its policy or when required by law. Bank posting times vary, and refunds never exceed the amount paid.",
  faq: [
    {
      question: "Who is this for?",
      answer:
        "Owners of service businesses with repeatable work and recurring scheduling, handoff, approval, update, or exception paths.",
    },
    {
      question: "What does the $29 include?",
      answer:
        "One response-based Ops Drag Report. It does not include a call, software subscription, system setup, custom implementation, or ongoing consulting.",
    },
    {
      question: "Is this a full operations audit?",
      answer:
        "No. It is a bounded diagnostic that organizes the submitted answers into likely friction hypotheses and a first repair sequence.",
    },
    {
      question: "Will this prove the root cause?",
      answer:
        "No. The report identifies where to investigate first. The operating team must validate each hypothesis against current work and exceptions.",
    },
  ],
} as const;

export const CUSTOMER_LAUNCH_GATE_KEYS = [
  "sourceHashesAccepted",
  "managedPaymentsAccepted",
  "taxConfigurationAccepted",
  "providerRuntimeAccepted",
  "productionReleaseAccepted",
  "dependencySecurityAccepted",
  "campaignControlsAccepted",
  "kiroLaunchReleased",
] as const;

export type CustomerContractRuntimeGates = Record<(typeof CUSTOMER_LAUNCH_GATE_KEYS)[number], true>;

export function assertAcceptedSourceHashes(actual: Record<keyof typeof OPS_DRAG_ACCEPTED_SOURCE_HASHES, string>): void {
  for (const key of Object.keys(OPS_DRAG_ACCEPTED_SOURCE_HASHES) as Array<keyof typeof OPS_DRAG_ACCEPTED_SOURCE_HASHES>) {
    if (actual[key].toUpperCase() !== OPS_DRAG_ACCEPTED_SOURCE_HASHES[key]) {
      throw new Error(`Accepted source hash mismatch: ${key}`);
    }
  }
}

export function acceptedSourceConfigurationHash(): string {
  return sha256(canonicalJson(OPS_DRAG_ACCEPTED_SOURCE_HASHES));
}

export function assertBusinessUseInputCeilingAcknowledgment(value: unknown): void {
  if (value !== true) throw new Error("Business-use and input-ceiling acknowledgment is required");
}

const FORBIDDEN_PUBLIC_CLAIMS = [
  /pinpoints? the root cause/i,
  /finds? exactly what is broken/i,
  /guaranteed? (?:savings|revenue|efficiency|continuity|independence|result)/i,
  /(?:available|delivered) (?:now|instantly|immediately)/i,
  /limited (?:slots|availability)/i,
  /tax[- ](?:inclusive|exempt)/i,
] as const;

export function assertCustomerContractClaimCeiling(text: string): void {
  if (FORBIDDEN_PUBLIC_CLAIMS.some((pattern) => pattern.test(text))) {
    throw new Error("Customer contract contains a forbidden public claim");
  }
}
