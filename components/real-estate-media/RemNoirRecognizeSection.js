"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { REM_COPY, REM_DEMO_HREF, REM_NOTIFICATIONS } from "@/lib/real-estate-media/rem-landing-content";
import { RemOwnerPhone } from "@/components/real-estate-media/rem-owner-phone";
import {
  RemSecondaryCta,
  RemSection,
  RemTerminalChrome,
  useRemReducedMotion,
} from "@/components/real-estate-media/rem-noir-primitives";
import { REM_BODY, REM_H2 } from "@/components/real-estate-media/rem-noir-tokens";

function NotificationFeedItem({ item }) {
  return (
    <div className="flex shrink-0 items-start gap-2.5 rounded border border-zinc-800 bg-zinc-950/90 px-3 py-2.5">
      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500/80" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{item.from}</p>
        <p className="mt-1 text-sm leading-snug text-zinc-300">{item.text}</p>
      </div>
    </div>
  );
}

export function RemNoirRecognizeSection() {
  const reduce = useRemReducedMotion();
  const [offset, setOffset] = useState(0);
  const feed = [...REM_NOTIFICATIONS, ...REM_NOTIFICATIONS];

  useEffect(() => {
    if (reduce) return undefined;
    const id = window.setInterval(() => {
      setOffset((o) => (o + 1) % REM_NOTIFICATIONS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <RemSection id="recognize">
      <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12">
        <div>
          <h2 className={REM_H2}>{REM_COPY.recognize.headline}</h2>
          <div className={`mt-5 space-y-3 lg:max-w-xl ${REM_BODY}`}>
            {REM_COPY.recognize.body.map((line, i) => (
              <p key={line} className={i === 6 ? "text-zinc-300" : undefined}>
                {line}
              </p>
            ))}
          </div>
          <div className="mt-8 hidden md:block">
            <RemSecondaryCta href={REM_DEMO_HREF}>{REM_COPY.recognize.cta}</RemSecondaryCta>
          </div>
        </div>

        <div className="mt-8 space-y-4 lg:mt-0">
          <RemTerminalChrome title="inbound.pings" right="live">
            <div className="relative h-[220px] overflow-hidden sm:h-[260px]">
              <motion.div
                className="flex flex-col gap-2"
                animate={reduce ? undefined : { y: -offset * 76 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                {feed.map((item, index) => (
                  <NotificationFeedItem key={`${item.text}-${index}`} item={item} />
                ))}
              </motion.div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-zinc-950 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 to-transparent" />
            </div>
          </RemTerminalChrome>
          <RemOwnerPhone notifications={REM_NOTIFICATIONS} />
        </div>
      </div>
    </RemSection>
  );
}
