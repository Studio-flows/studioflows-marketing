"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OpsTeardownSheetView from "@/components/ops-teardown/OpsTeardownSheetView";
import type { AuthorizedTeardown } from "@/lib/ops-teardown/authorized-access";
import {
  buildTeardownPdfEndpoint,
  buildTeardownReferralMailto,
  buildTeardownReferralUrl,
} from "@/lib/ops-teardown/teardown-share";
import {
  QualifierAtmosphere,
  QUALIFIER_PAGE,
  Q_BODY,
  Q_CARD,
  Q_CTA_SECONDARY,
  Q_EYEBROW,
  Q_HEADLINE,
} from "@/components/qualifier/qualifier-theme";

type AccessTokens = { view: string; pdf: string; email: string };
type OpsTeardownSheet = AuthorizedTeardown["sheet"];

function readAccessTokens(): AccessTokens | null {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const tokens = {
    view: fragment.get("view_token")?.trim() ?? "",
    pdf: fragment.get("pdf_token")?.trim() ?? "",
    email: fragment.get("email_token")?.trim() ?? "",
  };
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  return tokens.view && tokens.pdf && tokens.email ? tokens : null;
}

export default function OpsTeardownThankYouClient() {
  const [tokens, setTokens] = useState<AccessTokens | null>(null);
  const [sheet, setSheet] = useState<OpsTeardownSheet | null>(null);
  const [sheetState, setSheetState] = useState("loading");
  const [sheetError, setSheetError] = useState("");
  const [emailState, setEmailState] = useState("idle");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    const nextTokens = readAccessTokens();
    setTokens(nextTokens);
    if (!nextTokens) {
      setSheetState("missing");
      return;
    }
    fetch("/api/studioflows/ops-teardown", {
      headers: { Authorization: `Bearer ${nextTokens.view}` },
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Unable to access this teardown.");
        return body.sheet;
      })
      .then((nextSheet) => {
        setSheet(nextSheet);
        setSheetState("ready");
      })
      .catch(() => {
        setSheet(null);
        setSheetState("error");
        setSheetError("This secure teardown link is invalid or expired.");
      });
  }, []);

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
  const referralUrl = buildTeardownReferralUrl(siteOrigin);
  const referralMailto = buildTeardownReferralMailto({ companyName: sheet?.company_name, siteOrigin });

  const handlePdfDownload = async () => {
    if (!tokens?.pdf) return;
    const response = await fetch(buildTeardownPdfEndpoint(siteOrigin), {
      headers: { Authorization: `Bearer ${tokens.pdf}` },
      cache: "no-store",
    });
    if (!response.ok) {
      setSheetError("This secure PDF link is invalid or expired.");
      return;
    }
    const blobUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = "studioflows-ops-teardown.pdf";
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleEmailShare = async () => {
    if (!tokens?.email) return;
    setEmailState("sending");
    setEmailMessage("");
    try {
      const response = await fetch("/api/studioflows/ops-teardown/email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.email}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (!response.ok) throw new Error("secure email rejected");
      setEmailState("sent");
      setEmailMessage("Teardown email accepted for the verified order recipient.");
    } catch {
      setEmailState("error");
      setEmailMessage("This secure email link is invalid or expired.");
    }
  };

  return (
    <main className={QUALIFIER_PAGE}>
      <QualifierAtmosphere />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:py-10">
        <header className={`${Q_CARD} p-5 sm:p-6`}>
          <p className={Q_EYEBROW}>Secure delivery</p>
          <h1 className={`mt-2 text-2xl sm:text-3xl ${Q_HEADLINE}`}>
            {sheet?.company_name ? `${sheet.company_name} — Ops Teardown` : "Your Ops Teardown"}
          </h1>
          {sheetState === "loading" ? <p className={`mt-3 ${Q_BODY}`}>Verifying secure access…</p> : null}
          {sheetState === "error" ? <p className="mt-4 text-sm text-amber-900">{sheetError}</p> : null}
          {sheetState === "missing" ? (
            <p className="mt-4 text-sm text-amber-900">A secure paid-order access link is required.</p>
          ) : null}

          {sheetState === "ready" ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={handlePdfDownload} className={Q_CTA_SECONDARY}>
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleEmailShare}
                disabled={emailState === "sending"}
                className={Q_CTA_SECONDARY}
              >
                {emailState === "sending" ? "Sending…" : "Email PDF to verified recipient"}
              </button>
              <a href={referralMailto} className={Q_CTA_SECONDARY}>Know someone with ops drag?</a>
            </div>
          ) : null}
          {emailMessage ? <p className="mt-3 text-sm text-[#4E483D]">{emailMessage}</p> : null}
          <p className="mt-3 text-xs leading-6 text-[#4E483D]">
            Referral link: <a href={referralUrl} className="underline underline-offset-2">{referralUrl}</a>
          </p>
          <Link href="/services/custom-ops-hub" className={`mt-5 inline-flex ${Q_CTA_SECONDARY}`}>
            Return to Qualifier
          </Link>
        </header>
        {sheetState === "ready" && sheet ? <OpsTeardownSheetView sheet={sheet} viewport /> : null}
      </div>
    </main>
  );
}
