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

export type AuthorityPageSlug =
  | "founder-bottleneck"
  | "business-that-runs-without-you"
  | "approved-quote-handoff"
  | "scope-change-propagation";

export type AuthorityAnswerPoints = readonly [string, string, string];

export type ProcessBlueprintArtifact = {
  kind: "process-blueprint";
  entryState: string;
  exitState: string;
  releaseRecord: {
    acceptedBasis: string;
    blockers: ReadonlyArray<string>;
    owner: string;
    releaseProof: string;
  };
};

export type ScenarioTraceSurface = {
  name: string;
  before: string;
  after: string;
  owner: string;
  verification: string;
};

export type ScenarioTraceArtifact = {
  kind: "scenario-trace";
  trigger: string;
  baseline: string;
  outcome: string;
  surfaces: ReadonlyArray<ScenarioTraceSurface>;
};

type AuthorityPageCommon = {
  slug: AuthorityPageSlug;
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

export type LegacyAuthorityPageDefinition = AuthorityPageCommon & {
  template: "legacy-authority";
};

export type ProcessBlueprintPageDefinition = AuthorityPageCommon & {
  template: "process-blueprint";
  heroAnswer: string;
  answerPoints: AuthorityAnswerPoints;
  artifact: ProcessBlueprintArtifact;
};

export type ScenarioTracePageDefinition = AuthorityPageCommon & {
  template: "scenario-trace";
  heroAnswer: string;
  answerPoints: AuthorityAnswerPoints;
  artifact: ScenarioTraceArtifact;
};

export type AuthorityPageDefinition =
  | LegacyAuthorityPageDefinition
  | ProcessBlueprintPageDefinition
  | ScenarioTracePageDefinition;

export type ModernAuthorityPageDefinition =
  | ProcessBlueprintPageDefinition
  | ScenarioTracePageDefinition;

const INITIAL_PUBLISHED_ON = "2026-08-06";
const QUOTE_HANDOFF_BATCH_PUBLISHED_ON = "2026-08-09";

export const AUTHORITY_PAGES = {
  "founder-bottleneck": {
    template: "legacy-authority",
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
    publishedOn: INITIAL_PUBLISHED_ON,
    modifiedOn: INITIAL_PUBLISHED_ON,
    primaryQuery: "founder bottleneck",
  },
  "business-that-runs-without-you": {
    template: "legacy-authority",
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
    publishedOn: INITIAL_PUBLISHED_ON,
    modifiedOn: INITIAL_PUBLISHED_ON,
    primaryQuery: "business can run without you",
  },
  "approved-quote-handoff": {
    template: "process-blueprint",
    slug: "approved-quote-handoff",
    path: "/resources/approved-quote-handoff",
    title: "Approved Quote Handoff: Turn Approval Into Ready Work",
    eyebrow: "Quote to job · Release control",
    description:
      "A quote-to-job handoff for carrying approved scope, assumptions, customer commitments, readiness blockers, and ownership into scheduling.",
    directAnswer:
      "An approved quote is ready for scheduling only when the next owner can identify the accepted quote version, committed scope, exclusions, assumptions, customer inputs, timing constraints, readiness blockers, and decision authority from one job record. Approval confirms what the customer accepted. The handoff must also prove that the operation can release that work without reconstructing the sale from inboxes, calls, or memory.",
    heroAnswer:
      "An approved quote becomes ready work when one job record carries the accepted version, execution conditions, named next owner, and release acknowledgement.",
    answerPoints: [
      "Use the accepted quote version as the commercial baseline.",
      "Keep approved work separate from operational readiness until required inputs have owners.",
      "Release only to a named next owner with acknowledgement and an exception path.",
    ],
    frameworkName: "The quote-to-job release packet",
    frameworkIntroduction:
      "Build the packet from one accepted quote. Keep the quote as the commercial source, then carry only the facts the next owner needs to prepare, schedule, and control the job.",
    framework: [
      {
        number: "01",
        title: "Freeze the accepted basis",
        instruction:
          "Record the exact quote version, accepted package, acceptance date and method, customer authority, and any approved attachment. Link to the accepted source instead of copying an editable draft.",
        evidence:
          "One identifiable quote version and an acceptance record. A scheduler can distinguish the accepted basis from every earlier revision.",
      },
      {
        number: "02",
        title: "Translate the commitments",
        instruction:
          "Carry forward deliverables, exclusions, assumptions, price basis, payment or billing trigger, promised timing, site constraints, and customer-provided inputs. Resolve contradictions before release.",
        evidence:
          "A job record whose scope and commercial boundaries agree with the accepted quote, with unresolved conflicts named as blockers.",
      },
      {
        number: "03",
        title: "Test operational readiness",
        instruction:
          "Check the people, access, materials, equipment, information, dependencies, and permissions required to perform the work. Keep the status approved until each required condition is ready or assigned.",
        evidence:
          "A readiness state for every required input, plus a named owner and due time for each open blocker.",
      },
      {
        number: "04",
        title: "Assign the next decision",
        instruction:
          "Name the person who can schedule or prepare the job, the bounds of that authority, the response deadline, and the conditions that must return to commercial, safety, financial, or customer approval.",
        evidence:
          "One accountable next owner, a decision window, and an exception path that does not default to 'ask the founder.'",
      },
      {
        number: "05",
        title: "Release and acknowledge",
        instruction:
          "Move the job to ready only after the packet is complete. Have the next owner acknowledge the release, retire superseded instructions, and preserve the accepted source for later changes or billing questions.",
        evidence:
          "A timestamped release and acknowledgement. The next owner can state what was sold, what is still open, and where the accepted basis lives.",
      },
    ],
    artifact: {
      kind: "process-blueprint",
      entryState: "Customer acceptance recorded",
      exitState: "Ready work acknowledged by the next owner",
      releaseRecord: {
        acceptedBasis:
          "The accepted two-day equipment-service quote, including after-hours access and the optional part that was not purchased.",
        blockers: [
          "Customer-provided shutdown confirmation",
          "After-hours access confirmation",
        ],
        owner: "The coordinator, acting within documented scheduling authority.",
        releaseProof:
          "The linked quote version, resolved access condition, approved-not-ready state history, and scheduler acknowledgement.",
      },
    },
    exampleTitle: "Approval arrives, but the access promise is missing",
    exampleLabel: "Illustrative service-business example",
    example: [
      "A customer accepts a two-day equipment-service quote. The accepted version includes after-hours site access, one customer-provided shutdown, and an optional replacement part that was not purchased. Sales marks the opportunity won and sends the price and address to scheduling.",
      "The coordinator can see that the quote was approved but cannot tell who will arrange the shutdown, whether the after-hours window is confirmed, or whether the optional part belongs on the work order. The job is commercially approved and operationally blocked.",
      "The release packet links the accepted version, carries the exclusion and access promise into the job record, assigns the shutdown confirmation to the customer contact, and keeps the job in approved-not-ready status. Scheduling receives it only after the access condition is confirmed. No one has to reinterpret the sale, and the optional part cannot appear as unapproved work.",
    ],
    failureSignals: [
      "The scheduler receives a total price and address but not the accepted scope or exclusions.",
      "The job is marked ready while a customer input, access condition, or required resource has no owner.",
      "A revised quote exists, but the work order still points to an earlier version.",
      "Sales remains the only person who can explain a promise that affects execution.",
      "The crew discovers a commercial assumption after travel, assignment, or material preparation has begun.",
    ],
    limitations: [
      "This framework does not determine whether a quote, signature, email, or other acceptance creates an enforceable contract. Use the legal and commercial rules that apply to the business and transaction.",
      "Do not treat customer approval as proof that safety, licensing, access, privacy, credit, or technical readiness requirements are satisfied.",
      "Not every field belongs in every handoff. Carry the minimum information required to execute and control the job, and restrict sensitive data to people who need it.",
      "Material changes after release require their own authorized change record; editing the original handoff in place destroys the accepted baseline.",
    ],
    sources: [
      {
        organization: "Federal Acquisition Regulation",
        title: "FAR 4.801 — General contract-file requirements",
        url: "https://www.acquisition.gov/far/4.801",
        relevance:
          "Federal procurement guidance calls for records that document the complete transaction history and support informed decisions. This page adapts that traceability principle; it does not apply federal procurement rules to private service work.",
      },
      {
        organization: "Federal Acquisition Regulation",
        title: "FAR 4.803 — Contents of contract files",
        url: "https://www.acquisition.gov/far/4.803",
        relevance:
          "Its examples connect quotations, approvals, awards, modifications, notices to proceed, orders, and payment records. The release packet uses that record-continuity principle outside the federal contracting context.",
      },
      {
        organization: "U.S. Government Accountability Office",
        title: "Standards for Internal Control in the Federal Government",
        url: "https://www.gao.gov/greenbook",
        relevance:
          "The Green Book anchors the control ideas of documented responsibilities, reliable information, and evidence that a control was performed. Its standards govern federal internal control; this page uses them as a design reference.",
      },
    ],
    relatedLinks: [
      {
        title: "Scope change process",
        description: "Carry an approved change through every execution surface without losing the baseline.",
        href: "/resources/scope-change-propagation",
      },
      {
        title: "Founder bottleneck diagnosis",
        description: "Find the missing context and decisions that still make handoffs wait for the owner.",
        href: "/resources/founder-bottleneck",
      },
      {
        title: "Real Estate Media OS",
        description: "See how quote, scheduling, field work, delivery, and payment can remain connected in one vertical flow.",
        href: "/real-estate-media",
      },
    ],
    action: {
      title: "Trace your quote-to-job handoff",
      description:
        "The Ops Teardown follows a real work item from commitment to delivery and identifies the first missing input, owner, or control worth repairing.",
      label: "Start the Ops Teardown",
      href: "/services/custom-ops-hub",
    },
    publishedOn: QUOTE_HANDOFF_BATCH_PUBLISHED_ON,
    modifiedOn: QUOTE_HANDOFF_BATCH_PUBLISHED_ON,
    primaryQuery: "approved quote handoff",
  },
  "scope-change-propagation": {
    template: "scenario-trace",
    slug: "scope-change-propagation",
    path: "/resources/scope-change-propagation",
    title: "Scope Change Process: Keep the Job in One Version",
    eyebrow: "Quote to job · Change control",
    description:
      "A scope change process for updating authority, price, schedule, readiness, crew instructions, customer communication, and billing from one baseline.",
    directAnswer:
      "A scope change is complete only when an authorized record identifies the current baseline, the requested change, who approved it, its price and timing effects, its execution and safety effects, and every downstream record or owner that must change. The process ends when affected owners acknowledge the new version and superseded instructions can no longer direct the job.",
    heroAnswer:
      "A scope change is complete when one authorized record updates every affected execution surface and each downstream owner acknowledges the same effective version.",
    answerPoints: [
      "Anchor the change to the last accepted job baseline.",
      "Evaluate commercial, schedule, resource, customer, billing, and safety effects before propagation.",
      "Confirm affected owners received the new version and retire superseded instructions.",
    ],
    frameworkName: "The downstream change trace",
    frameworkIntroduction:
      "Start from the last accepted job version. Treat the change as a controlled transition between two known states, not as a message that each department must interpret on its own.",
    framework: [
      {
        number: "01",
        title: "Anchor the baseline",
        instruction:
          "Identify the accepted quote, scope, work order, schedule, and customer commitments currently governing the job. Stop if the team cannot agree which version is active.",
        evidence:
          "One versioned baseline with links to the records that currently control commercial and execution decisions.",
      },
      {
        number: "02",
        title: "Qualify the request and authority",
        instruction:
          "Record what changes, what remains unchanged, who requested it, who can approve it, and whether work must pause. Separate a question or preference from an authorized change.",
        evidence:
          "A written change statement, requester, decision owner, approval state, and explicit stop-or-continue instruction.",
      },
      {
        number: "03",
        title: "Map the effects",
        instruction:
          "Evaluate scope, price, payment, schedule, staffing, materials, access, safety, quality, delivery, and customer communication. Mark each dimension affected, unaffected, or unresolved.",
        evidence:
          "A completed impact record with an owner for every unresolved effect and no blank dimension silently treated as unchanged.",
      },
      {
        number: "04",
        title: "Propagate the approved version",
        instruction:
          "Update each affected execution surface: quote or change order, work order, schedule, resource plan, crew brief, customer notice, delivery requirement, and billing instruction. Link each update to the same change record.",
        evidence:
          "A downstream update list showing the new version, responsible owner, update time, and source change for every affected record.",
      },
      {
        number: "05",
        title: "Confirm receipt and retire the old path",
        instruction:
          "Require affected owners to acknowledge the change before their next irreversible action. Archive or mark old instructions superseded so search, chat, and printed notes cannot quietly restore the prior scope.",
        evidence:
          "Acknowledgements from affected owners and a trace showing that superseded instructions are retained for history but no longer operational.",
      },
    ],
    artifact: {
      kind: "scenario-trace",
      trigger: "A customer-approved request changes an active job.",
      baseline:
        "The last accepted quote, scope, work order, schedule, and customer commitments.",
      outcome:
        "Every affected execution surface points to the same approved version.",
      surfaces: [
        {
          name: "Change record",
          before: "The original scope is the active instruction.",
          after: "The approved addition is linked to the active baseline.",
          owner: "Commercial authority",
          verification: "Approval and the effective version are recorded.",
        },
        {
          name: "Work order",
          before: "One location and the original duration.",
          after: "The second location and updated scope are included.",
          owner: "Job preparation owner",
          verification: "The work order references the approved change.",
        },
        {
          name: "Schedule",
          before: "The original duration, route, and assignment.",
          after: "Travel, duration, and assignment reflect the change.",
          owner: "Scheduler",
          verification: "The current schedule matches the effective version.",
        },
        {
          name: "Resource or crew plan",
          before: "One address and the original field instructions.",
          after: "Both locations, access, and resource changes are visible.",
          owner: "Operations lead",
          verification: "The crew acknowledges the update before dispatch.",
        },
        {
          name: "Customer communication",
          before: "The original confirmation remains current.",
          after: "Timing, scope, and responsibilities reflect the approved change.",
          owner: "Customer owner",
          verification: "The customer receives the current confirmation.",
        },
        {
          name: "Billing instruction",
          before: "The original total and invoice instruction.",
          after: "The approved price and billing trigger are current.",
          owner: "Billing owner",
          verification: "The invoice instruction references the change.",
        },
      ],
    },
    exampleTitle: "One added location splits the job into two realities",
    exampleLabel: "Illustrative service-business example",
    example: [
      "A customer asks to add a second location after the first location is scheduled. Sales revises the quote and receives approval, but the scheduler still sees the original duration, the crew brief lists one address, and billing carries the original total.",
      "The company has proof of customer approval but not a complete operational change. If the crew follows its brief, the second location is missed. If it follows the salesperson's message, the schedule and invoice are wrong.",
      "The downstream change trace anchors the original job version, records the approved addition, evaluates travel, crew time, access, price, and delivery effects, then updates the work order, schedule, crew brief, customer confirmation, and billing instruction from the same change record. Each affected owner acknowledges the new version before dispatch.",
    ],
    failureSignals: [
      "A customer-approved change appears in the quote but not in the schedule, work order, crew brief, or invoice instruction.",
      "People learn about a change from chat, yet no record says which instruction it supersedes.",
      "The approver can authorize price but nobody owns the delivery, staffing, or safety impact.",
      "Blank impact fields are treated as no impact even though nobody checked them.",
      "A temporary workaround remains active because it has no expiration, review point, or restoration owner.",
    ],
    limitations: [
      "This framework is not legal advice and does not define contract-modification authority. Use the approval, notice, pricing, and signature requirements that govern the actual customer agreement.",
      "Safety-critical or regulated work may require an immediate stop, formal hazard review, training, permits, or approval before any changed work begins.",
      "Not every change affects every downstream record. The control is to evaluate each relevant dimension and record why it is unaffected, not to generate unnecessary updates.",
      "Urgency does not erase traceability. If an emergency procedure permits temporary action, record the authority, boundaries, affected work, and required follow-up review.",
    ],
    sources: [
      {
        organization: "Federal Acquisition Regulation",
        title: "FAR 43.102 — Policy for contract modifications",
        url: "https://www.acquisition.gov/far/43.102",
        relevance:
          "Federal policy ties modifications to defined authority and addresses pricing before execution. This page adapts the authority-and-impact principle without applying federal contracting rules to private service agreements.",
      },
      {
        organization: "Federal Acquisition Regulation",
        title: "FAR Subpart 43.2 — Change Orders",
        url: "https://www.acquisition.gov/far/subpart-43.2",
        relevance:
          "The subpart emphasizes written changes, cost segregation, supporting documentation, and adjustments to price or delivery. Those controls inform the trace while remaining specific to federal contracting.",
      },
      {
        organization: "Occupational Safety and Health Administration",
        title: "Process Safety Management — Management of Change",
        url: "https://www.osha.gov/enforcement/directives/cpl-02-02-045",
        relevance:
          "For covered highly hazardous processes, OSHA describes pre-implementation review of technical basis, safety impact, procedures, duration, authorization, and training. This page uses that discipline only as a safety-critical change reference.",
      },
      {
        organization: "National Institute of Standards and Technology",
        title: "NIST SP 800-171 Rev. 3 — Configuration Change Control",
        url: "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/800-171r3/NIST.SP.800-171r3.html",
        relevance:
          "In a cybersecurity context, NIST calls for reviewing, approving, documenting, and monitoring changes against a baseline. The downstream trace adapts that baseline-control pattern to service operations.",
      },
    ],
    relatedLinks: [
      {
        title: "Approved quote handoff",
        description: "Create the accepted job baseline that later changes must reference.",
        href: "/resources/approved-quote-handoff",
      },
      {
        title: "Business that runs without you",
        description: "Test whether normal work and legitimate exceptions can move through explicit authority rules.",
        href: "/resources/business-that-runs-without-you",
      },
      {
        title: "Real Estate Media OS",
        description: "See the downstream scheduling, field-work, delivery, and payment states a change can affect.",
        href: "/real-estate-media",
      },
    ],
    action: {
      title: "Find where changes split your operation",
      description:
        "The Ops Teardown traces active work across handoffs and shows where a customer decision stops propagating to the people and records that execute it.",
      label: "Start the Ops Teardown",
      href: "/services/custom-ops-hub",
    },
    publishedOn: QUOTE_HANDOFF_BATCH_PUBLISHED_ON,
    modifiedOn: QUOTE_HANDOFF_BATCH_PUBLISHED_ON,
    primaryQuery: "scope change process",
  },
} as const satisfies Record<AuthorityPageSlug, AuthorityPageDefinition>;

export function getAuthorityPage(slug: AuthorityPageSlug): AuthorityPageDefinition {
  const page = AUTHORITY_PAGES[slug];
  if (!page) {
    throw new Error(`Unknown authority page: ${slug}`);
  }
  return page;
}
