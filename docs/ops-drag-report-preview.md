# Ops Drag Report — build and preview contract

## Scope

- One-time StudioFlows Ops Drag Report: USD 29.
- Fully automated fulfillment from an existing Ops Check lead record.
- Stripe-hosted Checkout, Managed Payments, dynamic payment methods, and US-only checkout.
- Product-specific tax code intent: `txcd_10701410`.
- No consulting, coaching, manual review, implementation, or outcome guarantee.

## Launch hold

The checkout endpoint fails closed unless `OPS_DRAG_REPORT_CHECKOUT_ENABLED=true`. Live-mode keys also require `OPS_DRAG_REPORT_LIVE_ENABLED=true`. Neither value is authorized for production until the founder clears Managed Payments and its corresponding Stripe configuration.

Do not set either switch in Production during preview. Do not expose or link `/ops-drag-report` publicly before the launch hold clears.

## Server-only configuration

- `STRIPE_OPS_DRAG_REPORT_RESTRICTED_KEY`: must begin with `rk_test_` for preview or `rk_live_` after launch approval. Unrestricted `sk_` keys are rejected.
- `STRIPE_OPS_DRAG_REPORT_WEBHOOK_SECRET`: signing secret for the exact webhook endpoint.
- `RESEND_API_KEY`: existing transactional email key.
- `OPS_DRAG_REPORT_EMAIL_FROM` or `RESEND_FROM_EMAIL`: verified sender.
- Existing Supabase server configuration used by `custom_ops_hub_leads`.

The Stripe restricted key should grant only the minimum permissions required to create and read Checkout Sessions for this flow. Secrets stay in Vercel environment storage and are never written to the repository or receipts.

## Fulfillment and idempotency

1. An existing Ops Check lead ID is resolved server-side; the browser never provides price, tax code, delivery email, or product metadata.
2. The admitted report input is projected into an immutable allowlisted snapshot. Its canonical SHA-256 digest binds the order and Checkout metadata.
3. Checkout Session creation uses exactly `ops-drag:{submission_id}:checkout:v1`.
4. The webhook reads the raw body and verifies the Stripe signature before processing.
5. Payment admission validates session mode, offer/version, one-time cadence and quantity, submission/client/order references, snapshot digest, paid state, payment reference, amount, currency, email, and US country.
6. The existing lead metadata stores the durable order. JSON compare-and-swap makes payment-event deduplication and one-order fulfillment ownership one atomic transition without a schema change.
7. The transition appends a hash-chained, allowlisted receipt containing email SHA-256 only. It never stores the raw webhook payload or raw email in the receipt chain.
8. The provider-agnostic delivery/refund state machine validates a strict versioned report contract, scans report content for secret-shaped strings and unsupported claims, and records report/PDF SHA-256 digests.
9. Generation, delivery, and refund use durable bounded attempt ledgers and fixed SLA clocks. Email `accepted`, `queued`, and `sent` events remain nonterminal; only provider-confirmed `delivered` terminates as `DELIVERED`.
10. A hard bounce or expired delivery-confirmation SLA requires a full refund. Refund ownership uses exactly `ops-drag:{checkout_session_id}:refund:v1`; `refund.created` is nonterminal and only provider-confirmed success terminates as `REFUNDED`.
11. Signed, expiring, single-use tokens bind results, redelivery, or refund requests to one order and one action. Token IDs are stored only for replay prevention and are hashed in receipts.
12. Attempt, delivery, refund, token, and terminal evidence extends the existing redacted hash chain. Exactly one terminal outcome is allowed, and only `DELIVERED` qualifies as a verified first sale.

This preview contains provider adapter contracts only. It does not call an email or refund provider, send a message, issue a refund, or expose a report URL.

## Rollback

1. Set `OPS_DRAG_REPORT_CHECKOUT_ENABLED=false` (or remove it) to stop new Sessions.
2. Remove any public link to `/ops-drag-report`.
3. Preserve the webhook until already-paid Sessions are fulfilled or refunded under the approved refund policy.
4. Revert the feature branch or PR. The delivery/refund state is stored inside the existing durable order metadata, so no schema rollback is required.

Rollback receipt: the pre-delivery/refund base commit is `ddb37bcbe33b2470ccb08786461a31f4516bc92f`. Repointing the feature branch to that commit removes this state-machine preview without touching production, providers, or any schema.

## Proof ladder

- Contract test and Next build: `CODE_PASS` only.
- Protected preview with a restricted `rk_test_` key plus a signed Stripe sandbox event: preview runtime evidence, not production acceptance.
- Production deployment, live transaction, fulfillment receipt, and independent acceptance require separate receipts after the launch hold clears.

## Pre-launch security blocker

The current repository dependency scan reports seven inherited high-severity advisories, including the existing Next.js 14.2.35 runtime. The available Next.js remediation is a major-version upgrade and is intentionally not bundled into this payment patch. Production launch remains blocked until the repository owner completes and verifies that upgrade or records an explicit risk disposition.
