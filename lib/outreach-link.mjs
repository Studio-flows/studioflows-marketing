import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const TOKEN_VERSION = "v1";
const TOKEN_ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAX_TOKEN_LENGTH = 8192;

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.studioflows.co",
  "https://studioflows.co",
  "https://os.studioflows.co",
  "https://staging.os.studioflows.co",
];

const REQUIRED_ID_FIELDS = [
  "message_id",
  "prospect_id",
  "campaign_id",
  "experiment_id",
  "variant_id",
  "correlation_id",
  "market_cell",
  "vertical",
];

const BOT_PATTERNS = [
  ["head-request", /__HEAD_REQUEST__/i],
  ["empty-user-agent", /__EMPTY_USER_AGENT__/i],
  ["email-security", /(proofpoint|mimecast|barracuda|safelinks|microsoft office existence discovery|outlook-iOS|urldefense|fireeye|trendmicro|symantec|forcepoint)/i],
  ["link-preview", /(slackbot|discordbot|twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|skypeuripreview|google web preview)/i],
  ["crawler", /(bot|crawler|spider|scraper|preview|fetcher|headless|phantomjs|selenium|playwright|puppeteer|curl|wget|python-requests|httpclient|urlscan)/i],
];

function requireSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Outreach link secret must be at least 32 characters");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

function requireIdentifier(value, field) {
  if (typeof value !== "string") {
    throw new Error(`${field} is required`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(trimmed)) {
    throw new Error(`${field} is invalid`);
  }
  return trimmed;
}

function normalizePayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Outreach link payload must be an object");
  }

  const destination = typeof input.destination === "string" ? input.destination.trim() : "";
  if (!destination || destination.length > 2048) {
    throw new Error("destination is invalid");
  }

  const normalized = {
    version: 1,
    destination,
  };

  for (const field of REQUIRED_ID_FIELDS) {
    normalized[field] = requireIdentifier(input[field], field);
  }

  if (input.issued_at !== undefined) {
    const issuedAt = Number(input.issued_at);
    if (!Number.isInteger(issuedAt) || issuedAt <= 0) {
      throw new Error("issued_at is invalid");
    }
    normalized.issued_at = issuedAt;
  }

  if (input.expires_at !== undefined) {
    const expiresAt = Number(input.expires_at);
    if (!Number.isInteger(expiresAt) || expiresAt <= 0) {
      throw new Error("expires_at is invalid");
    }
    normalized.expires_at = expiresAt;
  }

  return normalized;
}

function resolveAllowedOrigins(value) {
  const supplied = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : DEFAULT_ALLOWED_ORIGINS;

  const normalized = supplied
    .map((origin) => String(origin).trim().replace(/\/$/, ""))
    .filter(Boolean);

  return new Set(normalized.length ? normalized : DEFAULT_ALLOWED_ORIGINS);
}

export function createOutreachToken(input, secret) {
  const payload = normalizePayload(input);
  const key = requireSecret(secret);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(TOKEN_ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const body = Buffer.concat([iv, tag, ciphertext]).toString("base64url");
  return `${TOKEN_VERSION}.${body}`;
}

export function verifyOutreachToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH) {
    throw new Error("Outreach link token is invalid");
  }

  const [version, encoded, extra] = token.split(".");
  if (version !== TOKEN_VERSION || !encoded || extra !== undefined) {
    throw new Error("Outreach link token version is invalid");
  }

  const packed = Buffer.from(encoded, "base64url");
  if (packed.length <= IV_BYTES + TAG_BYTES) {
    throw new Error("Outreach link token body is invalid");
  }

  const key = requireSecret(secret);
  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = packed.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(TOKEN_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let raw;
  try {
    raw = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Outreach link token authentication failed");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Outreach link token payload is invalid");
  }

  const payload = normalizePayload(parsed);
  if (payload.expires_at && nowSeconds > payload.expires_at) {
    throw new Error("Outreach link token has expired");
  }
  return payload;
}

export function buildAttributedDestination(payload, allowedOrigins) {
  const normalized = normalizePayload(payload);
  const url = new URL(normalized.destination);
  const origins = resolveAllowedOrigins(allowedOrigins);
  if (!origins.has(url.origin)) {
    throw new Error("Outreach link destination origin is not allowed");
  }

  url.searchParams.set("utm_source", "studioflows_outreach");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", normalized.campaign_id);
  url.searchParams.set("utm_content", normalized.variant_id);
  url.searchParams.set("utm_term", normalized.market_cell);
  url.searchParams.set("sf_experiment", normalized.experiment_id);
  url.searchParams.set("sf_variant", normalized.variant_id);
  url.searchParams.set("sf_cid", normalized.correlation_id);

  return url;
}

export function classifyOutreachRequest(userAgent, method = "GET") {
  const ua = typeof userAgent === "string" ? userAgent.trim() : "";
  const probe = method.toUpperCase() === "HEAD"
    ? "__HEAD_REQUEST__"
    : ua || "__EMPTY_USER_AGENT__";

  for (const [reason, pattern] of BOT_PATTERNS) {
    if (pattern.test(probe)) {
      return { is_bot: true, reason };
    }
  }

  return { is_bot: false, reason: "none" };
}

export function hashUserAgent(userAgent) {
  const ua = typeof userAgent === "string" ? userAgent : "";
  return createHash("sha256").update(ua, "utf8").digest("hex");
}
