import type { Metadata } from "next";
import type { ReactNode } from "react";

import { VESSA_FRAMEWORK } from "@/lib/vessa-framework-content";

export const metadata: Metadata = {
  title: VESSA_FRAMEWORK.meta.title,
  description: VESSA_FRAMEWORK.meta.description,
  alternates: {
    canonical: "/vessa",
  },
  openGraph: {
    title: `${VESSA_FRAMEWORK.meta.title} | StudioFlows`,
    description: VESSA_FRAMEWORK.meta.description,
    url: "/vessa",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${VESSA_FRAMEWORK.meta.title} | StudioFlows`,
    description: VESSA_FRAMEWORK.meta.description,
  },
  icons: {
    icon: "/Vessa%20favicon%20(200%20x%20200%20px).svg",
    shortcut: "/Vessa%20favicon%20(200%20x%20200%20px).svg",
    apple: "/Vessa%20favicon%20(200%20x%20200%20px).svg",
  },
};

export default function VessaLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
