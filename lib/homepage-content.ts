export const HOMEPAGE_CTA = {
  primaryLabel: "Build Your Execution System",
  primaryHref: "#diagnosis",
  secondaryLabel: "Talk Through the Workflow",
  secondaryHref: "/apply",
  executionLoopLabel: "See the execution loop",
  executionLoopHref: "#execution-loop",
  diagnosisLabel: "Start the 30-Second Diagnosis",
  vessaWaitlistLabel: "Join Vessa Waitlist",
  vessaWaitlistHref: "/vessa",
  auditLabel: "Get Your Ops Teardown",
  bookAuditLabel: "Book a Quick Call",
  qualifiedChoiceHelperCopy:
    "Answer the next set of questions and we'll turn them into a clear Ops Teardown based on how you actually run things. Takes about 2 minutes. PDF comes right after.",
} as const;

export const OPS_CHECK_QUALIFIED_BRIDGE = {
  eyebrow: "Ops Check Complete",
  headline: "You found operational drag. Now choose how deep you want to go.",
  subheadline:
    "Your answers suggest there may be real execution friction inside the business. You can book a quick Ops Call now, or complete the deeper audit to generate a private StudioFlows Ops Teardown first.",
  pathsHeading: "Two paths",
  bookCall: {
    title: "Book a Quick Ops Call",
    body: "Prefer to talk it through? Book a short call and we'll walk through where execution is leaking, what's likely costing time, and whether StudioFlows is a fit.",
    cta: "Book My Ops Call",
  },
  teardown: {
    title: "Generate My Private Ops Teardown",
    body: "Want the artifact first? Answer the deeper audit and StudioFlows will generate a private teardown showing your drag profile, founder bottlenecks, workflow risk, and recommended next operating-system step.",
    cta: "Start My Ops Teardown",
  },
  trustNote:
    "This audit is intentionally direct. We ask about founder dependency, handoffs, software trust, workflow volume, and business risk because vague answers create vague systems. Your teardown is private and designed to help you make a clearer operating decision.",
  privacyNote:
    "You can download or email your teardown after it's generated. If you choose to share anything publicly, we'll only share the public Ops Check link — never your private results.",
} as const;

export const OPS_CHECK_LOW_FIT_COPY = {
  eyebrow: "Ops Check complete",
  helper:
    "An audit slot is probably not the right move yet. You can still follow practical ops content, retake the check later, or get early access to Vessa.",
  byScoreBand: [
    {
      maxScore: 3,
      title: "Execution looks fairly contained",
      body: "From your answers, operational drag looks low right now. That usually means the basics are holding and you do not need a full Ops Audit yet.",
      guidance:
        "Keep tightening handoffs as you grow. If drag shows up later — especially around scheduling, owner routing, or client updates — retake the check.",
    },
    {
      maxScore: 7,
      title: "Some drag, not enough for an audit slot yet",
      body: "You have pockets of friction, but not the level of founder bottleneck or margin leakage we usually see before an Ops Audit makes sense.",
      guidance:
        "Useful next steps: watch for where work still routes through you, and retake the check if that pattern gets worse over the next few months.",
    },
  ],
} as const;

export const HERO = {
  eyebrow: "Execution Infrastructure for Service Businesses",
  headline: "Your business already has the signal.",
  headlineAccent: "StudioFlows turns it into execution.",
  subcopy:
    "StudioFlows captures opportunities, requests, decisions, and follow-ups from the places your team already works, then turns them into reviewable work your team can approve, release, and track.",
  support:
    "Built for founder-led service businesses where work still depends on memory, Slack threads, and manual routing.",
} as const;

export const PROBLEM = {
  eyebrow: "The drag tax",
  heading: "Operational drag quietly taxes every deal,",
  headingAccent: "handoff, approval, and client promise.",
  subcopy:
    "Most founder-led teams lose margin in the gaps between tools. The work is visible. The handoffs are not.",
  hint: "Tap a signal to see where drag compounds.",
} as const;

export const DRAG_SYMPTOMS = [
  {
    title: "Sales promises vanish in delivery",
    signal: "The deal closes fast. Delivery inherits ambiguity.",
    leak: "Scope, timing, and ownership shift midstream without a clean handoff.",
    outcome: "Rework climbs, trust drops, and margin gets squeezed.",
    pressure: "Drag: High",
  },
  {
    title: "The founder becomes the router",
    signal: "Approvals and escalations route through you all day.",
    leak: "Execution speed caps at your personal throughput.",
    outcome: "You become the bottleneck and the fallback system.",
    pressure: "Drag: High",
  },
  {
    title: "Tools track work but do not move it",
    signal: "Dashboards show activity. Output still stalls.",
    leak: "Critical work sits in threads, inboxes, and side channels.",
    outcome: "You have visibility without reliable velocity.",
    pressure: "Drag: Medium",
  },
  {
    title: "Nobody owns the handoff",
    signal: "Ownership changes hands. Nobody owns the transition.",
    leak: "Deadlines slip and accountability gets blurry at the seam.",
    outcome: "Chaos hides in handoffs and shows up when clients are waiting.",
    pressure: "Drag: Medium",
  },
] as const;

export const TOOLS_FAIL = {
  eyebrow: "Why current tools fail",
  heading: "They track work. They do not move it.",
  subcopy:
    "PM tools, CRMs, and dashboards were built to record activity, not to own handoffs, enforce approvals, or close the loop when context shifts.",
  comparisonHeaders: {
    tracks: "What most tools do",
    moves: "What execution requires",
  },
  comparisonRows: [
    {
      tracks: "Log tasks and updates",
      moves: "Route work to the right owner at the right moment",
    },
    {
      tracks: "Show dashboards after the fact",
      moves: "Surface what is blocked before it becomes a fire",
    },
    {
      tracks: "Send notifications into the noise",
      moves: "Hold approvals until the right human signs off",
    },
    {
      tracks: "Add another place to check",
      moves: "Close the loop from signal to finished work",
    },
    {
      tracks: "Depend on someone remembering the thread",
      moves: "Keep execution visible without founder routing",
    },
  ],
  closing:
    "StudioFlows installs the operating layer your stack was supposed to provide: capture, review, approval, execution, and proof.",
} as const;

export const OPERATING_LAYER_INTRO = {
  heading: "The operating layer your tools never installed.",
  subcopy:
    "Five connected capabilities that turn scattered signals into finished work your team can trust.",
} as const;

export const OPERATING_LAYER = [
  {
    number: "01",
    title: "Capture signals",
    body: "Pull requests, decisions, and follow-ups from the channels work already lives in.",
    before: "Signals scatter across inboxes and threads.",
    after: "Work enters one reviewable queue.",
  },
  {
    number: "02",
    title: "Route for review",
    body: "Organize incoming work by priority, owner, and deadline before it becomes chaos.",
    before: "Everything lands on the founder's desk.",
    after: "Work routes to the right operator automatically.",
  },
  {
    number: "03",
    title: "Approval control",
    body: "High-impact moves get a human checkpoint. Nothing critical runs silently.",
    before: "Approvals happen in side conversations.",
    after: "Decisions are visible, owned, and traceable.",
  },
  {
    number: "04",
    title: "Execution movement",
    body: "Release approved work into tasks, status changes, and client-facing updates.",
    before: "Approved work still waits for manual follow-up.",
    after: "Finished work moves without founder babysitting.",
  },
  {
    number: "05",
    title: "Proof closure",
    body: "Show what moved, who approved it, and what finished without dashboard theater.",
    before: "You reconstruct history from memory.",
    after: "Execution leaves a clear record.",
  },
] as const;

export const EXECUTION_LOOP = {
  eyebrow: "Execution loop",
  heading: "Detect → Prepare → Approve → Execute → Prove",
  subcopy:
    "How work moves through StudioFlows: surface the signal, package the move, get sign-off, run it, and leave proof behind.",
  steps: [
    {
      id: "detect",
      label: "Detect",
      body: "Capture signals from email, Slack, forms, and your operating surface. Expose what needs attention now.",
    },
    {
      id: "prepare",
      label: "Prepare",
      body: "Turn raw signals into scoped actions with owners, deadlines, and context attached.",
    },
    {
      id: "approve",
      label: "Approve",
      body: "Route high-impact moves to the right human checkpoint before anything executes.",
    },
    {
      id: "execute",
      label: "Execute",
      body: "Release approved work into tasks, updates, and delivery workflows your team already runs.",
    },
    {
      id: "prove",
      label: "Prove",
      body: "Show what moved, what finished, and what still needs attention without rebuilding the story manually.",
    },
  ],
} as const;

export const PRE_QUALIFIER = {
  heading: "Find the drag before you build around it.",
  subcopy: "Six quick questions to show where execution is leaking and whether a deeper workflow conversation makes sense.",
  footnote: "Answer honestly. If it looks like a fit, you can start the diagnosis or talk through the workflow.",
} as const;

export const QUIZ_QUESTIONS = [
  {
    id: "team-size",
    prompt: "Team size?",
    options: [
      { label: "1-4", score: 0 },
      { label: "5-9", score: 1 },
      { label: "10-14", score: 2 },
      { label: "15-24", score: 3 },
      { label: "25+", score: 3 },
    ],
  },
  {
    id: "founder-routes",
    prompt: "Does the founder still route most handoffs and approvals?",
    options: [
      { label: "No", score: 0 },
      { label: "Sometimes", score: 2 },
      { label: "Yes", score: 3 },
    ],
  },
  {
    id: "sales-disappear",
    prompt: "Do sales promises regularly disappear in delivery?",
    options: [
      { label: "No", score: 0 },
      { label: "Occasionally", score: 2 },
      { label: "Yes", score: 3 },
    ],
  },
  {
    id: "scheduling-manual",
    prompt: "Is scheduling/crew/freelancer work mostly manual?",
    options: [
      { label: "No", score: 0 },
      { label: "Partially", score: 2 },
      { label: "Yes", score: 3 },
    ],
  },
  {
    id: "week-off",
    prompt: "Can you take a full week off without things slipping?",
    options: [
      { label: "Yes", score: 0 },
      { label: "Not reliably", score: 2 },
      { label: "No", score: 3 },
    ],
  },
  {
    id: "work-lives",
    prompt: "Where does most work currently live?",
    options: [
      { label: "Structured workflows", score: 0 },
      { label: "Slack + PM tools", score: 2 },
      { label: "Founder's head / ad hoc", score: 3 },
    ],
  },
] as const;

export const FINAL_CTA = {
  heading: "Stop being the router for your own business.",
  subcopy:
    "StudioFlows gives service businesses a cleaner way to capture, approve, and finish the work that usually gets buried.",
} as const;

export const FOOTER = {
  tagline: "StudioFlows. Execution infrastructure for founder-led service businesses.",
  links: [
    { label: "Diagnosis", href: "#diagnosis" },
    { label: "Execution loop", href: "#execution-loop" },
    { label: "REC proof", href: "#rec-spotlight" },
    { label: "Ways to work", href: "#ways-to-work" },
    { label: "Talk through the workflow", href: "/apply" },
  ],
} as const;

export const NAV_LINKS = [
  { label: "Execution loop", href: "#execution-loop" },
  { label: "REC", href: "#rec-spotlight" },
  { label: "Ways to work", href: "#ways-to-work" },
  { label: "Diagnosis", href: "#diagnosis" },
] as const;
