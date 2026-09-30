export type ArchetypeId = "service" | "field" | "fulfillment" | "cases" | "booking" | "projects";

export type BusinessExample = {
  name: string;
  pack: string;
  configuration: string;
};

export type Archetype = {
  id: ArchetypeId;
  name: string;
  label: string;
  title: string;
  description: string;
  unit: string;
  flow: readonly string[];
  image: string;
  imageAlt: string;
  examples: readonly BusinessExample[];
};

// Illustrative marketing examples, not a registry of released packs or runtime states.
export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "service", name: "Service OS", label: "Ongoing service",
    title: "Keep every client moving.",
    description: "Recurring work, incoming requests, and client follow-up in one continuous flow.",
    unit: "Client service queue",
    flow: ["Request", "Prioritize", "Deliver", "Review", "Repeat"],
    image: "/home/archetype-service-v1.png",
    imageAlt: "Managed service colleagues reviewing a client request together",
    examples: [
      { name: "Managed IT", pack: "Service agreements, request priorities, and response targets.", configuration: "Your support hours, escalation owners, client plans, and approval limits." },
      { name: "Bookkeeping", pack: "Recurring close checklists, document requests, and client reviews.", configuration: "Your monthly deadlines, client assignments, service prices, and review rules." },
      { name: "Marketing services", pack: "Recurring deliverables, client requests, and content approvals.", configuration: "Your retainers, delivery cadence, account teams, and sign-off rules." },
    ],
  },
  {
    id: "field", name: "Field OS", label: "Work on site",
    title: "Connect the office and the field.",
    description: "Get the right crew to the right place, with the details to finish the job.",
    unit: "Field work order",
    flow: ["Request", "Schedule", "Dispatch", "Do the work", "Sign off"],
    image: "/home/archetype-field-v1.png",
    imageAlt: "Field-service technicians checking the next job beside their service van",
    examples: [
      { name: "HVAC", pack: "Equipment records, service checklists, and on-site completion evidence.", configuration: "Your service area, technician skills, rates, and dispatch rules." },
      { name: "Property maintenance", pack: "Property records, work orders, and before-and-after photos.", configuration: "Your properties, crews, access instructions, and spending approvals." },
      { name: "Landscaping", pack: "Site visits, seasonal schedules, and property-specific checklists.", configuration: "Your routes, crews, recurring services, and weather rescheduling rules." },
    ],
  },
  {
    id: "fulfillment", name: "Fulfillment OS", label: "Repeatable delivery",
    title: "Move every order to delivered.",
    description: "A repeatable path through production, quality checks, and the final handoff.",
    unit: "Fulfillment order",
    flow: ["Order", "Prepare", "Produce", "Check", "Deliver"],
    image: "/home/archetype-fulfillment-v1.png",
    imageAlt: "Production colleagues checking a finished order in a print and packaging workshop",
    examples: [
      { name: "Print services", pack: "Artwork intake, production specifications, proof approvals, and quality checks.", configuration: "Your print options, turnaround times, production owners, and delivery methods." },
      { name: "Photo editing", pack: "File intake, editing queues, revision requests, and delivery checks.", configuration: "Your editing packages, turnaround targets, reviewers, and file standards." },
      { name: "Laundry services", pack: "Collection intake, processing steps, quality checks, and return delivery.", configuration: "Your service options, collection windows, pricing, and handoff rules." },
    ],
  },
  {
    id: "cases", name: "Cases OS", label: "Case-by-case work",
    title: "Keep the whole story together.",
    description: "One place for the people, documents, decisions, and next steps in each case.",
    unit: "Case or matter",
    flow: ["Intake", "Assess", "Gather", "Resolve", "Close"],
    image: "/home/archetype-cases-v1.png",
    imageAlt: "A professional advisor and client reviewing case documents together",
    examples: [
      { name: "Legal services", pack: "Matter intake, document requirements, deadlines, and review steps.", configuration: "Your matter types, access rules, responsible reviewers, and approval requirements." },
      { name: "Recruiting", pack: "Search briefs, candidate stages, interview feedback, and placement records.", configuration: "Your hiring stages, client contacts, team assignments, and approval rules." },
      { name: "Claims support", pack: "Case intake, evidence collection, decision tracking, and closure records.", configuration: "Your case categories, reviewer assignments, response targets, and access rules." },
    ],
  },
  {
    id: "booking", name: "Booking OS", label: "Time-based services",
    title: "Make every appointment flow.",
    description: "Keep availability, preparation, the session, and follow-up connected.",
    unit: "Appointment or session",
    flow: ["Book", "Confirm", "Prepare", "Meet", "Follow up"],
    image: "/home/archetype-booking-v1.png",
    imageAlt: "A fitness studio owner and trainer reviewing appointments on a tablet",
    examples: [
      { name: "Fitness studios", pack: "Session types, instructor availability, and attendance records.", configuration: "Your class capacity, opening hours, packages, and cancellation rules." },
      { name: "Salons", pack: "Service durations, staff availability, and appointment preparation.", configuration: "Your service menu, staff schedules, prices, and booking policies." },
      { name: "Coaching", pack: "Session preparation, client notes, and follow-up actions.", configuration: "Your session lengths, availability, packages, and reminder preferences." },
    ],
  },
  {
    id: "projects", name: "Projects OS", label: "Multi-step projects",
    title: "Keep the finish line in sight.",
    description: "Bring scope, milestones, changes, and client approvals into the same plan.",
    unit: "Project",
    flow: ["Scope", "Plan", "Build", "Review", "Handover"],
    image: "/home/archetype-projects-v1.png",
    imageAlt: "Design-build colleagues reviewing project plans in an industrial loft studio",
    examples: [
      { name: "Design-build", pack: "Site briefs, project phases, change requests, and milestone approvals.", configuration: "Your project templates, team roles, budgets, and client sign-off rules." },
      { name: "Creative agencies", pack: "Creative briefs, deliverable milestones, revisions, and client reviews.", configuration: "Your service packages, project teams, revision limits, and approval sequence." },
      { name: "Consulting", pack: "Engagement scope, workstreams, deliverables, and stakeholder reviews.", configuration: "Your engagement templates, owners, rates, and review cadence." },
    ],
  },
];
