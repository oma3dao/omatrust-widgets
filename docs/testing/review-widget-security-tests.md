# OMATrust Review Widget — Security test cases (OMA3)

This document is for **QA and developers** validating that the hosted widget and its server routes behave safely under abuse. It maps to the three-layer model in [`docs/features/review-widget/plan.md`](../features/review-widget/plan.md) (host ↔ widget ↔ relay) and to [`docs/features/review-widget/spec.md`](../features/review-widget/spec.md).

## Threat model (short)

| Asset | Risk if broken |
|-------|------------------|
| End-user wallet keys | Phishing or signing unintended EIP-712 (e.g. different schema, chain, or recipient). |
| OMATrust relay / backend | Accepting forged or replayed delegated attestations; resource abuse. |
| Widget origin server (`reputation.omatrust.org` / Vercel app) | SSRF via proof-check, header/CSP misconfiguration, open proxy abuse. |
| Game developer’s site | Malicious page coerces signing or confuses users; iframe + `postMessage` confusion. |

The **widget repository does not hold private keys**. Critical cryptographic enforcement for delegated attestation is on the **relay** (`api.omatrust.org`). These tests still prove the **widget and its Next.js routes** do not weaken that model.

---

## 1. Malicious or cloned “widget” (same APIs, wrong origin)

**Scenario:** An attacker hosts a page that looks like the real widget but is not, and points `fetch` at the same `/api/proof/check`, `/api/eas/nonce`, and `/api/eas/delegated-attest` paths (e.g. by copying the Vercel URL or proxying).

| ID | Test | Expected result |
|----|------|-----------------|
| S1.1 | From an arbitrary origin, `POST` JSON to `/api/proof/check` with valid-shaped body (EVM addresses, chainId, optional `explorerApiUrl`). | **200** with JSON result; CORS is not required for simple `fetch` from browser (same-origin applies to credentialed flows). Document that **secrets are not returned**—only proof status. |
| S1.2 | Same as S1.1 with **invalid** `walletAddress` / `contractAddress` (not `0x` + 40 hex). | **400** with Zod `issues` (see `proofCheckRequestSchema` in `lib/validation.ts`). |
| S1.3 | `GET /api/eas/nonce?attester=<non-address>` | **400** `Invalid attester address`; relay is **not** called (`evmAddressSchema` in `app/api/eas/nonce/route.ts`). Automated: `app/api/eas/nonce/__tests__/route.test.ts`. |
| S1.4 | `POST /api/eas/delegated-attest` with **random JSON** or truncated signature. | **Non-2xx or relay error JSON**; relay must reject invalid signatures (see [delegated attestation API](https://docs.omatrust.org/api/delegated-attestation)). |

**Comfort for developers:** Using the **official iframe `src`** from the builder ties the UI to the real widget bundle. A third-party cannot silently replace the **signing logic inside** that iframe without a different `src`. Integrated-mode hosts must still implement the **host-side checks** from the plan (origin, schema UID, deadline, wallet match).

---

## 2. SSRF and server-side fetch abuse (`/api/proof/check`)

The server may `fetch` a user-supplied **explorer API** URL only after `isSafeExplorerUrl` in `lib/proof-check.ts` (HTTPS, no raw IPs, no localhost, `.local` / `.internal`, etc.).

| ID | Test | Expected result |
|----|------|-----------------|
| S2.1 | `explorerApiUrl: "http://169.254.169.254/latest/meta-data"` | Rejected by Zod (`url()` requires valid URL) **or** fails `https:` check — must not fetch HTTP. |
| S2.2 | `explorerApiUrl: "https://127.0.0.1/api"` | **Not** used for fallback fetch (`isSafeExplorerUrl` → false). |
| S2.3 | `explorerApiUrl: "https://192.0.2.1/api"` | Hostname matches IPv4 pattern → **false** (no fetch to raw IP). |
| S2.4 | `explorerApiUrl: "https://evil.com@127.0.0.1/"` (credential / parser tricks) | Parser resolves hostname to loopback → **false**; regression in `lib/__tests__/explorer-url-ssrf.test.ts` (`https://user@127.0.0.1/api`). |
| S2.5 | `explorerApiUrl: "https://metadata.internal/api"` | **false** (`.internal`). |
| S2.6 | Legitimate HTTPS host with dots, e.g. `https://api.basescan.org/api` | **true** (allowed path for fallback when Insight fails). |

Automated coverage: `lib/__tests__/explorer-url-ssrf.test.ts`, `lib/__tests__/validation.test.ts`, `lib/__tests__/widget-config.test.ts`, `app/api/proof/check/__tests__/route.test.ts`, `app/api/eas/nonce/__tests__/route.test.ts`, `lib/__tests__/recover-signer.test.ts`.

---

## 3. `postMessage` signing bridge (integrated mode)

Per plan: **any** window can call `postMessage`. Defenses: **origin**, **source**, **request id**.

| ID | Test | Expected result |
|----|------|-----------------|
| S3.1 | Host implements bridge: iframe sends `omatrust:signTypedData` with real typed data from widget. Host validates **origin** = known widget origin, **type**, EIP-712 **domain** (`EAS` / `1.4.0`), **chainId**, **schema UID**, **deadline**, wallet fields. | Host signs only if checks pass. |
| S3.2 | Malicious **sibling iframe** posts `omatrust:signature` with a **stolen id** (if it can guess UUID). | Low probability; host should sign only for **outstanding** ids it issued after a valid request. Widget should prefer validating **`event.source === parent`** where applicable. |
| S3.3 | Attacker page sends **fake** `omatrust:signature` with correct `id` from another tab. | Widget now enforces `requestId`, message type, `event.source === window.parent`, and host origin check when `document.referrer` is available (`lib/signing-bridge.ts`, `lib/__tests__/signing-bridge.test.ts`). |
| S3.4 | Widget after sign runs `recoverSigner` and compares to **claimed wallet**. | If host returns signature from **another** key, submission throws **signer mismatch** before relay (see `handleSign` in `review-widget.tsx`). EIP-712 recovery is covered by `lib/__tests__/recover-signer.test.ts`. |

---

## 4. Embed URL / query parameter tampering

Config is **only** query params—no server-side game registry for MVP.

| ID | Test | Expected result |
|----|------|-----------------|
| S4.1 | Change `url` to another domain → different `did:web` **subject**. | Review attaches to **that** subject; binding attestation elsewhere is required for trust (documented limitation). |
| S4.2 | Change `contract` to a contract the user never used. | Proof check should fail → **unverified** user; still allowed to submit per product rules. |
| S4.3 | `icon` / `name` set to very long strings or `javascript:` URLs. | UI should not execute script from `name`; **icon** `img src` should be restricted or sanitized—verify no XSS via `icon` in embed. |

---

## 5. Iframe, CSP, and `X-Frame-Options`

| ID | Test | Expected result |
|----|------|-----------------|
| S5.1 | Load embed on **allowed** third-party site (matches README rewrites). | Iframe loads; `Content-Security-Policy: frame-ancestors *` on embed route as documented. |
| S5.2 | Confirm **global** site pages are not `frame-ancestors *` if that would expose admin routes. | Only widget embed routes get permissive framing. |

---

## 6. Relay abuse (black-box)

These are primarily **relay** tests; the widget only **proxies** body to `api.omatrust.org`.

| ID | Test | Expected result |
|----|------|-----------------|
| S6.1 | Replay same signed payload twice. | Second call **rejected** (nonce consumed). |
| S6.2 | Valid signature but **wrong nonce** / **expired deadline**. | **Rejected** by relay. |
| S6.3 | High-volume `POST` to delegated-attest from many IPs. | Rate limiting / abuse controls (per plan: “spam controls” on delegation API). |

---

## 7. Traceability checklist (sign-off)

Use this for release gates:

- [ ] S2 SSRF cases exercised (automated + manual `explorer` param).
- [ ] Zod rejection paths return **400** without leaking stack traces in production.
- [ ] Integrated-mode host sample (`/widgets/reviews/examples/host`) follows **host validation** list from plan.
- [ ] Signer recovery mismatch path tested (wrong signature / wrong key).
- [ ] Relay errors from proxy are **forwarded safely** (no internal URLs in client-facing errors).

---

## References

- Internal: [`plan.md` security section](../features/review-widget/plan.md), [`spec.md`](../features/review-widget/spec.md)
- External: [Widget signing bridge spec](https://github.com/oma3dao/omatrust-sdk/blob/main/docs/features/widget-signing-bridge/spec.md), [Delegated attestation](https://docs.omatrust.org/api/delegated-attestation)
