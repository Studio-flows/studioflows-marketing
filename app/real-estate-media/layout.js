import { IBM_Plex_Mono } from "next/font/google";

export const metadata = {
  title: "Real Estate Media | Media Ops Score",
  description:
    "A real estate media industry example of StudioFlows, the operating system for service businesses across industries. Explore booking-to-delivery operations.",
};

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export default function RealEstateMediaLayout({ children }) {
  return <div className={`${ibmPlexMono.variable} font-mono`}>{children}</div>;
}
