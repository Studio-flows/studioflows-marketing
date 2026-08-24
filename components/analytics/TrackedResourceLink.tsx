"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackConversionEvent, type GeoEventContext } from "@/lib/analytics-events";

type TrackedResourceLinkProps = {
  href: string;
  eventLabel: string;
  eventLocation: string;
  geoContext?: GeoEventContext;
  className?: string;
  children: ReactNode;
};

export function TrackedResourceLink({
  href,
  eventLabel,
  eventLocation,
  geoContext,
  className,
  children,
}: TrackedResourceLinkProps) {
  function trackResourceClick() {
    trackConversionEvent({
      event: "resource_cta_click",
      resource_path: href,
      resource_label: eventLabel,
      resource_location: eventLocation,
      ...geoContext,
    });
  }

  return (
    <Link href={href} className={className} onClick={trackResourceClick}>
      {children}
    </Link>
  );
}
