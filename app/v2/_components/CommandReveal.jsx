"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CircleAlert, Clock3, Eye, UserRoundCheck } from "lucide-react";

const states=[
  {label:"Completed",value:"12",icon:CheckCircle2,copy:"Verified outcomes with history and evidence still attached.",tone:"text-[#8FD0A8]"},
  {label:"Needs you",value:"4",icon:CircleAlert,copy:"Decisions and approvals that genuinely require human authority.",tone:"text-[#D7B96B]"},
  {label:"In motion",value:"18",icon:Clock3,copy:"Work progressing, waiting, or being followed through on.",tone:"text-[#93BCE2]"}
];

export default function CommandReveal(){
  const reduced=useReducedMotion();
  return (
    <section id="command-proof" className="relative overflow-hidden bg-[#090B0F] py-24 sm:py-28 lg:py-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_30%,rgba(99,102,241,.08),transparent_28%),radial-gradient(circle_at_18%_80%,rgba(34,211,238,.05),transparent_28%)]"/>
      <div className="relative mx-auto grid max-w-[1380px] gap-10 px-5 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:px-10 xl:px-14">
        <div className="lg:sticky lg:top-28">
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#64717E]">Pull back</p>
          <h2 className="mt-4 max-w-[470px] text-[40px] font-medium leading-[.98] tracking-[-0.05em] text-[#F1F4F7] sm:text-[52px]">One piece of work becomes the state of the operation.</h2>
          <p className="mt-5 max-w-[430px] text-[14px] leading-6 text-[#7B8792]">Command is the macro view of everything you just watched happen: what finished, what needs your judgment, and what is still moving.</p>
          <div className="mt-8 hidden items-center gap-2 text-[10px] text-[#66727E] lg:flex"><Eye className="h-3.5 w-3.5"/>Less dashboard. More operational state.</div>
        </div>

        <div className="relative">
          <div className="absolute -inset-10 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(129,140,248,.10),transparent_60%)] blur-2xl"/>
          <div className="overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#080C11] shadow-[0_35px_110px_rgba(0,0,0,.42)]">
            <div className="flex items-center justify-between border-b border-white/[0.055] px-5 py-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#5D6975]">Command</p>
                <p className="mt-1 text-[13px] font-medium text-[#E0E6EC]">Operational state</p>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[9px] text-[#73808C]"><span className="h-1.5 w-1.5 rounded-full bg-[#78C99A]"/>live</span>
            </div>

            <div className="grid gap-px bg-white/[0.045] sm:grid-cols-3">
              {states.map((s,i)=>{
                const Icon=s.icon;
                return (
                  <motion.div key={s.label} initial={reduced?false:{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.45}} transition={{duration:reduced?0:.45,delay:i*.1,ease:[.22,1,.36,1]}} className="bg-[#0B0F14] p-5 sm:min-h-[240px] sm:p-6">
                    <div className="flex items-center justify-between">
                      <Icon className={["h-4 w-4",s.tone].join(" ")}/>
                      <span className="text-[9px] text-[#505B66]">0{i+1}</span>
                    </div>
                    <p className="mt-8 text-[46px] font-medium tracking-[-0.055em] text-[#F0F3F6]">{s.value}</p>
                    <p className="mt-1 text-[12px] font-medium text-[#C8D0D8]">{s.label}</p>
                    <p className="mt-3 text-[10px] leading-5 text-[#68747F]">{s.copy}</p>
                  </motion.div>
                )
              })}
            </div>

            <div className="border-t border-white/[0.05] p-5 sm:p-6">
              <div className="flex items-center gap-3 rounded-[16px] border border-white/[0.055] bg-white/[0.018] p-4">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-[#35516A] bg-[#101D29] text-[#9FC7E8]"><UserRoundCheck className="h-4 w-4"/></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-[#D5DCE3]">Customer work #2048</p>
                  <p className="mt-1 text-[9px] text-[#66727E]">Verified complete · outcome and history preserved</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-[#7DB995]"/>
              </div>
            </div>
          </div>
          <p className="mt-4 text-right text-[9px] text-[#4F5964]">Illustrative Command state · replace with approved Portal V2 media before cutover</p>
        </div>
      </div>
    </section>
  );
}
