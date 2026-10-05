import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Silent Collapse Diagnostic",
  description:
    "Find founder bottlenecks, stalled decisions, and broken handoffs in your service business with the Silent Collapse diagnostic and Ops Drag Audit.",
  path: "/silent-collapse",
});

export default function SilentCollapseLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <div className="dark min-h-screen bg-[#050505] text-white">{children}</div>
    </ThemeProvider>
  );
}
