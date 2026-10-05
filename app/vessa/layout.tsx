import type { Metadata } from "next";
import type { ReactNode } from "react";

import { VESSA_FRAMEWORK } from "@/lib/vessa-framework-content";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicPageMetadata({ ...VESSA_FRAMEWORK.meta, path: "/vessa" }),
  icons: {
    icon: "/Vessa%20favicon%20(200%20x%20200%20px).svg",
    shortcut: "/Vessa%20favicon%20(200%20x%20200%20px).svg",
    apple: "/Vessa%20favicon%20(200%20x%20200%20px).svg",
  },
};

export default function VessaLayout({ children }: { children: ReactNode }) {
  return children;
}
