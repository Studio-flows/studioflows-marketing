"use client";

import Link from "next/link";
import { useState } from "react";

import {
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const startBooking = async () => {
    setIsLoading(true);
    setError("");

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
          ops_check_answers: opsCheckAnswers,
          ...attribution,
          src: attribution.src ?? from,
        }),
      });
      const result = await response.json().catch(() => ({}));
      const leadId = typeof result.lead_id === "string" ? result.lead_id.trim() : "";
      const bookCallUrl = typeof result.book_call_url === "string" ? result.book_call_url.trim() : "";

      if (response.ok && leadId && bookCallUrl) {
        const bookingUrl = new URL(bookCallUrl);
        if (
          bookingUrl.protocol === "https:" &&
          bookingUrl.hostname === "os.studioflows.co" &&
          bookingUrl.pathname === "/s/app/ops-audit/book" &&
          bookingUrl.searchParams.get("lead_id") === leadId
        ) {
          trackConversionEvent({
            event: "qualified_submission",
            application_id: "ops_check_booking",
            source: "/apply",
          });
          saveBookCallUrl(bookCallUrl, leadId);
          window.location.assign(bookCallUrl);
          return;
        }
      }
    } catch {
      // The visible error below is the fail-closed recovery path.
    } finally {
      setIsLoading(false);
    }

    setError("We could not start your booking. Complete the Ops Teardown instead.");
  };

  return (
    <div>
      <button type="button" className={className} disabled={isLoading} onClick={startBooking}>
        {isLoading ? "Starting booking…" : label}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-amber-700" role="alert">
          {error} <Link href="/services/custom-ops-hub" className="underline">Get an Ops Teardown</Link>
        </p>
      ) : null}
    </div>
  );
}
