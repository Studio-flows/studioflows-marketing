"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowUpRight, BrainCircuit, CalendarDays, ChevronLeft, ChevronRight,
  FolderOpen, Layers3, Menu, Network, Package, Plus, RefreshCw,
  Route, ShieldCheck, SlidersHorizontal, Sparkles, UsersRound, X,
  type LucideIcon,
} from "lucide-react";
import { ARCHETYPES, type ArchetypeId } from "./archetype-content";
import styles from "./AppleHomepage.module.css";

const DEMO_URL = "https://os.studioflows.co/demo/access";
const LOGIN_URL = "https://os.studioflows.co/login";
const CONTACT_URL = "mailto:support@studioflows.co?subject=Let%27s%20talk%20about%20StudioFlows";
const LOGO = "/StudioFlows logo (1200 x 675 px) (1).png";
const ICONS: Record<ArchetypeId, LucideIcon> = {
  service: RefreshCw, field: Route, fulfillment: Package,
  cases: FolderOpen, booking: CalendarDays, projects: Layers3,
};
type QuestionId = "fit" | "ai" | "control" | "start";
type Detail = "flow" | QuestionId | "draft" | null;
const QUESTIONS: readonly { id: QuestionId; first: string; accent: string; icon: LucideIcon }[] = [
  { id: "fit", first: "Does it fit", accent: "the way we work?", icon: SlidersHorizontal },
  { id: "ai", first: "What does", accent: "AI actually do?", icon: BrainCircuit },
  { id: "control", first: "Where do I", accent: "stay in control?", icon: ShieldCheck },
  { id: "start", first: "How do we", accent: "get started?", icon: ArrowUpRight },
];
const EXAMPLE_STEPS = [
  { label: "A request comes in", heading: "The customer needs an update.", body: "“Can you let me know what happens next?”", status: "Customer request", icon: UsersRound },
  { label: "AI prepares a draft", heading: "A follow-up, ready to review.", body: "“Hi Alex — we’re reviewing the next steps for your project. I’ll confirm the timing with you shortly.”", status: "Draft · not sent", icon: Sparkles },
  { label: "You review", heading: "The final word is yours.", body: "Check the details. Make a change. Decide whether the draft is ready.", status: "Waiting for your decision", icon: ShieldCheck },
] as const;

export default function AppleHomepage() {
  const [activeId, setActiveId] = useState<string>("field");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [detail, setDetail] = useState<Detail>(null);
  const [exampleStep, setExampleStep] = useState<string>("1");
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const activeIndex = ARCHETYPES.findIndex((item) => item.id === activeId);
  const active = ARCHETYPES[activeIndex];
  const example = active.examples[exampleIndex];
  const scenario = EXAMPLE_STEPS[Number(exampleStep)];
  const ScenarioIcon = scenario.icon;

  useEffect(() => {
    if (!detail) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.documentElement.style.overflow;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.documentElement.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [detail]);

  function selectFlow(value: string) {
    setActiveId(value);
    setExampleIndex(0);
  }
  function nextFlow(direction: number) {
    selectFlow(ARCHETYPES[(activeIndex + direction + ARCHETYPES.length) % ARCHETYPES.length].id);
  }
  function finishSwipe(event: TouchEvent<HTMLDivElement>) {
    if (!touchRef.current) return;
    const changeX = event.changedTouches[0].clientX - touchRef.current.x;
    const changeY = event.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(changeX) > 70 && Math.abs(changeX) > Math.abs(changeY) * 1.5) nextFlow(changeX < 0 ? 1 : -1);
    touchRef.current = null;
  }
  function closeDetail() { setDetail(null); }

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#flows">Skip to the six flows</a>
      <section className={styles.hero} aria-labelledby="apple-hero-heading">
        <header className={styles.header}>
          <Link href="/" aria-label="StudioFlows home" className={styles.brand}>
            <Image src={LOGO} alt="StudioFlows" width={1120} height={459} sizes="(max-width: 600px) 150px, 190px" priority />
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            <a href="#flows">Find your flow</a><a href="#how-it-works">How it works</a><a href="#questions">Your questions</a>
          </nav>
          <div className={styles.headerActions}>
            <a className={styles.login} href={LOGIN_URL}>Log in</a>
            <a className={`${styles.primary} ${styles.headerCta}`} href={DEMO_URL}>See it in action</a>
            <button className={styles.menuButton} type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="apple-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
          {menuOpen ? <nav id="apple-mobile-nav" className={styles.mobileNav} aria-label="Mobile">
            <a href="#flows" onClick={() => setMenuOpen(false)}>Find your flow</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#questions" onClick={() => setMenuOpen(false)}>Your questions</a>
            <a href={DEMO_URL}>See it in action</a>
          </nav> : null}
        </header>

        <div className={styles.heroScene}>
          <Image src="/home/service-business-loft-v5.png" alt="A business owner smiling at his phone with two colleagues in a bright industrial loft" fill priority quality={85} sizes="(min-width: 1800px) 1800px, 100vw" className={styles.heroPhoto} />
          <div className={styles.heroFade} aria-hidden="true" />
          <svg className={styles.wire} viewBox="0 0 1672 940" fill="none" aria-hidden="true">
            <path d="M 1215 507 C 1110 471, 1006 492, 1085 577" stroke="#c0a9fc" strokeWidth="3" />
            <circle cx="1085" cy="577" r="7" fill="#8962ec" stroke="#e8dcff" strokeWidth="3" />
          </svg>
          <button type="button" className={styles.draftCard} onClick={() => setDetail("draft")} aria-label="Open an illustrative draft review">
            <span className={styles.draftKicker}><Sparkles size={14} /> Ready when you are</span>
            <strong>Draft is ready for your review.</strong>
            <span className={styles.draftAction}>Take a look <ChevronRight size={15} /></span>
          </button>
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Built around your business</p>
          <h1 id="apple-hero-heading">Your business.<br /><span>In a better flow.</span></h1>
          <p className={styles.heroDescription}>The AI-native operating system<br className={styles.desktopBreak} /> for service businesses.</p>
          <a className={styles.primary} href={DEMO_URL}>See it in action</a>
          <ul className={styles.benefits} aria-label="Our approach">
            <li><Network /><span>Tailored<br />workflows</span></li>
            <li><UsersRound /><span>Teams<br />and AI</span></li>
            <li><ShieldCheck /><span>You’re<br />in control</span></li>
          </ul>
        </div>
      </section>

      <section id="flows" className={styles.flows} aria-labelledby="flow-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Find your flow</p>
          <h2 id="flow-heading">Different businesses.<br /><span>One StudioFlows.</span></h2>
          <p>Six ways work moves. Find the one that feels like yours.</p>
        </div>
        <Tabs.Root value={activeId} onValueChange={selectFlow} className={styles.gallery}>
          <div className={styles.galleryStage} onTouchStart={(event) => { touchRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={finishSwipe} onTouchCancel={() => { touchRef.current = null; }}>
            {ARCHETYPES.map((item) => (
              <Tabs.Content key={item.id} value={item.id} className={styles.flowPanel}>
                <Image src={item.image} alt={item.imageAlt} fill sizes="(min-width: 1400px) 1280px, 94vw" quality={85} className={styles.flowPhoto} />
                <div className={styles.flowShade} aria-hidden="true" />
                <div className={styles.flowStory}>
                  <p>{item.name} <span> / {item.label}</span></p>
                  <h3>{item.title}</h3>
                </div>
                <div className={styles.flowBottom}>
                  <div><span className={styles.flowCaption}>A typical flow</span>
                    <ol aria-label={`${item.name} illustrative workflow`} className={styles.flowSteps}>{item.flow.map((step, index) => <li key={step}>{index > 0 ? <ChevronRight size={13} aria-hidden="true" /> : null}<span>{step}</span></li>)}</ol>
                  </div>
                  <button type="button" className={styles.exploreButton} aria-label="Explore this flow" onClick={() => setDetail("flow")}><span>Explore this flow</span><Plus size={24} aria-hidden="true" /></button>
                </div>
              </Tabs.Content>
            ))}
          </div>
          <div className={styles.galleryControls}>
            <Tabs.List className={styles.flowTabs} aria-label="Choose your business flow">
              {ARCHETYPES.map((item) => {
                const Icon = ICONS[item.id];
                return <Tabs.Trigger key={item.id} value={item.id} className={styles.flowTab}><Icon size={17} aria-hidden="true" />{item.name.replace(" OS", "")}</Tabs.Trigger>;
              })}
            </Tabs.List>
            <div className={styles.galleryArrows}>
              <button type="button" aria-label="Previous flow" onClick={() => nextFlow(-1)}><ChevronLeft /></button>
              <button type="button" aria-label="Next flow" onClick={() => nextFlow(1)}><ChevronRight /></button>
            </div>
          </div>
        </Tabs.Root>
      </section>

      <section id="how-it-works" className={styles.scenarioSection} aria-labelledby="scenario-heading">
        <div className={styles.scenarioCopy}>
          <p className={styles.eyebrow}>People and AI. Working together.</p>
          <h2 id="scenario-heading">AI helps.<br /><span>You decide.</span></h2>
          <p>Start with something familiar.<br />A customer needs a follow-up.</p>
          <Tabs.Root value={exampleStep} onValueChange={setExampleStep}>
            <Tabs.List className={styles.scenarioTabs} aria-label="Follow an example request">
              {EXAMPLE_STEPS.map((step, index) => <Tabs.Trigger key={step.label} value={String(index)} aria-controls={`scenario-panel-${index}`} className={styles.scenarioTab}><span>0{index + 1}</span>{step.label}<ChevronRight size={16} aria-hidden="true" /></Tabs.Trigger>)}
            </Tabs.List>
            {EXAMPLE_STEPS.map((step, index) => <Tabs.Content key={step.label} value={String(index)} id={`scenario-panel-${index}`} className={styles.srOnly}>{step.heading} {step.body}</Tabs.Content>)}
          </Tabs.Root>
        </div>
        <div className={styles.scenarioVisual}>
          <p className={styles.conceptLabel}>Illustrative experience · not a live action</p>
          <div className={styles.messageCard}>
            <div className={styles.messageTop}><span className={styles.messageIcon}><ScenarioIcon size={25} /></span><span>Customer follow-up<small>{scenario.status}</small></span><Network className={styles.messageMark} size={22} aria-hidden="true" /></div>
            <div className={styles.messageBody} aria-live="polite" aria-atomic="true"><h3>{scenario.heading}</h3><p>{scenario.body}</p></div>
            <div className={styles.messageFooter}><span><ShieldCheck size={16} /> Nothing sent automatically.</span><button type="button" onClick={() => setDetail("draft")}>Review example <ArrowUpRight size={16} /></button></div>
          </div>
          <p className={styles.scenarioNote}>A little less chasing. A clearer next step.</p>
        </div>
      </section>

      <section id="questions" className={styles.questionsSection} aria-labelledby="questions-heading">
        <div className={styles.questionsHeading}><p className={styles.eyebrow}>Good questions. Clear answers.</p><h2 id="questions-heading">Let’s make it simple.</h2></div>
        <div className={styles.questionGrid}>
          {QUESTIONS.map((question) => {
            const Icon = question.icon;
            return <button key={question.id} type="button" className={styles.questionCard} onClick={() => setDetail(question.id)}><Icon size={29} strokeWidth={1.6} aria-hidden="true" /><span className={styles.questionTitle}>{question.first}<br /><strong>{question.accent}</strong></span><span className={styles.questionPlus}><Plus size={22} aria-hidden="true" /></span></button>;
          })}
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="start-heading">
        <p className={styles.eyebrow}>Start with your business</p><h2 id="start-heading">See what a better<br />flow looks like.</h2>
        <a className={styles.primary} href={DEMO_URL}>See it in action</a>
        <a className={styles.contactLink} href={CONTACT_URL}>Or talk it through with us <ChevronRight size={16} /></a>
      </section>
      <footer className={styles.footer}>
        <Link href="/" className={styles.footerBrand}><Image src={LOGO} alt="StudioFlows" width={1120} height={459} sizes="150px" /></Link>
        <p>One operating system. Your way of working.</p>
        <nav aria-label="Footer"><Link href="/">Compare current homepage</Link><Link href="/privacy-policy">Privacy</Link><Link href="/terms-of-service">Terms</Link></nav>
        <span>Design preview</span>
      </footer>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="apple-detail-heading" onClose={() => setDetail(null)} onCancel={() => setDetail(null)} onClick={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
        <div className={styles.dialogInner}>
          <button type="button" className={styles.closeButton} aria-label="Close details" onClick={closeDetail} autoFocus><X size={23} /></button>
          {detail === "flow" || detail === "fit" ? <>
            <p className={styles.eyebrow}>{active.name} · A closer look</p>
            <h2 id="apple-detail-heading">A shared foundation.<br /><span>Shaped around you.</span></h2>
            <p className={styles.modalIntro}>Start with your flow. Add your industry’s details. Make it your own.</p>
            <div className={styles.examplePicker} role="group" aria-label="Choose a business example">{active.examples.map((item, index) => <button key={item.name} type="button" aria-pressed={exampleIndex === index} onClick={() => setExampleIndex(index)}>{item.name}</button>)}</div>
            <div aria-live="polite" aria-atomic="true">
              <p className={styles.exampleLabel}>{example.name} · Illustrative configuration</p>
              <ol className={styles.layers}>
                <li><Network /><div><p>01 · Global core OS</p><h3>The shared foundation</h3><span>People, work, files, AI context, and permissions.</span></div></li>
                <li><Route /><div><p>02 · Archetype</p><h3>{active.name}</h3><span>{active.flow.join(" → ")}</span></div></li>
                <li><Layers3 /><div><p>03 · Business-type pack</p><h3>{example.name}</h3><span>{example.pack}</span></div></li>
                <li><SlidersHorizontal /><div><p>04 · Tenant configuration</p><h3>Your business. Your rules.</h3><span>{example.configuration}</span></div></li>
              </ol>
            </div>
            <p className={styles.modalNote}>These examples explain the model, not a catalog of released packs. More than one kind of work? A primary flow can be complemented by supporting capability packs.</p>
          </> : detail === "start" ? <>
            <p className={styles.eyebrow}>Getting started</p><h2 id="apple-detail-heading">Start with the work.<br /><span>Not the software.</span></h2>
            <p className={styles.modalIntro}>Explore the demo, then talk through a real workflow from your business. Confirm the fit and what’s available before choosing your setup.</p>
            <ol className={styles.simpleSteps}><li><span>01</span>Pick the flow that feels familiar.</li><li><span>02</span>Bring one real example of your work.</li><li><span>03</span>Agree on what your business needs.</li></ol>
            <a className={styles.primary} href={DEMO_URL}>Explore the demo</a><a className={styles.modalContact} href={CONTACT_URL}>Talk to us</a>
          </> : detail === "control" ? <>
            <p className={styles.eyebrow}>Human judgment matters</p><h2 id="apple-detail-heading">Your business.<br /><span>Your call.</span></h2>
            <p className={styles.modalIntro}>In this example, AI prepares a follow-up. You check the details and decide what happens next. A draft is not a sent message.</p>
            <div className={styles.controlExample}><ShieldCheck size={36} /><h3>Review before action.</h3><p>Your team’s roles, permissions, and approval rules belong in the setup—not in the fine print.</p><small>Illustrative design principle. Actual controls depend on the configured workflow.</small></div>
          </> : <>
            <p className={styles.eyebrow}>An example of people + AI</p><h2 id="apple-detail-heading">A useful draft.<br /><span>You take it from here.</span></h2>
            <p className={styles.modalIntro}>AI assistance should have a specific job. Here, that job is preparing a customer follow-up for a person to review.</p>
            <div className={styles.draftExample}><span>Illustrative draft · not sent</span><h3>Next steps for your project</h3><p>Hi Alex — we’re reviewing the next steps for your project. I’ll confirm the timing with you shortly.</p><div><ShieldCheck size={18} /> Check the context, timing, and wording before using a draft.</div></div>
            <p className={styles.modalNote}>This is a design example, not a live AI response. No customer data is connected and no message will be sent.</p>
          </>}
        </div>
      </dialog>
    </main>
  );
}
