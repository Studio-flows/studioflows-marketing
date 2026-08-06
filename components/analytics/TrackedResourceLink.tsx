"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackConversionEvent } from "@/lib/analytics-events";

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
    trackConversionEvent({
      event: "resource_cta_click",
      resource_path: href,
      resource_label: eventLabel,
      resource_location: eventLocation,
    });
  }

  return (
    <Link href={href} className={className} onClick={trackResourceClick}>
      {children}
    </Link>
  );
}
