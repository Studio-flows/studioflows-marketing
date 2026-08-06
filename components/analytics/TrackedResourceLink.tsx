"use client";

import Link from "next/link";
import type { ReactNode } from "react";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    clarity?: (command: string, eventName: string) => void;
  }
}

type TrackedResourceLinkProps = {
  href: string;
  eventLabel: string;
  eventLocation: string;
  className?: string;
  children: ReactNode;
};

export function TrackedResourceLink({
  href,
  eventLabel,
  eventLocation,
  className,
  children,
}: TrackedResourceLinkProps) {
  function trackResourceClick() {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: "resource_cta_click",
      resource_path: href,
      resource_label: eventLabel,
      resource_location: eventLocation,
    });
    window.clarity?.("event", "resource_cta_click");
  }

  return (
    <Link href={href} className={className} onClick={trackResourceClick}>
      {children}
    </Link>
  );
}
