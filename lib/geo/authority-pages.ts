export type AuthorityFrameworkStep = {
  number: string;
  title: string;
  instruction: string;
  evidence: string;
};

export type AuthoritySource = {
  organization: string;
  title: string;
  url: string;
  relevance: string;
};

export type AuthorityLink = {
  title: string;
  description: string;
  href: string;
};

export type AuthorityPageDefinition = {
  slug: "founder-bottleneck" | "business-that-runs-without-you";
  path: string;
  title: string;
  eyebrow: string;
  description: string;
  directAnswer: string;
  frameworkName: string;
  frameworkIntroduction: string;
  framework: ReadonlyArray<AuthorityFrameworkStep>;
  exampleTitle: string;
  exampleLabel: string;
  example: ReadonlyArray<string>;
  failureSignals: ReadonlyArray<string>;
  limitations: ReadonlyArray<string>;
  sources: ReadonlyArray<AuthoritySource>;
  relatedLinks: ReadonlyArray<AuthorityLink>;
  action: {
    title: string;
    description: string;
    label: string;
    href: string;
  };
  publishedOn: string;
  modifiedOn: string;
  primaryQuery: string;
};

const PUBLISHED_ON = "2026-08-06";

export const AUTHORITY_PAGES = {
  "founder-bottleneck": {
    slug: "founder-bottleneck",
    path: "/resources/founder-bottleneck",
    title: "Founder Bottleneck: How to Find Where Work Waits on You",
    eyebrow: "Owner dependency · Diagnosis",
    description:
      "A practical method for finding founder-routed decisions, handoffs, and exceptions in a service business—and moving the right ones into the operating system.",
    directAnswer:
      "A founder bottleneck exists when normal work cannot move without the founder supplying context, approval, or a decision that the team should be able to obtain elsewhere. The fix is not to remove the founder from every decision. It is to separate true owner decisions from routine work, put the required evidence at the point of handoff, and give the team an explicit decision boundary.",
    frameworkName: "The StudioFlows WAIT Map",
    frameworkIntroduction:
      "Use one real work item, not a general discussion. Follow it from customer commitment to completed delivery and record each place where it waits.",
    framework: [
      {
        number: "01",
        title: "Work item",
        instruction:
          "Choose one completed or active job. Write down the promised outcome, current owner, next owner, and the exact state that should trigger the handoff.",
        evidence:
          "A named job and a visible state change. If the team can only describe the process in general, the handoff is not yet testable.",
      },
      {
        number: "02",
        title: "Awaiting",
        instruction:
          "Mark every interval where the job stopped moving. Separate queue time, missing-input time, approval time, and rework time.",
        evidence:
          "Timestamps, messages, status changes, or a direct observation of the pause. Do not label a person as the bottleneck without a work trace.",
      },
      {
        number: "03",
        title: "Information held by the founder",
        instruction:
          "For each pause, state what only the founder could supply: a customer promise, priority rule, pricing exception, quality judgment, staffing constraint, or risk decision.",
        evidence:
          "The missing fact or decision written in a form another qualified person could recognize. 'Ask the owner' is not evidence.",
      },
      {
        number: "04",
        title: "Transfer rule",
        instruction:
          "Move routine context into the job record, assign a decision owner, define the boundary they can act within, and route only named exceptions to the founder.",
        evidence:
          "A work record that contains the input, an accountable owner, a decision deadline, and an exception path.",
      },
    ],
    exampleTitle: "A quote is approved, but scheduling still waits",
    exampleLabel: "Illustrative service-business example",
    example: [
      "A customer approves a two-day field job. The coordinator can see the dates and address, but not the access restriction the founder discussed on the sales call. The job sits until the founder replies. The visible symptom is slow scheduling; the real dependency is missing customer context at the quote-to-job handoff.",
      "The team adds four readiness fields to the job record: access window, crew requirement, customer exception, and latest safe assignment time. The coordinator can schedule jobs inside the documented rules. Only an exception—such as a restricted site with no qualified crew—returns to the founder.",
      "The change is successful only when another qualified person can move the next comparable job without reconstructing the founder's memory in chat.",
    ],
    failureSignals: [
      "The same approval is requested more than once because the evidence is scattered.",
      "A status says 'ready' while the next owner still needs to ask what to do.",
      "The team can act only when the founder is available in chat.",
      "Every exception is treated as unique, so no decision rule accumulates.",
      "Delegation changes the person who asks the founder but not the point where work stops.",
    ],
    limitations: [
      "This method does not replace legal, financial, safety, licensing, or regulated approvals that must remain with a named authority.",
      "One successful handoff does not prove continuity. Repeat the test on normal work, rush work, and one legitimate exception.",
      "Do not distribute sensitive customer, employee, pricing, or access information more broadly than the work requires.",
      "Founder involvement is not automatically a defect. Keep decisions where the founder's judgment is intentional, material, and time-bounded.",
    ],
    sources: [
      {
        organization: "National Institute of Standards and Technology",
        title: "Criticality Analysis Process Model: Prioritizing Systems and Components",
        url: "https://csrc.nist.gov/pubs/ir/8179/final",
        relevance:
          "Supports tracing essential functions to the systems and components whose loss would affect the organization's goals.",
      },
      {
        organization: "National Institute of Standards and Technology",
        title: "Using Business Impact Analysis to Inform Risk Prioritization and Response",
        url: "https://www.nist.gov/publications/using-business-impact-analysis-inform-risk-prioritization-and-response-0",
        relevance:
          "Supports identifying mission-essential functions, enabling assets, and the impact of losing them before choosing a response.",
      },
      {
        organization: "U.S. Government Accountability Office",
        title: "Standards for Internal Control in the Federal Government",
        url: "https://www.gao.gov/products/gao-25-107721",
        relevance:
          "Provides a control reference for assigning authority, preserving approvals, and addressing duties that cannot be fully segregated.",
      },
    ],
    relatedLinks: [
      {
        title: "Business that runs without you",
        description: "Turn the repaired handoffs into a controlled owner-absence test.",
        href: "/resources/business-that-runs-without-you",
      },
      {
        title: "Operational resource library",
        description: "Continue through StudioFlows diagnostics and operating models.",
        href: "/resources",
      },
    ],
    action: {
      title: "Find the bottleneck in your own operation",
      description:
        "Run the Silent Collapse diagnostic to identify whether approvals, handoffs, visibility, or founder load is the first constraint to inspect.",
      label: "Run the diagnostic",
      href: "/silent-collapse",
    },
    publishedOn: PUBLISHED_ON,
    modifiedOn: PUBLISHED_ON,
    primaryQuery: "founder bottleneck",
  },
  "business-that-runs-without-you": {
    slug: "business-that-runs-without-you",
    path: "/resources/business-that-runs-without-you",
    title: "How to Build a Business That Can Run Without You",
    eyebrow: "Owner dependency · Continuity",
    description:
      "A controlled owner-absence test for service businesses: define the service cycle, decision rights, evidence, exception path, and proof required before the owner steps away.",
    directAnswer:
      "A business can run without the owner when a qualified team can complete a normal customer commitment through delivery, billing, and follow-up using visible work states, documented decision rights, and a bounded exception path. The goal is not permanent owner absence. It is continuity: ordinary work keeps moving, material exceptions reach the right authority, and the owner returns to a trustworthy record of what happened.",
    frameworkName: "The owner-absence continuity test",
    frameworkIntroduction:
      "Test a bounded service cycle before attempting a long absence. Use ordinary work, keep existing controls, and define what would stop the exercise.",
    framework: [
      {
        number: "01",
        title: "Define the service cycle",
        instruction:
          "Choose a start and finish that matter to the customer—for example, approved quote to paid invoice. Name every required handoff inside that boundary.",
        evidence:
          "A finite cycle with entry criteria, completion criteria, and a named owner for each state.",
      },
      {
        number: "02",
        title: "Set decision rights",
        instruction:
          "List the decisions the team can make, the evidence required, the financial or risk boundary, and the person who handles exceptions.",
        evidence:
          "A decision record that distinguishes routine authority, escalation, and decisions reserved for the owner.",
      },
      {
        number: "03",
        title: "Package the operating context",
        instruction:
          "Place customer commitments, scope, readiness inputs, schedule constraints, quality criteria, and billing triggers where the next owner receives the work.",
        evidence:
          "The next owner can act from the work record without searching private messages or asking for a reconstruction.",
      },
      {
        number: "04",
        title: "Run a controlled absence",
        instruction:
          "Start with one business day. The owner does not answer routine questions. A named backup receives genuine exceptions under the existing authority rules.",
        evidence:
          "A timestamped list of work that moved, work that waited, exceptions raised, decisions made, and any customer impact.",
      },
      {
        number: "05",
        title: "Repair and repeat",
        instruction:
          "Fix the smallest missing rule, input, owner, or control revealed by the test. Repeat with another normal cycle before extending the absence window.",
        evidence:
          "The same failure does not recur, and the new rule is visible at the handoff where it is needed.",
      },
    ],
    exampleTitle: "A listing-media job moves while the owner is offline",
    exampleLabel: "Illustrative service-business example",
    example: [
      "A real estate media studio selects one booked listing as the test. The job record contains access details, package scope, assigned crew, weather rule, upload destination, editing due time, delivery approver, and invoice trigger.",
      "The photographer reports that the property is not ready. The documented rule allows the coordinator to delay within a two-hour window and notify the client. A cancellation fee or scope change still routes to the designated commercial authority. The owner is not contacted for the routine delay.",
      "After delivery, the team reviews the trace. If the invoice waited because nobody owned the delivery-to-billing state, that single handoff becomes the next repair. The test expands only after the repair works on another live job.",
    ],
    failureSignals: [
      "The team has a procedure, but the current job does not contain the inputs the procedure requires.",
      "A backup can see the work but lacks authority to make a routine decision.",
      "The owner stays copied on every message and quietly resolves exceptions during the test.",
      "Work moves, but nobody records why a decision changed or who accepted the risk.",
      "The test covers delivery but ignores billing, customer follow-up, or another downstream commitment.",
    ],
    limitations: [
      "A planned owner-absence test is not a complete emergency, disaster-recovery, cybersecurity, or legal continuity plan.",
      "Do not suspend safety, financial, privacy, licensing, or customer-approval controls to make the test pass.",
      "Run the exercise on a bounded set of ordinary work. Do not create avoidable customer risk to prove independence.",
      "Continuity is specific to a service cycle and operating window. Passing one cycle does not guarantee the whole business can run unattended.",
    ],
    sources: [
      {
        organization: "U.S. Small Business Administration",
        title: "SBA Launches New Business Resilience Guide",
        url: "https://www.sba.gov/article/2024/08/01/sba-launches-new-business-resilience-guide",
        relevance:
          "Supports documenting essential operations and dependencies as part of a small-business resilience plan.",
      },
      {
        organization: "U.S. Small Business Administration",
        title: "Recover from disasters",
        url: "https://www.sba.gov/business-guide/manage-your-business/recover-disasters",
        relevance:
          "Supports identifying critical functions and processes, organizing a continuity team, and evaluating recovery strategies.",
      },
      {
        organization: "International Organization for Standardization",
        title: "ISO 22301:2019 — Business continuity management systems",
        url: "https://www.iso.org/standard/75106.html",
        relevance:
          "Provides the broader continuity principle: maintain a documented system, test it, review it, and improve it after disruption exercises.",
      },
      {
        organization: "National Institute of Standards and Technology",
        title: "Using Business Impact Analysis to Inform Risk Prioritization and Response",
        url: "https://www.nist.gov/publications/using-business-impact-analysis-inform-risk-prioritization-and-response-0",
        relevance:
          "Supports identifying essential functions, their enabling assets, and the effect of losing them before setting continuity priorities.",
      },
    ],
    relatedLinks: [
      {
        title: "Founder bottleneck diagnosis",
        description: "Trace the exact decisions and handoffs that still wait for the founder.",
        href: "/resources/founder-bottleneck",
      },
      {
        title: "Real Estate Media OS",
        description: "See a vertical operating model from booking through delivery and payment.",
        href: "/real-estate-media",
      },
    ],
    action: {
      title: "Choose the first handoff to test",
      description:
        "Run the Silent Collapse diagnostic to locate the approval, handoff, visibility, or founder-load constraint that should define your first owner-absence test.",
      label: "Run the diagnostic",
      href: "/silent-collapse",
    },
    publishedOn: PUBLISHED_ON,
    modifiedOn: PUBLISHED_ON,
    primaryQuery: "business can run without you",
  },
} as const satisfies Record<AuthorityPageDefinition["slug"], AuthorityPageDefinition>;

export function getAuthorityPage(slug: AuthorityPageDefinition["slug"]): AuthorityPageDefinition {
  const page = AUTHORITY_PAGES[slug];
  if (!page) {
    throw new Error(`Unknown authority page: ${slug}`);
  }
  return page;
}
