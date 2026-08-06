import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Silent Collapse Diagnostic",
  description:
    "Campaign diagnostic for founder-led teams seeing silent operational collapse — founder bottleneck signals, REC proof, and OPS Drag Audit handoff.",
  alternates: {
    canonical: "/silent-collapse",
  },
  openGraph: {
    title: "Silent Collapse Diagnostic | StudioFlows",
    description: "See the collapse before it compounds. Five-signal diagnostic and OPS Drag Audit path.",
    url: "https://www.studioflows.co/silent-collapse",
    siteName: "StudioFlows",
    type: "website",
    images: [
      {
        url: "/case-studies/rec/job-workspace.png",
        width: 1200,
        height: 630,
        alt: "StudioFlows REC job workspace — operational control surface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Silent Collapse Diagnostic | StudioFlows",
    description: "Founder bottleneck diagnostic for teams seeing silent operational collapse.",
    images: ["/case-studies/rec/job-workspace.png"],
  },
};

export default function SilentCollapseLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <div className="dark min-h-screen bg-[#050505] text-white">{children}</div>
    </ThemeProvider>
  );
}
