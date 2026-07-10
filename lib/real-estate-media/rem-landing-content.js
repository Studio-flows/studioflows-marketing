export const REM_SCORE_HREF = "/apply";
export const REM_DEMO_HREF = "https://os.studioflows.co/demo/real-estate-media";
export const REM_OPS_TEARDOWN_HREF = "/apply";

export const REM_HERO_JOBS = [
  {
    id: "maple",
    address: "124 Maple Ave",
    package: "Photo + drone + reel + floor plan",
    status: "Shoot tomorrow · 48h delivery window",
    flag: "No field owner assigned",
    tone: "warn",
    hoursLeft: 41,
  },
  {
    id: "pine",
    address: "87 Pine Street",
    package: "Field complete · upload pending",
    status: "Editor waiting on drone clips",
    flag: "Post-production blocked",
    tone: "pressure",
    hoursLeft: 28,
  },
  {
    id: "harbor",
    address: "19 Harbor Lane",
    package: "Photo + 3D + twilight",
    status: "Agent asked for delivery status",
    flag: null,
    tone: "neutral",
    hoursLeft: 19,
  },
];

export const REM_NOTIFICATIONS = [
  { from: "Photographer", text: "Who has 124 Maple tomorrow?" },
  { from: "Editor", text: "Drone clips still missing on 87 Pine" },
  { from: "Floor plan", text: "CubiCasa file never landed for Maple" },
  { from: "Agent, Harbor", text: "Are the photos and video going out today?" },
  { from: "Crew lead", text: "Do we have coverage for tomorrow's shoots?" },
];

export const REM_FRICTION_STAGES = [
  { id: "schedule", label: "Schedule", status: "Shoot booked", broken: "Interior and exterior need split visits." },
  { id: "crew", label: "Crew", status: "Field role open", broken: "Owner still deciding who covers the job." },
  { id: "upload", label: "Upload", status: "Raw files pending", broken: "Drone clips are in a text thread." },
  { id: "edit", label: "Edit", status: "Editor waiting", broken: "Post cannot start without confirmed assets." },
  { id: "agent", label: "Agent", status: "Status unclear", broken: "Client update lives in the owner's memory." },
];

export const REM_DEMO_JOBS = [
  {
    id: "maple-demo",
    address: "124 Maple Ave",
    services: ["Photo", "Drone", "Reel", "Floor plan"],
    window: "48h · 36h left",
    chaos: ["No field owner", "Drone file unknown", "Editor blocked"],
    connected: ["Crew assigned", "Raw upload tracked", "Editing queued"],
  },
  {
    id: "pine-demo",
    address: "87 Pine Street",
    services: ["Photo", "Twilight", "3D"],
    window: "48h · 22h left",
    chaos: ["Agent texting owner", "Package unclear", "Delivery status unknown"],
    connected: ["Package visible", "Field complete", "Agent status clear"],
  },
];

export const REM_KEEP_TOOLS = [
  "Booking pages that already work",
  "Galleries and final delivery links",
  "Payment processors",
  "Specialty tools like CubiCasa or Matterport",
];
export const REM_CLEAN_UP = [
  "Crew coverage",
  "Split shoot scheduling",
  "Raw upload handoffs",
  "Editing and QC status",
  "Agent update loops",
];

export const REM_SCORE_CARDS = [
  { title: "Jobs", body: "How many listing jobs move through the shop each month." },
  { title: "People", body: "Who touches the work before the agent receives anything." },
  {
    title: "Services",
    body: "Photo, drone, video, reels, floor plans, 3D, twilight, and add-ons.",
  },
  { title: "Status", body: "Where jobs get unclear between field, post, QC, and delivery." },
  { title: "Tools", body: "Where the truth lives now — calendar, inbox, texts, Drive, galleries, or memory." },
  { title: "Owner drag", body: "What still comes back to the founder before delivery." },
];

export const REM_FIT_LINES = [
  "Real estate media company doing repeat listing work",
  "Multiple people touch a job before delivery",
  "Photo, drone, video, floor plan, 3D, or twilight packages",
  "Scheduling and rescheduling take real owner attention",
  "Agents ask for status because the back office cannot answer fast enough",
];

export const REM_PROOF_ITEMS = [
  "Who owns the shoot",
  "Do we have coverage",
  "Did raw files land",
  "Has editing started",
  "Can the agent be updated",
];

export const REM_CATEGORY_ITEMS = [
  "listing jobs",
  "crew coverage",
  "split shoots",
  "field notes",
  "raw uploads",
  "editing",
  "QC",
  "delivery",
  "payments",
];

export const REM_START_PATHS = [
  {
    title: "Live demo path",
    eyebrow: "Most teams start here",
    body:
      "Step into a sample real estate media workspace and see one listing job run from booking to delivery before you create your own workspace.",
    cta: "Step Into the Live Demo",
    href: REM_DEMO_HREF,
    variant: "primary",
  },
  {
    title: "Ops Teardown path",
    eyebrow: "For complex operators",
    body:
      "Use the diagnostic path when your workflow has multiple markets, unusual handoffs, custom staffing logic, or enough complexity to justify a deeper build conversation.",
    cta: "Get an Ops Teardown",
    href: REM_OPS_TEARDOWN_HREF,
    variant: "secondary",
  },
];

export const REM_COPY = {
  hero: {
    eyebrow: "Real estate media OS · founder-led studios",
    headline: "Your real estate media business should not run through your phone.",
    body: [
      "Shoots get booked. Crew gets assigned. Files move. Editing starts. Agents ask for updates.",
      "Somehow, too much of it still lands back on the owner.",
      "StudioFlows gives every listing job one visible workspace from booking to delivery — so your team can move without you routing every handoff.",
    ],
    cta: "Step Into the Live Demo",
    ctaHref: REM_DEMO_HREF,
    secondaryCta: "Get an Ops Teardown",
    secondaryHref: REM_OPS_TEARDOWN_HREF,
    ctaNote: "Demo-first for standard media teams. Ops Teardown for higher-complexity workflows.",
    jobsLabel: "jobs pulling on you",
  },
  recognize: {
    headline: "The job is in the system. The questions still come to you.",
    body: [
      "A photographer asks who has tomorrow's shoot.",
      "An editor is missing drone clips.",
      "An agent wants to know if photos and video are going out today.",
      "A floor plan file still has not landed.",
      "A split interior/exterior shoot gets moved, and now coverage is fuzzy.",
      "None of these are hard questions.",
      "That is the problem.",
      "They are small enough to answer quickly, so you keep answering them — until your day disappears in pieces.",
    ],
    cta: "See the demo path",
  },
  friction: {
    headline: "A listing can be shot and still be wide open.",
    body: [
      "The camera work might be done. The operation might not be.",
      "Files need to land. Editing needs to start. QC needs a clear owner. The agent needs a straight answer.",
      "When status lives across texts, calendars, inboxes, Drive folders, gallery notes, and someone's memory, the owner becomes the backup system.",
    ],
    simulatorLabel: "124 Maple Ave · open loops",
    connectCta: "Connect the job record",
    connectedLabel: "Same job · connected",
  },
  tools: {
    headline: "You may not need half your stack once the operation lives in one place.",
    body: [
      "Do not rip out what is already working just to look modern. That is SaaS theater, and it gets expensive fast.",
      "StudioFlows starts with the part that usually breaks after the order comes in:",
    ],
    bullets: [
      "Who owns the job now",
      "What is waiting",
      "What changed since booking",
      "What needs attention before the agent asks",
      "What should happen next",
    ],
    close: "Some tools stay. Some disappear. The point is that the owner stops being the glue.",
  },
  demo: {
    headline: "Step into a working real estate media operation first.",
    body: [
      "Not a blank account. Not a feature tour. A live-feeling sample workspace with listing jobs already moving.",
      "Open a job. Check the package. See who owns field, post, QC, and delivery. Watch the chaos drop when the handoffs live in one record.",
      "The first question is not whether StudioFlows has a button. It is whether your team can see what happens next without asking you.",
    ],
    chaosMode: "Owner-router mode",
    connectedMode: "StudioFlows mode",
  },
  fieldflow: {
    headline: "Your field team should not need the whole back office.",
    body: [
      "Photographers, videographers, and drone operators need the job, the address, the package, the notes, and the next update — not a software dissertation.",
      "FieldFlow gives them a simple job view so field updates land on the record instead of in your texts.",
    ],
    mobileLabel: "Field · mobile",
    ownerLabel: "Owner · same job",
  },
  score: {
    headline: "For complex workflows, start with the Ops Teardown path.",
    body: [
      "Most real estate media teams should start with the demo workspace.",
      "If your operation has multi-market scheduling, custom staffing rules, complex handoffs, or a workflow that cannot be understood from a simple demo, use the diagnostic path instead.",
    ],
    cta: "Get an Ops Teardown",
  },
  voice: {
    headline: "One messy example usually says enough.",
    body: [
      "The best diagnostic input is not polished.",
      "It sounds like: the editor needed drone clips, the agent wanted status, the field team did not know who owned the next step, and somehow the owner had to untangle all of it.",
    ],
    example:
      "Harbor Lane. Agent asked if photos were sent. Editor was still waiting on drone. Floor plan never linked. I chased all three at 7:30.",
  },
  result: {
    headline: "The result should tell you what is actually stuck.",
    body: [
      "Some teams have a crew coverage issue. Some have post-production drag. Some have too many tools holding different pieces of the same job.",
      "The point is not a cute score. The point is seeing which handoffs still depend on you before you create your own workspace.",
    ],
  },
  fit: {
    headline: "Built for media teams with moving parts.",
    lead: "StudioFlows is for real estate media companies where jobs pass through more than one person before the agent receives the final package.",
    close: "If you are a solo shooter doing a few simple jobs a month, this is probably too much system. Good problem to have, honestly.",
  },
  pricing: {
    eyebrow: "Two ways to start",
    headline: "Demo for standard teams. Ops Teardown for complex teams.",
    body: [
      "The landing page should split visitors by how much operational complexity they already have.",
      "Standard media teams need to see the workspace. Complex teams need to expose the workflow before a call is worth anyone's time.",
    ],
  },
  proof: {
    headline: "This is built around listing media work, not blank project boards.",
    body: "The workflow language comes from a real media operation: scheduling, crew coverage, field updates, raw uploads, editor handoff, QC, delivery, payments, and agent status.",
  },
  final: {
    headline: "See what happens when the listing job has one place to live.",
    body: [
      "Open the demo path. Click through the job. Watch what stops needing the owner.",
      "If your workflow is more complex than the demo can explain, take the Ops Teardown path instead.",
    ],
    cta: "Step Into the Live Demo",
    ctaHref: REM_DEMO_HREF,
    secondaryCta: "Get an Ops Teardown",
    secondaryHref: REM_OPS_TEARDOWN_HREF,
  },
  category: {
    headline: "Everything that happens after the booking",
  },
};
