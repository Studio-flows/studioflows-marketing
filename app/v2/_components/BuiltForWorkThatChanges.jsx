"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { CalendarClock, Check, CheckCircle2, MessageSquareText, ShieldCheck, Users2 } from "lucide-react";

const STEPS=[
  {label:"Change received",title:"Customer requested a new date",actor:"Customer",icon:CalendarClock,tone:"amber"},
  {label:"Checking",title:"Team availability checked",actor:"Vessa",icon:Users2,tone:"blue"},
  {label:"Prepared",title:"Customer update prepared",actor:"Eva",icon:MessageSquareText,tone:"violet"},
  {label:"Needs you",title:"Approve Thursday · 2:00 PM",actor:"You",icon:ShieldCheck,tone:"amber"},
  {label:"Reconnected",title:"Calendar updated. Work continues.",actor:"StudioFlows",icon:CheckCircle2,tone:"green"}
];

const tone={
  amber:"border-[#5B4824] bg-[#241C10] text-[#D8B866]",
  blue:"border-[#35516A] bg-[#101D29] text-[#9FC7E8]",
  violet:"border-[#57426C] bg-[#20152A] text-[#C9A6E8]",
  green:"border-[#315842] bg-[#102319] text-[#91CBA8]"
};

function WorkObject({active}){
  return <div className="rounded-[22px] border border-white/[0.09] bg-[#090D12] p-4 shadow-[0_28px_90px_rgba(0,0,0,.42)] sm:p-5">
    <div className="flex items-center justify-between">
      <div><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#65717D]">Customer work #2048</p><p className="mt-1 text-[12px] font-medium text-[#E2E8EE]">{active>=4?"In motion":"Schedule change"}</p></div>
      <span className={["rounded-full border px-2.5 py-1 text-[8px]",active>=4?tone.green:tone.amber].join(" ")}>{active>=4?"Reconnected":"Exception"}</span>
    </div>
    <div className="mt-4 flex flex-wrap gap-1.5">{["Customer","Scope","Schedule","Owner","Evidence"].map(x=><span key={x} className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[8px] text-[#75818D]">{x}</span>)}</div>
  </div>
}

function Action({step,index,active}){
  const Icon=step.icon,visible=index<=active,current=index===active;
  return <motion.div animate={{opacity:visible?1:.22,y:visible?0:8,scale:current?1.015:1}} transition={{duration:.28}} className={["flex items-center gap-3 rounded-[14px] border p-3.5",visible?"border-white/[0.07] bg-[#0B1016]":"border-white/[0.035] bg-white/[0.01]"].join(" ")}>
    <div className={["grid h-8 w-8 shrink-0 place-items-center rounded-full border",tone[step.tone]].join(" ")}><Icon className="h-3.5 w-3.5"/></div>
    <div className="min-w-0 flex-1"><p className="text-[8px] uppercase tracking-[0.14em] text-[#5E6974]">{step.actor} · {step.label}</p><p className="mt-1 truncate text-[10px] font-medium text-[#CFD6DE]">{step.title}</p></div>
    {index<active&&<Check className="h-3.5 w-3.5 text-[#75AE8D]"/>}
  </motion.div>
}

function DesktopStory(){
  const ref=useRef(null),reduced=useReducedMotion();const [active,setActive]=useState(0);
  const {scrollYProgress}=useScroll({target:ref,offset:["start 72%","end 38%"]});
  useMotionValueEvent(scrollYProgress,"change",v=>{if(reduced)return;let n=0;if(v>.24)n=1;if(v>.43)n=2;if(v>.62)n=3;if(v>.81)n=4;setActive(a=>a===n?a:n)});
  return <div ref={ref} className="mx-auto mt-12 hidden max-w-[1180px] lg:grid lg:grid-cols-[.9fr_1.1fr] lg:gap-12">
    <div className="relative flex min-h-[470px] items-center">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 470" fill="none" aria-hidden="true">
        <path d="M42 235 H190 C230 235 220 310 280 310 C340 310 330 235 378 235 H480" stroke="rgba(255,255,255,.08)" strokeWidth="2" strokeDasharray="5 8"/>
        <motion.path d="M42 235 H190 C230 235 220 310 280 310 C340 310 330 235 378 235 H480" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" initial={false} animate={{pathLength:active>=4?1:.38+active*.12}} transition={{duration:reduced?0:.55}}/>
        <defs><linearGradient id="g"><stop stopColor="#67E8F9"/><stop offset=".55" stopColor="#A855F7"/><stop offset="1" stopColor="#76C99A"/></linearGradient></defs>
      </svg>
      <motion.div animate={{x:active>=4?250:active>=1?95:0,y:active>=1&&active<4?75:0}} transition={reduced?{duration:0}:{type:"spring",stiffness:120,damping:24}} className="relative z-10 w-[300px]"><WorkObject active={active}/></motion.div>
    </div>
    <div className="flex flex-col justify-center">
      <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#6C6250]">The path changed. The work didn't disappear.</p>
      <div className="space-y-2.5">{STEPS.map((s,i)=><Action key={s.label} step={s} index={i} active={active}/>)}</div>
      <AnimatePresence>{active===3&&<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-4 flex items-center justify-between rounded-[16px] border border-[#5B4824] bg-[#18140C] p-4"><div><p className="text-[9px] uppercase tracking-[0.14em] text-[#8F7845]">Human authority</p><p className="mt-1 text-[12px] font-medium text-[#E5E9ED]">Approve schedule change</p></div><button className="rounded-full bg-[#E7EDF3] px-4 py-2 text-[9px] font-semibold text-[#101820]">Approve</button></motion.div>}</AnimatePresence>
    </div>
  </div>
}

function MobileStory(){
  return <div className="mt-9 space-y-3 lg:hidden"><WorkObject active={4}/>{STEPS.map((s,i)=><Action key={s.label} step={s} index={i} active={4}/>)}</div>
}

export default function BuiltForWorkThatChanges(){
  return <section id="work-that-changes" className="relative overflow-hidden border-t border-white/[0.045] bg-[#07090D] py-20 sm:py-24 lg:py-24">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_35%,rgba(217,185,103,.05),transparent_28%),radial-gradient(circle_at_78%_28%,rgba(168,85,247,.065),transparent_30%)]"/>
    <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10 xl:px-14">
      <div className="max-w-[760px]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#746A54]">Reality changes the plan</p>
        <h2 className="mt-4 text-[40px] font-medium leading-[1] tracking-[-0.05em] text-[#F0F3F6] sm:text-[52px] lg:text-[62px]">Work changes.<span className="block bg-[linear-gradient(100deg,#E7D49B,#9FBCE8_52%,#A855F7)] bg-clip-text text-transparent">StudioFlows stays with it.</span></h2>
        <p className="mt-5 max-w-[680px] text-[14px] leading-7 text-[#7F8994] sm:text-[15px]">A schedule moves. The same work stays intact while Vessa coordinates the impact, Eva prepares the customer update, and you appear only when authority is actually required.</p>
      </div>
      <DesktopStory/><MobileStory/>
    </div>
  </section>
}
