# Sepolia Host Frontend Demo Spec

Status: Implemented (MVP)

## Goal

Provide a localhost host-application demo for OMA3 developers that embeds the OMATrust review widget for two well-known Sepolia protocol targets:

- Uniswap
- Aave

The demo showcases both widget signing paths:

- Basic mode (wallet UX in iframe)
- Integrated mode (host-mediated EIP-712 signing via `postMessage`)

## Route

- `/widgets/reviews/examples/host`

### Query parameters

- `signing=integrated` — opens the demo already in integrated signing mode and delays embedding the iframe until the URL is read on the client, so the host `postMessage` listener is attached before the widget sends `omatrust:ready`. Use this for Playwright (`e2e/sepolia-host-demo.spec.ts`) and for reliable local integrated-mode testing.

## Core files

- `components/examples/sepolia-host-demo.tsx`
- `lib/protocol-presets.ts`
- `app/widgets/reviews/examples/host/page.tsx`

## Protocol presets

Presets are centralized in `lib/protocol-presets.ts`:

- `uniswap` on Sepolia (chainId `11155111`)
- `aave` on Sepolia (chainId `11155111`)
- Explorer fallback uses Etherscan V2 endpoint with Sepolia chain id.

These presets provide:

- app URL / display name
- contract address for proof check
- chain ID
- optional icon URL
- optional explorer API URL

## UX and flow

1. Developer opens host demo route on localhost.
2. Developer selects protocol preset (`Uniswap` or `Aave`).
3. Developer selects signing mode (`basic` or `integrated`).
4. Developer optionally injects a wallet via query param manually or using connect button.
5. Host builds iframe URL using existing widget artifacts (`createWidgetArtifacts`).
6. Embedded widget runs review flow and submits via existing API routes.

## Integrated bridge behavior (MVP)

In integrated mode, host listens for widget messages:

- `omatrust:ready` → host replies `omatrust:hostReady`
- `omatrust:signTypedData` → host signs via injected EIP-1193 wallet and returns:
  - `omatrust:signature` on success
  - `omatrust:signatureError` on failure

MVP host checks include:

- `event.source` must match iframe window.
- message shape must include `id`, `domain`, `types`, `message` for sign request.

The widget-side response validation remains enforced in `lib/signing-bridge.ts` (`id`, source, and origin when derivable from referrer).

## Security notes

- This demo is intentionally localhost-focused and educational.
- It is not a production trust-policy host integration.
- For production integrated mode, host must additionally constrain:
  - allowed widget origin(s)
  - EIP-712 domain name/version and chain expectations
  - allowed schema UID / attestation fields
  - request deadline windows

## Local run

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000/widgets/reviews/examples/host`

## E2E smoke (Playwright)

First-time browser binaries:

```bash
npx playwright install chromium
```

Run (starts dev server automatically unless one is already running):

```bash
npm run test:e2e
```

Full suite (Vitest + Playwright), same as CI:

```bash
npm run test:ci
```

Tests live in `e2e/sepolia-host-demo.spec.ts` and cover host page load, preset switching, iframe `src` query params, integrated handshake (via `?signing=integrated`), and `POST /api/proof/check` with a valid body.

## Validation checklist

- Switching Uniswap/Aave updates iframe query params (`url`, `contract`, `chainId`).
- Basic mode renders wallet connect inside widget when wallet query param is absent.
- Integrated mode handshake reaches `hostReady` status and returns signature/error events.
- Review submission flow reaches existing proxy endpoints without code changes.

## Manual test script (QA)

Use this script for repeatable localhost checks. Record **Pass** / **Fail** and any notes per step.

### Preconditions

- Dev server running: `npm run dev`
- Browser: Chrome or Firefox with DevTools available (optional)
- URL: `http://localhost:3000/widgets/reviews/examples/host`

### Smoke: preset and embed URL

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| S1 | Select **Uniswap** | Host status area shows Uniswap contract and domain; iframe reloads | |
| S2 | Open **Open iframe target** in a new tab | Embed URL includes `chainId=11155111`, correct `contract`, and `url` matching preset domain | |
| S3 | Select **Aave** | Same as S1–S2 for Aave preset | |

### Smoke: basic mode

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| B1 | Set signing mode to **Basic**; clear wallet field if present | Widget shows Connect (or equivalent) when no `wallet` query param | |
| B2 | Click **Connect browser wallet** (optional) | Wallet address appears in field; iframe URL includes `wallet=` | |

### Smoke: integrated mode

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| I1 | Set signing mode to **Integrated** | Bridge status shows **Integrated bridge ready** after iframe handshake | |
| I2 | Connect wallet in host; inject wallet if needed | Host can sign when widget requests `omatrust:signTypedData` | |
| I3 | Complete a review through confirm/sign (if env allows) | No uncaught errors in host console; widget reaches success or clear relay error | |

### Security simulation panel (pass / fail criteria)

Run these with **Integrated** mode selected and iframe loaded (bridge ready).

| Step | Action | Pass criteria | Fail criteria |
|------|--------|----------------|---------------|
| SIM1 | Click **Simulate bad signature response** | Widget does **not** treat this as a successful signature: no success state from this message alone; no crash. User may still be mid-flow. | Widget shows success, or accepts invalid signature, or throws unhandled error. |
| SIM2 | Click **Simulate wrong message type** | Widget ignores the message; no inappropriate state jump (e.g. instant success). | Widget reacts as if a valid signing response arrived. |

**Regression rule:** If SIM1 or SIM2 **Fail**, treat as a defect in `postMessage` response handling (`components/embed/review-widget.tsx` and `lib/signing-bridge.ts`).

### Optional: network sanity

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| N1 | In DevTools Network tab, trigger proof check | `POST /api/proof/check` returns 200 with JSON body | |
| N2 | Submit review (if possible) | `GET /api/eas/nonce` and `POST /api/eas/delegated-attest` behave as in production (relay errors surfaced in UI) | |
