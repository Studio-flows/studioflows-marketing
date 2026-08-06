"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  buildDirectOpsAuditBookUrl,
  loadBookCallUrl,
  mergeLeadAttribution,
  parseLeadAttribution,
  loadLeadAttribution,
  saveBookCallUrl,
  toIngestAttribution,
} from "@/lib/lead-attribution";
import { trackConversionEvent } from "@/lib/analytics-events";

export function BookQuickCallButton({
  className,
  label,
  pqScore,
  pqBand,
  opsCheckAnswers = [],
  from = "homepage-ops-check-qualified",
}) {
  const [bookHref, setBookHref] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setBookHref(loadBookCallUrl());
  }, []);

  const startBooking = async () => {
    setIsLoading(true);

    try {
      const attribution = toIngestAttribution(
        mergeLeadAttribution(
          parseLeadAttribution(typeof window !== "undefined" ? window.location.search : ""),
          loadLeadAttribution()
        )
      );

      const response = await fetch("/api/studioflows/ingest-ops-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          pq_score: pqScore,
          pq_band: pqBand,
          pq_qualified: true,
          src: "homepage-diagnosis",
          ops_check_answers: opsCheckAnswers,
          ...attribution,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && typeof result.book_call_url === "string" && result.book_call_url.trim()) {
        trackConversionEvent({
          event: "qualified_submission",
          application_id: "ops_check_booking",
          source: "/apply",
        });
        saveBookCallUrl(result.book_call_url, result.lead_id ?? null);
        window.location.assign(result.book_call_url);
        return;
      }
    } catch {
      // Fall through to direct book URL recovery path.
    }

    window.location.assign(buildDirectOpsAuditBookUrl(from));
  };

  if (bookHref) {
    return (
      <Link href={bookHref} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} disabled={isLoading} onClick={startBooking}>
      {isLoading ? "Starting booking…" : label}
    </button>
  );
}
