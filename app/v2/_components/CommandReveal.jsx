"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CircleAlert, Clock3, UserRoundCheck } from "lucide-react";

const WORK=[
  {id:"#2041",state:"Completed",x:"8%",y:"18%",tone:"border-[#315842] text-[#91CBA8]"},
  {id:"#2042",state:"Waiting on customer",x:"36%",y:"9%",tone:"border-[#4B4E55] text-[#87919B]"},
  {id:"#2043",state:"In motion",x:"68%",y:"17%",tone:"border-[#35516A] text-[#9FC7E8]"},
  {id:"#2044",state:"Needs you",x:"17%",y:"58%",tone:"border-[#5B4824] text-[#D8B866]"},
  {id:"#2045",state:"Vessa following up",x:"48%",y:"67%",tone:"border-[#57426C] text-[#C9A6E8]"},
  {id:"#2048",state:"Verified",x:"76%",y:"56%",tone:"border-[#315842] text-[#91CBA8]"}
];

const STATES=[
  {label:"Completed",value:"12",icon:CheckCircle2,tone:"text-[#8FD0A8]"},
  {label:"Needs you",value:"4",icon:CircleAlert,tone:"text-[#D7B96B]"},
  {label:"In motion",value:"18",icon:Clock3,tone:"text-[#93BCE2]"}
];

export default function CommandReveal(){
  const reduced=useReducedMotion();
  return <section id="command-proof" className="relative overflow-hidden bg-[#090B0F] py-20 sm:py-24 lg:py-28">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_42%,rgba(99,102,241,.08),transparent_30%),radial-gradient(circle_at_18%_80%,rgba(34,211,238,.05),transparent_28%)]"/>
    <div className="relative mx-auto max-w-[1460px] px-5 sm:px-8 lg:px-10 xl:px-14">
      <div className="grid gap-10 lg:grid-cols-[.58fr_1.42fr] lg:items-center">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#64717E]">Pull back</p>
          <h2 className="mt-4 max-w-[470px] text-[42px] font-medium leading-[.98] tracking-[-0.05em] text-[#F1F4F7] sm:text-[54px]">One piece of work becomes the state of the operation.</h2>
          <p className="mt-5 max-w-[430px] text-[14px] leading-6 text-[#7B8792]">You followed #2048. Command is what happens when every active piece of customer work resolves into one operating view.</p>
        </div>

        <div className="relative min-h-[560px]">
          <div className="absolute inset-x-0 top-0 h-[250px] overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#080C11]">
            <p className="absolute left-5 top-4 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#56616D]">Active customer work</p>
            {WORK.map((w,i)=><motion.div key={w.id} initial={reduced?false:{opacity:0,scale:.86,y:12}} whileInView={{opacity:1,scale:1,y:0}} viewport={{once:true,amount:.3}} transition={{duration:reduced?0:.4,delay:i*.07}} style={{left:w.x,top:w.y}} className={["absolute rounded-[12px] border bg-[#0D1218] px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,.28)]",w.tone].join(" ")}>
              <p className="text-[8px] font-semibold text-[#AEB8C2]">{w.id}</p><p className="mt-1 whitespace-nowrap text-[8px]">{w.state}</p>
            </motion.div>)}
          </div>

          <motion.div initial={reduced?false:{opacity:0,y:36,scale:.97}} whileInView={{opacity:1,y:0,scale:1}} viewport={{once:true,amount:.4}} transition={{duration:reduced?0:.65,delay:.25,ease:[.22,1,.36,1]}} className="absolute inset-x-[3%] top-[205px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#080C11] shadow-[0_35px_110px_rgba(0,0,0,.48)]">
            <div className="flex items-center justify-between border-b border-white/[0.055] px-5 py-4">
              <div><p className="text-[8px] uppercase tracking-[0.16em] text-[#5D6975]">Command</p><p className="mt-1 text-[13px] font-medium text-[#E0E6EC]">Operational state</p></div>
              <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[8px] text-[#73808C]"><span className="h-1.5 w-1.5 rounded-full bg-[#78C99A]"/>live</span>
            </div>
            <div className="grid grid-cols-3 gap-px bg-white/[0.045]">
              {STATES.map((s,i)=>{const Icon=s.icon;return <div key={s.label} className="bg-[#0B0F14] p-4 sm:p-5">
                <div className="flex items-center justify-between"><Icon className={["h-3.5 w-3.5",s.tone].join(" ")}/><span className="text-[8px] text-[#505B66]">0{i+1}</span></div>
                <p className="mt-5 text-[36px] font-medium tracking-[-0.055em] text-[#F0F3F6] sm:text-[44px]">{s.value}</p>
                <p className="mt-1 text-[10px] font-medium text-[#C8D0D8]">{s.label}</p>
              </div>})}
            </div>
            <div className="border-t border-white/[0.05] p-4">
              <div className="flex items-center gap-3 rounded-[14px] border border-[#315842] bg-[#0E1D16] p-3">
                <div className="grid h-8 w-8 place-items-center rounded-full border border-[#35516A] bg-[#101D29] text-[#9FC7E8]"><UserRoundCheck className="h-3.5 w-3.5"/></div>
                <div className="min-w-0 flex-1"><p className="text-[9px] font-medium text-[#D5DCE3]">Customer work #2048</p><p className="mt-1 text-[8px] text-[#708078]">Verified complete · now part of the operating state</p></div>
                <CheckCircle2 className="h-4 w-4 text-[#7DB995]"/>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <p className="mt-6 text-right text-[8px] text-[#4F5964]">Illustrative Command state · replace with approved Portal V2 media before cutover</p>
    </div>
  </section>
}
