import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  FileCheck2,
  Inbox,
  LayoutGrid,
  MessageSquareText,
  ShieldCheck,
  Users2,
} from "lucide-react";

export const metadata = {
  title: "Service operations, reimagined for AI.",
  description:
    "StudioFlows coordinates customer work, teams, and AI agents from intake through completion.",
  alternates: {
    canonical: "/v2",
  },
};

const businessExamples = [
  "general contractors",
  "law firms",
  "HVAC companies",
  "managed IT providers",
  "property managers",
  "agencies & consultants",
  "real estate media teams",
  "accounting firms",
  "photographers",
  "cleaning companies",
];

const navItems = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#product" },
  { label: "Businesses", href: "#business-types" },
];

function BrandMark() {
  return (
    <Link href="/v2" className="flex items-center gap-3" aria-label="StudioFlows V2 home">
      <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.035]">
        <div className="h-3.5 w-3.5 rounded-[4px] border border-[#75B7FF]/70 shadow-[0_0_18px_rgba(117,183,255,.18)]" />
      </div>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">studioflows</span>
    </Link>
  );
}

function SidebarButton({ active = false, children }) {
  return (
    <div
      className={[
        "grid h-9 w-9 place-items-center rounded-[10px] border transition",
        active
          ? "border-[#466A90] bg-[#132131] text-[#A9D0FF] shadow-[inset_0_0_0_1px_rgba(118,183,255,.04)]"
          : "border-transparent text-[#687383]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function MiniMetric({ label, value, detail, accent }) {
  return (
    <div className="rounded-[15px] border border-white/[0.055] bg-[#0F1318] px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#6E7782]">{label}</p>
        <span className={"h-1.5 w-1.5 rounded-full " + accent} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[23px] font-medium tracking-[-0.04em] text-[#F2F4F7]">{value}</p>
        <p className="pb-0.5 text-[10px] text-[#69727D]">{detail}</p>
      </div>
    </div>
  );
}

function WorkRow({ icon, title, meta, status, tone = "neutral" }) {
  const toneClass =
    tone === "good"
      ? "border-[#214735] bg-[#12261D] text-[#91D8B0]"
      : tone === "warn"
        ? "border-[#554727] bg-[#2A2415] text-[#DDC47A]"
        : "border-white/[0.07] bg-white/[0.025] text-[#A7B0BB]";

  return (
    <div className="group flex items-center gap-3 rounded-[13px] border border-white/[0.045] bg-[#0B0F13] px-3.5 py-3 transition hover:border-white/[0.09] hover:bg-[#0D1217]">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.055] bg-white/[0.025] text-[#8C98A5]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-[#DCE1E7]">{title}</p>
        <p className="mt-0.5 truncate text-[10px] text-[#69737E]">{meta}</p>
      </div>
      <span className={"hidden rounded-full border px-2 py-1 text-[9px] font-medium sm:inline-flex " + toneClass}>
        {status}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-[#4D5661] transition group-hover:translate-x-0.5 group-hover:text-[#82909E]" />
    </div>
  );
}

// Temporary illustrative product shell for the marketing preview.
// Replace with approved real Portal V2 product media before homepage cutover.
function ProductShell() {
  return (
    <div id="product" className="relative mx-auto w-full max-w-[820px] lg:max-w-none">
      <div className="absolute -inset-x-16 -inset-y-20 -z-10 bg-[radial-gradient(circle_at_42%_38%,rgba(34,211,238,.10),transparent_36%),radial-gradient(circle_at_72%_62%,rgba(168,85,247,.11),transparent_42%),radial-gradient(circle_at_58%_50%,rgba(219,39,119,.07),transparent_55%)] blur-3xl" />
      <div className="pointer-events-none absolute -inset-[1px] -z-[1] rounded-[27px] bg-[linear-gradient(135deg,rgba(34,211,238,.18),rgba(168,85,247,.08)_42%,rgba(219,39,119,.14)_72%,rgba(255,255,255,.04))] opacity-80 blur-[1px]" />

      <div className="relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#080B0F] shadow-[0_40px_120px_rgba(0,0,0,.48),0_0_0_1px_rgba(255,255,255,.015)]">
        <div className="flex h-11 items-center justify-between border-b border-white/[0.055] bg-[#0A0D11] px-4">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-[3px] border border-[#6AA9E8]/60 bg-[#102033]" />
            <span className="text-[10px] font-semibold tracking-[-0.01em] text-[#CFD5DD]">STUDIOFLOWS</span>
            <span className="hidden text-[9px] text-[#4F5965] sm:inline">/ COMMAND</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.055] bg-white/[0.025] px-2.5 py-1 text-[9px] text-[#727D89] sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#78C89B] shadow-[0_0_8px_rgba(120,200,155,.45)]" />
              Operations live
            </div>
            <div className="grid h-6 w-6 place-items-center rounded-full border border-white/[0.08] bg-[#151A20] text-[8px] font-semibold text-[#B8C1CB]">
              D
            </div>
          </div>
        </div>

        <div className="flex min-h-[500px]">
          <aside className="hidden w-[58px] shrink-0 flex-col items-center border-r border-white/[0.05] bg-[#090C10] py-4 sm:flex">
            <div className="flex flex-col gap-1.5">
              <SidebarButton active><Command className="h-4 w-4" /></SidebarButton>
              <SidebarButton><LayoutGrid className="h-4 w-4" /></SidebarButton>
              <SidebarButton><Inbox className="h-4 w-4" /></SidebarButton>
              <SidebarButton><CalendarDays className="h-4 w-4" /></SidebarButton>
              <SidebarButton><Users2 className="h-4 w-4" /></SidebarButton>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full border border-[#4F6A82] bg-[#112131] text-[9px] font-semibold text-[#9FCBFA]">V</div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.08] bg-[#15191E] text-[9px] font-semibold text-[#AAB3BE]">E</div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="border-b border-white/[0.05] px-4 pb-0 pt-4 sm:px-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-medium uppercase tracking-[0.17em] text-[#56616D]">Operations</p>
                  <h2 className="mt-1 font-sans text-[19px] font-medium tracking-[-0.035em] text-[#EEF1F5]">Command</h2>
                </div>
                <div className="mb-2 hidden items-center gap-2 rounded-[10px] border border-white/[0.055] bg-white/[0.02] px-2.5 py-1.5 text-[9px] text-[#7A8490] md:flex">
                  <CircleDot className="h-3 w-3 text-[#6D9FCD]" />
                  Live operational state
                </div>
              </div>
              <div className="mt-4 flex gap-5">
                {["Overview", "Signals", "Objectives", "Work"].map((item, index) => (
                  <div
                    key={item}
                    className={[
                      "border-b pb-2.5 text-[10px] font-medium",
                      index === 0
                        ? "border-[#7CB8F2] text-[#D7E8F9]"
                        : "border-transparent text-[#68727D]",
                    ].join(" ")}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-3 gap-2.5">
                <MiniMetric label="Completed" value="12" detail="today" accent="bg-[#79C99A]" />
                <MiniMetric label="Needs you" value="4" detail="decisions" accent="bg-[#D1AF64]" />
                <MiniMetric label="In motion" value="18" detail="active" accent="bg-[#76AEE6]" />
              </div>

              <div className="grid gap-3.5 lg:grid-cols-[1.28fr_.72fr]">
                <section className="rounded-[17px] border border-white/[0.055] bg-[#0D1116] p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-[#D5DAE0]">Prepared for your approval</p>
                      <p className="mt-0.5 text-[9px] text-[#606A75]">Only the decisions that actually need you.</p>
                    </div>
                    <span className="rounded-full border border-[#514429] bg-[#251F13] px-2 py-1 text-[8px] font-medium text-[#DCC17A]">4 waiting</span>
                  </div>
                  <div className="space-y-2">
                    <WorkRow
                      icon={<CalendarDays className="h-3.5 w-3.5" />}
                      title="Move Halloran service visit"
                      meta="Vessa prepared client + team updates"
                      status="Review"
                      tone="warn"
                    />
                    <WorkRow
                      icon={<MessageSquareText className="h-3.5 w-3.5" />}
                      title="Approve scope change"
                      meta="Meyer project · added deliverable"
                      status="Review"
                      tone="warn"
                    />
                    <WorkRow
                      icon={<FileCheck2 className="h-3.5 w-3.5" />}
                      title="Closeout ready"
                      meta="Evidence complete · client handoff prepared"
                      status="Ready"
                      tone="good"
                    />
                  </div>
                </section>

                <section className="rounded-[17px] border border-white/[0.055] bg-[#0D1116] p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-[#D5DAE0]">Operations pulse</p>
                    <span className="flex items-center gap-1.5 text-[8px] text-[#6C7681]">
                      <span className="v2-live-dot h-1.5 w-1.5 rounded-full bg-[#79C99A]" />
                      live
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[27px] font-medium tracking-[-0.05em] text-[#F0F3F6]">87%</span>
                      <span className="text-[9px] text-[#6B7580]">on track</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#171D24]">
                      <div className="v2-progress h-full w-[87%] rounded-full bg-[#6FA9DF]" />
                    </div>
                    <div className="mt-4 space-y-2.5">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-[#6B7580]">Exceptions</span>
                        <span className="text-[#CBD2DA]">2</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-[#6B7580]">Waiting on customer</span>
                        <span className="text-[#CBD2DA]">3</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-[#6B7580]">Due today</span>
                        <span className="text-[#CBD2DA]">6</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section className="rounded-[17px] border border-white/[0.055] bg-[#0D1116] p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-full border border-[#4D6984] bg-[#102030] text-[8px] font-semibold text-[#9FCBFA]">V</div>
                    <div>
                      <p className="text-[10px] font-medium text-[#D7DDE4]">Vessa is following through</p>
                      <p className="text-[8.5px] text-[#5F6974]">Operational work still in motion</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-[#6D7782]">6 active</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-[12px] border border-white/[0.045] bg-[#0A0E12] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-[#C9D0D8]">Missing site photos</p>
                      <Clock3 className="h-3 w-3 text-[#6E7883]" />
                    </div>
                    <p className="mt-1.5 text-[9px] leading-4 text-[#636E79]">Requested from field lead · next check 1:30 PM</p>
                  </div>
                  <div className="rounded-[12px] border border-white/[0.045] bg-[#0A0E12] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-[#C9D0D8]">Customer schedule update</p>
                      <MessageSquareText className="h-3 w-3 text-[#6E7883]" />
                    </div>
                    <p className="mt-1.5 text-[9px] leading-4 text-[#636E79]">Drafted and queued after approval</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-[88px] right-3 hidden w-[235px] rounded-[16px] border border-[#314258] bg-[#0B1016]/95 p-3.5 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl xl:block">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[#4B4026] bg-[#231E12] px-2 py-1 text-[8px] font-medium text-[#DCC17A]">Needs approval</span>
            <ShieldCheck className="h-3.5 w-3.5 text-[#6D7D8F]" />
          </div>
          <p className="mt-3 text-[11px] font-medium text-[#E4E9EE]">Schedule change prepared</p>
          <p className="mt-1 text-[9px] leading-4 text-[#697582]">
            Team availability checked. Customer message and calendar update are ready.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-[10px] border border-white/[0.05] bg-white/[0.025] px-2.5 py-2">
            <span className="text-[8.5px] text-[#6D7884]">Evidence</span>
            <span className="flex items-center gap-1 text-[8.5px] text-[#9CC8F3]">
              <Check className="h-3 w-3" /> 3 sources
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-[9px] border border-white/[0.065] px-2.5 py-2 text-center text-[8.5px] text-[#85909B]">Open</div>
            <div className="flex-1 rounded-[9px] bg-[#DDE7F0] px-2.5 py-2 text-center text-[8.5px] font-semibold text-[#101820]">Approve</div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-3 flex max-w-[92%] items-center justify-between text-[9px] text-[#4E5863]">
        <span>Live operational context</span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-[#678E78]" />
          actions stay visible
        </span>
      </div>
    </div>
  );
}

export default function V2HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090C] font-sans text-white">
      <style>{`
        @keyframes v2Pulse {
          0%, 100% { opacity: .65; box-shadow: 0 0 0 0 rgba(121,201,154,.18); }
          50% { opacity: 1; box-shadow: 0 0 0 5px rgba(121,201,154,0); }
        }
        @keyframes v2Progress {
          from { transform: scaleX(.72); opacity: .55; }
          to { transform: scaleX(1); opacity: 1; }
        }
        @keyframes v2AuroraOne {
          0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: .75; }
          50% { transform: translate3d(-28px,22px,0) scale(1.08); opacity: 1; }
        }
        @keyframes v2AuroraTwo {
          0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: .62; }
          50% { transform: translate3d(32px,-18px,0) scale(1.12); opacity: .9; }
        }
        @keyframes v2BusinessCycle {
          0%, 7% {
            opacity: 0;
            transform: translateY(7px);
            filter: blur(2px);
          }
          10%, 17% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
          20%, 100% {
            opacity: 0;
            transform: translateY(-7px);
            filter: blur(2px);
          }
        }
        .v2-aurora-one { animation: v2AuroraOne 15s ease-in-out infinite; }
        .v2-aurora-two { animation: v2AuroraTwo 19s ease-in-out infinite; }
        .v2-live-dot { animation: v2Pulse 2.8s ease-in-out infinite; }
        .v2-progress { transform-origin: left; animation: v2Progress 1.2s cubic-bezier(.2,.8,.2,1) both; }
        .v2-business-example {
          opacity: 0;
          animation: v2BusinessCycle 24s cubic-bezier(.22,.75,.2,1) infinite;
          animation-delay: calc(var(--business-index) * 2.4s);
          will-change: opacity, transform, filter;
        }
        @media (prefers-reduced-motion: reduce) {
          .v2-aurora-one, .v2-aurora-two, .v2-live-dot, .v2-progress, .v2-business-example { animation: none; }
          .v2-business-example { display: none; opacity: 1; transform: none; filter: none; }
          .v2-business-example:first-child { display: inline; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(34,211,238,.10),transparent_27%),radial-gradient(circle_at_83%_36%,rgba(168,85,247,.10),transparent_30%),radial-gradient(circle_at_18%_5%,rgba(219,39,119,.07),transparent_24%),linear-gradient(180deg,#07090C_0%,#080A0E_45%,#07090C_100%)]" />

      <div className="v2-aurora v2-aurora-one pointer-events-none absolute right-[6%] top-[11%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.13)_0%,rgba(99,102,241,.08)_34%,transparent_68%)] blur-[46px]" />
      <div className="v2-aurora v2-aurora-two pointer-events-none absolute left-[10%] top-[20%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(219,39,119,.08)_0%,rgba(168,85,247,.07)_36%,transparent_68%)] blur-[52px]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          maskImage: "linear-gradient(to bottom, black, transparent 76%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,.20) 0.6px, transparent 0.8px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(circle at 70% 28%, black 0%, transparent 48%)",
        }}
      />
      <div className="pointer-events-none absolute left-[8%] right-[5%] top-[115px] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <header className="relative z-20 border-b border-white/[0.045]">
        <div className="mx-auto flex h-[72px] w-full max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-10 xl:px-14">
          <BrandMark />

          <nav className="hidden items-center gap-7 md:flex" aria-label="V2 navigation">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[12px] font-medium text-[#7E8792] transition hover:text-[#DCE2E8]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="hidden min-h-9 items-center justify-center rounded-full px-4 text-[11px] font-medium text-[#8E98A4] transition hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/[0.12] bg-[#EEF2F5] px-4 text-[11px] font-semibold text-[#0B1117] transition hover:bg-white"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10">
        <div className="mx-auto grid min-h-[calc(100vh-72px)] w-full max-w-[1480px] items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:px-10 lg:py-16 xl:px-14">
          <div className="lg:col-span-5 lg:-translate-y-7 lg:pr-7 xl:pr-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.19em] text-[#748191]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#73AEE6]" />
              Service operations
            </div>

            <h1 className="max-w-[700px] font-sans text-[46px] font-medium leading-[0.98] tracking-[-0.055em] text-[#F4F6F8] sm:text-[58px] lg:text-[64px] xl:text-[72px]">
              Service operations,
              <span className="block bg-[linear-gradient(100deg,#67E8F9_0%,#818CF8_30%,#A855F7_54%,#DB2777_76%,#22D3EE_100%)] bg-clip-text text-transparent [text-shadow:0_0_32px_rgba(168,85,247,.10)]">reimagined for AI.</span>
            </h1>

            <p className="mt-7 max-w-[590px] text-[17px] leading-7 text-[#8D97A3] sm:text-[18px]">
              One system for coordinating customer work, teams, and AI agents from intake through completion.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#EEF2F5] px-5 text-[12px] font-semibold text-[#0A1016] transition hover:bg-white"
              >
                Start free
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#product"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.025] px-5 text-[12px] font-medium text-[#BBC4CE] transition hover:border-white/[0.15] hover:bg-white/[0.045] hover:text-white"
              >
                See how it works
              </Link>
            </div>

            <div id="business-types" className="mt-10 border-t border-white/[0.055] pt-5">
              <p className="text-[9px] font-medium uppercase tracking-[0.17em] text-[#4F5965]">
                Built for service businesses like
              </p>

              <div className="relative mt-2.5 h-8 overflow-hidden" aria-label="Examples of service businesses StudioFlows supports">
                {businessExamples.map((business, index) => (
                  <span
                    key={business}
                    className="v2-business-example absolute left-0 top-0 text-[17px] font-medium tracking-[-0.025em] text-[#C8D2DD] sm:text-[18px]"
                    style={{ "--business-index": index }}
                  >
                    {business}
                  </span>
                ))}
              </div>

              <p className="mt-2 text-[10px] leading-5 text-[#56616D]">
                Projects · cases · appointments · work orders · service requests · fulfillment
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 lg:-translate-y-3 lg:translate-x-7 lg:scale-[1.025] lg:origin-left xl:translate-x-10">
            <ProductShell />
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07090C] to-transparent" />
    </main>
  );
}
