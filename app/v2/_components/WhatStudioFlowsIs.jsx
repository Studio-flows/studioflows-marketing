"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { CalendarDays, Check, CheckCircle2, MessageSquareText, Paperclip, UserRoundCheck } from "lucide-react";
import { CLIENT_ONSITE } from "@/lib/real-estate-media/media-assets/client-onsite";
import { TEAM_JOB_HANDOFF } from "@/lib/real-estate-media/media-assets/team-job-handoff";
import { FIELD_DRONE } from "@/lib/real-estate-media/media-assets/field-drone";
import { EDITING_BAY } from "@/lib/real-estate-media/media-assets/editing-bay";

const STAGES = [
  {
    number:"01", label:"Intake", title:"Someone needs something.",
    copy:"A quote, booking, intake form, or request becomes real customer work.",
    status:"New request", detail:"Customer + request captured", icon:MessageSquareText,
    image:CLIENT_ONSITE, align:"right"
  },
  {
    number:"02", label:"Coordinate", title:"The details come together.",
    copy:"Schedule, ownership, requirements, and the people responsible attach to the same work.",
    status:"Ready", detail:"Owner + timing confirmed", icon:CalendarDays,
    image:TEAM_JOB_HANDOFF, align:"left"
  },
  {
    number:"03", label:"Deliver", title:"The work moves into the real world.",
    copy:"People do the work while updates, files, evidence, and deliverables stay connected.",
    status:"In motion", detail:"Activity + evidence attached", icon:UserRoundCheck,
    image:FIELD_DRONE, align:"right"
  },
  {
    number:"04", label:"Complete", title:"Finished means finished.",
    copy:"The outcome is confirmed and the history stays attached before the work settles as complete.",
    status:"Verified", detail:"Outcome + history preserved", icon:CheckCircle2,
    image:EDITING_BAY, align:"left"
  }
];

function WorkObject({stage, compact=false}) {
  const Icon=stage.icon;
  return (
    <motion.div layout className={["rounded-[18px] border border-white/[0.10] bg-[#090D12]/92 shadow-[0_22px_70px_rgba(0,0,0,.45)] backdrop-blur-md",compact?"p-3":"p-4"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-[#9EC4E5]"><Icon className="h-3.5 w-3.5"/></div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#687583]">Customer work #2048</p>
            <p className="mt-0.5 text-[10px] font-medium text-[#E2E8EE]">{stage.status}</p>
          </div>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-[#75B9E8] shadow-[0_0_12px_rgba(117,185,232,.5)]"/>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {stage.number==="01" && ["Customer","Request","Preferred date"].map(x=><Chip key={x}>{x}</Chip>)}
        {stage.number==="02" && ["Customer","Scope","Schedule","Owner"].map(x=><Chip key={x}>{x}</Chip>)}
        {stage.number==="03" && ["Owner","Activity","Files","Evidence"].map(x=><Chip key={x}>{x}</Chip>)}
        {stage.number==="04" && ["Outcome","Evidence","History"].map(x=><Chip key={x} done>{x}</Chip>)}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[9px] text-[#75818D]"><Check className="h-3 w-3 text-[#6EA887]"/>{stage.detail}</div>
    </motion.div>
  );
}

function Chip({children,done=false}) {
  return <span className={["rounded-full border px-2 py-1 text-[8px]",done?"border-[#315842] bg-[#102319] text-[#8EC8A6]":"border-white/[0.06] bg-white/[0.025] text-[#77838F]"].join(" ")}>{children}</span>
}

function Scene({stage,active=false,desktop=false}) {
  const reverse=stage.align==="left";
  return (
    <motion.article
      animate={desktop?{opacity:active?1:.28,scale:active?1:.965}:undefined}
      transition={{duration:.35,ease:[.22,1,.36,1]}}
      className={["relative shrink-0 snap-center overflow-hidden border border-white/[0.075] bg-[#0A0D12]",desktop?"h-[510px] w-[760px] rounded-[30px]":"w-[86vw] max-w-[390px] rounded-[24px]"].join(" ")}
    >
      <div className={["grid h-full",desktop?"grid-cols-[.88fr_1.12fr]":"grid-rows-[250px_auto]"].join(" ")}>
        <div className={["relative overflow-hidden",desktop&&reverse?"order-2":""].join(" ")}>
          <img src={stage.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,10,.02),rgba(5,7,10,.14)_52%,rgba(6,8,11,.78))]"/>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(103,232,249,.09),transparent_38%)]"/>
          <div className="absolute left-4 top-4 rounded-full border border-white/[0.14] bg-black/45 px-3 py-1.5 text-[9px] font-semibold tracking-[0.13em] text-white/80 backdrop-blur-md">{stage.number} · {stage.label}</div>
          <div className="absolute bottom-4 left-4 right-4"><WorkObject stage={stage} compact/></div>
        </div>
        <div className={["flex flex-col justify-center p-6 sm:p-8",desktop&&reverse?"order-1":""].join(" ")}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#596673]">{stage.label}</p>
          <h3 className={["mt-3 font-medium leading-[1.02] tracking-[-0.045em] text-[#F0F3F6]",desktop?"text-[38px]":"text-[26px]"].join(" ")}>{stage.title}</h3>
          <p className={["mt-4 max-w-[420px] leading-6 text-[#7D8995]",desktop?"text-[14px]":"text-[13px]"].join(" ")}>{stage.copy}</p>
          {desktop&&<div className="mt-7 h-px w-16 bg-[linear-gradient(90deg,#67E8F9,#A855F7,transparent)]"/>}
        </div>
      </div>
    </motion.article>
  );
}

function Progress({active}) {
  return <div className="flex gap-2">{STAGES.map((s,i)=><span key={s.number} className={["h-[2px] flex-1 rounded-full transition-colors",i<=active?"bg-[#AAB9C7]":"bg-white/[0.08]"].join(" ")}/>)}</div>
}

function MobileJourney() {
  const ref=useRef(null); const [active,setActive]=useState(0);
  const onScroll=()=>{
    const n=ref.current;if(!n)return;
    const cards=[...n.querySelectorAll("[data-scene]")],center=n.scrollLeft+n.clientWidth/2;
    let best=0,dist=Infinity;
    cards.forEach((c,i)=>{const d=Math.abs(c.offsetLeft+c.clientWidth/2-center);if(d<dist){best=i;dist=d}});
    setActive(best);
  };
  return (
    <div className="mt-8 lg:hidden">
      <div ref={ref} onScroll={onScroll} className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STAGES.map((s,i)=><div data-scene key={s.number} className="shrink-0"><Scene stage={s} active={i===active}/></div>)}
        <div className="w-3 shrink-0"/>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-[#66717C]"><span>{String(active+1).padStart(2,"0")} / 04</span><span>Swipe to follow the work</span></div>
      <div className="mt-3"><Progress active={active}/></div>
    </div>
  );
}

function DesktopJourney() {
  const ref=useRef(null); const reduced=useReducedMotion(); const [active,setActive]=useState(0);
  const {scrollYProgress}=useScroll({target:ref,offset:["start start","end end"]});
  useMotionValueEvent(scrollYProgress,"change",v=>{
    if(reduced)return;
    let next=0;
    if(v>=.28)next=1;if(v>=.50)next=2;if(v>=.72)next=3;
    setActive(a=>a===next?a:next);
  });
  return (
    <div ref={ref} className="relative hidden min-h-[132vh] lg:block">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="w-full">
          <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
            <motion.div className="flex gap-7" style={{paddingLeft:"calc(50vw - 380px)",paddingRight:"calc(50vw - 380px)"}} animate={{x:-(active*788)}} transition={reduced?{duration:0}:{type:"spring",stiffness:120,damping:26,mass:.9}}>
              {STAGES.map((s,i)=><Scene key={s.number} stage={s} active={i===active} desktop/>)}
            </motion.div>
          </div>
          <div className="mx-auto mt-6 max-w-[760px]">
            <div className="mb-3 flex items-center justify-between text-[10px] text-[#626D78]"><span>{String(active+1).padStart(2,"0")} / 04</span><span>One piece of work · context stays attached</span></div>
            <Progress active={active}/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatStudioFlowsIs(){
  return (
    <section id="what-it-is" className="relative overflow-hidden border-t border-white/[0.045] bg-[#080A0E] py-20 sm:py-24 lg:pb-0 lg:pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(99,102,241,.07),transparent_27%),radial-gradient(circle_at_86%_65%,rgba(34,211,238,.05),transparent_28%)]"/>
      <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-10 xl:px-14">
        <div className="max-w-[760px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#64717E]">Follow the work</p>
          <h2 className="mt-4 max-w-[720px] text-[38px] font-medium leading-[1.02] tracking-[-0.045em] text-[#F0F3F6] sm:text-[48px] lg:text-[56px]">From intake to completion,<span className="block text-[#AAB5C0]">the work keeps its context.</span></h2>
          <p className="mt-4 max-w-[620px] text-[14px] leading-6 text-[#7E8994] sm:text-[15px]">Follow one piece of customer work as people, timing, files, evidence, and outcomes stay connected around it.</p>
        </div>
        <MobileJourney/>
      </div>
      <DesktopJourney/>
    </section>
  );
}
