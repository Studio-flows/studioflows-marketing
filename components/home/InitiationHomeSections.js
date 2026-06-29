"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

import {
  FINAL_BODY,
  FINAL_BODY_BEAT,
  FINAL_BODY_LEAD,
  FINAL_BODY_PUNCH,
  FINAL_BODY_SM,
  FINAL_CARD,
  FINAL_CARD_ACTIVE,
  FINAL_CLUSTER_GAP,
  FINAL_CLUSTER_INNER,
  FINAL_CONTAINER,
  FINAL_CONTAINER_SINGLE,
  FINAL_CTA_PRIMARY,
  FINAL_CTA_SECONDARY,
  FINAL_EYEBROW,
  FINAL_H1,
  FINAL_H2,
  FINAL_H3,
  FINAL_INDEX,
  FINAL_MUTED_PANEL,
  FINAL_PAUSE,
  FINAL_ROLE_LINE,
  FINAL_SECTION,
  FINAL_SECTION_DRAMATIC,
  FINAL_SECTION_TIGHT,
  FINAL_SIGNAL_DOT,
  FINAL_STAGE,
  FINAL_STAGE_DARK,
} from "@/components/home/final-home-tokens";
import { RevealLine, RevealSection } from "@/components/home/InitiationMotionPrimitives";

/*
  ───────────────────────────────────────────────────────────────────────────
  PROGRESSION — the page is access-gated. Each micro-action the viewer takes
  (tracing a symptom, naming a dependency, breaking the surface, asking the
  system what it saw) logs a SIGNAL and raises CLEARANCE. Downstream parts of
  the page stay sealed until clearance is earned, then decrypt on screen.

  Psychology: you don't get to meet the system, or get the ask, until you've
  confronted the pattern yourself. Engagement compounds. (Mr. Robot: clearance,
  daemons, override.)  Reduced-motion / no-provider → everything open.
  ───────────────────────────────────────────────────────────────────────────
*/

// Total trackable micro-actions across the journey (drives the clearance meter).
const PROGRESSION_TOTAL = 4;

const ProgressionFallback = {
  count: PROGRESSION_TOTAL,
  has: () => true,
  mark: () => {},
};

const ProgressionContext = createContext(ProgressionFallback);

function useProgression() {
  return useContext(ProgressionContext);
}

export function ProgressionProvider({ children }) {
  const [actions, setActions] = useState(() => new Set());

  const mark = useCallback((key) => {
    setActions((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      count: actions.size,
      has: (key) => actions.has(key),
      mark,
    }),
    [actions, mark],
  );

  return (
    <ProgressionContext.Provider value={value}>
      {children}
      <ClearanceHud count={value.count} />
    </ProgressionContext.Provider>
  );
}

// Fixed, low-key terminal readout. Appears only after the first signal so it
// doesn't clutter the cold open; reinforces "there is more to unlock."
function ClearanceHud({ count }) {
  if (count <= 0) return null;
  const cells = Array.from({ length: PROGRESSION_TOTAL });
  const full = count >= PROGRESSION_TOTAL;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-none fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-[#05070B]/80 px-3 py-2 backdrop-blur-sm"
      aria-hidden="true"
    >
      <span
        className="font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: full ? "#D4A853" : "#DB2777" }}
      >
        {full ? "clearance" : "access"}
      </span>
      <span className="flex gap-1">
        {cells.map((_, i) => (
          <span
            key={i}
            className="h-2 w-2"
            style={{
              backgroundColor: i < count ? (full ? "#D4A853" : "#DB2777") : "rgba(255,255,255,0.14)",
              boxShadow: i < count ? `0 0 10px ${full ? "rgba(212,168,83,0.6)" : "rgba(219,39,119,0.6)"}` : "none",
            }}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] tabular-nums tracking-[0.1em] text-[#9B9894]">
        {Math.min(count, PROGRESSION_TOTAL)}/{PROGRESSION_TOTAL}
      </span>
    </motion.div>
  );
}

// Seals a downstream part of the page until CLEARANCE >= minCount. The viewer
// either earns it upstream (auto-decrypts — the dopamine hit) or overrides the
// lock manually (one tap). Reduced-motion or no provider → always open.
export function LockedReveal({ minCount = 1, code = "section", children }) {
  const reduce = useReducedMotion();
  const { count } = useProgression();
  const [override, setOverride] = useState(false);
  const open = reduce || count >= minCount || override;
  const remaining = Math.max(minCount - count, 0);

  return (
    <div className="relative">
      <div
        className={
          open
            ? "transition-all duration-[900ms] ease-out"
            : "pointer-events-none select-none opacity-25 blur-[9px] saturate-0 transition-all duration-700"
        }
        aria-hidden={open ? undefined : true}
      >
        {children}
      </div>

      <AnimatePresence>
        {!open ? (
          <motion.button
            type="button"
            onClick={() => setOverride(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(12px)" }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#05070B]/72 px-6 text-center backdrop-blur-[2px]"
            aria-label={`Locked. ${remaining} more signal${remaining === 1 ? "" : "s"} required, or override to continue.`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#DB2777]">
              [ access locked · {code} ]
            </span>
            <span className="font-mono text-[11px] leading-5 tracking-[0.08em] text-[#9B9894]">
              {remaining} signal{remaining === 1 ? "" : "s"} required to decrypt
            </span>
            <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-[#D4A853]/40 bg-[#D4A853]/[0.06] px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-[#D4A853]">
              &gt; override_lock
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AmbientShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030304] text-[#E8E6E3]">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:72px_72px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-32 bg-gradient-to-b from-[#030304] to-transparent"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

const STUDIOFLOWS_LOGO_SRC = "/StudioFlows logo white (1200 x 675 px).png";

function StudioFlowsLogoMark({ className = "" }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <Image
        src={STUDIOFLOWS_LOGO_SRC}
        alt="StudioFlows"
        width={1200}
        height={675}
        className="h-10 w-auto sm:h-12 lg:h-14"
        priority
      />
    </div>
  );
}

// Abstract pressure field. No traceable line, no literal mark. A current in the
// dark that breathes, drifts toward the pointer, and intensifies then dissolves
// across the hero scroll. Felt more than seen.
function HeroForceField({ progress }) {
  const reduce = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const driftX = useSpring(px, { stiffness: 32, damping: 22, mass: 1.1 });
  const driftY = useSpring(py, { stiffness: 32, damping: 22, mass: 1.1 });

  // Pressure rises through the first half of the hero, then dissolves as the
  // reader is handed off to recognition.
  const fieldOpacity = useTransform(progress, [0, 0.55, 1], [0.92, 1, 0]);
  const bloomScale = useTransform(progress, [0, 1], [1, 1.12]);
  const fieldShift = useTransform(progress, [0, 1], [0, -70]);

  // Layered parallax depths so the field has dimensionality, not flatness.
  const nearX = useTransform(driftX, (v) => v);
  const nearY = useTransform(driftY, (v) => v);
  const farX = useTransform(driftX, (v) => v * -0.45);
  const farY = useTransform(driftY, (v) => v * -0.45);

  useEffect(() => {
    if (reduce) return undefined;
    function onMove(event) {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      px.set(nx * 46);
      py.set(ny * 34);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, px, py]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ opacity: reduce ? 0.7 : fieldOpacity, y: reduce ? 0 : fieldShift }}
      aria-hidden="true"
    >
      {/* Primary pressure bloom — magenta, off-center, the dominant signal. */}
      <motion.div
        className="absolute left-[56%] top-[14%] h-[86vh] w-[86vh] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          x: reduce ? 0 : nearX,
          y: reduce ? 0 : nearY,
          scale: reduce ? 1 : bloomScale,
          background:
            "radial-gradient(circle at 50% 50%, rgba(219,39,119,0.20) 0%, rgba(219,39,119,0.08) 38%, transparent 68%)",
        }}
        animate={reduce ? undefined : { opacity: [0.82, 1, 0.82] }}
        transition={
          reduce
            ? undefined
            : { duration: 12, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* Intelligence undertone — blue, lower, quieter, counter-phase. */}
      <motion.div
        className="absolute left-[30%] top-[58%] h-[64vh] w-[64vh] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          x: reduce ? 0 : farX,
          y: reduce ? 0 : farY,
          background:
            "radial-gradient(circle at 50% 50%, rgba(219,39,119,0.13) 0%, rgba(219,39,119,0.05) 42%, transparent 70%)",
        }}
        animate={reduce ? undefined : { opacity: [0.55, 0.85, 0.55] }}
        transition={
          reduce
            ? undefined
            : { duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1.6 }
        }
      />

      {/* Gold ember — emphasis only, a single warm point of truth. */}
      <motion.div
        className="absolute left-[64%] top-[40%] h-[26vh] w-[26vh] -translate-x-1/2 rounded-full blur-[80px]"
        style={{
          x: reduce ? 0 : nearX,
          y: reduce ? 0 : nearY,
          background:
            "radial-gradient(circle at 50% 50%, rgba(212,168,83,0.12) 0%, transparent 66%)",
        }}
        animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4] }}
        transition={
          reduce
            ? undefined
            : { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }
        }
      />

      {/* Pressure signal line — magenta, right. The instrument is live. */}
      <motion.div
        className="absolute right-[16%] top-0 hidden h-full w-px sm:block"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(219,39,119,0.22) 32%, rgba(219,39,119,0.22) 68%, transparent 100%)",
        }}
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? undefined : { opacity: [0, 0.9, 0.55, 0.9] }}
        transition={
          reduce
            ? undefined
            : { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
        }
      />

      {/* Intelligence signal line — blue, left, quieter. */}
      <motion.div
        className="absolute left-[9%] top-[18%] hidden h-[46%] w-px lg:block"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(219,39,119,0.16) 50%, transparent 100%)",
        }}
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? undefined : { opacity: [0, 0.7, 0.4, 0.7] }}
        transition={
          reduce
            ? undefined
            : { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.2 }
        }
      />
    </motion.div>
  );
}

// Reactive "operational energy" field. A living background current: soft
// metaballs drift autonomously like a slow current, then locally bulge and lerp
// toward the pointer like an amoeba. Brand-abstract "operational pressure ->
// clarity" — organic flow, NO falling code / glyphs (that aesthetic is reserved
// for Vessa). Canvas + cached sprite blobs for mobile-grade perf. Reduced-motion
// renders a static gradient with no rAF loop.
const REACTIVE_FIELD_PALETTES = {
  // Graphite/near-black base, magenta pressure + faint amber energy. Additive
  // blending reads as chaotic operational pressure glowing out of the dark.
  dark: {
    base: "#0B0B0D",
    composite: "lighter",
    staticBg:
      "radial-gradient(58% 50% at 62% 34%, rgba(219,39,119,0.18), transparent 70%), radial-gradient(46% 44% at 34% 72%, rgba(212,168,83,0.09), transparent 72%), #0B0B0D",
    blobs: [
      // Large slow current — barely there, sets the drift of the whole field.
      { hx: 0.36, hy: 0.42, r: 0.92, driftR: 0.07, sp: 0.05, phase: 0.0, alpha: 0.14, follow: 0.12, color: [219, 39, 119] },
      // Primary magenta bloom — the dominant pointer-reactive signal.
      { hx: 0.62, hy: 0.3, r: 0.52, driftR: 0.12, sp: 0.09, phase: 1.7, alpha: 0.22, follow: 0.42, color: [219, 39, 119] },
      // Warm amber ember — emphasis, follows quickest, small bulge.
      { hx: 0.54, hy: 0.64, r: 0.32, driftR: 0.13, sp: 0.12, phase: 3.1, alpha: 0.12, follow: 0.5, color: [212, 168, 83] },
    ],
  },
  // Warm parchment base, soft amber/warm energy. Source-over with low alpha
  // tints the parchment gently — feels calm/resolved rather than pressured.
  light: {
    base: "#F4F1EA",
    composite: "source-over",
    staticBg:
      "radial-gradient(60% 52% at 50% 40%, rgba(212,168,83,0.16), transparent 72%), radial-gradient(44% 40% at 70% 70%, rgba(219,39,119,0.05), transparent 72%), #F4F1EA",
    blobs: [
      { hx: 0.42, hy: 0.4, r: 0.9, driftR: 0.06, sp: 0.045, phase: 0.5, alpha: 0.1, follow: 0.12, color: [212, 168, 83] },
      { hx: 0.6, hy: 0.34, r: 0.5, driftR: 0.1, sp: 0.08, phase: 2.2, alpha: 0.12, follow: 0.36, color: [224, 178, 110] },
      { hx: 0.5, hy: 0.66, r: 0.3, driftR: 0.11, sp: 0.11, phase: 3.6, alpha: 0.08, follow: 0.46, color: [212, 168, 83] },
    ],
  },
};

export function ReactiveField({ tone = "dark", className = "" }) {
  const reduce = useReducedMotion();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef({
    raf: 0,
    running: false,
    dpr: 1,
    w: 0,
    h: 0,
    t: 0,
    last: 0,
    px: 0,
    py: 0,
    active: false,
    blobs: null,
    sprites: null,
  });

  useEffect(() => {
    if (reduce) return undefined;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    const palette = REACTIVE_FIELD_PALETTES[tone] || REACTIVE_FIELD_PALETTES.dark;
    const s = stateRef.current;
    const finePointer =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: fine)").matches;

    // Cache one soft radial sprite per blob color so the loop never allocates a
    // gradient per frame — just drawImage of a pre-rendered disc.
    const spriteCache = new Map();
    function spriteFor(color) {
      const key = color.join(",");
      let sprite = spriteCache.get(key);
      if (sprite) return sprite;
      const size = 256;
      sprite = document.createElement("canvas");
      sprite.width = size;
      sprite.height = size;
      const sctx = sprite.getContext("2d");
      const grad = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      const [r, g, b] = color;
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},0.45)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, size, size);
      spriteCache.set(key, sprite);
      return sprite;
    }

    s.blobs = palette.blobs.map((b) => ({
      ...b,
      x: 0,
      y: 0,
      cr: 0,
      sprite: spriteFor(b.color),
    }));

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.dpr = dpr;
      s.w = Math.max(1, Math.round(rect.width));
      s.h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(s.w * dpr);
      canvas.height = Math.round(s.h * dpr);
      canvas.style.width = `${s.w}px`;
      canvas.style.height = `${s.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const minDim = Math.min(s.w, s.h);
      for (const blob of s.blobs) {
        blob.x = blob.hx * s.w;
        blob.y = blob.hy * s.h;
        blob.cr = blob.r * minDim;
      }
    }
    resize();

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      s.px = e.clientX - rect.left;
      s.py = e.clientY - rect.top;
      s.active = true;
    }
    function onLeave() {
      s.active = false;
    }

    function draw(dt) {
      const { w, h, t } = s;
      const minDim = Math.min(w, h);
      const ease = 1 - Math.pow(0.0006, dt);

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.base;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = palette.composite;
      for (const blob of s.blobs) {
        const driftX = Math.cos(t * blob.sp + blob.phase) * blob.driftR * w;
        const driftY = Math.sin(t * blob.sp * 0.82 + blob.phase * 1.3) * blob.driftR * h;
        let tx = blob.hx * w + driftX;
        let ty = blob.hy * h + driftY;
        let targetR = blob.r * minDim;

        if (s.active && finePointer) {
          const dx = s.px - blob.x;
          const dy = s.py - blob.y;
          const dist = Math.hypot(dx, dy) || 1;
          const reach = minDim * 0.95;
          const pull = Math.max(0, 1 - dist / reach);
          tx += (s.px - tx) * blob.follow * pull;
          ty += (s.py - ty) * blob.follow * pull;
          targetR *= 1 + pull * 0.6;
        }

        blob.x += (tx - blob.x) * ease;
        blob.y += (ty - blob.y) * ease;
        blob.cr += (targetR - blob.cr) * ease;

        const d = blob.cr * 2;
        ctx.globalAlpha = blob.alpha;
        ctx.drawImage(blob.sprite, blob.x - blob.cr, blob.y - blob.cr, d, d);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      if (!s.running) return;
      const dt = s.last ? Math.min((now - s.last) / 1000, 0.05) : 0.016;
      s.last = now;
      s.t += dt;
      draw(dt);
      s.raf = requestAnimationFrame(frame);
    }

    function start() {
      if (s.running) return;
      s.running = true;
      s.last = 0;
      s.raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (!s.running) return;
      s.running = false;
      cancelAnimationFrame(s.raf);
    }

    // Only run the loop while on-screen and the tab is visible.
    const io = new IntersectionObserver(
      (entries) => {
        const onScreen = entries.some((entry) => entry.isIntersecting);
        if (onScreen && document.visibilityState !== "hidden") start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(container);

    function onVisibility() {
      if (document.visibilityState === "hidden") stop();
    }

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (finePointer) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      window.addEventListener("blur", onLeave);
    }

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (finePointer) {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("blur", onLeave);
      }
    };
  }, [reduce, tone]);

  if (reduce) {
    const palette = REACTIVE_FIELD_PALETTES[tone] || REACTIVE_FIELD_PALETTES.dark;
    return (
      <div
        ref={containerRef}
        className={`pointer-events-none absolute inset-0 ${className}`}
        style={{ background: palette.staticBg }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

// The system's voice: one quiet line of telemetry. Not a dashboard — a single
// ambient readout that the operational layer is already watching.
function HeroPressureReadout() {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0.61);
  const [rising, setRising] = useState(true);

  useEffect(() => {
    if (reduce) return undefined;
    const id = window.setInterval(() => {
      setValue((prev) => {
        const next = Math.min(0.94, Math.max(0.43, prev + (Math.random() - 0.42) * 0.06));
        setRising(next >= prev);
        return next;
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9B9894]/80">
      <span className="relative flex h-1.5 w-1.5">
        {!reduce ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DB2777]/50" />
        ) : null}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#DB2777]" />
      </span>
      <span>operational pressure</span>
      <span className="tabular-nums text-[#D4A853]">{value.toFixed(2)}</span>
      <span className="text-[#9B9894]/55" aria-hidden="true">
        {rising ? "/ rising" : "/ easing"}
      </span>
    </div>
  );
}

const GLITCH_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\/[]{}=+*^?#%$&";

function randomGlyph() {
  return GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
}

// Decode-on-load: each glyph churns through noise, then locks left-to-right into
// the real character. SSR/reduced-motion render the final text immediately.
function ScrambleText({ text, className = "", as: Tag = "span", delayMs = 0, onComplete }) {
  const reduce = useReducedMotion();
  const [output, setOutput] = useState(text);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (reduce) {
      setOutput(text);
      onCompleteRef.current?.();
      return undefined;
    }

    const len = text.length;
    const offset = Math.round(delayMs / 16);
    const queue = text.split("").map((char, index) => ({
      char,
      settle: offset + 10 + Math.round((index / Math.max(len, 1)) * 24) + Math.floor(Math.random() * 8),
      rand: randomGlyph(),
    }));

    let frame = 0;
    let raf = 0;

    const tick = () => {
      let settled = 0;
      const next = queue
        .map((q) => {
          if (q.char === " ") {
            settled += 1;
            return " ";
          }
          if (frame >= q.settle) {
            settled += 1;
            return q.char;
          }
          if (Math.random() < 0.34) q.rand = randomGlyph();
          return q.rand;
        })
        .join("");

      setOutput(next);
      frame += 1;

      if (settled < queue.length) {
        raf = requestAnimationFrame(tick);
      } else {
        setOutput(text);
        onCompleteRef.current?.();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delayMs, reduce]);

  return <Tag className={className}>{output}</Tag>;
}

function BlinkingCaret({ className = "" }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <span className={`inline-block ${className}`} aria-hidden="true">
        &#9613;
      </span>
    );
  }
  return (
    <motion.span
      className={`inline-block ${className}`}
      aria-hidden="true"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1.05, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: "linear" }}
    >
      &#9613;
    </motion.span>
  );
}

// Stable on load. No scramble. After the lines above finish, ghost-fades
// letter-by-letter (right to left), holds, then reassembles. Plays once.
function HeadlineDisappear({ text, className = "", active = false, holdBeforeFadeMs = 500 }) {
  const reduce = useReducedMotion();
  const chars = useMemo(() => text.split(""), [text]);
  const [vis, setVis] = useState(() => chars.map(() => true));
  const fadeStartedRef = useRef(false);

  useEffect(() => {
    if (reduce || !active || fadeStartedRef.current) {
      return undefined;
    }

    fadeStartedRef.current = true;
    setVis(chars.map(() => true));

    const timers = [];

    const reform = () => {
      chars.forEach((_, i) => {
        timers.push(
          window.setTimeout(() => {
            setVis((v) => {
              const n = [...v];
              n[i] = true;
              return n;
            });
          }, i * 70),
        );
      });
    };

    const dissolve = () => {
      const order = chars.map((_, i) => i).reverse();
      order.forEach((idx, k) => {
        timers.push(
          window.setTimeout(() => {
            setVis((v) => {
              const n = [...v];
              n[idx] = false;
              return n;
            });
          }, k * 90),
        );
      });
      const goneAt = order.length * 90;
      timers.push(window.setTimeout(reform, goneAt + 550));
    };

    timers.push(window.setTimeout(dissolve, holdBeforeFadeMs));

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [reduce, chars, active, holdBeforeFadeMs]);

  return (
    <span className={className} aria-label={text}>
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          aria-hidden="true"
          className="inline-block"
          initial={false}
          animate={{
            opacity: vis[i] ? 1 : 0.06,
            filter: vis[i] ? "blur(0px)" : "blur(12px)",
            y: vis[i] ? 0 : -6,
          }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </span>
  );
}

// Unpredictability. At irregular intervals the system "twitches" — a scanline
// tear and a magenta pressure flash — as if it noticed you reading. Never on a
// fixed beat, so it never feels like a loop. Reduced-motion: silent.
function SystemInterrupt() {
  const reduce = useReducedMotion();
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    let timer = 0;
    const schedule = () => {
      const wait = 5200 + Math.random() * 7600;
      timer = window.setTimeout(() => {
        setPulse((p) => p + 1);
        schedule();
      }, wait);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [reduce]);

  if (reduce || pulse === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden="true">
      <motion.div
        key={`flash-${pulse}`}
        className="absolute inset-0 bg-[#DB2777]/[0.05]"
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: [0, 0.6, 0, 0.3, 0], x: [0, -5, 4, -2, 0] }}
        transition={{ duration: 0.5, ease: "linear" }}
      />
      <motion.div
        key={`tear-${pulse}`}
        className="absolute left-0 right-0 h-px bg-white/45 mix-blend-screen shadow-[0_0_18px_rgba(255,255,255,0.4)]"
        initial={{ top: "34%", opacity: 0 }}
        animate={{ top: ["34%", "58%", "47%"], opacity: [0, 0.85, 0] }}
        transition={{ duration: 0.55, times: [0, 0.55, 1], ease: "easeOut" }}
      />
    </div>
  );
}

// Covert-terminal surface: CRT scanlines, corner vignette for unease, and a
// rare flicker. The lander should feel like a feed you weren't cleared to see.
function HeroInterfaceOverlay() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 [background:radial-gradient(125%_92%_at_50%_36%,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
      <motion.div
        className="absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.6)_0px,rgba(255,255,255,0.6)_1px,transparent_1px,transparent_3px)]"
        animate={reduce ? undefined : { opacity: [0.04, 0.065, 0.04] }}
        transition={reduce ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {!reduce ? (
        <motion.div
          className="absolute inset-0 bg-white/[0.018]"
          animate={{ opacity: [0, 0, 0.6, 0, 0.25, 0, 0] }}
          transition={{
            duration: 7,
            times: [0, 0.8, 0.82, 0.85, 0.88, 0.9, 1],
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ) : null}
    </div>
  );
}

// Intercept feed (no container). The founder's symptoms print in one by one
// like an intercepted transmission — the system has been listening all along.
function HeroInterceptFeed({ lines }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? lines.length : 0);

  useEffect(() => {
    if (reduce) {
      setCount(lines.length);
      return undefined;
    }

    let timeouts = [];
    const run = () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      timeouts = [];
      setCount(0);
      lines.forEach((_, i) => {
        timeouts.push(window.setTimeout(() => setCount(i + 1), 1300 + i * 1600));
      });
    };

    run();
    const cycleMs = 1300 + lines.length * 1600 + 6500;
    const loop = window.setInterval(run, cycleMs);

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      window.clearInterval(loop);
    };
  }, [reduce, lines]);

  return (
    <div className="w-full max-w-sm font-mono">
      <div className="mb-5 flex items-center gap-2.5 text-[9px] uppercase tracking-[0.28em] text-[#DB2777]/75">
        <span className="relative flex h-1.5 w-1.5">
          {!reduce ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DB2777]/60" />
          ) : null}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#DB2777]" />
        </span>
        intercepting signal
        <span className="text-[#9B9894]/40">· founder channel</span>
      </div>

      <div className="space-y-3.5">
        {lines.map((line, i) => {
          const visible = reduce || i < count;
          const isPunch = i === lines.length - 1;
          const isHinge = i === lines.length - 2;
          return (
            <motion.div
              key={line}
              className={`flex gap-3 ${
                isPunch ? "text-[0.92rem] leading-7 sm:text-[0.98rem]" : "text-[0.78rem] leading-6 sm:text-[0.82rem]"
              }`}
              initial={false}
              animate={{
                opacity: visible ? 1 : 0,
                filter: visible ? "blur(0px)" : "blur(7px)",
                x: visible ? 0 : -10,
              }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className={`shrink-0 tabular-nums ${isPunch ? "text-[#DB2777]" : "text-[#DB2777]/45"}`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  isPunch
                    ? "font-medium text-[#F3EFEC]"
                    : isHinge
                      ? "italic text-[#C2BFBA]"
                      : "text-[#8E8B87]"
                }
              >
                {line}
              </span>
            </motion.div>
          );
        })}
        <div className="flex gap-3 pt-1 text-[0.78rem] leading-6 text-[#9B9894]/45">
          <span className="shrink-0 tabular-nums text-[#DB2777]/40">&gt;</span>
          <BlinkingCaret className="text-[#DB2777]/70" />
        </div>
      </div>
    </div>
  );
}

// Hero "flashlight in the dark" reveal. The OS sits in shadow like evidence
// pinned to a wall; a single beam roams across it — auto-roaming clue to clue,
// or chasing the pointer/touch on desktop — lighting up real product views one
// at a time. Detective with a flashlight in the dark, finding what runs the
// business underneath.
// Each clue is rendered full-bleed and zoomed well beyond the beam diameter, so
// the spotlight only ever reveals a cropped close-up of real UI detail. `pos`
// chooses the focal region of that screen; `scale` controls the zoom; ax/ay are
// the beam roam anchors (kept loosely aligned with the focal region).
const SPOTLIGHT_LAYOUT = [
  { ax: 38, ay: 28, pos: "22% 18%", scale: 1.08 },
  { ax: 55, ay: 72, pos: "48% 78%", scale: 1.06 },
  { ax: 48, ay: 42, pos: "50% 42%", scale: 1.05 },
  { ax: 62, ay: 38, pos: "58% 35%", scale: 1.06 },
  { ax: 70, ay: 26, pos: "74% 12%", scale: 1.04 },
  { ax: 32, ay: 52, pos: "28% 48%", scale: 1.07 },
  { ax: 58, ay: 58, pos: "52% 55%", scale: 1.08 },
];

const SPOTLIGHT_IMAGE_SIZES =
  "(min-width: 1536px) 2400px, (min-width: 1024px) 1920px, (min-width: 640px) 1200px, 100vw";

function SpotlightClueImage({ clue, layout }) {
  const isHeroFlow = clue.src.includes("/product/hero-flow/");
  const [hiResFailed, setHiResFailed] = useState(false);
  const useOptionalHiRes = Boolean(clue.srcHiRes) && !hiResFailed;
  const imageSrc = useOptionalHiRes ? clue.srcHiRes : clue.src;
  const native = isHeroFlow || useOptionalHiRes;
  const zoom = native ? layout.scale : Math.min(layout.scale, 1.02);

  useEffect(() => {
    setHiResFailed(false);
  }, [clue.src, clue.srcHiRes]);

  return (
    <Image
      src={imageSrc}
      alt={`StudioFlows OS, ${clue.label}`}
      fill
      unoptimized={native}
      quality={100}
      priority={native}
      sizes={SPOTLIGHT_IMAGE_SIZES}
      className="object-cover"
      onError={() => {
        if (clue.srcHiRes) setHiResFailed(true);
      }}
      style={{
        objectPosition: layout.pos,
        transform: `scale(${zoom})`,
      }}
    />
  );
}

function HeroSpotlightReveal({ clues, caption }) {
  const reduce = useReducedMotion();
  const boardRef = useRef(null);
  const cards = SPOTLIGHT_LAYOUT.slice(0, clues.length).map((l, i) => ({
    ...l,
    ...clues[i],
    layout: l,
  }));

  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [radius, setRadius] = useState(150);

  const tx = useMotionValue(cards[0]?.ax ?? 50);
  const ty = useMotionValue(cards[0]?.ay ?? 42);
  const sx = useSpring(tx, { stiffness: 70, damping: 19, mass: 0.8 });
  const sy = useSpring(ty, { stiffness: 70, damping: 19, mass: 0.8 });

  const mask = useMotionTemplate`radial-gradient(circle ${radius}px at ${sx}% ${sy}%, #000 0%, #000 88%, transparent 100%)`;
  const glowLeft = useMotionTemplate`${sx}%`;
  const glowTop = useMotionTemplate`${sy}%`;

  useEffect(() => {
    const set = () =>
      setRadius(window.innerWidth < 640 ? 118 : window.innerWidth < 1024 ? 160 : 200);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // Auto-roam between clues when the operator isn't steering the beam.
  useEffect(() => {
    if (reduce || hovering || cards.length === 0) return undefined;
    const id = window.setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % cards.length;
        tx.set(cards[next].ax);
        ty.set(cards[next].ay);
        return next;
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, [reduce, hovering, cards.length, tx, ty]);

  function handleMove(event) {
    if (reduce) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    tx.set(Math.max(4, Math.min(96, x)));
    ty.set(Math.max(4, Math.min(96, y)));
  }

  // A single full-bleed, heavily-zoomed screen of the active clue. Because it is
  // scaled well past the beam diameter, the spotlight only ever uncovers a
  // cropped close-up of real UI detail rather than a shrunken whole page.
  const activeCard = cards[active] ?? cards[0];
  const board = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={activeCard.src}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        <SpotlightClueImage clue={activeCard} layout={activeCard.layout} />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="w-full font-mono">
      <div className="mb-4 flex items-center gap-2.5 text-[9px] uppercase tracking-[0.28em] text-[#D4A853]/75">
        <span className="relative flex h-1.5 w-1.5">
          {!reduce ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4A853]/55" />
          ) : null}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#D4A853]" />
        </span>
        {caption}
        <span className="text-[#9B9894]/40">· restricted preview</span>
      </div>

      <div
        ref={boardRef}
        onPointerMove={handleMove}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setHovering(true);
        }}
        onPointerDown={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onPointerUp={() => setHovering(false)}
        className="relative h-[60svh] w-full overflow-hidden rounded-2xl border border-white/10 bg-black sm:h-[64svh] lg:h-[72vh]"
        style={{ touchAction: "pan-y" }}
        aria-label="A flashlight reveals the StudioFlows OS hidden in the dark"
        role="img"
      >
        {reduce ? (
          // Static, readable fallback: two cropped close-ups lit, no beam/roam.
          <div className="absolute inset-0 grid grid-rows-2 gap-px bg-black">
            {[cards[0], cards[6]].filter(Boolean).map((c) => (
              <div key={c.src} className="relative overflow-hidden">
                <SpotlightClueImage clue={c} layout={c.layout} />
                <span className="absolute left-3 top-3 rounded bg-black/55 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#D4A853]/85 backdrop-blur-sm">
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Pitch black outside the beam — only the masked (lit) layer shows
                any imagery; everything else is true #000. */}
            <motion.div
              className="absolute inset-0"
              style={{ WebkitMaskImage: mask, maskImage: mask }}
            >
              {board}
            </motion.div>

            {/* Warm flashlight glow + soft edge ring. */}
            <motion.div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
              style={{
                left: glowLeft,
                top: glowTop,
                width: radius * 2,
                height: radius * 2,
                background:
                  "radial-gradient(circle, transparent 56%, rgba(212,168,83,0.10) 78%, transparent 92%)",
              }}
            />
            <motion.div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D4A853]/25"
              style={{
                left: glowLeft,
                top: glowTop,
                width: radius * 2 * 0.62,
                height: radius * 2 * 0.62,
              }}
            />
          </>
        )}

        {/* Vignette + grain for the dark-room feel. */}
        <div
          className="pointer-events-none absolute inset-0 [box-shadow:inset_0_0_120px_rgba(0,0,0,0.85)]"
          aria-hidden="true"
        />

        {/* Current clue caption. */}
        {!reduce ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex max-w-full flex-col rounded-lg border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-sm"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#D4A853]/85">
                  {String(active + 1).padStart(2, "0")} · {cards[active]?.label}
                </span>
                <span className="mt-0.5 text-[11px] leading-4 text-[#C2BFBA]">
                  {cards[active]?.hint}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-[10px] leading-5 text-[#9B9894]/55">
        {reduce ? "Real views from the StudioFlows OS." : "Move the light. Or watch it find the clues."}
      </p>
    </div>
  );
}

function ContinuityAct1({ children }) {
  return (
    <div className="relative overflow-x-hidden bg-[#030304] text-[#E8E6E3]">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:72px_72px]"
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CopyBlocks({ paragraphs, className = "" }) {
  return paragraphs.map((text) => (
    <p key={text} className={`mt-5 max-w-3xl ${FINAL_BODY} ${className}`}>
      {text}
    </p>
  ));
}

function ChapterAside({ index, label, children }) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="border-l border-[#9FE7C3]/20 pl-5">
        <p className={FINAL_INDEX}>{index}</p>
        <p className="mt-3 max-w-xs text-sm uppercase tracking-[0.22em] text-[#AAB5AE]/70">
          {label}
        </p>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </aside>
  );
}

function SectionGrid({ index, label, children, aside, className = FINAL_SECTION }) {
  return (
    <section className={className}>
      <RevealSection>
        <div className={FINAL_CONTAINER}>
          <ChapterAside index={index} label={label}>
            {aside}
          </ChapterAside>
          <div>{children}</div>
        </div>
      </RevealSection>
    </section>
  );
}

function PainBeatCluster({ lines, lead = false }) {
  return (
    <div className={`${FINAL_CLUSTER_GAP} ${FINAL_CLUSTER_INNER}`}>
      {lines.map((text, index) => (
        <p
          key={text}
          className={
            lead && index === 0
              ? FINAL_BODY_LEAD
              : index === lines.length - 1 && lines.length > 1
                ? FINAL_BODY_PUNCH
                : FINAL_BODY_BEAT
          }
        >
          {text}
        </p>
      ))}
    </div>
  );
}

function PainRoleList({ lines }) {
  return (
    <ul className={`${FINAL_CLUSTER_GAP} ${FINAL_CLUSTER_INNER} list-none`}>
      {lines.map((text) => (
        <li key={text} className={FINAL_ROLE_LINE}>
          {text}
        </li>
      ))}
    </ul>
  );
}

function SignalCard({ eyebrow, title, body }) {
  return (
    <div className={FINAL_MUTED_PANEL}>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9FE7C3]/75">
        {eyebrow}
      </p>
      <p className="mt-4 text-xl font-semibold leading-tight tracking-[-0.02em] text-[#F3F7F4]">
        {title}
      </p>
      {body ? <p className={`mt-3 ${FINAL_BODY_SM}`}>{body}</p> : null}
    </div>
  );
}

function SystemGlyph() {
  const nodes = [
    { label: "deadline", className: "left-[18%] top-[26%]" },
    { label: "approval", className: "right-[18%] top-[30%]" },
    { label: "context", className: "left-[24%] bottom-[28%]" },
    { label: "handoff", className: "right-[22%] bottom-[24%]" },
  ];

  return (
    <div className="relative hidden min-h-[520px] overflow-hidden rounded-[2.25rem] border border-white/[0.09] bg-black/[0.20] shadow-[0_40px_160px_rgba(0,0,0,0.42)] lg:block">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(159,231,195,0.18),transparent_25%),radial-gradient(circle_at_50%_46%,rgba(159,231,195,0.08),transparent_44%)]"
        aria-hidden="true"
      />

      <div
        className="absolute left-1/2 top-1/2 h-[21rem] w-[21rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#9FE7C3]/10"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 h-[15rem] w-[15rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]"
        aria-hidden="true"
      />

      <div
        className="absolute left-1/2 top-1/2 h-px w-[68%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#9FE7C3]/20 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-[#9FE7C3]/20 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#9FE7C3]/18"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 h-[12rem] w-[12rem] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/[0.08]"
        aria-hidden="true"
      />

      {nodes.map((node) => (
        <div key={node.label} className={`absolute ${node.className}`}>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#07100D]/75 px-3 py-2 shadow-[0_12px_50px_rgba(0,0,0,0.28)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9FE7C3]/75 shadow-[0_0_18px_rgba(159,231,195,0.45)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#B8C2BC]">
              {node.label}
            </span>
          </div>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9FE7C3] shadow-[0_0_70px_rgba(159,231,195,0.75)]" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#9FE7C3]/20" />

      <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/[0.08] bg-black/[0.22] p-5">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#9FE7C3]/75">
              Dependency map
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#B8C2BC]">
              The business looks calm until the invisible routes still depend on one person.
            </p>
          </div>
          <div className="hidden rounded-full border border-[#9FE7C3]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9FE7C3]/80 xl:block">
            signal forming
          </div>
        </div>
      </div>
    </div>
  );
}

const DEPENDENCY_OPTION_SELECTED =
  "rounded-full border border-[#9FE7C3]/45 bg-[#9FE7C3]/[0.08] px-4 py-2.5 text-sm leading-7 text-[#F3F7F4] shadow-[0_0_26px_rgba(159,231,195,0.08)] transition";
const DEPENDENCY_OPTION_IDLE =
  "rounded-full border border-white/10 bg-white/[0.025] px-4 py-2.5 text-sm leading-7 text-[#B3BDC9] transition hover:border-white/20 hover:text-[#F3F7F4]";

export function InitiationHeroSection({ content }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const [line2ScrambleReady, setLine2ScrambleReady] = useState(false);
  const [disappearFadeActive, setDisappearFadeActive] = useState(false);
  const handleLine1ScrambleComplete = useCallback(() => {
    setLine2ScrambleReady(true);
  }, []);
  const handleLine2ScrambleComplete = useCallback(() => {
    setDisappearFadeActive(true);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Scroll-dissolve handoff: the cold open recedes into the dark rather than
  // ending at a hard edge, then recognition rises underneath.
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -64]);
  const contentScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.985]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);

  const contentStyle = reduce
    ? undefined
    : { opacity: contentOpacity, y: contentY, scale: contentScale };

  return (
    <ContinuityAct1>
      <section
        ref={sectionRef}
        aria-labelledby="initiation-hero-heading"
        className="relative isolate flex min-h-[72vh] flex-col justify-between overflow-hidden px-5 pb-9 pt-6 sm:px-8 sm:pb-12 lg:min-h-[100svh] lg:px-20"
      >
        <HeroForceField progress={scrollYProgress} />
        <HeroInterfaceOverlay />
        <SystemInterrupt />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-[#030304] to-transparent"
          aria-hidden="true"
        />

        {/* Header — logo + clearance strip */}
        <header className="relative z-10 flex items-center justify-between gap-4">
          <StudioFlowsLogoMark />
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#D4A853]/70 md:flex">
              <span className="relative flex h-1.5 w-1.5">
                {!reduce ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4A853]/50" />
                ) : null}
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#D4A853]" />
              </span>
              <span className="hidden sm:inline">restricted</span>
              <span className="hidden text-[#9B9894]/40 sm:inline">/</span>
              <span>operator access</span>
            </div>
            <Link
              href={content.loginHref}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8E6E3] transition hover:border-[#D4A853]/40 hover:bg-[#D4A853]/[0.06] hover:text-white"
            >
              {content.loginLabel}
            </Link>
          </div>
        </header>

        {/* Main content — headline / diamond / actions */}
        <motion.div
          className="relative z-10 flex flex-1 flex-col justify-center gap-9 py-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12"
          style={contentStyle}
        >
          {/* A — headline */}
          <div className="order-1 max-w-xl lg:col-start-1 lg:row-start-1">
            <div className="mb-6 flex items-center gap-2.5">
              <span className="font-mono text-[12px] leading-none text-[#D4A853]/80">&gt;</span>
              <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#9B9894] sm:text-[11px]">
                {content.eyebrow}
              </p>
              <BlinkingCaret className="font-mono text-[12px] leading-none text-[#D4A853]/80" />
            </div>

            <h1
          id="initiation-hero-heading"
              className="max-w-[13ch] font-serif text-[2.85rem] font-semibold leading-[0.9] tracking-[-0.045em] text-[#E8E6E3] sm:text-[4rem] lg:text-[5rem]"
            >
              <ScrambleText
                as="span"
                className="block"
                text="Your business"
                delayMs={80}
                onComplete={handleLine1ScrambleComplete}
              />
              {line2ScrambleReady ? (
                <ScrambleText
                  as="span"
                  className="block"
                  text="knows when you"
                  delayMs={40}
                  onComplete={handleLine2ScrambleComplete}
                />
              ) : (
                <span className="block">knows when you</span>
              )}
              <HeadlineDisappear
                className="block text-[#DB2777]"
                text="disappear."
                active={disappearFadeActive}
              />
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-[#C2BFBA] sm:mt-6 sm:text-base sm:leading-8 lg:max-w-lg">
              {content.subheadline}
            </p>

            <div className="mt-6 flex flex-col gap-3 lg:hidden">
              <Link
                href={content.primaryCtaTarget}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#E8E6E3] px-7 py-3.5 text-[15px] font-semibold text-[#030304] shadow-[0_8px_32px_rgba(232,230,227,0.18)] transition hover:bg-white"
              >
                {content.primaryCta}
              </Link>
              <Link
                href={content.secondaryCtaTarget}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/20 bg-white/[0.05] px-7 py-3 text-sm font-semibold text-[#E8E6E3] transition hover:border-[#DB2777]/40 hover:bg-[#DB2777]/[0.06]"
              >
                {content.secondaryCta}
              </Link>
              {content.funnelHelperCopy ? (
                <p className="text-sm leading-6 text-[#9B9894]">{content.funnelHelperCopy}</p>
              ) : null}
            </div>
          </div>

          {/* B — spotlight reveal: flashlight in the dark over the OS */}
          <div className="order-2 flex w-full justify-start lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <HeroSpotlightReveal
              clues={content.spotlight.clues}
              caption={content.spotlight.caption}
            />
          </div>

          {/* C — actions (desktop; mobile CTAs live under subheadline for first-viewport visibility) */}
          <div className="order-3 hidden max-w-xl lg:col-start-1 lg:row-start-2 lg:block">
            <p className="font-mono text-[11px] leading-6 tracking-[0.02em] text-[#D4A853]/70">
              // most operators never see the layer underneath.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={content.primaryCtaTarget}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#E8E6E3] px-7 py-3 text-sm font-semibold text-[#030304] transition hover:bg-white"
              >
            {content.primaryCta}
          </Link>
              <Link
                href={content.secondaryCtaTarget}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-7 py-3 text-sm font-semibold text-[#E8E6E3] transition hover:border-[#DB2777]/40 hover:bg-[#DB2777]/[0.06]"
              >
            {content.secondaryCta}
          </Link>
        </div>
            {content.funnelHelperCopy ? (
              <p className="mt-4 max-w-md text-sm leading-6 text-[#9B9894]">{content.funnelHelperCopy}</p>
            ) : null}
          </div>
        </motion.div>

        {/* Telemetry footer: the system's voice + scroll cue */}
        <motion.footer
          className="relative z-10 flex items-end justify-between gap-4"
          style={reduce ? undefined : { opacity: cueOpacity }}
        >
          <HeroPressureReadout />
          <div className="hidden items-center gap-2.5 sm:flex" aria-hidden="true">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#9B9894]/45">
              scroll
            </span>
            <span className="flex h-7 w-4 justify-center rounded-full border border-white/15 pt-1.5">
              {!reduce ? (
                <motion.span
                  className="h-1.5 w-1 rounded-full bg-[#DB2777]"
                  animate={{ y: [0, 7, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : (
                <span className="h-1.5 w-1 rounded-full bg-[#DB2777]" />
              )}
            </span>
          </div>
        </motion.footer>
    </section>
    </ContinuityAct1>
  );
}

// The founder dependency core. A conic gauge that fills as the reader traces
// each symptom to themselves, then overloads — the "you didn't see that coming"
// payoff of routing your own business through one person.
function FounderCore({ count, total, full, reduce }) {
  const deg = (count / total) * 360;

  // Magnetic pull: the core leans toward the cursor (within tight limits) and
  // tilts in 3D — a small psychological tug that makes it feel sentient.
  const anchorRef = useRef(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const mvRx = useMotionValue(0);
  const mvRy = useMotionValue(0);
  const springCfg = { stiffness: 130, damping: 15, mass: 0.4 };
  const x = useSpring(mvX, springCfg);
  const y = useSpring(mvY, springCfg);
  const rotateX = useSpring(mvRx, springCfg);
  const rotateY = useSpring(mvRy, springCfg);

  useEffect(() => {
    if (reduce) return undefined;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    function onMove(e) {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      mvX.set(clamp(dx / 14, -20, 20));
      mvY.set(clamp(dy / 14, -20, 20));
      mvRy.set(clamp(dx / 26, -10, 10));
      mvRx.set(clamp(-dy / 26, -10, 10));
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, mvX, mvY, mvRx, mvRy]);

  return (
    <div className="flex flex-col items-center" style={{ perspective: 700 }}>
      <div ref={anchorRef} className="relative">
      <motion.div
        className="relative grid h-44 w-44 place-items-center rounded-full sm:h-48 sm:w-48 lg:h-96 lg:w-96"
        style={{
          background: `conic-gradient(#DB2777 ${deg}deg, rgba(255,255,255,0.05) ${deg}deg)`,
          transition: "background 0.5s ease",
          x: reduce ? 0 : x,
          y: reduce ? 0 : y,
          rotateX: reduce ? 0 : rotateX,
          rotateY: reduce ? 0 : rotateY,
          transformPerspective: 700,
        }}
        animate={full && !reduce ? { scale: [1, 1.035, 1] } : { scale: 1 }}
        transition={full && !reduce ? { duration: 0.7, repeat: Infinity, repeatType: "reverse" } : { duration: 0.3 }}
      >
        {full && !reduce ? (
          <span className="absolute -inset-1 rounded-full ring-2 ring-[#DB2777]/40 animate-pulse" aria-hidden="true" />
        ) : null}
        <div className="grid h-[9.5rem] w-[9.5rem] place-items-center rounded-full bg-[#070409] text-center shadow-[inset_0_0_44px_rgba(0,0,0,0.65)] sm:h-[10.5rem] sm:w-[10.5rem] lg:h-[21rem] lg:w-[21rem]">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9B9894]/55 lg:text-[13px] lg:tracking-[0.3em]">
              routed through you
            </p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-[#F3EFEC] lg:mt-3 lg:text-7xl">
              {String(count).padStart(2, "0")}
              <span className="text-lg text-[#DB2777]/60 lg:text-3xl">/0{total}</span>
            </p>
            <p
              className={`mt-1 font-mono text-[9px] uppercase tracking-[0.24em] lg:mt-3 lg:text-[13px] lg:tracking-[0.3em] ${
                full ? "text-[#DB2777]" : "text-[#9B9894]/45"
              }`}
            >
              {full ? "overloaded" : "dependency load"}
            </p>
          </div>
        </div>
      </motion.div>
      </div>
      <p className="mt-6 max-w-[230px] text-center text-sm leading-6 text-[#9B9894]/75 lg:mt-8 lg:max-w-[300px] lg:text-base lg:leading-7">
        {full
          ? "Every signal terminates at one person. That is not a workflow. That is you."
          : "The founder quietly became the operating layer. Trace where each signal really goes."}
      </p>
    </div>
  );
}

export function InitiationFounderPainSection({ content }) {
  const reduce = useReducedMotion();
  const symptoms = content.body.slice(0, 5);
  const reflection = content.body.slice(5);
  const reflectionLead = reflection.slice(0, -1);
  const reflectionPunch = reflection[reflection.length - 1];

  const { mark } = useProgression();
  const [traced, setTraced] = useState(() => new Set());
  const [flash, setFlash] = useState(0);
  const count = traced.size;
  const total = symptoms.length;
  const pct = total ? count / total : 0;
  const full = count === total;

  // Unconventional parallax: each layer rides scroll at a different speed AND
  // direction, so the field destabilizes while the core stays pinned.
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bloomY = useTransform(scrollYProgress, [0, 1], [-120, 170]);
  const bloomRotate = useTransform(scrollYProgress, [0, 1], [-8, 10]);
  const bloomScale = useTransform(scrollYProgress, [0, 1], [1.18, 0.9]);
  const deepY = useTransform(scrollYProgress, [0, 1], [150, -180]);
  const streakX = useTransform(scrollYProgress, [0, 1], [-260, 260]);
  const headY = useTransform(scrollYProgress, [0, 1], [30, -42]);

  function trace(index) {
    setTraced((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setFlash((f) => f + 1);
    mark("recognition");
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-founder-pain-heading"
      className="relative -mt-20 overflow-hidden bg-[#040406] pb-12 pt-12 sm:-mt-24 sm:pb-16 sm:pt-16 lg:pb-28 lg:pt-36"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-36 bg-gradient-to-b from-[#030304] via-[#030304]/92 to-transparent sm:h-32"
        aria-hidden="true"
      />

      {/* Parallax layer 1 — magenta pressure, drifts DOWN against the read, rotating
          and shrinking; opacity rises with the dependency load. */}
      <motion.div
        className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 z-0 bg-[radial-gradient(58%_55%_at_72%_42%,rgba(219,39,119,0.18),transparent_60%)] transition-opacity duration-700"
        style={{
          opacity: 0.25 + pct * 0.75,
          y: reduce ? 0 : bloomY,
          rotate: reduce ? 0 : bloomRotate,
          scale: reduce ? 1 : bloomScale,
        }}
        aria-hidden="true"
      />
      {/* Parallax layer 2 — blue intelligence, deeper, moves UP (opposite). */}
      <motion.div
        className="pointer-events-none absolute left-[10%] top-[52%] z-0 h-[42vh] w-[42vh] rounded-full blur-[120px]"
        style={{
          y: reduce ? 0 : deepY,
          background: "radial-gradient(circle, rgba(212,168,83,0.10), transparent 70%)",
        }}
        aria-hidden="true"
      />
      {/* Parallax layer 3 — a horizontal pressure streak that slides across as you scroll down. */}
      <motion.div
        className="pointer-events-none absolute left-0 top-[28%] z-0 h-px w-[62%] bg-gradient-to-r from-transparent via-[#DB2777]/30 to-transparent"
        style={{ x: reduce ? 0 : streakX }}
        aria-hidden="true"
      />

      {!reduce && flash > 0 ? (
        <motion.div
          key={flash}
          className="pointer-events-none absolute inset-0 z-[1] bg-[#DB2777]/[0.06]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, full ? 0.7 : 0.45, 0] }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          aria-hidden="true"
        />
      ) : null}

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.56fr_0.44fr] lg:gap-16">
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-1.5 w-1.5">
              {!reduce ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DB2777]/50" />
              ) : null}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#DB2777]" />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9B9894]/60">
              01 / operational weight
            </p>
          </div>

          <motion.div style={reduce ? undefined : { y: headY }}>
            <RevealLine
              as="h2"
              id="initiation-founder-pain-heading"
              className="mt-6 max-w-xl font-serif text-3xl font-semibold leading-[1.02] tracking-[-0.035em] text-[#E8E6E3] sm:text-4xl"
            >
            {content.headline}
          </RevealLine>
          </motion.div>

          <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.18em] text-[#DB2777]/55">
            &gt; trace each signal to its source
          </p>

          <div className="mt-4 space-y-2.5">
            {symptoms.map((line, i) => {
              const isTraced = traced.has(i);
              return (
                <motion.button
                  key={line}
                  type="button"
                  onClick={() => trace(i)}
                  aria-pressed={isTraced}
                  initial={reduce ? false : { opacity: 0, x: -18 }}
                  whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-8% 0px" }}
                  transition={reduce ? undefined : { duration: 0.5, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] }}
                  className={`group flex w-full items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left transition ${
                    isTraced
                      ? "border-[#DB2777]/45 bg-[#DB2777]/[0.07]"
                      : "border-white/[0.07] bg-white/[0.012] hover:border-[#DB2777]/25 hover:bg-white/[0.03]"
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 font-mono text-[10px] tabular-nums ${
                      isTraced ? "text-[#DB2777]" : "text-[#DB2777]/40"
                    }`}
                  >
                    SIG{String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`flex-1 text-[15px] leading-7 transition-colors ${
                      isTraced ? "text-[#E8E6E3]" : "text-[#9B9894] group-hover:text-[#C2BFBA]"
                    }`}
                  >
                    {line}
                  </span>
                  <span
                    className={`mt-0.5 shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors ${
                      isTraced ? "text-[#DB2777]" : "text-[#6B6864] group-hover:text-[#9B9894]"
                    }`}
                  >
                    {isTraced ? "→ you" : "trace"}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-10 border-l-2 border-[#DB2777]/40 pl-6">
            {reflectionLead.map((line, i) => (
              <p
                key={line}
                className={
                  i === 0
                    ? "text-lg leading-8 text-[#C9C4BE]"
                    : "mt-3 text-lg leading-8 text-[#9B9894]"
                }
              >
                {line}
              </p>
            ))}
            <p
              className={`mt-4 text-xl font-semibold leading-8 transition-all duration-700 sm:text-2xl ${
                full
                  ? "text-[#D4A853] [text-shadow:0_0_26px_rgba(212,168,83,0.45)]"
                  : "text-[#9B9894]"
              }`}
            >
              {reflectionPunch}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center lg:sticky lg:top-28 lg:h-fit lg:self-start lg:pt-4">
          <FounderCore count={count} total={total} full={full} reduce={reduce} />
        </div>
      </div>
    </section>
  );
}

// ── 02 THE MIRROR · break the glass ──────────────────────────────────────────
// Not abstract geometry — a real mirror you have to BREAK. It is whole at first
// ("break the glass"); the impact shatters it into IRREGULAR shards of varied
// size and shape (off-center impact, jagged kinked cracks, real gaps between
// pieces). Then each piece you touch REVEALS what still depends on you. Sporadic
// involuntary twitches + a stress flash keep it alive and unnerving; scroll
// parallax and a pointer tilt give it physical depth. Reduced-motion safe.
const MIRROR_IMPACT = [61, 33];
const MIRROR_PERIM = [
  [44, 0],
  [100, 0],
  [100, 40],
  [100, 100],
  [50, 100],
  [0, 100],
  [0, 58],
  [0, 0],
];
const MIRROR_KINKS = [
  [0.5, 3],
  [0.44, -4.5],
  [0.56, 3.5],
  [0.6, -5],
  [0.5, 4],
  [0.46, -3],
  [0.54, 4.5],
  [0.48, -4],
];

const MIRROR_RAYS = MIRROR_PERIM.map(([x, y], i) => {
  const vx = x - MIRROR_IMPACT[0];
  const vy = y - MIRROR_IMPACT[1];
  const len = Math.hypot(vx, vy) || 1;
  const [t, o] = MIRROR_KINKS[i];
  return {
    perim: [x, y],
    k: [MIRROR_IMPACT[0] + vx * t + (-vy / len) * o, MIRROR_IMPACT[1] + vy * t + (vx / len) * o],
  };
});

const MIRROR_SHARDS = MIRROR_PERIM.map((_, i) => {
  const [px, py] = MIRROR_IMPACT;
  const a = MIRROR_RAYS[i];
  const b = MIRROR_RAYS[(i + 1) % MIRROR_RAYS.length];
  const pts = [[px, py], a.k, a.perim, b.perim, b.k];
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  // inset toward centroid → thin dark crack seams + a pulverized core hole
  const inset = pts.map(([x, y]) => [cx + (x - cx) * 0.962, cy + (y - cy) * 0.962]);
  const dx = cx - px;
  const dy = cy - py;
  const dl = Math.hypot(dx, dy) || 1;
  const push = 9 + ((i * 5) % 13);
  return {
    clip: `polygon(${inset.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(", ")})`,
    cx,
    cy,
    bx: (dx / dl) * push,
    by: (dy / dl) * push,
    r: (i % 2 ? 1 : -1) * (2.5 + (i % 4)),
    sx: (dx / dl) * push * 3.2,
    sy: (dy / dl) * push * 3.2,
    sr: (i % 2 ? 1 : -1) * (10 + (i % 5) * 3),
  };
});

const MIRROR_GLASS = {
  backgroundImage:
    "linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.4) 100%), linear-gradient(135deg, #0c0d13 0%, #070709 54%, #0e0a11 100%)",
};

export function InitiationDependencySelectorSection({ content }) {
  const reduce = useReducedMotion();
  const { mark } = useProgression();
  const sectionRef = useRef(null);
  const paneRef = useRef(null);

  const [broken, setBroken] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [twitch, setTwitch] = useState(-1);
  const [flash, setFlash] = useState(0);
  const [stress, setStress] = useState(null);

  const count = content.options.filter((option) => selected.has(option)).length;
  const hasSelection = count > 0;
  const frac = content.options.length ? count / content.options.length : 0;

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const paneY = useTransform(scrollYProgress, [0, 1], [44, -44]);
  const glowY = useTransform(scrollYProgress, [0, 1], [-70, 90]);
  const glowX = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 120, damping: 20 });
  const sry = useSpring(ry, { stiffness: 120, damping: 20 });

  function onPaneMove(event) {
    const el = paneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    if (!reduce) {
      rx.set(ny * -9);
      ry.set(nx * 9);
      if (!broken) {
        setStress({ x: (nx + 0.5) * 100, y: (ny + 0.5) * 100 });
      }
    }
  }

  function onPaneLeave() {
    rx.set(0);
    ry.set(0);
    setStress(null);
  }

  function breakGlass() {
    if (broken) return;
    setBroken(true);
    mark("mirror");
  }

  function toggleShard(option) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  }

  // Involuntary: a random shard flinches at irregular intervals.
  useEffect(() => {
    if (reduce || !broken) return undefined;
    let timer;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setTwitch(Math.floor(Math.random() * content.options.length));
        window.setTimeout(() => setTwitch(-1), 200);
        schedule();
      }, 2200 + Math.random() * 3800);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [reduce, broken, content.options.length]);

  // Involuntary: a magenta pulse rips across the glass on no fixed beat.
  useEffect(() => {
    if (reduce || !broken) return undefined;
    let timer;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setFlash((f) => f + 1);
        schedule();
      }, 6000 + Math.random() * 7000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [reduce, broken]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-dependency-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#050507] py-12 sm:py-16 lg:py-28"
    >
      <SectionBleed />
      <motion.div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
        style={{
          opacity: 0.18 + frac * 0.6,
          x: reduce ? 0 : glowX,
          y: reduce ? 0 : glowY,
          background: "radial-gradient(50% 50% at 72% 44%, rgba(219,39,119,0.13), transparent 62%)",
        }}
        aria-hidden="true"
      />

      <RevealSection>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-14">
          <div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#DB2777]/75">02 / what still depends on you</p>
              <span className="h-px flex-1 bg-gradient-to-r from-[#DB2777]/30 to-transparent" />
            </div>

            <h2
              id="initiation-dependency-heading"
              className="mt-6 font-serif text-4xl font-semibold leading-[1.0] tracking-[-0.04em] text-[#F3EFEC] sm:text-5xl lg:text-6xl"
            >
            {content.title}
          </h2>

            <p className="mt-5 max-w-md text-base leading-8 text-[#9B9894] sm:text-[17px]">{content.prompt}</p>

            <div
              className={
                hasSelection
                  ? "mt-9 border-l-2 border-[#DB2777] bg-gradient-to-r from-[#DB2777]/[0.08] to-transparent py-4 pl-5"
                  : "mt-9 border-l-2 border-white/10 py-4 pl-5"
              }
              aria-live="polite"
              aria-atomic="true"
            >
              {hasSelection ? (
                content.resultCopy.map((line, index) => (
                  <p
                    key={line}
                    className={
                      index === 0
                        ? "font-mono text-[11px] uppercase tracking-[0.24em] text-[#DB2777]"
                        : "mt-3 text-base leading-8 text-[#D8D4CE]"
                    }
                  >
                    {line}
                  </p>
                ))
              ) : (
                <>
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#DB2777]/55">
                    {broken ? "glass broken" : "reflection intact"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#7E7B77]">
                    {broken
                      ? "Touch a piece. Name what still routes through you."
                      : "The glass holds everything you carry. Break it to see what it is hiding."}
                  </p>
                </>
              )}
            </div>

            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.24em] text-[#6F6C68]">
              <span className="text-[#DB2777]">{String(count).padStart(2, "0")}</span> /{" "}
              {String(content.options.length).padStart(2, "0")} revealed
            </p>
          </div>

          {/* THE MIRROR — break it, then touch the pieces */}
          <motion.div
            className="relative aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-[4/3]"
            style={{ y: reduce ? 0 : paneY }}
          >
            <motion.div
              ref={paneRef}
              onMouseMove={onPaneMove}
              onMouseLeave={onPaneLeave}
              className="relative h-full w-full [transform-style:preserve-3d]"
              style={{
                rotateX: srx,
                rotateY: sry,
                transformPerspective: 1000,
                filter: "drop-shadow(0 40px 90px rgba(0,0,0,0.65))",
              }}
            >
              {!broken ? (
                <button
                  type="button"
                  onClick={breakGlass}
                  aria-label="Break the glass to reveal what depends on you"
                  className="group absolute inset-0 cursor-pointer overflow-hidden focus:outline-none"
                >
                  <span className="absolute inset-0" style={MIRROR_GLASS} aria-hidden="true" />
                  <span
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.05) 49%, transparent 57%)",
                    }}
                    aria-hidden="true"
                  />
                  {stress && !reduce ? (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full"
                      aria-hidden="true"
                    >
                      {[0, 1, 2, 3, 4, 5].map((kk) => {
                        const ang = (kk / 6) * Math.PI * 2 + 0.5;
                        const len = 5 + (kk % 3) * 4;
                        return (
                          <line
                            key={kk}
                            x1={stress.x}
                            y1={stress.y}
                            x2={stress.x + Math.cos(ang) * len}
                            y2={stress.y + Math.sin(ang) * len}
                            stroke="rgba(220,225,235,0.35)"
                            strokeWidth="0.28"
                          />
                        );
                      })}
                    </svg>
                  ) : null}
                  <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#DB2777]/50">
                      {!reduce ? (
                        <span className="absolute inset-0 animate-ping rounded-full border border-[#DB2777]/40" />
                      ) : null}
                      <span className="h-2 w-2 rounded-full bg-[#DB2777] shadow-[0_0_18px_rgba(219,39,119,0.85)]" />
                    </span>
                    <span className="font-mono text-[12px] uppercase tracking-[0.34em] text-[#DB2777] transition group-hover:text-[#F7D7E6]">
                      break the glass
                    </span>
                    <span className="max-w-[13rem] text-center text-xs leading-5 text-white/45">
                      Tap to shatter the reflection and see what it is hiding.
                    </span>
                  </span>
                  <span
                    className="absolute inset-0"
                    style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.7)" }}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <>
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: "radial-gradient(20% 20% at 61% 33%, rgba(219,39,119,0.22), transparent 70%)" }}
                    aria-hidden="true"
                  />

                  {content.options.map((option, i) => {
                    const shard = MIRROR_SHARDS[i % MIRROR_SHARDS.length];
                    const active = selected.has(option);
                    const tw = twitch === i;
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        aria-label={option}
                        onClick={() => toggleShard(option)}
                        className="absolute inset-0 focus:outline-none focus-visible:[filter:brightness(1.25)_drop-shadow(0_0_14px_rgba(219,39,119,0.9))]"
                        style={{ clipPath: shard.clip, zIndex: active ? 6 : 2 }}
                        initial={reduce ? false : { x: shard.sx, y: shard.sy, rotate: shard.sr, opacity: 0 }}
                        animate={{
                          x: (active ? shard.bx : 0) + (tw ? 2.5 : 0),
                          y: (active ? shard.by : 0) + (tw ? -2 : 0),
                          rotate: (active ? shard.r : 0) + (tw ? 1.2 : 0),
                          opacity: tw ? 0.76 : 1,
                          filter: active
                            ? "brightness(1.18) drop-shadow(0 0 16px rgba(219,39,119,0.5))"
                            : "brightness(0.92)",
                        }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 160, damping: 15, opacity: { duration: 0.18 } }
                        }
                      >
                        <span className="absolute inset-0" style={MIRROR_GLASS} aria-hidden="true" />
                        <span
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              "linear-gradient(135deg, rgba(255,255,255,0.1), transparent 26%, transparent 74%, rgba(0,0,0,0.55))",
                          }}
                          aria-hidden="true"
                        />
                        {active ? (
                          <span
                            className="absolute inset-0"
                            style={{ background: "rgba(219,39,119,0.17)" }}
                            aria-hidden="true"
                          />
                        ) : null}
                      </motion.button>
              );
            })}

                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 z-[7] h-full w-full transition-opacity duration-700"
                    style={{ opacity: 0.5 + frac * 0.4 }}
                    aria-hidden="true"
                  >
                    {MIRROR_RAYS.map((rayItem, i) => (
                      <polyline
                        key={i}
                        points={`${MIRROR_IMPACT[0]},${MIRROR_IMPACT[1]} ${rayItem.k[0].toFixed(1)},${rayItem.k[1].toFixed(1)} ${rayItem.perim[0]},${rayItem.perim[1]}`}
                        fill="none"
                        stroke="rgba(220,225,235,0.22)"
                        strokeWidth="0.3"
                      />
                    ))}
                    <polygon
                      points={MIRROR_RAYS.map((r) => `${r.k[0].toFixed(1)},${r.k[1].toFixed(1)}`).join(" ")}
                      fill="none"
                      stroke="rgba(219,39,119,0.22)"
                      strokeWidth="0.3"
                    />
                  </svg>

                  {content.options.map((option, i) => {
                    const shard = MIRROR_SHARDS[i % MIRROR_SHARDS.length];
                    const active = selected.has(option);
                    return (
                      <span
                        key={`lbl-${option}`}
                        className="pointer-events-none absolute z-10 max-w-[6.5rem] text-center font-mono text-[9px] uppercase leading-tight tracking-[0.16em] transition-all duration-300 sm:text-[10px]"
                        style={{
                          left: `${shard.cx}%`,
                          top: `${shard.cy}%`,
                          transform: `translate(-50%, -50%) translate(${active ? shard.bx : 0}px, ${active ? shard.by : 0}px)`,
                          color: active ? "#F7D7E6" : "rgba(255,255,255,0.18)",
                          textShadow: active ? "0 0 12px rgba(219,39,119,0.85)" : "none",
                        }}
                      >
                        {active ? option : "·"}
                      </span>
                    );
                  })}

                  {flash > 0 && !reduce ? (
                    <motion.div
                      key={flash}
                      className="pointer-events-none absolute inset-0 z-[8] bg-[#DB2777]/[0.06]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.7, 0, 0.3, 0] }}
                      transition={{ duration: 0.5 }}
                      aria-hidden="true"
                    />
                  ) : null}

                  <div
                    className="pointer-events-none absolute inset-0 z-[9]"
                    style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.72)" }}
                    aria-hidden="true"
                  />
                </>
              )}
            </motion.div>
          </motion.div>
          </div>
      </RevealSection>
    </section>
  );
}

// THE PRISON FAKE-OUT. The reader is shown a calm, polished "everything is
// healthy" surface and given a beat to believe it — then it glitches, tears,
// and dissolves to expose the scattered truth underneath. After this, the reader
// distrusts every calm surface the page shows. Reduced-motion: truth shown plainly.
function ConfessionRealityBreak({ surface, breakLine, scattered }) {
  const reduce = useReducedMotion();
  const { mark } = useProgression();
  const ref = useRef(null);
  const nearView = useInView(ref, { margin: "0px 0px -15% 0px" });
  const wasNear = useRef(false);
  const [broken, setBroken] = useState(reduce);
  const brokenRef = useRef(reduce);

  // The reader breaks the surface themselves — a deliberate click / tap (or
  // Enter/Space) shatters the "nominal" facade. Hover no longer fires it, so the
  // reader gets to read the calm surface before they choose to break it.
  const trigger = useCallback(() => {
    if (brokenRef.current) return;
    brokenRef.current = true;
    setBroken(true);
    mark("confession");
  }, [mark]);

  // Reduced motion: skip straight to the exposed reality.
  useEffect(() => {
    if (reduce) trigger();
  }, [reduce, trigger]);

  // Fallback ONLY if they scroll past without interacting — so the copy is never
  // permanently hidden, but the reveal never auto-fires while it's on screen.
  // The reader's hover/tap/focus stays the intended trigger.
  useEffect(() => {
    if (reduce) return;
    if (nearView) {
      wasNear.current = true;
    } else if (wasNear.current && !broken) {
      trigger();
    }
  }, [nearView, reduce, broken, trigger]);

  return (
    <div ref={ref} className="relative mt-12 min-h-[460px] sm:min-h-[430px]">
      <AnimatePresence>
        {!broken ? (
          <motion.div
            key="surface"
            className="absolute inset-0 flex items-center justify-center"
            initial={false}
            exit={{ opacity: 0, scale: 1.06, filter: "blur(13px)", x: [0, -9, 7, -3, 0] }}
            transition={{ duration: 0.55, ease: "easeIn" }}
          >
            <motion.div
              role="button"
              tabIndex={0}
              aria-label="Click to break the surface and reveal what was underneath"
              onClick={trigger}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  trigger();
                }
              }}
              initial={false}
              animate={
                reduce
                  ? {}
                  : {
                      x: [0, 0, 0, 0, -2.5, 3, -1.5, 1, 0],
                      skewX: [0, 0, 0, 0, -1.4, 1.1, 0, 0, 0],
                      opacity: [1, 1, 1, 1, 0.82, 1, 0.9, 1, 1],
                    }
              }
              transition={
                reduce
                  ? undefined
                  : {
                      duration: 3.6,
                      repeat: Infinity,
                      repeatDelay: 1,
                      times: [0, 0.55, 0.78, 0.84, 0.87, 0.9, 0.93, 0.96, 1],
                      ease: "easeInOut",
                    }
              }
              whileHover={reduce ? undefined : { scale: 1.012 }}
              whileTap={reduce ? undefined : { scale: 0.985 }}
              className="group relative w-full max-w-xl cursor-pointer rounded-[2rem] border border-white/[0.12] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-8 text-center shadow-[0_34px_130px_rgba(0,0,0,0.45)] transition-[border-color] duration-300 hover:border-[#DB2777]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]/50 sm:p-10"
            >
              {!reduce ? (
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[2rem] mix-blend-screen"
                  style={{ background: "linear-gradient(160deg, rgba(219,39,119,0.16), transparent 42%)" }}
                  animate={{ opacity: [0, 0, 0, 0, 0.7, 0, 0.45, 0, 0] }}
                  transition={{
                    duration: 3.6,
                    repeat: Infinity,
                    repeatDelay: 1,
                    times: [0, 0.55, 0.78, 0.84, 0.87, 0.9, 0.93, 0.96, 1],
                    ease: "easeOut",
                  }}
                />
              ) : null}
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.28em] text-[#6FB58E]">
                  <span className="relative flex h-1.5 w-1.5">
                    {!reduce ? (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6FB58E]/50" />
                    ) : null}
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6FB58E]" />
                  </span>
                  system status: all good
                </div>
                <p className="mt-7 text-sm leading-7 text-[#9B9894]">{surface[0]}</p>
                <p className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-[-0.02em] text-[#EEF1ED] sm:text-3xl">
                  {surface[1]}
                </p>
                <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.26em] text-[#9B9894]/40">
                  the version everyone saw
                </p>
                {!reduce ? (
                  <motion.span
                    animate={{ opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="mt-6 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[#DB2777] group-hover:text-[#F7D7E6]"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#DB2777] shadow-[0_0_10px_rgba(219,39,119,0.8)]" />
                    <span className="sm:hidden">tap to break the surface</span>
                    <span className="hidden sm:inline">click to break the surface</span>
                  </motion.span>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {broken ? (
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.26em] text-[#DB2777]">
            // surface integrity lost
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-[#E8E6E3] sm:text-xl">
            {breakLine}
          </p>
          <div className="mx-auto mt-9 grid max-w-3xl grid-cols-2 gap-3 sm:gap-4">
            {scattered.map((line, i) => {
              const rot = [-3, 2.5, -2, 3][i % 4];
              return (
                <motion.div
                  key={line}
                  initial={reduce ? false : { opacity: 0, y: 20, rotate: rot * 2.2 }}
                  animate={{ opacity: 1, y: 0, rotate: rot }}
                  transition={{ duration: 0.5, delay: 0.28 + i * 0.13, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl border border-[#DB2777]/25 bg-[#120A10]/75 px-4 py-4 shadow-[0_14px_50px_rgba(0,0,0,0.4)]"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#DB2777]/55">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#C2BFBA]">{line}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      {broken && !reduce ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="absolute left-0 right-0 top-[34%] h-px bg-white/55 mix-blend-screen shadow-[0_0_22px_rgba(255,255,255,0.55)]" />
          <div className="absolute inset-0 bg-[#DB2777]/[0.04]" />
        </motion.div>
      ) : null}
    </div>
  );
}

// Eerie watcher for the confession cascade: dusty CRT with scanlines. Optional
// `broadcastLines` cycles copy on the glass (desktop "on air" beat). Reduced-motion:
// static frame. Purely decorative when aria-hidden; broadcast mode exposes live text.
function FounderCrtTvBroadcast({ lines, reduce, inView }) {
  const [active, setActive] = useState(0);
  const [flicker, setFlicker] = useState(false);

  useEffect(() => {
    if (reduce || !inView || lines.length === 0) return undefined;
    const id = window.setInterval(() => {
      setFlicker(true);
      setActive((a) => (a + 1) % lines.length);
      window.setTimeout(() => setFlicker(false), 120);
    }, 3400);
    return () => window.clearInterval(id);
  }, [reduce, inView, lines.length]);

  if (reduce) {
    return (
      <div className="absolute inset-0 flex flex-col justify-end p-[10%] pb-[12%]">
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#6FB58E]/80">on air</p>
        <div className="mt-2 space-y-1">
          {lines.map((line, i) => (
            <p
              key={line}
              className={`font-mono text-[10px] leading-snug text-[#6FB58E]/90 ${i === lines.length - 1 ? "opacity-100" : "opacity-55"}`}
            >
              {String(i + 1).padStart(2, "0")} {line}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 grid grid-rows-[auto_1fr_auto] px-[7%] pb-[6%] pt-[5%]"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[clamp(6px,3.2cqw,11px)] uppercase tracking-[0.22em] text-[#6FB58E]/90 [text-shadow:0_0_8px_rgba(111,181,142,0.65)]">
          ● on air
        </span>
        <span className="font-mono text-[clamp(5px,2.6cqw,9px)] uppercase tracking-[0.14em] text-[#6FB58E]/55">
          founder channel
        </span>
      </div>

      <div className="relative flex min-h-0 flex-col justify-end self-stretch">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{
              opacity: flicker ? [1, 0.72, 1] : 1,
              y: 0,
              filter: "blur(0px)",
            }}
            exit={{ opacity: 0, y: -5, filter: "blur(3px)" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-end"
          >
            <span className="font-mono text-[clamp(7px,3.4cqw,12px)] tabular-nums text-[#DB2777]/75">
              {String(active + 1).padStart(2, "0")}
            </span>
            <p className="mt-0.5 font-mono text-[clamp(8px,4.2cqw,15px)] leading-[1.25] text-[#8FE8B0] [text-shadow:0_0_10px_rgba(111,181,142,0.55)]">
              {lines[active]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-1.5 flex shrink-0 gap-0.5">
        {lines.map((line, i) => (
          <span
            key={line}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i === active ? "bg-[#6FB58E]/85" : "bg-[#6FB58E]/20"
            }`}
            aria-hidden="true"
          />
              ))}
            </div>
    </div>
  );
}

function FounderCrtTv({ progressTarget, broadcastLines, stage = false }) {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, { once: false, margin: "-20% 0px" });
  const { scrollYProgress } = useScroll({
    target: progressTarget,
    offset: ["start end", "end start"],
  });
  const onAir = Boolean(broadcastLines?.length);
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduce || onAir ? ["0%", "0%"] : ["-4%", "4%"]
  );
  const ghost = useTransform(scrollYProgress, [0.45, 0.62, 0.85, 0.98], [0, 0.92, 0.92, 0]);
  const ghostX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-7, 7]);
  // Pixel-mapped to crt-tv.png (682×1024) inner glass — audit: x 25–547, y 285–531.
  const screen = {
    left: "3.67%",
    top: "27.83%",
    width: "76.54%",
    height: "25.1%",
  };

  return (
    <div
      ref={wrapRef}
      className={`relative mx-auto w-full ${
        stage
          ? "max-w-[280px] sm:max-w-[340px] lg:max-w-[520px] xl:max-w-[620px] 2xl:max-w-[680px]"
          : "max-w-[240px] sm:max-w-[280px]"
      }`}
      aria-hidden={onAir ? undefined : "true"}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-6 h-32 bg-[radial-gradient(ellipse_at_center,rgba(219,39,119,0.14),transparent_70%)] blur-2xl lg:h-48 xl:h-56"
      />
      <motion.div style={{ y }} className="relative">
        <div className="relative aspect-[682/1024] w-full">
          <Image
            src="/founder/crt-tv.png"
            alt=""
            fill
            sizes={
              stage
                ? "(min-width: 1536px) 680px, (min-width: 1280px) 620px, (min-width: 1024px) 520px, (min-width: 640px) 340px, 280px"
                : "(min-width: 640px) 280px, 240px"
            }
            className="select-none object-contain"
          />

          {/* live screen — mapped to CRT glass (682×1024 asset audit) */}
          <div
            className="absolute overflow-hidden [container-type:size] [transform-origin:50%_46%]"
            style={{
              ...screen,
              borderRadius: "6% 6% 8% 8% / 17% 17% 21% 21%",
              transform: "perspective(1400px) rotateX(1.25deg)",
            }}
          >
            {onAir ? (
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_80%_at_50%_42%,rgba(111,181,142,0.16),transparent_72%)]"
                aria-hidden="true"
              />
          ) : null}
            <div
              className="absolute inset-0 bg-black/15"
              aria-hidden="true"
            />

            {!reduce ? (
              <motion.div
                className="absolute inset-0 mix-blend-screen"
                style={{ backgroundImage: RANSOM_GRAIN, backgroundSize: "110px 110px" }}
                animate={{ opacity: [0.05, 0.17, 0.08, 0.14, 0.06] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{ backgroundImage: RANSOM_GRAIN, backgroundSize: "110px 110px" }}
              />
            )}

            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, rgba(0,0,0,0.55) 0 1px, transparent 1px 3px)",
              }}
            />

            {!reduce ? (
              <motion.div
                className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-white/12 to-transparent"
                animate={{ y: ["-40%", "140%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
            ) : null}

            {onAir ? (
              <FounderCrtTvBroadcast lines={broadcastLines} reduce={reduce} inView={inView} />
            ) : (
              <motion.div
                style={{ opacity: reduce ? 0.24 : ghost, x: ghostX }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3"
              >
                <span className="font-mono text-[8px] uppercase tracking-[0.34em] text-[#6FB58E]/85 [text-shadow:0_0_8px_rgba(111,181,142,0.7)]">
                  status: nominal
                </span>
                <svg viewBox="0 0 100 20" className="w-4/5 text-[#6FB58E]/75" fill="none">
                  <motion.path
                    d="M0 10 H38 l2.5 -7 l2 9 l2.5 -8 l2 6 H100"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 0 4px rgba(111,181,142,0.6))" }}
                    animate={reduce ? {} : { opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </motion.div>
            )}

            {/* glass curvature + vignette — soft edge blend into bezel */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                boxShadow:
                  "inset 0 0 28px 12px rgba(0,0,0,0.48), inset 0 10px 22px rgba(255,255,255,0.03)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.14]"
              style={{
                background:
                  "radial-gradient(ellipse 94% 90% at 50% 44%, rgba(255,255,255,0.1), transparent 72%)",
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </motion.div>

      {!onAir ? (
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-[#9B9894]/35">
          the channel no one switched off
        </p>
      ) : null}
    </div>
  );
}

export function InitiationFounderStorySection({ content }) {
  const sectionRef = useRef(null);
  const body = content.body;

  const surface = body.slice(1, 3);
  const breakLine = body[3];
  const scattered = body.slice(4, 8);
  const movement = body.slice(8, 10);
  const consequenceChain = body.slice(10, 13);
  const finalTruth = body.slice(13);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-founder-story-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#07070C] py-12 sm:py-16 lg:py-36"
    >
      <SectionBleed />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(219,39,119,0.08),transparent_30%),radial-gradient(circle_at_82%_72%,rgba(212,168,83,0.05),transparent_32%)]"
        aria-hidden="true"
      />

      <RevealSection>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          {/* Chapter opener — one definitive section header, not a floating sidebar */}
          <header className="max-w-4xl border-l-2 border-[#DB2777]/35 pl-5 sm:pl-6">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#DB2777]/70">
              03 / founder story
            </p>
          <RevealLine
            as="h2"
            id="initiation-founder-story-heading"
              className="mt-5 font-serif text-3xl font-semibold leading-[1.02] tracking-[-0.035em] text-[#F3EFEC] sm:text-4xl lg:text-5xl"
          >
            {content.headline}
          </RevealLine>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-[#E8E6E3] sm:text-xl sm:leading-9">
              {body[0]}
            </p>
          </header>

          {/* 03a — the surface (fake calm → break → scattered truth) */}
          <div className="mt-16 sm:mt-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#9B9894]/55">
              03a / from the outside
            </p>
            <p className="mt-2 text-sm uppercase tracking-[0.2em] text-[#9B9894]/65">
              The business looked strong from the outside.
            </p>
            <ConfessionRealityBreak surface={surface} breakLine={breakLine} scattered={scattered} />
          </div>

          {/* 03b — the cascade (copy left, CRT broadcast in the old stack slot) */}
          <div className="mt-20 border-t border-white/[0.08] pt-16 sm:mt-24 sm:pt-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#DB2777]/65">
              03b / when handoffs slip
            </p>

            <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:items-center lg:gap-10 xl:gap-14">
              <div className="max-w-xl lg:max-w-none lg:pr-4">
                <p className="text-sm leading-6 text-[#9B9894] sm:text-base">{movement[0]}</p>
                <p className="mt-2 text-lg font-semibold leading-8 tracking-[-0.02em] text-[#F3EFEC] sm:text-xl lg:mt-3">
                  {movement[1]}
                </p>
              </div>

              <div className="mt-8 flex justify-center sm:mt-10 lg:mt-0 lg:justify-end lg:self-center">
                <div className="w-full max-w-[320px] sm:max-w-[360px] lg:max-w-none">
                  <FounderCrtTv
                    progressTarget={sectionRef}
                    broadcastLines={consequenceChain}
                    stage
                  />
                  <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-[#9B9894]/40 sm:text-[10px] lg:text-right">
                    the channel no one switched off
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 03c — the truth (section climax — still part 03, not a transition) */}
          <div className="mt-16 border-t border-[#DB2777]/20 pt-16 sm:mt-20 sm:pt-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#DB2777]/65">
              03c / what broke
            </p>
            {(() => {
              const truthLine = finalTruth[finalTruth.length - 1];
              const ACCENT = "not";
              const SUFFIX = "strong enough";
              const accentIdx = truthLine.indexOf(ACCENT);
              const prefix =
                accentIdx >= 0 ? truthLine.slice(0, accentIdx).trim() : "The system was";
              const afterAccent =
                accentIdx >= 0 ? truthLine.slice(accentIdx + ACCENT.length).trim() : truthLine;
              const suffixIdx = afterAccent.indexOf(SUFFIX);
              const suffix = suffixIdx >= 0 ? SUFFIX : afterAccent;
              const post =
                suffixIdx >= 0 ? afterAccent.slice(suffixIdx + SUFFIX.length).trim() : "";
              return (
                <div className="mt-8 rounded-[2rem] border border-[#DB2777]/15 bg-[#120A10]/40 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
                  <p className="text-base leading-8 text-[#9B9894]">{finalTruth[0]}</p>
                  <div className="mt-8 max-w-2xl space-y-3">
                    <p className="font-serif text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.03em] text-[#F3EFEC] sm:text-3xl lg:text-4xl">
                      {prefix}
                    </p>
                    <div className="py-1 text-[2rem] leading-none sm:text-[2.75rem] lg:text-[3.25rem]">
                      <RansomText text={ACCENT} baseSize={1.15} scrollReveal />
                    </div>
                    <p className="font-serif text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.03em] text-[#F3EFEC] sm:text-3xl lg:text-4xl">
                      {suffix}
                    </p>
                  </div>
                  {post ? (
                    <p className="mt-6 max-w-2xl text-xl leading-9 text-[#C2BFBA] sm:text-2xl">{post}</p>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </div>
      </RevealSection>
    </section>
  );
}

// Ransom-note treatment. Each letter is a torn scrap from a different source —
// mismatched fonts, papers, rotations — assembled into an accusation. Styling is
// deterministic (seeded by index) so server and client render identically.
const RANSOM_FONTS = [
  "Georgia, 'Times New Roman', serif",
  "'Courier New', Courier, monospace",
  "Arial, Helvetica, sans-serif",
  "Impact, 'Arial Narrow Bold', sans-serif",
  "'Times New Roman', Times, serif",
  "'Trebuchet MS', Verdana, sans-serif",
];

const RANSOM_PAPERS = [
  { bg: "#ECE6D8", fg: "#15110B" },
  { bg: "#F3F0E6", fg: "#1A1A1A" },
  { bg: "#1B1A17", fg: "#EDE8DC" },
  { bg: "#DED7C5", fg: "#1A1712" },
  { bg: "#0B0B0C", fg: "#E8E6E3" },
  { bg: "#C7C0AE", fg: "#16130D" },
  { bg: "#DB2777", fg: "#0B0B0C" },
];

// Hand-tuned torn-paper silhouettes (kept slightly irregular but never
// degenerate). Picked per letter so every scrap looks ripped from elsewhere.
const RANSOM_CLIPS = [
  "polygon(2% 6%, 38% 0%, 72% 5%, 100% 2%, 97% 44%, 100% 92%, 64% 100%, 30% 96%, 3% 100%, 0% 58%)",
  "polygon(0% 8%, 30% 2%, 68% 0%, 98% 7%, 100% 50%, 96% 96%, 62% 100%, 26% 94%, 4% 99%, 2% 50%)",
  "polygon(4% 2%, 40% 6%, 74% 0%, 96% 6%, 100% 46%, 98% 90%, 70% 98%, 34% 100%, 6% 95%, 0% 52%)",
  "polygon(0% 4%, 34% 0%, 70% 6%, 100% 0%, 96% 48%, 100% 94%, 66% 100%, 28% 98%, 2% 100%, 4% 50%)",
  "polygon(3% 0%, 36% 8%, 70% 2%, 100% 8%, 95% 50%, 99% 88%, 60% 100%, 32% 92%, 0% 98%, 2% 46%)",
];

// Inline fractal-noise grain, multiplied over each scrap so paper reads as fiber
// and ink rather than flat fill.
const RANSOM_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

function ransomRand(seed) {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

function RansomText({ text, className = "", baseSize = 1.6, scrollReveal = false }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  // Scroll-linked assembly: each torn scrap slams into place tied to scroll
  // position, so the accusation builds slow and painful at the reader's own pace
  // (no auto-play). The window is intentionally long so it takes real scrolling.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 88%", "start 22%"] });
  const [p, setP] = useState(reduce || !scrollReveal ? 1 : 0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduce || !scrollReveal) return;
    setP(Math.min(1, Math.max(0, v)));
  });

  const letters = useMemo(
    () =>
      text.split("").map((ch, i) => {
        const font = RANSOM_FONTS[Math.floor(ransomRand(i * 12.9898 + 1) * RANSOM_FONTS.length)];
        const paper = RANSOM_PAPERS[Math.floor(ransomRand(i * 78.233 + 2) * RANSOM_PAPERS.length)];
        const clip = RANSOM_CLIPS[Math.floor(ransomRand(i * 21.41 + 6) * RANSOM_CLIPS.length)];
        const rotate = (ransomRand(i * 37.719 + 3) - 0.5) * 15;
        const size = 0.82 + ransomRand(i * 9.137 + 4) * 0.54;
        const yShift = (ransomRand(i * 5.117 + 5) - 0.5) * 10;
        const taped = ransomRand(i * 3.77 + 7) > 0.74;
        const tapeRot = (ransomRand(i * 8.21 + 8) - 0.5) * 22;
        return { ch, font, paper, clip, rotate, size, yShift, taped, tapeRot, key: i };
      }),
    [text],
  );

  // How many scraps are mid-landing at once — smaller = more strictly one-by-one.
  const SPREAD = 1.8;
  const total = text.length || 1;
  const easeOut = (x) => 1 - Math.pow(1 - x, 2.2);

  return (
    <span
      ref={ref}
      className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-3 ${className}`}
      aria-label={text}
    >
      {letters.map((l) => {
        if (l.ch === " ") {
          return <span key={l.key} className="w-2.5 sm:w-3.5" aria-hidden="true" />;
        }

        const scrap = (
          <>
            <span
              className="block px-2 py-1 font-bold leading-none"
              style={{
                fontFamily: l.font,
                color: l.paper.fg,
                backgroundColor: l.paper.bg,
                backgroundImage: RANSOM_GRAIN,
                backgroundBlendMode: "multiply",
                fontSize: `${l.size * baseSize}em`,
                clipPath: l.clip,
              }}
            >
              {l.ch}
            </span>
            {l.taped ? (
              <span
                aria-hidden="true"
                className="absolute left-1/2 -top-1.5 h-2.5 w-7 -translate-x-1/2"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(228,222,205,0.42), rgba(200,193,173,0.30))",
                  transform: `translateX(-50%) rotate(${l.tapeRot}deg)`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.28)",
                }}
              />
            ) : null}
          </>
        );

        if (scrollReveal && !reduce) {
          const lp = easeOut(Math.min(1, Math.max(0, (p * (total + SPREAD) - l.key) / SPREAD)));
          return (
            <span
              key={l.key}
              aria-hidden="true"
              className="relative inline-block"
              style={{
                opacity: lp,
                transform: `translateY(${-22 + (l.yShift + 22) * lp}px) rotate(${
                  l.rotate * 2.3 + (l.rotate - l.rotate * 2.3) * lp
                }deg) scale(${0.44 + 0.56 * lp})`,
                filter: "drop-shadow(2px 5px 4px rgba(0,0,0,0.55))",
                willChange: "transform, opacity",
              }}
            >
              {scrap}
            </span>
          );
        }

        return (
          <motion.span
            key={l.key}
            aria-hidden="true"
            className="relative inline-block"
            style={{
              filter: "drop-shadow(2px 5px 4px rgba(0,0,0,0.55))",
              ...(reduce ? { transform: `rotate(${l.rotate}deg)` } : null),
            }}
            initial={reduce ? false : { opacity: 0, y: -18, rotate: l.rotate * 2.2, scale: 0.5 }}
            whileInView={reduce ? undefined : { opacity: 1, y: l.yShift, rotate: l.rotate, scale: 1 }}
            viewport={{ once: true, margin: "-12% 0px" }}
            transition={
              reduce ? undefined : { duration: 0.4, delay: l.key * 0.055, ease: [0.34, 1.56, 0.64, 1] }
            }
          >
            {scrap}
          </motion.span>
        );
      })}
    </span>
  );
}

/*
  ───────────────────────────────────────────────────────────────────────────
  ARC — luminance + tension. The page IS the product: pressure made visible,
  then lifted. Dark → light = "a business that becomes lighter to operate."

  ACT I · THE WEIGHT (near-black, magenta pressure) — dig the pain.
    Hero · 01 Recognition · 02 Mirror · 03 Confession
  ACT II · THE TURN (black, amber intelligence + first amber) — the reveal.
    04 Reframe · 05 Category · 06 System appears (sunrise dashboard / light pivot)
  ACT III · LIGHTER TO OPERATE (graphite warming to bone) — proof → relief.
    07 Friday · 08 Compounding · 09 Confidence · 10 Pillars
    11 Diagnostic · 12 Entry · 13 Final CTA (full light payoff)

  Accent language: magenta #DB2777 = pressure
  · amber #D4A853 = intelligence / the system / truth / relief.
  ───────────────────────────────────────────────────────────────────────────
*/

// Smoky seam: soft fade to near-black at top and bottom so adjacent dark
// sections dissolve into each other instead of meeting at a hard line. Tall and
// translucent on purpose — the transitions should feel murky, not organized.
function SectionBleed({ strength = 0.7, top = true, bottom = true }) {
  return (
    <>
      {top ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-32 sm:h-40"
          style={{ background: `linear-gradient(to bottom, rgba(3,3,4,${strength}), transparent)` }}
          aria-hidden="true"
        />
      ) : null}
      {bottom ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 sm:h-40"
          style={{ background: `linear-gradient(to top, rgba(3,3,4,${strength}), transparent)` }}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

// Reusable involuntary trigger: a sporadic glitch that fires on no fixed beat.
// To avoid the "same horizontal line on every slide" feel, it rotates through
// several flavors — scanline, TV vertical-roll, fractal static, a sound-wave
// equalizer, and a terminal trace. variant="auto" picks a random one per pulse;
// pass a specific name to pin a section. Reduced-motion: silent.
const GLITCH_VARIANTS = ["scanline", "roll", "static", "wave", "terminal"];

function SectionGlitchOverlay({ accent = "#DB2777", variant = "auto", z = "z-[3]" }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [pulse, setPulse] = useState(0);
  const [kind, setKind] = useState("scanline");

  useEffect(() => {
    if (reduce) return undefined;
    let timer;
    const loop = () => {
      timer = window.setTimeout(
        () => {
          setKind(
            variant === "auto"
              ? GLITCH_VARIANTS[Math.floor(Math.random() * GLITCH_VARIANTS.length)]
              : variant,
          );
          setPulse((p) => p + 1);
          loop();
        },
        4200 + Math.random() * 7200,
      );
    };
    loop();
    return () => window.clearTimeout(timer);
  }, [reduce, variant]);

  if (reduce || pulse === 0) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${z}`} aria-hidden="true">
      {kind === "scanline" ? (
        <motion.div
          key={pulse}
          className="absolute inset-x-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow: `0 0 12px ${accent}`,
          }}
          initial={{ top: "-2%", opacity: 0 }}
          animate={{ top: ["0%", "100%"], opacity: [0, 0.85, 0] }}
          transition={{ duration: 0.5, ease: "linear" }}
        />
      ) : kind === "roll" ? (
        <motion.div
          key={pulse}
          className="absolute inset-x-0 h-20"
          style={{ background: `linear-gradient(to bottom, transparent, ${accent}26, transparent)` }}
          initial={{ top: "-25%", opacity: 0 }}
          animate={{ top: ["-25%", "110%"], opacity: [0, 0.6, 0.6, 0] }}
          transition={{ duration: 0.7, ease: "linear" }}
        />
      ) : kind === "static" ? (
        <motion.svg
          key={pulse}
          className="absolute inset-0 h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.16, 0.05, 0.14, 0] }}
          transition={{ duration: 0.42 }}
        >
          <filter id={`gn-${uid}-${pulse}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
              seed={pulse}
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#gn-${uid}-${pulse})`} />
        </motion.svg>
      ) : kind === "wave" ? (
        <motion.div
          key={pulse}
          className="absolute inset-x-0 top-1/2 flex h-16 -translate-y-1/2 items-center justify-center gap-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.55, 0] }}
          transition={{ duration: 0.6 }}
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.span
              key={i}
              className="w-[2px] rounded-full"
              style={{ backgroundColor: accent }}
              initial={{ height: 2 }}
              animate={{
                height: [2, 4 + Math.abs(Math.sin(i * 0.5)) * 30 * (0.4 + Math.random() * 0.6), 2],
              }}
              transition={{ duration: 0.5, delay: i * 0.004, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={pulse}
          className="absolute bottom-5 left-5 font-mono text-[10px] tracking-[0.2em]"
          style={{ color: accent }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.2, 1, 0] }}
          transition={{ duration: 0.7 }}
        >
          {`› 0x${Math.floor(Math.random() * 0xffffff)
            .toString(16)
            .padStart(6, "0")} :: trace`}
          <span
            className="ml-1 inline-block h-3 w-[7px] translate-y-[2px] align-middle"
            style={{ backgroundColor: accent }}
          />
        </motion.div>
      )}
    </div>
  );
}

// Reusable scroll parallax: a MotionValue that drifts `from`→`to` as the target
// scrolls through the viewport. Pair with style={{ y }} on a motion element.
function useParallaxValue(ref, from, to) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  return useTransform(scrollYProgress, [0, 1], [from, to]);
}

// Shared noir section shell for the reframed page: sticky chapter index + rail,
// act-driven accent and background. Replaces the retired SectionGrid/mint shell.
function StorySection({ id, index, label, accent = "#DB2777", bg = "#0A0A11", aside, children }) {
  return (
    <section
      id={id}
      className="relative z-10 scroll-mt-24 overflow-hidden py-24 sm:py-28 lg:py-32"
      style={{ backgroundColor: bg }}
    >
      <SectionBleed />
      <RevealSection>
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.26fr_0.74fr] lg:gap-14">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-l pl-5" style={{ borderColor: `${accent}40` }}>
              <p className="font-mono text-xs uppercase tracking-[0.28em]" style={{ color: `${accent}cc` }}>
                {index}
              </p>
              <p className="mt-3 max-w-[14rem] text-sm uppercase tracking-[0.2em] text-[#9B9894]/65">
                {label}
              </p>
              {aside ? <div className="mt-8">{aside}</div> : null}
            </div>
          </aside>
          <div>{children}</div>
        </div>
      </RevealSection>
    </section>
  );
}

// ── 04 REFRAME · "That is dependency." ───────────────────────────────────────
// UNIQUE (Layer 3): the founder-roles stack ONTO one figure and physically pile
// up (weight) until "Scale it!" scatters the pile — growth breaks a one-person
// system. Verdict lands in clean type after the collapse.
const REFRAME_SCATTER = [
  { x: -34, y: -18, rotate: -14, scale: 0.9 },
  { x: 28, y: -26, rotate: 11, scale: 0.88 },
  { x: -10, y: 8, rotate: 8, scale: 0.92 },
  { x: 36, y: -4, rotate: -10, scale: 0.86 },
  { x: -40, y: 16, rotate: 15, scale: 0.84 },
  { x: 6, y: 22, rotate: -12, scale: 0.9 },
];

export function InitiationContinuityReframeSection({ content, inlineCta }) {
  const reduce = useReducedMotion();
  const { mark } = useProgression();
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-25% 0px" });

  const roles = content.body.slice(0, 6);
  const smallTruth = content.body[6];
  const liability = content.body[7];
  const realization = content.body[8];
  const notScale = content.body[9];
  const dependency = content.body[10];

  const [loaded, setLoaded] = useState(reduce ? roles.length : 0);
  const [buckled, setBuckled] = useState(false);
  const [crushed, setCrushed] = useState(false);

  const drift = useParallaxValue(sectionRef, reduce ? 0 : 36, reduce ? 0 : -36);
  const fullyLoaded = loaded >= roles.length;
  const loadPct = Math.round((loaded / roles.length) * 100);
  const tilts = [-1.4, 1.1, -0.8, 1.5, -1.1, 0.7];

  // The weight piles on, one responsibility at a time, as you arrive.
  useEffect(() => {
    if (reduce || !inView || buckled || loaded >= roles.length) return undefined;
    const timer = window.setTimeout(() => setLoaded((n) => n + 1), 480);
    return () => window.clearTimeout(timer);
  }, [inView, loaded, buckled, reduce, roles.length]);

  // After the buckle, "scale" crushes and reforms as "dependency".
  useEffect(() => {
    if (!buckled) return undefined;
    if (reduce) {
      setCrushed(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setCrushed(true), 900);
    return () => window.clearTimeout(timer);
  }, [buckled, reduce]);

  function buckle() {
    if (buckled) return;
    setBuckled(true);
    mark("reframe");
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-continuity-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-transparent py-12 sm:py-16 lg:py-32"
    >
      <SectionBleed top />
      <SectionGlitchOverlay accent="#DB2777" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(219,39,119,0.08),transparent_32%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-40 sm:h-48"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(3,3,4,0.45) 55%, rgba(3,3,4,0.92) 100%)",
        }}
        aria-hidden="true"
      />

      <RevealSection>
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#DB2777]/75">
              04 / operational continuity
            </p>
            <h2
              id="initiation-continuity-heading"
              className="mt-7 font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#F3EFEC] sm:text-5xl lg:text-6xl"
            >
            {content.headline}
          </h2>
          <RevealLine
            as="p"
              delayMs={120}
              className="mx-auto mt-7 max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#D4A853] sm:text-3xl lg:text-4xl"
          >
            {content.subheadline}
          </RevealLine>
          </div>

          {/* THE PILE — responsibilities stack, then scatter when you try to scale */}
          <div className="relative mx-auto mt-14 w-full max-w-md sm:max-w-lg lg:max-w-xl" style={{ perspective: 1000 }}>
            <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em]">
              <span style={{ color: buckled ? "#DB2777" : fullyLoaded ? "#DB2777" : "#9B9894" }}>
                {buckled ? "overload" : "load"}
              </span>
              <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ backgroundColor: buckled ? "#DB2777" : fullyLoaded ? "#DB2777" : "#D4A853" }}
                  animate={{ width: buckled ? "100%" : `${loadPct}%` }}
                  transition={{ ease: "easeOut", duration: 0.4 }}
                />
                {buckled && !reduce ? (
                  <motion.span
                    className="absolute inset-y-0 right-0 w-[18%] rounded-full bg-[#DB2777]/50"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: [0.4, 0.85, 0.4], x: [0, 4, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden="true"
                  />
                ) : null}
              </span>
              <span style={{ color: buckled ? "#DB2777" : fullyLoaded ? "#DB2777" : "#9B9894" }}>
                {buckled ? "fail" : `${loadPct}%`}
              </span>
            </div>

            <motion.div
              style={{ y: drift, transformOrigin: "center bottom" }}
              animate={
                buckled && !reduce
                  ? { x: [0, -2, 2, -1, 0], y: 0 }
                  : fullyLoaded && !reduce && !buckled
                    ? { x: [0, -1.5, 1.5, -1, 0] }
                    : {}
              }
              transition={
                buckled && !reduce
                  ? { x: { duration: 0.35, ease: "easeOut" }, y: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                  : { duration: 0.45, repeat: Infinity, repeatDelay: 1.6 }
              }
            >
              <div
                className={
                  buckled
                    ? "relative flex min-h-[360px] flex-col sm:min-h-[380px]"
                    : "relative flex flex-col gap-1.5"
                }
              >
                <div
                  className={
                    buckled
                      ? "relative mx-auto flex min-h-[240px] w-full max-w-[340px] flex-1 items-center justify-center sm:min-h-[260px]"
                      : "relative flex flex-col gap-1.5"
                  }
                >
                  {roles.map((_, i) => {
                    const idx = roles.length - 1 - i;
                    const role = roles[idx];
                    const on = idx < loaded;
                    const tilt = tilts[idx] || 0;
                    const scatter = REFRAME_SCATTER[idx] || REFRAME_SCATTER[0];
                    return (
                      <motion.div
                        key={role}
                        initial={false}
                        animate={
                          !on
                            ? { opacity: 0, y: -26, rotate: tilt * 2, x: 0, scale: 1 }
                            : buckled
                              ? {
                                  opacity: 0.92,
                                  x: scatter.x,
                                  y: scatter.y,
                                  rotate: scatter.rotate,
                                  scale: scatter.scale,
                                }
                              : { opacity: 1, y: 0, x: 0, rotate: tilt, scale: 1 }
                        }
                        transition={
                          buckled
                            ? { type: "spring", stiffness: 420, damping: 22, delay: idx * 0.04 }
                            : { type: "spring", stiffness: 260, damping: 18 }
                        }
                        className={`rounded-lg border px-4 py-3 ${
                          buckled
                            ? "absolute left-1/2 top-1/2 w-[88%] max-w-[320px] -translate-x-1/2 -translate-y-1/2 border-[#DB2777]/35 bg-gradient-to-b from-[#1a0a12]/90 to-[#0a0608]/95 shadow-[0_16px_40px_rgba(0,0,0,0.55)] sm:max-w-[340px]"
                            : "border-white/[0.1] bg-gradient-to-b from-white/[0.07] to-white/[0.02]"
                        }`}
                        style={
                          buckled
                            ? {
                                zIndex: idx + 1,
                                boxShadow:
                                  "0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(219,39,119,0.12)",
                              }
                            : { boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }
                        }
                      >
                        <p className="text-sm leading-6 text-[#D8D4CE] sm:text-[15px]">{role}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  className={`relative w-full overflow-hidden rounded-lg border bg-[#DB2777]/[0.06] ${
                    buckled ? "mt-2 shrink-0 border-[#DB2777]/50 sm:mt-3" : "mt-1.5 border-[#DB2777]/30"
                  }`}
                  style={{ transformOrigin: "center" }}
                  animate={
                    buckled
                      ? reduce
                        ? { scaleX: 0.94, scaleY: 0.72, rotate: -1, y: 0, opacity: 0.82 }
                        : { scaleX: 0.92, scaleY: 0.68, rotate: [-0.5, 1.5, -1], y: 0, opacity: 0.85 }
                      : { scaleY: 1 - (loaded / roles.length) * 0.4, scaleX: 1, rotate: 0, y: 0, opacity: 1 }
                  }
                  transition={
                    buckled && !reduce
                      ? { rotate: { duration: 0.5, ease: "easeOut" }, default: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                      : { ease: "easeOut", duration: 0.4 }
                  }
                >
                  <div className="flex min-h-[52px] items-center justify-between px-4 py-3.5 sm:min-h-[56px] sm:py-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#DB2777]">
                      the founder
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#DB2777]/70">
                      {buckled ? "collapsed" : "bearing the load"}
                    </span>
                  </div>
                  {buckled ? (
                    <>
                      <svg
                        viewBox="0 0 100 6"
                        preserveAspectRatio="none"
                        className="absolute inset-x-0 top-0 h-2 w-full"
                        aria-hidden="true"
                      >
                        <polyline
                          points="0,3 8,1 18,5 28,0 38,6 48,1 58,5 68,0 78,4 88,6 100,2"
                          fill="none"
                          stroke="#DB2777"
                          strokeWidth="0.8"
                        />
                      </svg>
                      <div
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_46%,rgba(219,39,119,0.15)_46.5%,rgba(219,39,119,0.15)_47.5%,transparent_48%)]"
                        aria-hidden="true"
                      />
                    </>
                  ) : null}
                </motion.div>
              </div>
            </motion.div>

            <div className="mt-7 min-h-[3.5rem] text-center">
              {!fullyLoaded ? (
                <p className="text-sm leading-7 text-[#7E7B77]">{smallTruth}</p>
              ) : !buckled ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#DB2777]">
                    structure straining
                  </p>
                  <button
                    type="button"
                    onClick={buckle}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#D4A853] px-7 py-3 text-sm font-semibold text-[#1a1205] transition hover:bg-[#e0b766] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
                  >
                    Scale it
                    <span aria-hidden="true">↑</span>
                  </button>
          </div>
              ) : null}
            </div>
          </div>

          {/* THE TRAP SPRINGS — growth is the load that breaks it */}
          <AnimatePresence>
            {buckled ? (
              <motion.div
                key="trap"
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mx-auto mt-14 max-w-3xl text-center"
              >
                <RevealLine
                  as="p"
                  className="font-serif text-2xl font-semibold leading-snug tracking-[-0.025em] text-[#F3EFEC] sm:text-3xl"
                >
                  {liability}
                </RevealLine>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#B8B5B0] sm:text-[17px]">
                  {realization}
                </p>

                <div className="relative mt-10 flex h-[4.5rem] items-center justify-center sm:h-24">
                  <AnimatePresence mode="wait">
                    {!crushed ? (
                      <motion.p
                        key="notscale"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { scaleY: 0.12, opacity: 0, filter: "blur(5px)" }}
                        transition={{ duration: 0.35 }}
                        style={{ transformOrigin: "center 65%" }}
                        className="font-serif text-3xl font-semibold tracking-[-0.03em] text-[#F3EFEC] sm:text-5xl"
                      >
                        {notScale}
                      </motion.p>
                    ) : (
                      <motion.p
                        key="dep"
                        initial={reduce ? false : { scale: 1.25, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 420, damping: 16 }}
                        className="font-serif text-4xl font-semibold tracking-[-0.04em] text-[#DB2777] sm:text-6xl"
                        style={{ textShadow: "0 0 30px rgba(219,39,119,0.4)" }}
                      >
                        {dependency}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </RevealSection>
      {inlineCta ? (
        <InlineCtaAnchor
          href={inlineCta.href}
          label={inlineCta.label}
          tone="dark"
          embedded
        />
      ) : null}
    </section>
  );
}

// ── 05 CATEGORY BREAK · "Prompting is still work." ───────────────────────────
// UNIQUE (Layer 3): the SITCOM device — render a bright, cheerful "AI dashboard"
// fantasy (fake wins, laugh-track energy), then strip the set away to expose the
// work that still lands on the founder. Mind-fuck: the comforting AI illusion,
// killed on screen.
export function InitiationAICategorySection({ content }) {
  const reduce = useReducedMotion();
  const { mark } = useProgression();
  const sectionRef = useRef(null);

  const items = content.body.slice(1, 6);
  const reality = content.body[6];
  const aftermath = content.body.slice(7);

  const [completed, setCompleted] = useState(reduce ? items.length : 0);
  const [killed, setKilled] = useState(false);
  const [glitchRow, setGlitchRow] = useState(-1);

  const setDrift = useParallaxValue(sectionRef, reduce ? 0 : 30, reduce ? 0 : -30);
  const allDone = completed >= items.length;

  // The set assembles itself — work ticks to "done" one satisfying row at a time.
  useEffect(() => {
    if (reduce || killed || completed >= items.length) return undefined;
    const timer = window.setTimeout(() => setCompleted((c) => c + 1), 520);
    return () => window.clearTimeout(timer);
  }, [completed, killed, reduce, items.length]);

  // Involuntary: once it looks "handled", a random row keeps flickering back to
  // YOU. The comfort never quite holds. (Foreshadows the strike.)
  useEffect(() => {
    if (reduce || killed || !allDone) return undefined;
    let timer;
    const loop = () => {
      timer = window.setTimeout(() => {
        setGlitchRow(Math.floor(Math.random() * items.length));
        window.setTimeout(() => setGlitchRow(-1), 260);
        loop();
      }, 1800 + Math.random() * 2600);
    };
    loop();
    return () => window.clearTimeout(timer);
  }, [reduce, killed, allDone, items.length]);

  function strike() {
    if (killed) return;
    setKilled(true);
    mark("category");
  }

  const accent = killed ? "#DB2777" : "#D4A853";

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-ai-category-heading"
      className="relative z-10 hidden scroll-mt-24 overflow-hidden bg-transparent py-24 sm:py-28 lg:block lg:py-32"
    >
      <SectionBleed top={false} />
      <SectionGlitchOverlay accent={accent} />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-40 sm:h-48"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,3,4,0.92) 0%, rgba(3,3,4,0.45) 45%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-700"
        style={{
          background: killed
            ? "radial-gradient(60% 50% at 50% 30%, rgba(219,39,119,0.09), transparent 62%)"
            : "radial-gradient(60% 50% at 50% 22%, rgba(212,168,83,0.08), transparent 62%)",
        }}
        aria-hidden="true"
      />

      <RevealSection>
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <p
              className="font-mono text-xs uppercase tracking-[0.3em] transition-colors duration-500"
              style={{ color: killed ? "rgba(219,39,119,0.8)" : "rgba(212,168,83,0.8)" }}
            >
              05 / why ai isn't enough
            </p>
            <span
              className="h-px flex-1 transition-[background] duration-500"
              style={{
                background: `linear-gradient(to right, ${
                  killed ? "rgba(219,39,119,0.3)" : "rgba(212,168,83,0.3)"
                }, transparent)`,
              }}
            />
          </div>

          <h2
            id="initiation-ai-category-heading"
            className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1.0] tracking-[-0.04em] text-[#F3EFEC] sm:text-5xl lg:text-6xl"
          >
            {content.headline}
          </h2>

          <p className="mt-6 max-w-2xl text-base leading-8 text-[#9B9894] sm:text-[17px]">
            {content.body[0]}
          </p>

          <motion.div style={{ y: setDrift }} className="relative mt-12 min-h-[26rem]">
            <AnimatePresence mode="wait" initial={false}>
              {!killed ? (
                <motion.div
                  key="set"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    reduce
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: 70,
                          scale: 0.95,
                          filter: "grayscale(1) brightness(0.55)",
                          rotate: -1.4,
                        }
                  }
                  transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-gradient-to-br from-[#FDFBF5] to-[#ECE3D2] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.5)] sm:p-8"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                    <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.24em] text-black/45">
                      your tools, synced
                    </span>
                    <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#28C840]/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1c7a32]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#28C840]" />
                      {allDone ? "all tracked" : "syncing"}
                    </span>
                  </div>

                  <ul className="mt-7 space-y-2.5">
                    {items.map((item, i) => {
                      const done = i < completed;
                      const glitched = glitchRow === i;
                      return (
                        <motion.li
                          key={item}
                          animate={glitched ? { x: [0, -3, 3, 0] } : { x: 0 }}
                          transition={{ duration: 0.24 }}
                          className="flex items-center justify-between rounded-xl border px-4 py-3 transition-colors duration-200"
                          style={{
                            opacity: done ? 1 : 0.5,
                            borderColor: glitched ? "rgba(192,57,43,0.5)" : "rgba(0,0,0,0.06)",
                            backgroundColor: glitched ? "rgba(192,57,43,0.06)" : "rgba(255,255,255,0.7)",
                          }}
                        >
                          <span className="text-sm font-medium text-black/75">{item}</span>
                          {glitched ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c0392b]">
                              still on you
                            </span>
                          ) : done ? (
                            <motion.span
                              initial={reduce ? false : { scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 18 }}
                              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1c7a32]"
                            >
                              done
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#28C840] text-[9px] text-white">
                                ✓
                              </span>
                            </motion.span>
                          ) : (
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/30">
                              ···
                            </span>
                          )}
                        </motion.li>
                      );
                    })}
                  </ul>

                  <div className="mt-6">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                      <motion.div
                        className="h-full rounded-full bg-[#28C840]"
                        animate={{ width: `${(completed / items.length) * 100}%` }}
                        transition={{ ease: "easeOut", duration: 0.4 }}
                      />
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/35">
                        {allDone ? "[ looks handled ]" : "tracking…"}
                      </p>
                      {allDone ? (
                        <motion.button
                          type="button"
                          onClick={strike}
                          initial={reduce ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]"
                        >
                          Strike the set
                        </motion.button>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="reality"
                  initial={reduce ? false : { opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-[1.75rem] border border-[#DB2777]/20 bg-[#08080d] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.6)] sm:p-10"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#DB2777]/70">
                    laugh track cuts
                  </p>
                  <p className="mt-6 max-w-3xl font-serif text-2xl font-semibold leading-snug tracking-[-0.025em] text-[#F3EFEC] sm:text-3xl">
                    {reality}
                  </p>
                  <div className="mt-8 max-w-2xl space-y-4">
                    {aftermath.map((line) => (
                      <p key={line} className="text-base leading-8 text-[#B8B5B0] sm:text-[17px]">
                        {line}
                      </p>
                    ))}
                  </div>
                  <div className="mt-10 border-l-2 border-[#DB2777] pl-6">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#DB2777]/70">
                      the line in the sand
                    </p>
          <RevealLine
            as="p"
                      className="mt-3 font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-[#DB2777] sm:text-6xl"
          >
            {content.requiredLine}
          </RevealLine>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </RevealSection>
    </section>
  );
}

// Warm bloom behind the rising dashboard — decorative only; reduced-motion: static glow.
function SunriseBloom({ reduce, style }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2"
      style={style}
      aria-hidden="true"
    >
      <div
        className="h-[min(92vw,720px)] w-[min(92vw,720px)] rounded-full blur-[80px] sm:blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(212,168,83,0.42) 0%, rgba(244,228,196,0.18) 34%, transparent 72%)",
        }}
      />
      {!reduce ? (
        <motion.div
          className="absolute inset-0 rounded-full blur-[60px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,248,235,0.28) 0%, rgba(212,168,83,0.12) 40%, transparent 70%)",
          }}
          animate={{ opacity: [0.45, 0.85, 0.5], scale: [0.96, 1.06, 0.98] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </motion.div>
  );
}

// Hypnagogic copy: each line blurs up out of nothing, then keeps a slow float +
// opacity shimmer on its OWN out-of-sync clock so the block breathes like a
// half-remembered thought rather than sitting as a static frame. Optional glow
// keeps a very subtle lift — no heavy text-shadow bloom. Reduced-motion: static.
function DreamLine({ as = "p", id, className, children, index = 0, reduce, glow = false }) {
  if (reduce) {
    const Plain = as;
    return (
      <Plain id={id} className={className}>
        {children}
      </Plain>
    );
  }
  const M = motion[as];
  const dur = 7 + (index % 3) * 1.7;
  const phase = (index % 4) * 0.8;
  const floatAnim = glow
    ? {
        y: [0, -3, 0, 2, 0],
        opacity: [1, 0.96, 1],
      }
    : {
        y: [0, -4, 0, 3, 0],
        opacity: [1, 0.98, 1],
      };
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(5px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 1.3, delay: 0.16 * index, ease: [0.16, 1, 0.3, 1] }}
    >
      <M
        id={id}
        className={className}
        animate={floatAnim}
        transition={{ duration: dur, delay: 1.6 + phase, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </M>
    </motion.div>
  );
}

const STUDIOFLOWS_REVEAL_DASHBOARD_SRC = "/product/hero-flow/01-action-center.png";
const STUDIOFLOWS_REVEAL_DASHBOARD_SIZES =
  "(min-width: 1536px) 2400px, (min-width: 1024px) 1920px, (min-width: 640px) 1200px, 100vw";

export function InitiationStudioFlowsRevealSection({ content }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start start", "end end"],
  });

  // Sunrise dashboard: black → product rises (scale + amber bloom) → light radiates → white wipe.
  // 0→0.52 rise · 0.52→0.68 hold · 0.68→0.82 radiate · 0.78→1 wipe. Copy stays below stage.
  const dashboardOpacity = useTransform(scrollYProgress, [0, 0.24, 0.52, 0.78], [0, 0.7, 1, 0.25]);
  const dashboardScale = useTransform(scrollYProgress, [0, 0.52, 0.68], [0.28, 1, 1.03]);
  const dashboardY = useTransform(scrollYProgress, [0, 0.52], ["44%", "0%"]);
  const horizonGlow = useTransform(scrollYProgress, [0.06, 0.42, 0.72], [0, 1, 0.35]);
  const bloomScale = useTransform(scrollYProgress, [0.3, 0.56, 0.82], [0.55, 1.25, 2.35]);
  const bloomOpacity = useTransform(scrollYProgress, [0.28, 0.5, 0.68, 0.84], [0, 0.5, 0.92, 0]);
  const rimGlow = useTransform(scrollYProgress, [0.38, 0.56, 0.72], [0, 1, 0.55]);
  const whiteWipe = useTransform(scrollYProgress, [0.78, 1], [0, 1]);
  const lightProgress = useTransform(scrollYProgress, [0.78, 1], [0, 1]);
  const darkVeil = useTransform(scrollYProgress, [0, 0.52, 0.78], [1, 0.45, 0]);

  const parchmentStyle = { opacity: reduce ? 0.85 : lightProgress };
  const darkVeilStyle = { opacity: reduce ? 0.2 : darkVeil };
  const whiteWipeStyle = { opacity: reduce ? 0 : whiteWipe };
  const dashboardMotion = reduce
    ? { opacity: 1, y: 0, scale: 1 }
    : { opacity: dashboardOpacity, y: dashboardY, scale: dashboardScale };
  const bloomMotion = reduce
    ? { opacity: 0.55, scale: 1.15 }
    : { opacity: bloomOpacity, scale: bloomScale };
  const horizonStyle = { opacity: reduce ? 0.6 : horizonGlow };
  const rimStyle = { opacity: reduce ? 0.7 : rimGlow };

  return (
    <section
      id={content.anchor}
      ref={sectionRef}
      aria-labelledby="initiation-studioflows-reveal-heading"
      className="relative z-10 scroll-mt-24 bg-black"
    >
      <div ref={stageRef} className="relative z-10 hidden h-[200vh] lg:block">
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
          <p className="absolute inset-x-0 top-[10vh] z-20 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-[#D4A853]/70 sm:top-[11vh] sm:text-xs sm:tracking-[0.3em]">
            06 / studioflows os
          </p>

          {/* horizon — amber edge before the sun breaks */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[52vh]"
            style={{
              ...horizonStyle,
              background:
                "linear-gradient(to top, rgba(212,168,83,0.34) 0%, rgba(212,168,83,0.1) 28%, transparent 72%)",
            }}
            aria-hidden="true"
          />

          <SunriseBloom reduce={reduce} style={bloomMotion} />

          {/* operations dashboard — rises from the bottom like a sun */}
          <motion.div
            className="absolute inset-x-0 bottom-0 flex items-end justify-center px-4 pb-[8vh] pt-[10vh] sm:px-8 sm:pb-[9vh]"
            style={{
              ...dashboardMotion,
              transformOrigin: "50% 100%",
            }}
          >
            <div className="relative w-full max-w-[min(100%,560px)] sm:max-w-2xl lg:max-w-5xl">
              <motion.div
                className="pointer-events-none absolute -inset-4 rounded-[1.35rem] blur-2xl sm:-inset-6"
                style={{
                  ...rimStyle,
                  background:
                    "radial-gradient(ellipse at 50% 88%, rgba(212,168,83,0.55), rgba(212,168,83,0.12) 42%, transparent 72%)",
                }}
                aria-hidden="true"
              />
              <div className="relative aspect-video overflow-hidden rounded-xl border border-[#D4A853]/25 shadow-[0_32px_100px_rgba(0,0,0,0.65),0_0_0_1px_rgba(212,168,83,0.12)] sm:rounded-2xl">
                <Image
                  src={STUDIOFLOWS_REVEAL_DASHBOARD_SRC}
                  alt="StudioFlows OS operations dashboard"
                  fill
                  unoptimized
                  quality={100}
                  sizes={STUDIOFLOWS_REVEAL_DASHBOARD_SIZES}
                  priority={false}
                  className="object-cover object-left-top"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#D4A853]/[0.07] via-transparent to-transparent"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#D4A853]/20"
                  aria-hidden="true"
                />
              </div>
            </div>
          </motion.div>

          {/* vignette — recedes as light blooms outward */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(68% 62% at 50% 58%, transparent 18%, rgba(0,0,0,0.62) 58%, #000 100%)",
              ...darkVeilStyle,
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black to-transparent"
            aria-hidden="true"
          />
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-black/70 to-black sm:h-28"
            style={darkVeilStyle}
            aria-hidden="true"
          />

          {/* sunrise light pivot — confined to the parallax stage, not the copy block */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-[#F4F1EA]"
            style={parchmentStyle}
            aria-hidden="true"
          />
          <motion.div
            className="pointer-events-none absolute inset-0 bg-[#F7F4ED]"
            style={whiteWipeStyle}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="relative z-10 -mt-0 bg-black pb-12 pt-12 text-center sm:pt-8 lg:-mt-[clamp(5rem,12vh,9rem)] lg:pb-24 lg:pt-2">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black via-black/95 to-transparent"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
          <DreamLine
            as="h2"
            id="initiation-studioflows-reveal-heading"
            index={0}
            reduce={reduce}
            className="font-serif text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl"
          >
            {content.headline}
          </DreamLine>
          <div className="mt-8 space-y-5">
            {content.body.map((text, i) => (
              <DreamLine
                key={text}
                index={i + 1}
                reduce={reduce}
                className="mx-auto max-w-2xl text-[15px] leading-7 text-white/[0.88] sm:text-[17px] sm:leading-8"
              >
                {text}
              </DreamLine>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 07 FRIDAY REPORT · "Again." ──────────────────────────────────────────────
// UNIQUE (Layer 3): the REWIND. A scrubbable VHS "tape" of Thursday night races
// to the panic, stamps "Again.", auto-rewinds and LOOPS (Angela's compulsive
// rewind — rewinding fixes nothing). Hit "Run it with StudioFlows" and the same
// timeline replays, but the system flags the drift EARLY and the emergency never
// lands. Reduced-motion: static end-state, manual mode toggle, no loop.
// Tape timeline: equal time per beat, short hold on climax ("Again." / system resolve).
const FRIDAY_PANIC_HOLD = 0.06;

function fridayBeatSpan() {
  return 1 - FRIDAY_PANIC_HOLD;
}

function fridayBeatMarkers(beatCount) {
  const span = fridayBeatSpan();
  return Array.from({ length: beatCount }, (_, i) => ((i + 1) / beatCount) * span);
}

function fridayBeatIndex(progress, beatCount) {
  const span = fridayBeatSpan();
  if (progress >= span) return beatCount - 1;
  const segment = span / beatCount;
  return Math.min(Math.floor(progress / segment), beatCount - 1);
}

function fridayTimecode(p) {
  const total = 23 * 60 + 6 + Math.round(p * 252); // THU 23:06 → ~03:18
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function InitiationFridayReportSection({ content }) {
  const reduce = useReducedMotion();
  const { mark } = useProgression();
  const sectionRef = useRef(null);
  // Fire only once the section is well into the viewport — so the tape starts
  // "when you get here", not while it's still scrolling up from below.
  const inView = useInView(sectionRef, { margin: "-35% 0px -35% 0px" });
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const started = useRef(false);

  const [mode, setMode] = useState("unaided");
  const [progress, setProgress] = useState(reduce ? 1 : 0);
  const [playing, setPlaying] = useState(false);
  const [rewinding, setRewinding] = useState(false);

  // autoplay loop forward
  useEffect(() => {
    if (reduce || !playing) return undefined;
    const iv = window.setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.00375));
    }, 60);
    return () => window.clearInterval(iv);
  }, [reduce, playing]);

  // play once, then HOLD on the climax — no infinite loop. The visitor is left
  // stuck on "Again." (or on the resolved system view) with the controls + the
  // "Run it with StudioFlows" CTA to move forward at their own pace.
  useEffect(() => {
    if (reduce || progress < 1) return undefined;
    setPlaying(false);
    return undefined;
  }, [progress, reduce]);

  // come alive when scrolled into view
  useEffect(() => {
    if (reduce || !inView || started.current) return;
    started.current = true;
    setPlaying(true);
  }, [inView, reduce]);

  function setFromClientX(cx) {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setProgress(Math.min(1, Math.max(0, (cx - r.left) / r.width)));
  }
  function onPointerDown(e) {
    dragging.current = true;
    setPlaying(false);
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  }
  function onPointerMove(e) {
    if (dragging.current) setFromClientX(e.clientX);
  }
  function endDrag() {
    dragging.current = false;
  }

  function runWithSystem() {
    setMode("system");
    setProgress(0);
    setRewinding(false);
    setPlaying(!reduce);
    mark("friday");
  }
  function replayUnaided() {
    setMode("unaided");
    setProgress(reduce ? 1 : 0);
    setPlaying(!reduce);
  }

  const isSystem = mode === "system";
  const accent = isSystem ? "#D4A853" : "#DB2777";
  const beatSpan = fridayBeatSpan();
  const beatCount = isSystem ? content.systemBeats.length : content.unaidedBeats.length;
  const markers = fridayBeatMarkers(beatCount);
  const beatIndex = fridayBeatIndex(progress, beatCount);
  const systemDone = isSystem && progress >= beatSpan;
  const panic = !isSystem && progress >= beatSpan;

  // narration streams one short beat at a time as the tape advances
  const unaidedBeat = content.unaidedBeats[beatIndex];
  const systemBeat = content.systemBeats[beatIndex];

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-friday-report-heading"
      className="relative z-10 hidden scroll-mt-24 overflow-hidden bg-[#0A0B12] py-24 sm:py-28 lg:block lg:py-32"
    >
      <SectionBleed />
      <SectionGlitchOverlay accent={accent} variant="roll" />

      <RevealSection>
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#D4A853]/80">
              07 / before the emergency
            </p>
            <span className="h-px flex-1 bg-gradient-to-r from-[#D4A853]/30 to-transparent" />
          </div>

          <h2
            id="initiation-friday-report-heading"
            className="mt-6 max-w-3xl font-serif text-3xl font-semibold leading-[1.02] tracking-[-0.035em] text-[#F3EFEC] sm:text-4xl lg:text-5xl"
          >
            {content.headline}
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#C2BFBA] sm:text-[17px]">{content.intro}</p>

          {/* THE TAPE */}
          <div
            className="relative mt-10 overflow-hidden rounded-[1.5rem] border bg-[#070810]"
            style={{ borderColor: isSystem ? "rgba(212,168,83,0.25)" : "rgba(219,39,119,0.25)" }}
          >
            {/* scanlines */}
            <div
              className="pointer-events-none absolute inset-0 z-[2] opacity-[0.14]"
              style={{
                backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0 1px, transparent 1px 3px)",
              }}
              aria-hidden="true"
            />
            {/* rewind streak */}
            {rewinding && !reduce ? (
              <motion.div
                className="pointer-events-none absolute inset-0 z-[3] bg-[#DB2777]/[0.07]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 1.1 }}
                aria-hidden="true"
              >
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-xs uppercase tracking-[0.4em] text-[#DB2777]">
                  ◀◀ rewind
                </div>
              </motion.div>
            ) : null}

            {/* monitor header */}
            <div className="relative z-[2] flex items-center justify-between border-b border-white/[0.06] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <span className="flex items-center gap-2" style={{ color: accent }}>
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                />
                {isSystem ? "studioflows" : "field crew"} · {fridayTimecode(progress)}
              </span>
              <span className="text-[#9B9894]/70">job · 08:00 tomorrow</span>
            </div>

            {/* scene */}
            <div className="relative z-[1] min-h-[13rem] px-6 py-8 sm:min-h-[12rem] sm:px-8">
              {!isSystem ? (
                <AnimatePresence mode="wait">
                  {panic ? (
                    <motion.div
                      key="again"
                      initial={reduce ? false : { opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center text-center"
                    >
                      <motion.p
                        animate={reduce ? {} : { opacity: [1, 0.55, 1] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                        className="font-serif text-6xl font-semibold tracking-[-0.04em] text-[#DB2777] sm:text-8xl"
                        style={{ textShadow: "0 0 40px rgba(219,39,119,0.45)" }}
                      >
                        {content.panicLine}
                      </motion.p>
                    </motion.div>
                  ) : (
                    <motion.p
                      key={unaidedBeat}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="max-w-2xl font-serif text-2xl font-semibold leading-snug tracking-[-0.02em] text-[#E8E4DE] sm:text-3xl"
                    >
                      {unaidedBeat}
                    </motion.p>
                  )}
                </AnimatePresence>
              ) : (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#D4A853]/60">
                    studioflows · scanning
                  </p>
                  {!systemDone ? (
                    <div className="mt-5 min-h-[3.5rem]">
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={beatIndex}
                          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                          transition={{ duration: 0.4 }}
                          className="font-serif text-2xl font-semibold leading-snug tracking-[-0.02em] text-[#F3EFEC] sm:text-3xl"
                        >
                          {systemBeat}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  ) : (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4"
                    >
                      <p className="text-base leading-8 text-[#D8D4CE] sm:text-lg">{content.systemResolve[0]}</p>
                      <p className="mt-2 text-base leading-8 text-[#D8D4CE] sm:text-lg">{content.systemResolve[1]}</p>
                      <div className="mt-6 flex flex-wrap items-baseline gap-x-3">
                        <span className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#F3EFEC] sm:text-3xl">
                          {content.closer.lead}
                        </span>
                        <span className="text-[#9B9894] line-through decoration-[#DB2777]/60">
                          {content.closer.strike}
                        </span>
                        <span className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#D4A853] sm:text-3xl">
                          {content.closer.gold}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* scrub track */}
            <div className="relative z-[2] px-6 pb-3 sm:px-8">
              <div
                ref={trackRef}
                role="slider"
                tabIndex={0}
                aria-label="Scrub the timeline"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="relative h-11 cursor-pointer touch-none select-none focus:outline-none"
              >
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/12" />
                <div
                  className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
                  style={{ width: `${progress * 100}%`, backgroundColor: accent }}
                />
                {/* beat markers — one dot per phrase transition (6 beats → 6 dots) */}
                {markers.map((m, i) => {
                  const lit = progress >= m;
                  const col = isSystem
                    ? lit
                      ? "#D4A853"
                      : "rgba(212,168,83,0.4)"
                    : lit
                      ? "#DB2777"
                      : "rgba(219,39,119,0.45)";
                  return (
                    <span
                      key={i}
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200"
                      style={{ left: `${m * 100}%`, backgroundColor: col }}
                    />
                  );
                })}
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
                  style={{ left: `${progress * 100}%`, backgroundColor: accent }}
                />
              </div>
              <p className="mt-1 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-[#9B9894]/50">
                {isSystem ? content.scrubLabelSystem : content.scrubLabelUnaided}
              </p>

              {isSystem ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {content.revealItems.map((item, i) => {
                    const lit = progress >= (markers[i] ?? beatSpan);
                    return (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-all duration-300"
                        style={{
                          borderColor: lit ? "rgba(212,168,83,0.45)" : "rgba(255,255,255,0.08)",
                          backgroundColor: lit ? "rgba(212,168,83,0.08)" : "transparent",
                          color: lit ? "#E8E6E3" : "rgba(155,152,148,0.35)",
                        }}
                      >
                        <span style={{ color: lit ? "#D4A853" : "transparent" }} aria-hidden="true">
                          ✓
                        </span>
                        {item}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* controls */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4 sm:px-8">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProgress(0)}
                  aria-label="Rewind"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#C9C4BE] transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  ◀◀
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "Pause" : "Play"}
                  disabled={reduce}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#C9C4BE] transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-40"
                >
                  {playing ? "❚❚" : "▶"}
                </button>
              </div>

              {isSystem ? (
                <button
                  type="button"
                  onClick={replayUnaided}
                  className="inline-flex min-h-[44px] items-center px-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[#9B9894] transition hover:text-[#C9C4BE] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  ↺ replay unaided
                </button>
              ) : (
                <button
                  type="button"
                  onClick={runWithSystem}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#D4A853] px-6 py-2.5 text-sm font-semibold text-[#1a1205] transition hover:bg-[#e0b766] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]"
                >
                  Run it with StudioFlows
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </RevealSection>
    </section>
  );
}

// ── 08 COMPOUNDING · the system remembers ────────────────────────────────────
// UNIQUE (Layer 3): operational memory visibly ACCUMULATES as you scroll — a
// lattice wires itself together node by node, the "it learns…" lines ignite in
// sequence, and the outcome meters climb/drop in real time. The system gets
// smarter the longer you stay. Reduced-motion: fully-formed, static.
const MEMORY_NODES = [
  [50, 50],
  [27, 31],
  [73, 29],
  [19, 61],
  [41, 18],
  [63, 65],
  [82, 51],
  [34, 77],
  [58, 35],
  [70, 81],
  [15, 41],
  [45, 63],
];
const MEMORY_EDGES = [
  [0, 1],
  [0, 2],
  [0, 5],
  [0, 8],
  [1, 4],
  [1, 10],
  [1, 3],
  [2, 8],
  [2, 6],
  [5, 6],
  [5, 9],
  [5, 11],
  [3, 7],
  [8, 2],
  [6, 9],
  [11, 7],
  [3, 11],
  [4, 8],
];
const MEMORY_METERS = {
  "Approvals decrease": "down",
  "Routing improves": "up",
  "Execution speeds up": "up",
  "Coordination friction drops": "down",
  "Operational trust increases": "up",
};

// Line-icon set for the "what you get" feature lattice. Every stroke is a motion
// primitive that redraws itself on hover (driven by the parent svg's variant
// state), so the whole icon "writes itself" when the card lights up.
const FEATURE_ICON_DRAW = {
  rest: { pathLength: 1, opacity: 1 },
  draw: { pathLength: [0, 1], opacity: [0.25, 1] },
};

function FeatureIcon({ name, active, reduce }) {
  const p = {
    variants: FEATURE_ICON_DRAW,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  };
  const glyphs = {
    jobs: (
      <>
        <motion.rect x="5" y="4" width="14" height="17" rx="2" {...p} />
        <motion.rect x="9" y="2.5" width="6" height="3" rx="1" {...p} />
        <motion.line x1="9" y1="11" x2="15" y2="11" {...p} />
        <motion.line x1="9" y1="15" x2="15" y2="15" {...p} />
      </>
    ),
    calendar: (
      <>
        <motion.rect x="3" y="4.5" width="18" height="16" rx="2" {...p} />
        <motion.line x1="3" y1="9" x2="21" y2="9" {...p} />
        <motion.line x1="8" y1="2.5" x2="8" y2="6" {...p} />
        <motion.line x1="16" y1="2.5" x2="16" y2="6" {...p} />
        <motion.line x1="11" y1="13.5" x2="13" y2="13.5" {...p} />
      </>
    ),
    records: (
      <>
        <motion.rect x="3" y="5" width="18" height="14" rx="2" {...p} />
        <motion.circle cx="8" cy="11" r="2.1" {...p} />
        <motion.path d="M5 16.2 a3 3 0 0 1 6 0" {...p} />
        <motion.line x1="14" y1="10" x2="18" y2="10" {...p} />
        <motion.line x1="14" y1="14" x2="18" y2="14" {...p} />
      </>
    ),
    team: (
      <>
        <motion.circle cx="9" cy="8" r="3" {...p} />
        <motion.path d="M3 19 a6 6 0 0 1 12 0" {...p} />
        <motion.path d="M16 5.4 a3 3 0 0 1 0 5.2" {...p} />
        <motion.path d="M17.2 14.2 a6 6 0 0 1 3.8 4.8" {...p} />
      </>
    ),
    mobile: (
      <>
        <motion.rect x="7" y="2.5" width="10" height="19" rx="2.5" {...p} />
        <motion.line x1="11" y1="18.5" x2="13" y2="18.5" {...p} />
      </>
    ),
    files: (
      <>
        <motion.path d="M14 3 H7 a1 1 0 0 0 -1 1 v16 a1 1 0 0 0 1 1 h10 a1 1 0 0 0 1 -1 V7 z" {...p} />
        <motion.path d="M14 3 v4 h4" {...p} />
        <motion.line x1="9.5" y1="13" x2="14.5" y2="13" {...p} />
        <motion.line x1="9.5" y1="16.5" x2="14.5" y2="16.5" {...p} />
      </>
    ),
    portal: (
      <>
        <motion.circle cx="12" cy="12" r="9" {...p} />
        <motion.line x1="3" y1="12" x2="21" y2="12" {...p} />
        <motion.path d="M12 3 c4 4 4 14 0 18 c-4 -4 -4 -14 0 -18" {...p} />
      </>
    ),
    payments: (
      <>
        <motion.rect x="3" y="6" width="18" height="12" rx="2" {...p} />
        <motion.line x1="3" y1="10" x2="21" y2="10" {...p} />
        <motion.line x1="7" y1="14.5" x2="11" y2="14.5" {...p} />
      </>
    ),
    timeline: (
      <>
        <motion.path d="M2 12 h4 l2 -6 l3 12 l2 -8 l2 4 h5" {...p} />
      </>
    ),
    dashboard: (
      <>
        <motion.rect x="4" y="4" width="7" height="7" rx="1.5" {...p} />
        <motion.rect x="13" y="4" width="7" height="4" rx="1.5" {...p} />
        <motion.rect x="13" y="11" width="7" height="9" rx="1.5" {...p} />
        <motion.rect x="4" y="14" width="7" height="6" rx="1.5" {...p} />
      </>
    ),
  };

  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      initial="rest"
      animate={active && !reduce ? "draw" : "rest"}
      aria-hidden="true"
    >
      {glyphs[name] ?? glyphs.dashboard}
    </motion.svg>
  );
}

function FeatureCard({ feature, index, reduce }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.li
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group flex items-start gap-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 transition-colors duration-300 hover:border-[#D4A853]/30 hover:bg-[#D4A853]/[0.04]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[#D4A853] transition-all duration-300 group-hover:scale-[1.07] group-hover:border-[#D4A853]/45 group-hover:bg-[#D4A853]/10 group-hover:text-[#e0b766] group-hover:shadow-[0_0_22px_rgba(212,168,83,0.3)]">
        <FeatureIcon name={feature.icon} active={hovered} reduce={reduce} />
      </span>
      <span>
        <span className="block text-[15px] font-semibold tracking-[-0.01em] text-[#EDEBE8]">
          {feature.name}
        </span>
        <span className="mt-0.5 block text-[13px] leading-6 text-[#8E8B87]">
          {feature.blurb}
        </span>
      </span>
    </motion.li>
  );
}

function MagnifyGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 7.5 V13.5 M7.5 10.5 H13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Mobile-first magnifier. Tap any screenshot to open a full-screen viewer; tap the
// image to zoom 2.4x, then drag (pointer/touch) to pan. Arrows/Esc on desktop,
// swipe-friendly buttons on mobile. Reduced-motion safe.
function ProductLightbox({ state, onClose, onNavigate }) {
  const reduce = useReducedMotion();
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const open = Boolean(state);
  const item = state ? state.items[state.index] : null;
  const count = state ? state.items.length : 0;

  useEffect(() => {
    setZoom(false);
    setOrigin({ x: 50, y: 50 });
  }, [state?.index, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNavigate(1);
      else if (e.key === "ArrowLeft") onNavigate(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, onNavigate]);

  function handlePointerMove(e) {
    if (!zoom) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  }

  const stop = (e) => e.stopPropagation();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[95] flex flex-col bg-black/92 backdrop-blur-md"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={item?.label ? `${item.label}, enlarged` : "Enlarged screenshot"}
          onClick={onClose}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
            onClick={stop}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#D4A853]/80">
              {item?.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-lg text-[#E8E6E3] transition hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden px-3 sm:px-6">
            <div
              className="relative mx-auto h-full w-full max-w-5xl select-none"
              style={{ cursor: zoom ? "zoom-out" : "zoom-in", touchAction: "none" }}
              onClick={(e) => {
                stop(e);
                setZoom((z) => !z);
                handlePointerMove(e);
              }}
              onPointerMove={handlePointerMove}
            >
              <motion.div
                className="relative h-full w-full"
                animate={{ scale: zoom ? 2.4 : 1 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
              >
                {item ? (
                  <Image
                    src={item.src}
                    alt={item.label ? `StudioFlows, ${item.label}` : "StudioFlows screenshot"}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority
                  />
                ) : null}
              </motion.div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6" onClick={stop}>
            {item?.caption ? (
              <p className="mx-auto max-w-3xl text-center text-[13px] leading-6 text-[#C2BFBA]">
                {item.caption}
              </p>
            ) : null}
            <div className="mt-3 flex items-center justify-center gap-5">
              {count > 1 ? (
                <button
                  type="button"
                  onClick={() => onNavigate(-1)}
                  aria-label="Previous screenshot"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#E8E6E3] transition hover:bg-white/10"
                >
                  ‹
                </button>
              ) : null}
              <span className="font-mono text-[11px] tracking-[0.2em] text-[#9B9894]">
                {count > 1
                  ? `${String(state.index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`
                  : "tap image to magnify"}
              </span>
              {count > 1 ? (
                <button
                  type="button"
                  onClick={() => onNavigate(1)}
                  aria-label="Next screenshot"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#E8E6E3] transition hover:bg-white/10"
                >
                  ›
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#9B9894]/50">
              {zoom ? "drag to pan · tap to shrink" : "tap image to magnify"}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── 08 WHAT YOU GET · the product surfaces (DARK) ────────────────────────────
// The concrete StudioFlows OS. Feature lattice + real product screenshots framed
// like a live operator console. Noir, but the first time the page shows the
// product itself — proof, not promise.
export function InitiationWhatYouGetSection({ content }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const drift = useParallaxValue(sectionRef, reduce ? 0 : 26, reduce ? 0 : -26);
  const accent = "#D4A853";

  const [lightbox, setLightbox] = useState(null);
  const openLightbox = useCallback((items, index) => setLightbox({ items, index }), []);
  const navigateLightbox = useCallback(
    (dir) =>
      setLightbox((s) =>
        s ? { ...s, index: (s.index + dir + s.items.length) % s.items.length } : s
      ),
    []
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-what-you-get-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#0B0B12] py-24 sm:py-28 lg:py-32"
    >
      <SectionBleed />
      <SectionGlitchOverlay accent={accent} variant="terminal" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 18%, rgba(212,168,83,0.08), transparent 62%)",
        }}
        aria-hidden="true"
      />

      <RevealSection>
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#D4A853]/80">
              08 / what you get
            </p>
            <span className="h-px flex-1 bg-gradient-to-r from-[#D4A853]/30 to-transparent" />
          </div>

          <h2
            id="initiation-what-you-get-heading"
            className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1.0] tracking-[-0.04em] text-[#F3EFEC] sm:text-5xl lg:text-6xl"
          >
            {content.headline}
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#9B9894] sm:text-[17px]">
            {content.intro}
          </p>

          <motion.ul style={{ y: drift }} className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {content.features.map((feature, i) => (
              <FeatureCard key={feature.name} feature={feature} index={i} reduce={reduce} />
            ))}
          </motion.ul>

          <div className="mt-10 max-w-2xl space-y-1.5">
            {content.body.map((line, i) => (
              <p
                key={line}
                className={
                  i === content.body.length - 1
                    ? "font-serif text-xl font-semibold leading-snug tracking-[-0.02em] text-[#F3EFEC] sm:text-2xl"
                    : "text-base leading-8 text-[#9B9894] sm:text-[17px]"
                }
              >
                {line}
              </p>
            ))}
          </div>

          <p className="mt-14 font-mono text-[11px] uppercase tracking-[0.24em] text-[#D4A853]/70">
            {content.proofIntro}
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {content.proof.map((shot, i) => (
              <motion.figure
                key={shot.src}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#06060a] shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
              >
          <button
            type="button"
                  onClick={() => openLightbox(content.proof, i)}
                  aria-label={`Enlarge ${shot.label} screenshot`}
                  className="group/zoom block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]/70"
                >
                  <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/80" />
                    <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9B9894]/70">
                      {shot.label}
                    </span>
                  </div>
                  <div className="relative aspect-[16/9] w-full cursor-zoom-in overflow-hidden bg-[#0b0b12]">
                    <Image
                      src={shot.src}
                      alt={`StudioFlows OS, ${shot.label}`}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover object-top transition-transform duration-500 ease-out group-hover/zoom:scale-[1.04]"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/zoom:opacity-100" />
                    <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-[#E8E6E3] opacity-70 backdrop-blur-sm transition duration-300 group-hover/zoom:scale-110 group-hover/zoom:opacity-100">
                      <MagnifyGlyph />
                    </span>
                  </div>
          </button>
                <figcaption className="px-4 py-3 text-[13px] leading-6 text-[#9B9894]">
                  {shot.caption}
                </figcaption>
              </motion.figure>
            ))}
          </div>

          {content.experience ? (
            <>
              <p className="mt-14 font-mono text-[11px] uppercase tracking-[0.24em] text-[#D4A853]/70">
                {content.experienceIntro}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-6">
                {content.experience.map((shot, i) => (
                  <motion.figure
                    key={shot.src}
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="group"
                  >
                    <button
                      type="button"
                      onClick={() => openLightbox(content.experience, i)}
                      aria-label={`Enlarge ${shot.label} screen`}
                      className="group/zoom relative block w-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#06060a] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]/70 sm:rounded-[1.75rem] sm:p-2"
                    >
                      <div className="relative aspect-[9/18] w-full cursor-zoom-in overflow-hidden rounded-[0.9rem] bg-[#0b0b12] sm:rounded-[1.25rem]">
                        <Image
                          src={shot.src}
                          alt={`StudioFlows booking, ${shot.label}`}
                          fill
                          sizes="(min-width: 640px) 30vw, 33vw"
                          className="object-cover object-top transition-transform duration-500 ease-out group-hover/zoom:scale-[1.05]"
                        />
                        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/55 text-[#E8E6E3] opacity-70 backdrop-blur-sm transition duration-300 group-hover/zoom:scale-110 group-hover/zoom:opacity-100">
                          <MagnifyGlyph />
                        </span>
                      </div>
                    </button>
                    <figcaption className="mt-3 px-0.5">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#D4A853]/80">
                        {String(i + 1).padStart(2, "0")} · {shot.label}
                      </span>
                      <span className="mt-1 block text-[12px] leading-5 text-[#8E8B87] sm:text-[13px] sm:leading-6">
                        {shot.caption}
                      </span>
                    </figcaption>
                  </motion.figure>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </RevealSection>

      <ProductLightbox
        state={lightbox}
        onClose={() => setLightbox(null)}
        onNavigate={navigateLightbox}
      />
    </section>
  );
}

// ── 08.5 FOUNDING CUSTOMER PROGRAM · the offer (DARK) ─────────────────────────
// Pricing made visible without a SaaS tier grid. One guided founding offer,
// framed as a partnership — a ledger of terms, not a comparison table. Premium,
// scarce, founder-led. Removes uncertainty; still sells the workflow review.
export function InitiationFoundingProgramSection({ content }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const drift = useParallaxValue(sectionRef, reduce ? 0 : 22, reduce ? 0 : -22);
  const accent = "#D4A853";

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-founding-program-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#09090f] py-24 sm:py-28 lg:py-32"
    >
      <SectionBleed />
      <SectionGlitchOverlay accent={accent} variant="scanline" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 48% at 50% 16%, rgba(212,168,83,0.07), transparent 62%)",
        }}
        aria-hidden="true"
      />

      <RevealSection>
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#D4A853]/80">
              08.5 / founding customer program
            </p>
            <span className="h-px flex-1 bg-gradient-to-r from-[#D4A853]/30 to-transparent" />
          </div>

          <div className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-[#D4A853]/25 bg-[#D4A853]/[0.06] px-4 py-1.5">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              {!reduce ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4A853]/60" />
              ) : null}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#D4A853]" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#e0b766]">
              {content.availability}
            </span>
          </div>

          <h2
            id="initiation-founding-program-heading"
            className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.0] tracking-[-0.04em] text-[#F3EFEC] sm:text-5xl lg:text-[3.4rem]"
          >
            {content.headline}
          </h2>
          <div className="mt-6 max-w-2xl space-y-4">
            {content.body.map((line) => (
              <p key={line} className="text-base leading-8 text-[#9B9894] sm:text-[17px]">
                {line}
              </p>
            ))}
          </div>

          {/* the offer — a ledger of terms, not a pricing tier */}
          <motion.div
            style={{ y: drift }}
            className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] shadow-[0_40px_120px_rgba(0,0,0,0.55)] lg:grid-cols-[1.05fr_0.95fr]"
          >
            {/* terms ledger */}
            <div className="relative bg-[#07070c] p-7 sm:p-9">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(120% 80% at 0% 0%, rgba(212,168,83,0.08), transparent 55%)",
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#D4A853]/75">
                  {content.programLabel}
                </p>
                <dl className="mt-6 divide-y divide-white/[0.07]">
                  {content.terms.map((term, i) => {
                    const isLast = i === content.terms.length - 1;
                    return (
                      <motion.div
                        key={term.label}
                        initial={reduce ? false : { opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-12% 0px" }}
                        transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-baseline justify-between gap-4 py-4"
                      >
                        <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8B87]">
                          {term.label}
                        </dt>
                        <dd
                          className={
                            isLast
                              ? "font-serif text-3xl font-semibold tracking-[-0.03em] text-[#F3EFEC] sm:text-4xl"
                              : "font-serif text-2xl font-semibold tracking-[-0.02em] text-[#D8D5D0] sm:text-[1.75rem]"
                          }
                        >
                          {term.value}
                          {isLast ? (
                            <span className="ml-1 align-baseline font-mono text-[11px] font-normal uppercase tracking-[0.18em] text-[#8E8B87]">
                              /mo
                            </span>
                          ) : null}
                        </dd>
                      </motion.div>
                    );
                  })}
                </dl>
                <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-[#D4A853]/15 bg-[#D4A853]/[0.04] px-4 py-3">
                  <span className="mt-0.5 font-mono text-[12px] text-[#D4A853]/80" aria-hidden="true">
                    ✶
                  </span>
                  <p className="text-[13px] leading-6 text-[#e0b766]">{content.lockNote}</p>
                </div>
              </div>
            </div>

            {/* what's included + partnership framing */}
            <div className="bg-[#0b0b12] p-7 sm:p-9">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#D4A853]/75">
                What it includes
              </p>
              <ul className="mt-6 space-y-3">
                {content.included.map((item, i) => (
                  <motion.li
                    key={item}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A853]"
                      style={{ boxShadow: "0 0 8px rgba(212,168,83,0.7)" }}
                      aria-hidden="true"
                    />
                    <span className="text-[15px] leading-7 text-[#D8D5D0]">{item}</span>
                  </motion.li>
            ))}
          </ul>
              <div className="mt-7 space-y-3 border-t border-white/[0.07] pt-6">
                {content.supporting.map((line, i) => (
                  <p
                    key={line}
                    className={
                      i === 0
                        ? "text-[15px] font-semibold leading-7 text-[#EDEBE8]"
                        : "text-[14px] leading-7 text-[#9B9894]"
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={content.primaryCtaTarget}
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#F3EFEC] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#0B0B0C] transition hover:bg-white"
            >
              {content.primaryCta}
              <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href={content.secondaryCtaTarget}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-[#E8E6E3] transition hover:border-white/40 hover:bg-white/[0.04]"
            >
              {content.secondaryCta}
            </Link>
          </div>
          {content.funnelHelperCopy ? (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9B9894]">{content.funnelHelperCopy}</p>
          ) : null}
        </div>
      </RevealSection>
    </section>
  );
}

// ── 09 BUILT FOR SERVICE LOOPS · the fit (DARK) ──────────────────────────────
// ICP + the request→follow-up lifecycle as an animated chain. Tells the visitor,
// fast, whether the product is for them — the qualifier before the diagnostic.
export function InitiationServiceLoopsSection({ content }) {
  const reduce = useReducedMotion();
  const accent = "#D4A853";

  return (
    <section
      aria-labelledby="initiation-service-loops-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#08080d] py-24 sm:py-28 lg:py-32"
    >
      <SectionBleed />
      <SectionGlitchOverlay accent={accent} variant="wave" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 24%, rgba(212,168,83,0.07), transparent 60%)",
        }}
        aria-hidden="true"
      />

      <RevealSection>
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#D4A853]/80">
              09 / built for service loops
            </p>
            <span className="h-px flex-1 bg-gradient-to-r from-[#D4A853]/30 to-transparent" />
          </div>

          <h2
            id="initiation-service-loops-heading"
            className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1.0] tracking-[-0.04em] text-[#F3EFEC] sm:text-5xl lg:text-6xl"
          >
            {content.headline}
          </h2>
          <div className="mt-6 max-w-2xl space-y-4">
            {content.body.map((line) => (
              <p key={line} className="text-base leading-8 text-[#9B9894] sm:text-[17px]">
                {line}
              </p>
            ))}
          </div>

          <p className="mt-14 font-mono text-[11px] uppercase tracking-[0.24em] text-[#D4A853]/70">
            {content.lifecycleIntro}
          </p>
          <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
            {content.lifecycle.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <motion.span
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center rounded-full border border-[#D4A853]/25 bg-[#D4A853]/[0.06] px-4 py-2 text-sm font-semibold tracking-[-0.01em] text-[#EDEBE8]"
                >
                  {step}
                </motion.span>
                {i < content.lifecycle.length - 1 ? (
                  <motion.span
                    aria-hidden="true"
                    initial={reduce ? false : { opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : i * 0.12 + 0.1 }}
                    className="font-mono text-[#D4A853]/60"
                  >
                    →
                  </motion.span>
                ) : null}
              </li>
            ))}
          </ol>

          <p className="mt-14 font-mono text-[11px] uppercase tracking-[0.24em] text-[#D4A853]/70">
            {content.fitIntro}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {content.fitExamples.map((example, i) => (
              <motion.li
                key={example}
                initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-8% 0px" }}
                transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : i * 0.05 }}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-sm text-[#C2BFBA]"
              >
                {example}
              </motion.li>
            ))}
          </ul>

          <div className="mt-12 border-l-2 border-[#D4A853]/50 pl-6">
          <RevealLine
            as="p"
              className="max-w-2xl font-serif text-2xl font-semibold leading-snug tracking-[-0.025em] text-[#F3EFEC] sm:text-3xl"
          >
              {content.qualifier}
          </RevealLine>
          </div>
        </div>
      </RevealSection>
    </section>
  );
}

// Mobile-only sticky primary CTA after the hero leaves the viewport.
export function MobileStickyPrimaryCta({ href, label }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("initiation-hero-heading")?.closest("section");
    if (!hero) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#030304]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <Link
        href={href}
        tabIndex={visible ? 0 : -1}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#E8E6E3] px-7 py-3 text-sm font-semibold text-[#030304] shadow-[0_8px_28px_rgba(232,230,227,0.16)] transition hover:bg-white"
      >
        {label}
      </Link>
    </div>
  );
}

// Understated inline CTA — a "lightly sprinkled" anchor along the scroll journey
// that reuses the primary diagnostic href without competing with the main CTAs.
// tone="dark" → amber-on-dark ghost pill · tone="light" → ink pill on parchment.
export function InlineCtaAnchor({
  href,
  label = "See if StudioFlows is a fit",
  tone = "dark",
  embedded = false,
}) {
  const dark = tone !== "light";
  return (
    <div
      className={
        embedded
          ? "relative z-20 mt-8 flex justify-center px-5 pb-1 pt-2 sm:mt-10 sm:pb-2"
          : "relative z-20 -my-10 flex justify-center bg-transparent px-5 py-6 sm:-my-12 sm:py-8"
      }
    >
      <Link
        href={href}
        className={
          dark
            ? "group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4A853]/30 bg-[#D4A853]/[0.06] px-5 py-2.5 text-sm font-medium tracking-[-0.01em] text-[#D4A853] transition hover:border-[#D4A853]/60 hover:bg-[#D4A853]/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            : "group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#0B0B0C]/25 bg-[#0B0B0C]/[0.05] px-5 py-2.5 text-sm font-medium tracking-[-0.01em] text-[#0B0B0C] transition hover:bg-[#0B0B0C]/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0B0C]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EA]"
        }
      >
        {label}
        <span
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        >
          →
        </span>
      </Link>
    </div>
  );
}

export function InitiationCompoundingIntelligenceSection({ content }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  // The lattice wires itself together once the graph scrolls into view — a single
  // ~2.8s eased build so it always completes on screen, instead of being tied to
  // scroll distance (which made it easy to scroll past and miss the completion).
  const graphRef = useRef(null);
  const inView = useInView(graphRef, { once: true, margin: "-18% 0px -18% 0px" });
  const [growth, setGrowth] = useState(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce || !inView) return undefined;
    const start = performance.now();
    const dur = 3920;
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setGrowth(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce]);

  const learn = content.body.slice(2, 7);
  const nodesLinked = Math.round(growth * MEMORY_NODES.length);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-compounding-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#0B0C14] py-24 sm:py-28 lg:py-32"
    >
      <SectionBleed />
      <SectionGlitchOverlay accent="#D4A853" variant="terminal" />

      <RevealSection>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#D4A853]/80">
                  08 / how it learns
                </p>
                <span className="h-px flex-1 bg-gradient-to-r from-[#D4A853]/30 to-transparent" />
              </div>

              <p className="mt-6 font-mono text-xs uppercase tracking-[0.28em] text-[#9B9894]/70">
                {content.headline}
              </p>
              <h2
                id="initiation-compounding-heading"
                className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] text-[#F3EFEC] sm:text-5xl"
              >
                {content.subheadline}
              </h2>

              <p className="mt-7 max-w-xl text-base leading-8 text-[#C2BFBA] sm:text-[17px]">
                {content.body[0]}
              </p>
              <p className="mt-4 max-w-xl text-base leading-8 text-[#C2BFBA] sm:text-[17px]">
                {content.body[1]}
              </p>

              <ul className="mt-8 space-y-2.5">
                {learn.map((line, i) => {
                  const lit = growth > (i + 0.5) / learn.length;
                  return (
                    <li
                      key={line}
                      className="flex items-start gap-3 transition-colors duration-500"
                      style={{ color: lit ? "#E8E6E3" : "rgba(155,152,148,0.4)" }}
                    >
                      <span
                        className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[9px] transition-all duration-500"
                        style={{
                          borderColor: lit ? "#D4A853" : "rgba(255,255,255,0.15)",
                          backgroundColor: lit ? "rgba(212,168,83,0.18)" : "transparent",
                          color: lit ? "#D4A853" : "transparent",
                        }}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span className="text-sm leading-6 sm:text-[15px]">{line}</span>
                    </li>
                  );
                })}
          </ul>

              <p className="mt-8 max-w-xl font-serif text-xl font-semibold leading-snug tracking-[-0.02em] text-[#F3EFEC] sm:text-2xl">
                {content.body[7]}
              </p>
            </div>

            <div>
              <div ref={graphRef} className="relative aspect-square w-full overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-[#08090f]">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  {MEMORY_EDGES.map((e, i) => {
                    const a = Math.min(1, Math.max(0, growth * MEMORY_EDGES.length - i));
                    const [x1, y1] = MEMORY_NODES[e[0]];
                    const [x2, y2] = MEMORY_NODES[e[1]];
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#D4A853"
                        strokeWidth="0.3"
                        style={{ opacity: a * 0.45 }}
                      />
                    );
                  })}
                  {MEMORY_NODES.map((p, i) => {
                    const a = Math.min(1, Math.max(0, growth * MEMORY_NODES.length - i));
                    const isHub = i === 0;
                    return (
                      <g key={i} style={{ opacity: a }}>
                        <circle cx={p[0]} cy={p[1]} r={(isHub ? 2.4 : 1.4) * (0.5 + a * 0.5)} fill="#D4A853" />
                        <circle
                          cx={p[0]}
                          cy={p[1]}
                          r={(isHub ? 5 : 3) * a}
                          fill="none"
                          stroke="#D4A853"
                          strokeWidth="0.25"
                          style={{ opacity: 0.4 * a }}
                        />
                      </g>
                    );
                  })}
                </svg>
                <p className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#D4A853]/70">
                  operational memory
                </p>
                <p className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9B9894]/70">
                  {String(nodesLinked).padStart(2, "0")} / {MEMORY_NODES.length} linked
                </p>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#D4A853]/80">
                  {content.outcomeIntro}
                </p>
                <div className="mt-5 space-y-3.5">
                  {content.outcomeItems.map((item) => {
                    const dir = MEMORY_METERS[item] || "up";
                    const w = dir === "down" ? 90 - growth * 73 : 14 + growth * 78;
                    return (
                      <div key={item}>
                        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                          <span className="text-[#C9C4BE]">{item}</span>
                          <span className="text-[#D4A853]">{dir === "down" ? "↓" : "↑"}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#D4A853]"
                            style={{ width: `${w}%`, transition: "width 0.12s linear" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-3xl text-center">
            {content.outcomeClosing.map((t, i) => (
              <p
                key={t}
                className={
                  i === content.outcomeClosing.length - 1
                    ? "mt-3 font-serif text-2xl font-semibold leading-tight tracking-[-0.025em] text-[#D4A853] sm:text-4xl"
                    : "text-base leading-8 text-[#C2BFBA] sm:text-[17px]"
                }
              >
                {t}
              </p>
            ))}
          </div>
        </div>
      </RevealSection>
    </section>
  );
}

// ── 09 CONFIDENCE · earned autonomy ──────────────────────────────────────────
// UNIQUE (Layer 3): the tactile peak. A confidence dial you DRAG up — as you
// grant autonomy the ring morphs magenta→amber (dependency→light), interruptions
// /approvals/oversight fall away, and autonomous execution climbs. You hand over
// control yourself. Reduced-motion: slider still works, no flourish.
const CONFIDENCE_METERS = [
  { label: "Interruptions", dir: "down" },
  { label: "Approvals", dir: "down" },
  { label: "Manual oversight", dir: "down" },
  { label: "Execution handled autonomously", dir: "up" },
];

function mixColor(a, b, t) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function InitiationConfidenceModelSection({ content }) {
  const reduce = useReducedMotion();
  const { mark } = useProgression();
  const [value, setValue] = useState(8);
  const marked = useRef(false);
  const trackRef = useRef(null);
  const dragging = useRef(false);
  // Come-alive: the dial demonstrates itself once when scrolled into view, then
  // hands control to the viewer the moment they touch it (so it never sits dead).
  const dialRef = useRef(null);
  const inView = useInView(dialRef, { once: true, margin: "-25% 0px -25% 0px" });
  const touched = useRef(false);
  const demoed = useRef(false);

  const t = value / 100;
  const ring = mixColor([219, 39, 119], [212, 168, 83], t);
  const C = 2 * Math.PI * 42;

  useEffect(() => {
    if (!marked.current && value > 40) {
      marked.current = true;
      mark("confidence");
    }
  }, [value, mark]);

  useEffect(() => {
    if (reduce || !inView || demoed.current || touched.current) return undefined;
    demoed.current = true;
    const target = 76;
    const start = performance.now();
    const from = 8;
    const dur = 1900;
    let raf = 0;
    const tick = (now) => {
      if (touched.current) return;
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce]);

  function setFromClientX(cx) {
    const el = trackRef.current;
    if (!el) return;
    touched.current = true;
    const r = el.getBoundingClientRect();
    setValue(Math.round(Math.min(1, Math.max(0, (cx - r.left) / r.width)) * 100));
  }

  function onPointerDown(e) {
    dragging.current = true;
    touched.current = true;
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  }

  function onPointerMove(e) {
    if (dragging.current) setFromClientX(e.clientX);
  }

  function endDrag() {
    dragging.current = false;
  }

  function onKeyDown(e) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      touched.current = true;
      setValue((v) => Math.min(100, v + 4));
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      touched.current = true;
      setValue((v) => Math.max(0, v - 4));
      e.preventDefault();
    }
  }

  return (
    <section
      aria-labelledby="initiation-confidence-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#0C0D15] py-24 sm:py-28 lg:py-32"
    >
      <SectionBleed />
      <SectionGlitchOverlay accent="#D4A853" variant="wave" />

      <RevealSection>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#D4A853]/80">
                  09 / earned trust
                </p>
                <span className="h-px flex-1 bg-gradient-to-r from-[#D4A853]/30 to-transparent" />
              </div>

              <h2
                id="initiation-confidence-heading"
                className="mt-6 font-serif text-3xl font-semibold leading-[1.04] tracking-[-0.035em] text-[#F3EFEC] sm:text-4xl lg:text-5xl"
              >
            {content.headline}
              </h2>

              <div className="mt-7 max-w-xl space-y-4">
                <p className="text-base leading-8 text-[#C2BFBA] sm:text-[17px]">{content.body[0]}</p>
                <p className="text-base leading-8 text-[#C2BFBA] sm:text-[17px]">{content.body[1]}</p>
                <p className="text-base leading-8 text-[#C2BFBA] sm:text-[17px]">{content.body[2]}</p>
              </div>

              <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-[#D4A853]/30 bg-[#D4A853]/[0.06] px-5 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4A853]" />
                <span className="text-sm font-semibold text-[#F3EFEC]">{content.body[3]}</span>
              </div>

              <AnimatePresence>
                {value >= 66 ? (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 max-w-xl font-serif text-xl font-semibold leading-snug tracking-[-0.02em] text-[#D4A853] sm:text-2xl"
                  >
                    {content.body[4]}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <div ref={dialRef} className="rounded-[1.75rem] border border-white/[0.07] bg-[#08090f] p-7 sm:p-9">
              <div className="relative mx-auto aspect-square w-full max-w-[18rem]">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={ring}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - t)}
                    style={{ transition: "stroke-dashoffset 0.12s linear, stroke 0.2s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="font-serif text-5xl font-semibold tracking-[-0.04em] sm:text-6xl"
                    style={{ color: ring }}
                  >
                    {value}
                    <span className="text-2xl">%</span>
                  </span>
                  <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[#9B9894]/70">
                    confidence
                  </span>
                </div>
              </div>

              <div className="mt-7">
                <span className="mb-2 block text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#D4A853]/80">
                  drag to grant autonomy
                </span>
                <div
                  ref={trackRef}
                  role="slider"
                  tabIndex={0}
                  aria-label="Confidence level"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={value}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={onKeyDown}
                  className="relative mt-2 h-11 cursor-pointer touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090f]"
                >
                  <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/12" />
                  <div
                    className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                    style={{ width: `${value}%`, backgroundColor: ring, transition: "background-color 0.2s linear" }}
                  />
                  <div
                    className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                    style={{ left: `${value}%`, backgroundColor: ring, transition: "background-color 0.2s linear" }}
                  />
                </div>
              </div>

              <div className="mt-7 space-y-3">
                {CONFIDENCE_METERS.map((m) => {
                  const w = m.dir === "down" ? 88 - t * 74 : 12 + t * 80;
                  const col = m.dir === "down" ? "#DB2777" : "#D4A853";
                  return (
                    <div key={m.label}>
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                        <span className="text-[#C9C4BE]">{m.label}</span>
                        <span style={{ color: col }}>{m.dir === "down" ? "↓" : "↑"}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${w}%`, backgroundColor: col, transition: "width 0.12s linear" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </RevealSection>
    </section>
  );
}

// ── 10 PILLARS · signal vs noise ─────────────────────────────────────────────
// UNIQUE (Layer 3): a sorting MACHINE. A live stream of signals is judged against
// the five pillars — anything that strengthens one is kept; the rest is spat out
// as noise. Cold, mechanical, the machine deciding. Feed it noise yourself and
// watch it get rejected. Reduced-motion: idle machine, manual feed only.
const SORTER_LABELS = ["notification", "task", "request"];

export function InitiationFivePillarsSection({ content }) {
  const reduce = useReducedMotion();
  const { mark } = useProgression();
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { margin: "-20% 0px -20% 0px" });
  const idRef = useRef(0);

  const pillars = content.pillars;
  const [items, setItems] = useState([]);
  const [kept, setKept] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [counts, setCounts] = useState(() => pillars.map(() => 0));
  const [pulse, setPulse] = useState({ idx: -1, n: 0 });

  const spawn = useCallback(
    (forceNoise) => {
      const label = SORTER_LABELS[Math.floor(Math.random() * SORTER_LABELS.length)];
      const noise = forceNoise || Math.random() < 0.55;
      const verdict = noise ? "noise" : Math.floor(Math.random() * pillars.length);
      idRef.current += 1;
      const id = idRef.current;
      setItems((prev) => [{ id, label, verdict }, ...prev].slice(0, 5));
      if (noise) {
        setRejected((r) => r + 1);
      } else {
        setKept((k) => k + 1);
        setCounts((prev) => {
          const next = [...prev];
          next[verdict] += 1;
          return next;
        });
        setPulse((p) => ({ idx: verdict, n: p.n + 1 }));
      }
    },
    [pillars.length],
  );

  useEffect(() => {
    if (reduce || !inView) return undefined;
    const timer = window.setInterval(() => spawn(false), 1600);
    return () => window.clearInterval(timer);
  }, [reduce, inView, spawn]);

  function feedNoise() {
    spawn(true);
    mark("pillars");
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="initiation-pillars-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#0D0E17] py-24 sm:py-28 lg:py-32"
    >
      <SectionBleed />
      <SectionGlitchOverlay accent="#D4A853" variant="static" />

      <RevealSection>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#D4A853]/80">10 / five pillars</p>
            <span className="h-px flex-1 bg-gradient-to-r from-[#D4A853]/30 to-transparent" />
          </div>

          <h2
            id="initiation-pillars-heading"
            className="mt-6 max-w-3xl font-serif text-3xl font-semibold leading-[1.04] tracking-[-0.035em] text-[#F3EFEC] sm:text-4xl lg:text-5xl"
          >
            {content.headline}
          </h2>
          <div className="mt-7 max-w-2xl space-y-4">
            {content.body.map((para) => (
              <p key={para} className="text-base leading-8 text-[#C2BFBA] sm:text-[17px]">
                {para}
              </p>
            ))}
          </div>

          {/* THE SORTER */}
          <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-[#08090f]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#D4A853]/80">
                signal / noise filter
              </p>
              <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
                <span className="text-[#D4A853]">kept {String(kept).padStart(2, "0")}</span>
                <span className="text-[#DB2777]">rejected {String(rejected).padStart(2, "0")}</span>
              </div>
            </div>

            <div className="grid gap-6 p-5 sm:grid-cols-[1fr_1fr] sm:p-6">
              <div className="min-h-[14rem]">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9B9894]/60">
                  intake
                </p>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((item) => {
                      const noise = item.verdict === "noise";
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={reduce ? false : { opacity: 0, y: -14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? { opacity: 0 } : { opacity: 0, x: noise ? 60 : -10, filter: "blur(3px)" }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center justify-between rounded-lg border px-3 py-2"
                          style={{
                            borderColor: noise ? "rgba(219,39,119,0.4)" : "rgba(212,168,83,0.4)",
                            backgroundColor: noise ? "rgba(219,39,119,0.06)" : "rgba(212,168,83,0.06)",
                          }}
                        >
                          <span className="font-mono text-xs text-[#C9C4BE]">{item.label}</span>
                          <span
                            className="font-mono text-[10px] uppercase tracking-[0.12em]"
                            style={{ color: noise ? "#DB2777" : "#D4A853" }}
                          >
                            {noise ? "✕ noise" : `→ ${pillars[item.verdict]}`}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {items.length === 0 ? (
                    <p className="font-mono text-xs text-[#9B9894]/40">awaiting signal…</p>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9B9894]/60">
                  {content.body[1]}
                </p>
                <div className="space-y-2">
                  {pillars.map((p, i) => (
                    <motion.div
                      key={p}
                      animate={pulse.idx === i ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center justify-between rounded-xl border px-4 py-3"
                      style={{
                        borderColor: `rgba(212,168,83,${0.18 + Math.min(0.5, counts[i] * 0.06)})`,
                        backgroundColor: `rgba(212,168,83,${0.03 + Math.min(0.12, counts[i] * 0.02)})`,
                      }}
                    >
                      <span className="text-sm font-semibold text-[#F3EFEC]">{p}</span>
                      <span className="font-mono text-[10px] text-[#D4A853]">{counts[i]}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center border-t border-white/[0.06] px-5 py-4">
              <button
                type="button"
                onClick={feedNoise}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#DB2777]/40 bg-[#DB2777]/[0.06] px-6 py-2.5 text-sm font-semibold text-[#F3EFEC] transition hover:bg-[#DB2777]/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]"
              >
                Feed it noise
              </button>
            </div>
          </div>

          <p className="mt-8 max-w-3xl text-base leading-8 text-[#C2BFBA] sm:text-[17px]">{content.closing}</p>
          <p className="mt-3 max-w-3xl font-serif text-xl font-semibold leading-snug tracking-[-0.02em] text-[#F3EFEC] sm:text-2xl">
            {content.closing2}
          </p>
        </div>
      </RevealSection>
    </section>
  );
}

// ── THE TURN · crash to light ────────────────────────────────────────────────
// The hinge of the whole arc. After the system has proven itself in the dark, the
// noir gets KILLED: a terminal override executes, a green cascade rips down, the
// screen whites out and the page is reborn in light. Everything below operates
// lighter. Reduced-motion: static "deployed" state, no sequence. Decorative.
export function SystemResetTransition() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-25% 0px -25% 0px" });
  const [phase, setPhase] = useState(reduce ? 4 : 0);

  useEffect(() => {
    if (reduce) {
      setPhase(4);
      return undefined;
    }
    if (!inView) return undefined;
    const timers = [
      window.setTimeout(() => setPhase(1), 250),
      window.setTimeout(() => setPhase(2), 1500),
      window.setTimeout(() => setPhase(3), 2500),
      window.setTimeout(() => setPhase(4), 3450),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, reduce]);

  const lines = [
    { at: 1, text: "root@studioflows:~# checking what depends on you...", tone: "muted" },
    { at: 1, text: "[ alert ] found it: the business waits on one person", tone: "alert" },
    { at: 2, text: "root@studioflows:~# taking the weight off the owner", tone: "bright" },
    { at: 2, text: "you no longer have to hold it all up", tone: "muted" },
    { at: 3, text: "root@studioflows:~# turning on the system", tone: "bright" },
    { at: 3, text: "starting the layer that runs the work...", tone: "amber" },
  ];

  const whiteout = phase >= 4;

  return (
    <section
      ref={ref}
      aria-hidden="true"
      className="relative z-10 flex min-h-[82vh] items-center justify-center overflow-hidden bg-[#06070C]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)]" />

      <div className="relative z-10 w-full max-w-2xl px-6 font-mono text-[12px] leading-7 sm:text-sm">
        {lines.map((l, i) => (
          <motion.p
            key={i}
            initial={false}
            animate={{ opacity: phase >= l.at && !whiteout ? 1 : 0, x: phase >= l.at ? 0 : -6 }}
            transition={{ duration: 0.25 }}
            className={
              l.tone === "alert"
                ? "text-[#DB2777]"
                : l.tone === "amber"
                  ? "text-[#D4A853]"
                  : l.tone === "bright"
                    ? "text-[#E8E6E3]"
                    : "text-[#5F6675]"
            }
          >
            {l.text}
          </motion.p>
        ))}
      </div>

      <AnimatePresence>
        {phase === 3 && !reduce ? (
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(110,255,180,0),rgba(110,255,180,0.14),rgba(110,255,180,0))]"
            initial={{ opacity: 0, y: "-120%" }}
            animate={{ opacity: [0, 1, 0], y: ["-120%", "260%"] }}
            transition={{ duration: 0.9, ease: "linear" }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        className="pointer-events-none absolute inset-0 origin-center bg-[#F4F1EA]"
        initial={false}
        animate={{ scaleY: whiteout ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.55, ease: [0.7, 0, 0.3, 1] }}
      />
      {whiteout ? (
        <motion.p
          className="absolute z-10 font-mono text-[11px] uppercase tracking-[0.34em] text-[#8A6A1F]"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.45, duration: 0.5 }}
        >
          [ ok ] the system is running
        </motion.p>
      ) : null}
    </section>
  );
}

// Light-act atmosphere: motes of warm light rising into the light — the visual
// of operational weight lifting. Deterministic, decorative, reduced-motion off.
const LIGHT_MOTES = Array.from({ length: 16 }).map((_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + (i % 3),
  delay: (i % 8) * 0.85,
  dur: 9 + (i % 5) * 2.3,
  rise: 260 + (i % 4) * 90,
  drift: (i % 2 ? 1 : -1) * (8 + (i % 4) * 6),
}));

function RisingMotes({ reduce }) {
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {LIGHT_MOTES.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-[#8A6A1F]/30"
          style={{ left: `${m.left}%`, bottom: -12, width: m.size, height: m.size }}
          initial={{ opacity: 0, y: 0, x: 0 }}
          animate={{ opacity: [0, 0.55, 0], y: [0, -m.rise], x: [0, m.drift] }}
          transition={{ duration: m.dur, delay: m.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ── 11 DIAGNOSTIC · the first ask (LIGHT) ────────────────────────────────────
// The page is reborn: near-white, velvet-black type, paper grain. UNIQUE
// (Layer 3): the diagnostic SURFACES its findings live — a scan walks the list,
// each finding settles into place — then the CTA reads as the authorized command.
export function InitiationOperationalDiagnosticSection({ content }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30% 0px -15% 0px" });
  const [scan, setScan] = useState(reduce ? content.bullets.length : 0);

  useEffect(() => {
    if (reduce || !inView || scan >= content.bullets.length) return undefined;
    const t = window.setTimeout(() => setScan((n) => n + 1), 460);
    return () => window.clearTimeout(t);
  }, [inView, scan, reduce, content.bullets.length]);

  const done = scan >= content.bullets.length;

  return (
    <section
      ref={ref}
      id={content.anchor}
      aria-labelledby="initiation-diagnostic-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F4F1EA] py-24 text-[#0B0B0C] sm:py-28 lg:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
        style={{ backgroundImage: RANSOM_GRAIN }}
        aria-hidden="true"
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,168,83,0.16),transparent_55%)]"
        animate={reduce ? {} : { opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <RevealSection>
        <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#8A6A1F]">11 / fit check</p>
          <h2
            id="initiation-diagnostic-heading"
            className="mt-6 font-serif text-3xl font-semibold leading-[1.04] tracking-[-0.035em] text-[#0B0B0C] sm:text-4xl lg:text-5xl"
          >
            {content.headline}
          </h2>
          <div className="mt-8 space-y-5">
            {content.body.map((t, i) => (
              <p key={t} className="mx-auto max-w-2xl text-base leading-8 text-[#3A352C] sm:text-[17px]">
                {t}
                {i === content.body.length - 1 && !reduce ? (
                  <motion.span
                    className="ml-2 inline-block h-2 w-2 rounded-full bg-[#8A6A1F] align-middle"
                    animate={{ opacity: done ? 1 : [0.3, 1, 0.3], scale: done ? 1 : [1, 1.3, 1] }}
                    transition={done ? { duration: 0.3 } : { duration: 1.1, repeat: Infinity }}
                  />
                ) : null}
              </p>
            ))}
          </div>

          <div className="mx-auto mt-4 flex max-w-2xl items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-[#8A6A1F]/70">
            <span>{done ? "diagnostic surfaced" : "scanning operations…"}</span>
            <span>
              {String(Math.min(scan, content.bullets.length)).padStart(2, "0")} /{" "}
              {String(content.bullets.length).padStart(2, "0")}
            </span>
          </div>

          <ul className="mx-auto mt-4 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {content.bullets.map((bullet, i) => {
              const lit = i < scan;
              return (
                <motion.li
                  key={bullet}
                  initial={false}
                  animate={{
                    opacity: lit ? 1 : 0.28,
                    x: lit ? 0 : -6,
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden rounded-xl border bg-white/60 px-4 py-3 pl-5 text-sm leading-6 text-[#2A2722] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                  style={{ borderColor: lit ? "rgba(138,106,31,0.35)" : "rgba(0,0,0,0.1)" }}
                >
                  <motion.span
                    className="absolute inset-y-0 left-0 w-[3px] origin-top bg-[#D4A853]"
                    initial={false}
                    animate={{ scaleY: lit ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    aria-hidden="true"
                  />
                  {bullet}
                </motion.li>
              );
            })}
          </ul>

          <div className="relative mt-12 inline-block">
            {!reduce ? (
              <motion.span
                className="pointer-events-none absolute -inset-2 rounded-full bg-[#D4A853]/30 blur-xl"
                animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.96, 1.04, 0.96] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              />
            ) : null}
            <Link
              href={content.ctaTarget}
              className="group relative inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#0B0B0C] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#F4F1EA] shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition hover:bg-black"
            >
            {content.cta}
              <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
          </Link>
          </div>
          {content.funnelHelperCopy ? (
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[#6B6557]">{content.funnelHelperCopy}</p>
          ) : null}
        </div>
      </RevealSection>
    </section>
  );
}

// ── 12 ENTRY · two doors (LIGHT) ─────────────────────────────────────────────
// In the light now. UNIQUE (Layer 3): two paths (IQ / OS) as doors the viewer
// chooses; the picked one opens, the other recedes. Velvet-black on near-white.
export function InitiationEntryPathsSection({ content }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(null);

  return (
    <section
      aria-labelledby="initiation-entry-paths-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F4F1EA] py-24 text-[#0B0B0C] sm:py-28 lg:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
        style={{ backgroundImage: RANSOM_GRAIN }}
        aria-hidden="true"
      />
      <RevealSection>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#8A6A1F]">12 / two entry paths</p>
          <h2
            id="initiation-entry-paths-heading"
            className="mt-6 max-w-3xl font-serif text-3xl font-semibold leading-[1.04] tracking-[-0.035em] text-[#0B0B0C] sm:text-4xl lg:text-5xl"
          >
            {content.headline}
          </h2>
          <div className="mt-6 max-w-3xl space-y-4">
            {content.body.map((t) => (
              <p key={t} className="text-base leading-8 text-[#3A352C] sm:text-[17px]">
                {t}
              </p>
            ))}
          </div>

          {/* the story forks — one line splits into two doors */}
          <svg
            viewBox="0 0 200 36"
            preserveAspectRatio="none"
            className="mx-auto mt-10 h-9 w-full max-w-md text-[#8A6A1F]"
            aria-hidden="true"
          >
            <motion.path
              d="M100 0 L100 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.6 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            />
            <motion.path
              d="M100 14 C100 26, 40 22, 30 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: open === 1 ? 0.25 : 0.6 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.4 }}
            />
            <motion.path
              d="M100 14 C100 26, 160 22, 170 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: open === 0 ? 0.25 : 0.6 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.4 }}
            />
          </svg>

          <div
            className="mt-2 grid gap-6 lg:grid-cols-2"
            onMouseLeave={() => setOpen(null)}
          >
            {[content.card1, content.card2].map((card, i) => {
              const isOpen = open === i;
              const isOther = open !== null && open !== i;
              return (
                <motion.article
                  key={card.headline}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isOpen}
                  onMouseEnter={() => setOpen(i)}
                  onFocus={() => setOpen(i)}
                  onClick={() => setOpen(isOpen ? null : i)}
                  initial={false}
                  animate={
                    reduce
                      ? {}
                      : {
                          y: isOpen ? -8 : 0,
                          scale: isOpen ? 1.02 : isOther ? 0.98 : 1,
                          opacity: isOther ? 0.55 : 1,
                        }
                  }
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/70 p-6 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[#8A6A1F] sm:p-7"
                  style={{
                    borderColor: isOpen ? "rgba(138,106,31,0.5)" : "rgba(0,0,0,0.1)",
                    boxShadow: isOpen
                      ? "0 34px 90px rgba(0,0,0,0.16)"
                      : "0 18px 60px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* top accent — the door opening */}
                  <motion.span
                    className="absolute inset-x-0 top-0 h-[3px] origin-left bg-gradient-to-r from-[#D4A853] to-[#8A6A1F]"
                    initial={false}
                    animate={{ scaleX: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    aria-hidden="true"
                  />
                  {/* warm inner glow on open */}
                  <span
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,168,83,0.12),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ opacity: isOpen ? 1 : undefined }}
                    aria-hidden="true"
                  />

                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8A6A1F]">
                        {card.headline}
                      </p>
                      {card.tag ? (
                        <span className="inline-flex items-center rounded-full border border-[#8A6A1F]/30 bg-[#8A6A1F]/[0.06] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8A6A1F]">
                          {card.tag}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[#0B0B0C] sm:text-2xl">
                      {card.subheadline}
                    </h3>
                    <div className="mt-4 space-y-3">
                      {card.body.map((t) => (
                        <p key={t} className="text-sm leading-7 text-[#3A352C]">
                          {t}
                        </p>
                      ))}
                    </div>
                    <p className="mt-6 text-sm font-semibold text-[#8A6A1F]">Best for:</p>
                    <p className="mt-2 text-sm leading-7 text-[#3A352C]">{card.bestFor}</p>
                    {card.comingSoon ? (
                      <p className="mt-7 font-mono text-xs uppercase tracking-[0.22em] text-[#4E483D]">
                        {card.comingSoon}
                      </p>
                    ) : card.cta ? (
                      <Link
                        href={card.ctaTarget}
                        onClick={(event) => event.stopPropagation()}
                        className={
                          i === 0
                            ? "mt-7 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0B0B0C] px-6 py-3 text-sm font-semibold text-[#F4F1EA] transition hover:bg-black"
                            : "mt-7 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#0B0B0C]/25 px-6 py-3 text-sm font-semibold text-[#0B0B0C] transition hover:bg-black/5"
                        }
                      >
                        {card.cta}
                        <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </RevealSection>
    </section>
  );
}

// ── 13 FINAL CTA · the weight lifts (LIGHT) ──────────────────────────────────
// Full light. The page that opened in near-black ends near-white, velvet-black,
// textured — the business "lighter to operate." The main CTA is the quiz funnel,
// framed as the earned command. Callback to the hero's pressure readout, resolved.
export function InitiationFinalCtaSection({ content }) {
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby="initiation-final-cta-heading"
      className="relative z-10 overflow-hidden bg-[#F4F1EA] py-24 text-[#0B0B0C] sm:py-28 lg:py-36"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
        style={{ backgroundImage: RANSOM_GRAIN }}
        aria-hidden="true"
      />
      <RisingMotes reduce={reduce} />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-1/4 mx-auto h-[60vh] w-[80%] max-w-3xl rounded-full bg-[radial-gradient(circle,rgba(212,168,83,0.18),transparent_68%)] blur-2xl"
        animate={reduce ? {} : { opacity: [0.5, 0.9, 0.5], scale: [0.96, 1.05, 0.96] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <RevealSection fadeOnly>
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          <motion.div
            className="relative rounded-[2rem] border border-black/10 bg-white/70 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.1)] sm:p-10 lg:p-14"
            animate={reduce ? {} : { y: [0, -7, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#8A6A1F]">13 / lighter to operate</p>
            <h2
              id="initiation-final-cta-heading"
              className="mt-6 font-serif text-3xl font-semibold leading-[1.04] tracking-[-0.035em] text-[#0B0B0C] sm:text-4xl lg:text-5xl"
            >
            {content.headline}
          </h2>
            <div className="mt-6 space-y-4">
              {content.body.map((t) => (
                <p key={t} className="max-w-2xl text-base leading-8 text-[#3A352C] sm:text-[17px]">
                  {t}
                </p>
              ))}
            </div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                {!reduce ? (
                  <motion.span
                    className="pointer-events-none absolute -inset-1.5 rounded-full bg-[#D4A853]/35 blur-lg"
                    animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.97, 1.05, 0.97] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden="true"
                  />
                ) : null}
                <Link
                  href={content.primaryCtaTarget}
                  className="group relative inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#0B0B0C] px-9 py-4 text-sm font-semibold tracking-wide text-[#F4F1EA] shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition hover:bg-black"
                >
              {content.primaryCta}
                  <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                    →
                  </span>
            </Link>
              </div>
              <Link
                href={content.secondaryCtaTarget}
                className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-black/20 bg-transparent px-9 py-4 text-sm font-semibold text-[#0B0B0C] transition hover:bg-black/5"
              >
              {content.secondaryCta}
            </Link>
          </div>
          {content.funnelHelperCopy ? (
            <p className="mt-6 max-w-2xl text-sm leading-7 text-[#6B6557]">{content.funnelHelperCopy}</p>
          ) : null}
          </motion.div>
          <footer className="mt-12 border-t border-black/10 pt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#6B6557]">© 2026 StudioFlows</p>
              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6B6557]" aria-label="Legal">
                <Link href="/privacy-policy" className="transition hover:text-[#0B0B0C]">
                  Privacy
                </Link>
                <Link href="/terms-of-service" className="transition hover:text-[#0B0B0C]">
                  Terms
                </Link>
              </nav>
            </div>
          </footer>
        </div>
      </RevealSection>
    </section>
  );
}

// ── PAIN ⇄ PRODUCT BANDS · alternating editorial spreads ──────────────────────
// Terse magazine-style bands that show a REAL product screenshot fast. Each band
// blends a known pain (scattered tools) with the product moment that resolves it.
// A lightweight interaction swaps the "scattered" before-state into the resolved
// StudioFlows screenshot — hover-preview on fine pointers, tap/keyboard toggle
// everywhere (aria-pressed). Reduced motion → resolved state, no auto-swap.
// Exported for a later task to wire into the page; not placed in any page here.

// Disconnected tools — concepts pulled from aiCategorySeparation.body
// (CRM / calendar / inbox / spreadsheet / group chat / text).
const PP_SCATTER_CHIPS = ["CRM", "Calendar", "Inbox", "Spreadsheet", "Group chat", "Text"];
const PP_CHIP_ROT = [-6, 4, -3, 7, -5, 3];
const PP_MAC_DOTS = ["#FF5F57", "#FEBC2E", "#28C840"];

function PainScatterChips({ tone }) {
  const dark = tone === "dark";
  return (
    <div className="flex h-full w-full flex-wrap content-center items-center justify-center gap-2.5 p-6 sm:gap-3 sm:p-8">
      {PP_SCATTER_CHIPS.map((chip, i) => (
        <span
          key={chip}
          className={`inline-flex items-center rounded-full border border-dashed px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] ${
            dark
              ? "border-white/20 bg-white/[0.03] text-[#C9C6C2]"
              : "border-black/15 bg-black/[0.03] text-[#5A554B]"
          }`}
          style={{ transform: `rotate(${PP_CHIP_ROT[i % PP_CHIP_ROT.length]}deg)` }}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

// Industry image slot: real photo at /industries/{key}.jpg with a graceful
// grain+gradient placeholder fallback if the asset is missing. Never crashes.
function PainIndustrySlot({ industry, tone }) {
  const [failed, setFailed] = useState(false);
  const dark = tone === "dark";
  return (
    <span
      className={`relative inline-flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border ${
        dark ? "border-white/15" : "border-black/10"
      }`}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 120% at 0% 0%, rgba(219,39,119,0.30), transparent 60%), radial-gradient(120% 120% at 100% 100%, rgba(212,168,83,0.28), transparent 60%)",
        }}
      />
      <span
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 2px)",
        }}
      />
      {!failed ? (
        <Image
          src={`/industries/${industry}.jpg`}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}

export function PainProductBand({ band, index }) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  // Reduced motion (or no JS hydration default): show the resolved screenshot.
  const showResolved = reduce ? true : revealed;
  const dark = band.tone === "dark";
  const phone = band.imageKind === "phone";
  const imageFirst = index % 2 === 1;

  const palette = dark
    ? {
        bg: "bg-[#0B0B12]",
        text: "text-[#F3EFEC]",
        muted: "text-[#9B9894]",
        frame: "border-white/10 bg-[#06060a]",
        chrome: "border-white/[0.06] bg-white/[0.02]",
        chromeLabel: "text-[#9B9894]/70",
        media: "bg-[#0b0b12]",
        scatter: "bg-[#070710]",
      }
    : {
        bg: "bg-[#F4F1EA]",
        text: "text-[#0B0B0C]",
        muted: "text-[#3A352C]",
        frame: "border-black/10 bg-white",
        chrome: "border-black/[0.06] bg-black/[0.02]",
        chromeLabel: "text-[#6B6557]",
        media: "bg-[#ECE8DF]",
        scatter: "bg-[#ECE8DF]",
      };

  const toggle = useCallback(() => {
    if (reduce) return;
    setRevealed((v) => !v);
  }, [reduce]);

  // Hover-preview on fine pointers; tap/keyboard toggle covers touch + a11y.
  const onEnter = useCallback(() => {
    if (!reduce) setRevealed(true);
  }, [reduce]);
  const onLeave = useCallback(() => {
    if (!reduce) setRevealed(false);
  }, [reduce]);

  const aspect = phone ? "aspect-[9/18]" : "aspect-[16/9]";

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden ${palette.bg} ${palette.text}`}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-28">
        {/* Copy column */}
        <div className={imageFirst ? "lg:order-2" : "lg:order-1"}>
          <div className="flex items-center gap-3">
            <PainIndustrySlot industry={band.industry} tone={band.tone} />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#D4A853]">
              {band.industry.replace(/-/g, " ")}
            </span>
          </div>
          <h3 className="mt-5 font-serif text-3xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            {band.headline}
          </h3>
          <p className={`mt-4 max-w-md text-base leading-7 ${palette.muted} sm:text-[17px]`}>
            {band.line}
          </p>
          <p className="mt-5 inline-flex items-center gap-2 font-serif text-lg font-semibold leading-snug tracking-[-0.01em] text-[#DB2777] sm:text-xl">
            <span aria-hidden="true" className="text-[#D4A853]">
              →
            </span>
            {band.benefit}
          </p>
        </div>

        {/* Product column — the interaction lives here */}
        <div className={imageFirst ? "lg:order-1" : "lg:order-2"}>
          <button
            type="button"
            onClick={toggle}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            aria-pressed={showResolved}
            aria-label={
              showResolved
                ? `Showing StudioFlows: ${band.benefit}`
                : `Show how StudioFlows resolves it: ${band.benefit}`
            }
            className={`group block w-full min-h-[44px] rounded-2xl border ${palette.frame} text-left shadow-[0_30px_90px_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]/70 ${
              phone ? "mx-auto max-w-[260px] p-2 sm:max-w-[300px]" : ""
            }`}
          >
            {/* Chrome bar */}
            <div className={`flex items-center gap-2 rounded-t-xl border-b ${palette.chrome} px-4 py-2.5`}>
              {PP_MAC_DOTS.map((c) => (
                <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `${c}cc` }} />
              ))}
              <span className={`ml-3 truncate font-mono text-[10px] uppercase tracking-[0.2em] ${palette.chromeLabel}`}>
                {showResolved ? "in StudioFlows" : "scattered across tools"}
              </span>
              <span
                className={`ml-auto hidden shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] sm:inline ${
                  dark ? "border-white/15 text-[#9B9894]" : "border-black/10 text-[#6B6557]"
                }`}
                aria-hidden="true"
              >
                {reduce ? "resolved" : showResolved ? "tap to scatter" : "tap to resolve"}
              </span>
            </div>

            {/* Media area: scattered chips ⇄ resolved screenshot */}
            <div className={`relative w-full overflow-hidden rounded-b-xl ${aspect} ${palette.media}`}>
              {reduce ? (
                <Image
                  src={band.image}
                  alt={`StudioFlows OS, ${band.headline}`}
                  fill
                  sizes={phone ? "300px" : "(min-width: 1024px) 50vw, 100vw"}
                  className="object-cover object-top"
                />
              ) : (
                <AnimatePresence initial={false} mode="wait">
                  {showResolved ? (
                    <motion.div
                      key="resolved"
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={band.image}
                        alt={`StudioFlows OS, ${band.headline}`}
                        fill
                        sizes={phone ? "300px" : "(min-width: 1024px) 50vw, 100vw"}
                        className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="scattered"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`absolute inset-0 ${palette.scatter}`}
                    >
                      <PainScatterChips tone={band.tone} />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function PainProductBands({ bands }) {
  if (!bands || bands.length === 0) return null;
  return (
    <>
      {bands.map((band, index) => (
        <PainProductBand key={band.id} band={band} index={index} />
      ))}
    </>
  );
}

// ── StoryExpander ────────────────────────────────────────────────────────────
// Accessible disclosure that keeps the long founder story collapsed by default,
// so skimmers see one teaser line instead of ~15. Collapsed → teaser + a real
// <button>. Expanded → framer-motion height/opacity reveal of the founderStory
// headline + body (passed in as `content`). useReducedMotion() → instant
// open/close with no height animation. Named export, NOT wired into any page.
//   content = { teaser, cta, headline, body }
export function StoryExpander({ content }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const regionId = useId();

  if (!content) return null;
  const { teaser, cta = "Read why we built this", headline, body = [] } = content;

  const Panel = (
    <div className="border-l-2 border-[#DB2777]/40 pl-6">
      {headline ? (
        <h3 className="max-w-2xl font-serif text-2xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#F3EFEC] sm:text-3xl">
          {headline}
        </h3>
      ) : null}
      <div className="mt-5 space-y-3">
        {body.map((line, index) => (
          <p key={index} className="text-base leading-7 text-[#B8B5B0] sm:text-[17px]">
            {line}
          </p>
        ))}
      </div>
    </div>
  );

  return (
    <div className="text-[#F3EFEC]">
      {teaser ? (
        <p className="max-w-2xl text-lg leading-8 text-[#C2BFBA] sm:text-xl">{teaser}</p>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={regionId}
        className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#DB2777]/40 px-5 py-2 font-mono text-xs uppercase tracking-[0.22em] text-[#DB2777] transition-colors hover:bg-[#DB2777]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]/70"
      >
        <span>{cta}</span>
        <span
          aria-hidden="true"
          className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`}
        >
          →
        </span>
      </button>

      {reduce ? (
        open ? (
          <div id={regionId} role="region" aria-label={headline || cta} className="mt-8">
            {Panel}
          </div>
        ) : null
      ) : (
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="story"
              id={regionId}
              role="region"
              aria-label={headline || cta}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="mt-8">{Panel}</div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </div>
  );
}

// ── IndustryImage ────────────────────────────────────────────────────────────
// Canonical swappable image slot for industry/lifestyle photography we don't
// have yet. Points at /industries/{slot}.jpg; on a missing/failed asset it
// gracefully falls back (onError) to a tasteful grain + gradient block with the
// humanized slot label centered, so an empty slot reads as intentional, never
// broken. `tone`: "dark" → desaturated noir (grayscale + dark gradient + faint
// magenta #DB2777 rim); "light" → warm full-color framing. `kind`: "portrait"
// (~4:5) or "wide" (~16:9). Named export, NOT wired into any page.
const INDUSTRY_IMAGE_SIZES = "(min-width: 1024px) 50vw, 100vw";

function humanizeSlot(slot) {
  return String(slot || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function IndustryImage({ slot, kind = "portrait", tone = "dark", className = "" }) {
  const [failed, setFailed] = useState(false);
  const dark = tone === "dark";
  const label = humanizeSlot(slot);
  const aspect = kind === "wide" ? "aspect-[16/9]" : "aspect-[4/5]";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${aspect} ${
        dark ? "bg-[#07070C]" : "bg-[#F4F1EA]"
      } ${className}`}
    >
      {!failed ? (
        <Image
          src={`/industries/${slot}.jpg`}
          alt={label}
          fill
          sizes={INDUSTRY_IMAGE_SIZES}
          onError={() => setFailed(true)}
          className={`object-cover ${
            dark ? "grayscale-[0.85] contrast-[1.05] brightness-[0.82]" : "saturate-[1.05]"
          }`}
        />
      ) : (
        <div
          role="img"
          aria-label={label}
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* Gradient base — noir for dark, warm for light. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: dark
                ? "radial-gradient(120% 120% at 0% 0%, rgba(219,39,119,0.18), transparent 55%), radial-gradient(120% 120% at 100% 100%, rgba(8,8,14,0.9), rgba(8,8,14,1) 70%)"
                : "radial-gradient(120% 120% at 0% 0%, rgba(212,168,83,0.30), transparent 55%), radial-gradient(120% 120% at 100% 100%, rgba(219,39,119,0.16), transparent 60%)",
            }}
          />
          {/* Grain overlay. */}
          <div
            className="absolute inset-0 opacity-30 mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 2px)",
            }}
          />
          {/* Faint magenta rim (more present in dark/noir tone). */}
          <div
            className={`pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ${
              dark ? "ring-[#DB2777]/30" : "ring-[#DB2777]/15"
            }`}
          />
          <span
            className={`relative z-10 px-4 text-center font-serif text-xl font-semibold tracking-[-0.02em] sm:text-2xl ${
              dark ? "text-[#F3EFEC]" : "text-[#0B0B0C]"
            }`}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

