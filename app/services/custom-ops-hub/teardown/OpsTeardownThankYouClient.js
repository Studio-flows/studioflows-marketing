"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import OpsTeardownSheetView from "@/components/ops-teardown/OpsTeardownSheetView";
import { buildOpsAuditBookUrl } from "@/lib/ops-audit-handoff";
import {
  buildTeardownPdfDownloadUrl,
  buildTeardownReferralMailto,
  buildTeardownReferralUrl,
  buildTeardownShareUrl,
} from "@/lib/ops-teardown/teardown-share";
import {
  QualifierAtmosphere,
  QUALIFIER_PAGE,
  Q_BODY,
  Q_CARD,
  Q_CTA_PRIMARY,
  Q_CTA_SECONDARY,
  Q_EYEBROW,
  Q_HEADLINE,
} from "@/components/qualifier/qualifier-theme";

function readSearchParam(search, key) {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const value = params.get(key);
  return value?.trim() ? value.trim() : null;
}

export default function OpsTeardownThankYouClient({ initialSearch = "" }) {
  const leadId = useMemo(() => readSearchParam(initialSearch, "lead_id"), [initialSearch]);
  const email = useMemo(() => readSearchParam(initialSearch, "email"), [initialSearch]);
  const from = useMemo(() => readSearchParam(initialSearch, "from") ?? "custom-ops-hub", [initialSearch]);

  const [sheet, setSheet] = useState(null);
  const [sheetState, setSheetState] = useState("idle");
  const [sheetError, setSheetError] = useState("");
  const [emailState, setEmailState] = useState("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    if (!leadId && !email) {
      setSheetState("missing");
      return;
    }

    const params = new URLSearchParams();
    if (leadId) params.set("lead_id", leadId);
    if (email) params.set("email", email);

    setSheetState("loading");
    setSheetError("");

    fetch(`/api/studioflows/ops-teardown?${params.toString()}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error || "Unable to generate your Ops Teardown right now.");
        }
        return body.sheet;
      })
      .then((nextSheet) => {
        setSheet(nextSheet);
        setSheetState("ready");
      })
      .catch((error) => {
        setSheet(null);
        setSheetState("error");
        setSheetError(error instanceof Error ? error.message : "Unable to generate your Ops Teardown.");
      });
  }, [leadId, email]);

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : undefined;

  const bookCallUrl = leadId
    ? buildOpsAuditBookUrl({
        leadId,
        email,
        from,
        platformRoot:
          process.env.NEXT_PUBLIC_STUDIOFLOWS_PLATFORM_URL ?? "https://os.studioflows.co",
      })
    : null;

  const pdfDownloadUrl =
    sheetState === "ready" && (leadId || email)
      ? buildTeardownPdfDownloadUrl({ leadId, email, siteOrigin })
      : null;

  const shareUrl =
    sheetState === "ready" && leadId
      ? buildTeardownShareUrl({ leadId, email, from, siteOrigin })
      : null;

  const referralUrl = buildTeardownReferralUrl(siteOrigin);
  const referralMailto = buildTeardownReferralMailto({
    companyName: sheet?.company_name,
    siteOrigin,
  });

  const handleEmailShare = async () => {
    if (!leadId && !email) return;
    setEmailState("sending");
    setEmailMessage("");

    try {
      const response = await fetch("/api/studioflows/ops-teardown/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          email,
          to_email: email,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Unable to email your teardown right now.");
      }
      setEmailState("sent");
      setEmailMessage(body.share_url ? `Sent to ${email}.` : "Teardown email sent.");
    } catch (error) {
      setEmailState("error");
      setEmailMessage(error instanceof Error ? error.message : "Unable to email your teardown.");
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("error");
    }
  };

  return (
    <main className={QUALIFIER_PAGE}>
      <QualifierAtmosphere />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:py-10">
        <header className={`${Q_CARD} p-5 sm:p-6`}>
          <p className={Q_EYEBROW}>Thank you</p>
          <h1 className={`mt-2 text-2xl sm:text-3xl ${Q_HEADLINE}`}>
            {sheet?.company_name
              ? `${sheet.company_name} — Ops Teardown`
              : "Your Ops Teardown is ready."}
          </h1>
          <p className={`mt-3 max-w-2xl text-sm leading-7 ${Q_BODY}`}>
            Built from your pre-qualifier and full qualifier answers. Review your teardown below,
            then book a full ops audit with the founder of StudioFlows when you are ready to go deeper.
          </p>

          {sheetState === "loading" ? (
            <p className="mt-4 text-sm text-[#4E483D]">Generating your teardown sheet…</p>
          ) : null}
          {sheetState === "error" ? (
            <p className="mt-4 text-sm text-amber-900">{sheetError}</p>
          ) : null}
          {sheetState === "missing" ? (
            <p className="mt-4 text-sm text-amber-900">
              Missing lead reference. Return to the qualifier to restart your handoff.
            </p>
          ) : null}

          {bookCallUrl ? (
            <a href={bookCallUrl} className={`mt-5 inline-flex ${Q_CTA_PRIMARY}`}>
              Book a Full Ops Audit with the Founder
            </a>
          ) : (
            <Link href="/services/custom-ops-hub" className={`mt-5 inline-flex ${Q_CTA_SECONDARY}`}>
              Return to Qualifier
            </Link>
          )}

          {sheetState === "ready" ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {pdfDownloadUrl ? (
                <a href={pdfDownloadUrl} className={Q_CTA_SECONDARY}>
                  Download PDF
                </a>
              ) : null}
              {email ? (
                <button
                  type="button"
                  onClick={handleEmailShare}
                  disabled={emailState === "sending"}
                  className={Q_CTA_SECONDARY}
                >
                  {emailState === "sending" ? "Sending…" : "Email PDF to me"}
                </button>
              ) : null}
              {shareUrl ? (
                <button type="button" onClick={handleCopyShareLink} className={Q_CTA_SECONDARY}>
                  {copyState === "copied" ? "Link copied" : "Copy share link"}
                </button>
              ) : null}
              <a href={referralMailto} className={Q_CTA_SECONDARY}>
                Know someone with ops drag?
              </a>
            </div>
          ) : null}

          {emailMessage ? <p className="mt-3 text-sm text-[#4E483D]">{emailMessage}</p> : null}
          <p className="mt-3 text-xs leading-6 text-[#4E483D]">
            Referral link:{" "}
            <a href={referralUrl} className="underline underline-offset-2">
              {referralUrl}
            </a>
          </p>
        </header>

        {sheetState === "ready" && sheet ? (
          <OpsTeardownSheetView sheet={sheet} viewport />
        ) : null}
      </div>
    </main>
  );
}
