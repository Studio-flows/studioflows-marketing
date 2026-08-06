const STORAGE_KEY = "sf_lead_attribution";
const PRE_QUAL_SESSION_KEY = "sf_pre_qual_session";
const OPS_HUB_PATH = "/services/custom-ops-hub";
const DEFAULT_OPS_HUB_URL = `https://os.studioflows.co${OPS_HUB_PATH}`;
const DEFAULT_OS_SELL_BASE = "https://os.studioflows.co/s/app";

function resolveOpsAuditBookBase() {
  const sellBase = (
    process.env.NEXT_PUBLIC_STUDIOFLOWS_CONSULTING_SELL_URL ?? DEFAULT_OS_SELL_BASE
  )
    .trim()
    .replace(/\/$/, "");
  return `${sellBase}/ops-audit/book`;
}

function resolveOpsHubQuestionnaireUrl() {
  const configured = process.env.NEXT_PUBLIC_OPS_HUB_QUESTIONNAIRE_URL;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim().replace(/\/$/, "");
  }
  return DEFAULT_OPS_HUB_URL;
}

export function getPreQualBand(score) {
  if (score >= 13) return "high";
  if (score >= 8) return "moderate";
  return "low";
}

export function createPreQualSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildPreQualAnswerPayload(questions, answers, score, band, qualified) {
  const sessionId = createPreQualSessionId();
  return {
    session_id: sessionId,
    completed_at: new Date().toISOString(),
    score,
    band,
    qualified,
    answers: questions.map((question, index) => {
      const selected = answers[index];
      return {
        question_id: question.id,
        prompt: question.prompt,
        label: selected?.label ?? null,
        score: selected?.score ?? null,
      };
    }),
  };
}

export function parseLeadAttribution(search) {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(typeof search === "string" ? search : "");

  const pqScoreRaw = params.get("pq_score");
  const pqScoreParsed = pqScoreRaw != null && pqScoreRaw !== "" ? Number(pqScoreRaw) : null;

  return {
    src: params.get("src") || null,
    pq_session_id: params.get("pq_session_id") || null,
    pq_score: Number.isFinite(pqScoreParsed) ? pqScoreParsed : null,
    pq_qualified: params.get("pq_qualified") || null,
    pq_band: params.get("pq_band") || null,
    lead_id: params.get("lead_id") || null,
    email: params.get("email") || null,
    from: params.get("from") || null,
    continue: params.get("continue") || null,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
    referrer: null,
    landing_path: OPS_HUB_PATH,
  };
}

export function parseUtmFromWindow() {
  if (typeof window === "undefined") {
    return {};
  }
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
}

/**
 * @param {{
 *   source?: string;
 *   pqSessionId?: string;
 *   pqScore?: number | string;
 *   pqQualified?: boolean | string;
 *   pqBand?: string;
 *   preQualSession?: Record<string, unknown>;
 *   utm?: Record<string, string | null | undefined>;
 *   referrer?: string | null;
 * }} [options]
 */
export function buildOpsHubUrl({
  source,
  pqSessionId,
  pqScore,
  pqQualified,
  pqBand,
  preQualSession,
  utm = {},
  referrer,
} = {}) {
  const params = new URLSearchParams();

  if (source) params.set("src", source);
  if (pqSessionId) params.set("pq_session_id", pqSessionId);
  if (pqScore != null && pqScore !== "") params.set("pq_score", String(pqScore));
  if (pqQualified != null && pqQualified !== "") params.set("pq_qualified", String(pqQualified));
  if (pqBand) params.set("pq_band", pqBand);

  const utmEntries = {
    utm_source: utm.utm_source ?? utm.source,
    utm_medium: utm.utm_medium ?? utm.medium,
    utm_campaign: utm.utm_campaign ?? utm.campaign,
    utm_term: utm.utm_term ?? utm.term,
    utm_content: utm.utm_content ?? utm.content,
  };

  for (const [key, value] of Object.entries(utmEntries)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  const hubBase = resolveOpsHubQuestionnaireUrl();
  const path = query ? `${hubBase}?${query}` : hubBase;

  if (typeof window !== "undefined") {
    saveLeadAttribution({
      src: source ?? null,
      pq_session_id: pqSessionId ?? null,
      pq_score: pqScore ?? null,
      pq_qualified: pqQualified != null ? String(pqQualified) : null,
      pq_band: pqBand ?? null,
      ...utmEntries,
      referrer: referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
      landing_path: OPS_HUB_PATH,
    });

    if (preQualSession && typeof preQualSession === "object") {
      savePreQualSession(preQualSession);
    }
  }

  return path;
}

/**
 * @param {{ leadId?: string | null; email?: string | null; from?: string }} [options]
 */
export function buildOpsAuditBookUrl({ leadId, email, from = "homepage-diagnosis" } = {}) {
  if (!leadId) return null;

  const params = new URLSearchParams();
  params.set("lead_id", String(leadId));
  params.set("from", from);
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  if (normalizedEmail) params.set("email", normalizedEmail);
  return `${resolveOpsAuditBookBase()}?${params.toString()}`;
}

/**
 * High-intent homepage bypass — calendar without a prior lead_id.
 *
 * @param {string} [from]
 */
export function buildDirectOpsAuditBookUrl(from = "homepage-direct-book") {
  const params = new URLSearchParams();
  params.set("from", from);
  return `${resolveOpsAuditBookBase()}?${params.toString()}`;
}

const BOOK_CALL_STORAGE_KEY = "sf_book_call_url";

/**
 * Prefer ingest-provided book_call_url; otherwise build ops-audit/book with lead_id.
 *
 * @param {{ ingestBookCallUrl?: string | null; leadId?: string | null; email?: string | null; from?: string }} [options]
 */
export function resolveBookCallUrl({
  ingestBookCallUrl,
  leadId,
  email,
  from = "homepage-diagnosis",
} = {}) {
  if (typeof ingestBookCallUrl === "string" && ingestBookCallUrl.trim()) {
    return ingestBookCallUrl.trim();
  }
  return buildOpsAuditBookUrl({ leadId, email, from });
}

/**
 * Qualified homepage ops audit handoff: use ingest book_call_url when present.
 *
 * @param {{ qualified?: boolean; lead_id?: string | null; book_call_url?: string | null }} result
 * @param {{ src?: string | null } | null | undefined} attribution
 * @param {string | null | undefined} [email]
 */
export function resolveQualifiedOpsAuditRedirect(result, attribution, email) {
  if (!result?.qualified) return null;

  const from = attribution?.src === "homepage-diagnosis" ? "homepage-diagnosis" : "custom-ops-hub";
  const url = resolveBookCallUrl({
    ingestBookCallUrl: result.book_call_url,
    leadId: result.lead_id,
    email,
    from,
  });

  if (!url) return null;

  saveBookCallUrl(url, result.lead_id ?? null);
  return url;
}

export function saveBookCallUrl(url, leadId = null) {
  if (typeof window === "undefined" || !url) return;
  try {
    sessionStorage.setItem(BOOK_CALL_STORAGE_KEY, JSON.stringify({ url, lead_id: leadId }));
  } catch {
    // sessionStorage unavailable
  }
}

export function loadBookCallUrl() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BOOK_CALL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.url === "string" ? parsed.url : null;
  } catch {
    return null;
  }
}

export function saveLeadAttribution(attribution) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // sessionStorage unavailable
  }
}

export function loadLeadAttribution() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function savePreQualSession(session) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PRE_QUAL_SESSION_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage unavailable
  }
}

export function loadPreQualSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PRE_QUAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function mergeLeadAttribution(urlAttribution, storedAttribution) {
  const url = urlAttribution ?? {};
  const stored = storedAttribution ?? {};

  return {
    src: url.src ?? stored.src ?? null,
    pq_session_id: url.pq_session_id ?? stored.pq_session_id ?? null,
    pq_score: url.pq_score ?? stored.pq_score ?? null,
    pq_qualified: url.pq_qualified ?? stored.pq_qualified ?? null,
    pq_band: url.pq_band ?? stored.pq_band ?? null,
    lead_id: url.lead_id ?? stored.lead_id ?? null,
    email: url.email ?? stored.email ?? null,
    from: url.from ?? stored.from ?? null,
    continue: url.continue ?? stored.continue ?? null,
    utm_source: url.utm_source ?? stored.utm_source ?? null,
    utm_medium: url.utm_medium ?? stored.utm_medium ?? null,
    utm_campaign: url.utm_campaign ?? stored.utm_campaign ?? null,
    utm_term: url.utm_term ?? stored.utm_term ?? null,
    utm_content: url.utm_content ?? stored.utm_content ?? null,
    referrer:
      (typeof document !== "undefined" ? document.referrer || null : null) ??
      stored.referrer ??
      null,
    landing_path: OPS_HUB_PATH,
  };
}

export function toIngestAttribution(merged) {
  return {
    src: merged.src,
    pq_session_id: merged.pq_session_id,
    pq_score: merged.pq_score != null ? String(merged.pq_score) : null,
    pq_qualified: merged.pq_qualified,
    pq_band: merged.pq_band,
    utm_source: merged.utm_source,
    utm_medium: merged.utm_medium,
    utm_campaign: merged.utm_campaign,
    utm_term: merged.utm_term,
    utm_content: merged.utm_content,
    referrer: merged.referrer,
    landing_path: merged.landing_path,
  };
}

export function toIngestPreQual(preQualSession) {
  if (!preQualSession || typeof preQualSession !== "object") return null;
  const sessionId =
    typeof preQualSession.session_id === "string" ? preQualSession.session_id.trim() : "";
  if (!sessionId) return null;
  return preQualSession;
}
