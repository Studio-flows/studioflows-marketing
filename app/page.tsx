import type { Metadata } from "next";
import AppleHomepage from "@/components/home/AppleHomepage";

const title = "The AI-Native Operating System for Service Businesses";
const description =
  "StudioFlows brings your team, work, and AI into one operating system shaped around your service business. Find your flow and explore the current demo.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/" },
  twitter: { title, description },
};

export default function HomePage() {
  return <AppleHomepage />;
}
