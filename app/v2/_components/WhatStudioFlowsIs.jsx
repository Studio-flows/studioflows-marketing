"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { CalendarDays, Check, CheckCircle2, FileText, MessageSquareText, Paperclip, UserRoundCheck, Users2 } from "lucide-react";

const STAGES=[
  {number:"01",label:"Intake",title:"Someone needs something.",copy:"A quote, booking, intake form, or request becomes real customer work.",status:"New request",icon:MessageSquareText,chips:["Customer","Request","Preferred date"],receipt:"Customer + request captured"},
  {number:"02",label:"Coordinate",title:"The details come together.",copy:"Schedule, ownership, requirements, and the people responsible attach to the same work.",status:"Ready",icon:CalendarDays,chips:["Customer","Scope","Schedule","Owner"],receipt:"Owner + timing confirmed"},
  {number:"03",label:"Deliver",title:"The work moves into the real world.",copy:"People do the work while updates, files, evidence, and deliverables stay connected.",status:"In motion",icon:Users2,chips:["Owner","Activity","Files +3","Evidence +2"],receipt:"Activity + evidence attached"},
  {number:"04",label:"Complete",title:"Finished means verified.",copy:"The outcome is checked and the history stays attached before the work settles as complete.",status:"Verified",icon:CheckCircle2,chips:["Outcome","Evidence","History"],receipt:"Outcome verified"}
];

function Chip({children,done=false}){
  return <span className={["rounded-full border px-2.5 py-1 text-[9px]",done?"border-[#315842] bg-[#102319] text-[#91CBA8]":"border-white/[0.07] bg-white/[0.025] text-[#84909C]"].join(" ")}>{children}</span>
}

function Person({initial,label,tone}){
  return <div className="flex items-center gap-2 rounded-full border border-white/[0.065] bg-[#0C1117] py-1.5 pl-1.5 pr-3">
    <span className={["grid h-7 w-7 place-items-center rounded-full border text-[9px] font-semibold",tone].join(" ")}>{initial}</span>
    <span className="text-[9px] text-[#8A96A2]">{label}</span>
  </div>
}

function LivingWork({stage,active}){
  const Icon=stage.icon;
  return <motion.div layout className="relative mx-auto w-full max-w-[640px]">
    <div className="absolute -inset-10 -z-10 bg-[radial-gradient(circle,rgba(99,102,241,.10),transparent_64%)] blur-2xl"/>
    <motion.div layout className="overflow-hidden rounded-[26px] border border-white/[0.10] bg-[#090D12] shadow-[0_30px_100px_rgba(0,0,0,.45)]">
      <div className="flex items-center justify-between border-b border-white/[0.055] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-[11px] border border-[#35516A] bg-[#101D29] text-[#9FC7E8]"><Icon className="h-4 w-4"/></div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#65717D]">Customer work #2048</p>
            <AnimatePresence mode="wait"><motion.p key={stage.status} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} className="mt-0.5 text-[12px] font-medium text-[#E2E8EE]">{stage.status}</motion.p></AnimatePresence>
          </div>
        </div>
        <span className="h-2 w-2 rounded-full bg-[#75B9E8] shadow-[0_0_16px_rgba(117,185,232,.55)]"/>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {stage.chips.map((chip,i)=><motion.div key={chip} initial={{opacity:0,scale:.9,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.92}} transition={{delay:i*.045}}><Chip done={stage.number==="04"}>{chip}</Chip></motion.div>)}
          </AnimatePresence>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[16px] border border-white/[0.055] bg-white/[0.018] p-4">
            <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#56616D]">People around the work</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Person initial="C" label="Customer" tone="border-[#5B4B35] bg-[#241D14] text-[#D4B681]"/>
              {active>=1&&<Person initial="T" label="Team" tone="border-[#36536A] bg-[#101E2A] text-[#9CC6E7]"/>}
              {active>=2&&<Person initial="V" label="Vessa" tone="border-[#57426C] bg-[#20152A] text-[#C9A6E8]"/>}
            </div>
          </div>
          <div className="rounded-[16px] border border-white/[0.055] bg-white/[0.018] p-4">
            <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#56616D]">Operational receipt</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-[#9BA6B1]"><Check className="h-3.5 w-3.5 text-[#73AA8B]"/>{stage.receipt}</div>
            {active>=2&&<div className="mt-2 flex items-center gap-2 text-[9px] text-[#68747F]"><Paperclip className="h-3 w-3"/>Context stays attached</div>}
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
}

function DesktopJourney(){
  const ref=useRef(null),reduced=useReducedMotion(); const [active,setActive]=useState(0);
  const {scrollYProgress}=useScroll({target:ref,offset:["start start","end end"]});
  useMotionValueEvent(scrollYProgress,"change",v=>{
    if(reduced)return;
    let next=0;if(v>=.30)next=1;if(v>=.52)next=2;if(v>=.74)next=3;
    setActive(a=>a===next?a:next);
  });
  const stage=STAGES[active];
  return <div ref={ref} className="relative hidden min-h-[118vh] lg:block">
    <div className="sticky top-0 flex h-screen items-center">
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-[.72fr_1.28fr] items-center gap-14 px-10 xl:px-14">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#66727E]">{stage.number} · {stage.label}</p>
          <AnimatePresence mode="wait">
            <motion.div key={stage.number} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.32}}>
              <h3 className="mt-4 max-w-[430px] text-[48px] font-medium leading-[.98] tracking-[-0.05em] text-[#F0F3F6]">{stage.title}</h3>
              <p className="mt-5 max-w-[420px] text-[15px] leading-7 text-[#7D8995]">{stage.copy}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-9 flex gap-2">{STAGES.map((s,i)=><span key={s.number} className={["h-[2px] w-14 rounded-full",i<=active?"bg-[#A9BAC9]":"bg-white/[0.08]"].join(" ")}/>)}</div>
        </div>
        <LivingWork stage={stage} active={active}/>
      </div>
    </div>
  </div>
}

function MobileJourney(){
  return <div className="mt-9 lg:hidden">
    <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STAGES.map((stage,index)=><article key={stage.number} className="w-[86vw] max-w-[390px] shrink-0 snap-center rounded-[24px] border border-white/[0.075] bg-[#0A0E13] p-5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#64717E]">{stage.number} · {stage.label}</p>
        <h3 className="mt-3 text-[28px] font-medium leading-[1.02] tracking-[-0.045em] text-[#F0F3F6]">{stage.title}</h3>
        <p className="mt-3 text-[13px] leading-6 text-[#7D8995]">{stage.copy}</p>
        <div className="mt-6"><LivingWork stage={stage} active={index}/></div>
      </article>)}
      <div className="w-2 shrink-0"/>
    </div>
    <p className="mt-2 text-right text-[10px] text-[#59646F]">Swipe to follow the same work →</p>
  </div>
}

export default function WhatStudioFlowsIs(){
  return <section id="what-it-is" className="relative overflow-hidden border-t border-white/[0.045] bg-[#080A0E] pt-20 sm:pt-24 lg:pt-20">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(99,102,241,.07),transparent_27%),radial-gradient(circle_at_86%_65%,rgba(34,211,238,.05),transparent_28%)]"/>
    <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10 xl:px-14">
      <div className="max-w-[760px]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#64717E]">Follow one piece of work</p>
        <h2 className="mt-4 text-[38px] font-medium leading-[1.02] tracking-[-0.045em] text-[#F0F3F6] sm:text-[48px] lg:text-[56px]">From intake to completion,<span className="block text-[#AAB5C0]">the work keeps its context.</span></h2>
        <p className="mt-4 max-w-[620px] text-[14px] leading-6 text-[#7E8994] sm:text-[15px]">Watch customer work gain the people, timing, files, evidence, and outcomes it needs without becoming a new record at every handoff.</p>
      </div>
      <MobileJourney/>
    </div>
    <DesktopJourney/>
  </section>
}
