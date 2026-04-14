# Build Brief for Codex: OMATrust Hosted Review Widget MVP

## Goal

Build the **MVP** of a hosted OMATrust review widget system for OMA3.

The product goal is to make integration as close to zero-effort as possible for member studios that run games or virtual worlds.

For MVP, a developer should only need to:

1. enter the url for a game in a website frontend
2. enter one or more EVM chain + smart contract addresses
3. copy a widget embed snippet
4. paste it into their site

The hosted widget/iframe should then allow a user to submit a OMATrust user review using the **same wallet they already use with the game**, while OMA3 handles proof lookup and delegated attestation through OMA3 infrastructure.

This is intentionally centralized for MVP.

---

## Identity & binding model

OMATrust uses a multi-layer identity and trust system. The widget participates in this system but only handles two layers: subject identity and review attestations.

### Subject identity

Every review targets a **subject**, identified by a `did:web` DID constructed from the game's domain:

```
did:web:mygame.com
```

The widget constructs this automatically from the game URL using `buildDidWeb()` from `@oma3/omatrust/identity`.

### Review attestations

A review attestation records a user's rating and optional text, targeting the subject DID. It includes a `tx-interaction` proof referencing a specific contract address and transaction hash.

### Contract-to-subject binding (out of scope)

The binding between a contract address and a `did:web` subject is handled by separate OMATrust attestations (Linked Identifier, Key Binding, Controller Witness). This binding is NOT the widget's responsibility.

- The widget trusts the snippet config at review time.
- Reviews accumulate immediately under the `did:web` subject.
- For reviews to be fully verifiable by third parties, the developer must separately complete a binding attestation linking their domain to their contract. This is done through existing OMATrust tools, not through this widget.
- The developer is incentivized to complete the binding because their reviews are effectively unverified without it.

**The widget does not implement, enforce, or verify binding attestations.**

---

## High-level MVP behavior

### Studio-side flow

A studio uses a frontend hosted on Vercel to:

- enter:
  - game URL (e.g., `mygame.com` — the widget constructs the `did:web:` DID automatically)
  - game name (optional)
  - game icon URL (optional)
  - slug (optional — auto-generated from game name if omitted)
  - one contract address for the game
  - chain ID of the EVM chain where the contract resides
  - reviewer wallet address (optional — if provided, pre-populates the widget so the reviewer doesn't need to connect again)
- receive:
  - a widget URL (all config encoded as query params — no server-side persistence needed)
  - an iframe embed snippet with that URL
  - optionally a simple JS snippet for opening the iframe in a modal

The creation form does NOT ask for a DID. The developer enters a plain URL (e.g., `mygame.com`). The widget constructs the subject DID as `did:web:{normalized_domain}` using `buildDidWeb()` from `@oma3/omatrust/identity` at attestation time. This matches how `rep-attestation-frontend` handles DID construction via its `DidWebInput` component.

The creation form should display a notice:

> "For your reviews to be fully verifiable, you will need to complete a binding attestation linking your domain to your contract address."

### Player-side flow

A user visits the game site and opens the OMATrust review widget.

The widget:

1. obtains the user wallet address
   - if the embed URL includes a `wallet` query param (set by the game developer in the snippet), use it directly — no wallet connect needed
   - otherwise: iframe connects wallet directly via Thirdweb
   - the creation form lets the developer optionally hardcode a wallet address into the snippet, or the game site can set it dynamically via JS before loading the iframe
2. checks whether the wallet has at least one transaction sent to the configured contract (via `/api/proof/check` → Thirdweb Insight API)
3. if yes, mark the review as **Verified Player**
4. if no, still allow review submission (without verified badge)
5. collect:
   - rating (1-5)
   - optional review text
6. construct the subject DID from the game URL: `did:web:{domain}` using `buildDidWeb()` from `@oma3/omatrust/identity`
7. build EIP-712 typed data using `@oma3/omatrust` SDK's `prepareDelegatedAttestation`
8. ask the user to sign via `eth_signTypedData_v4`
9. submit signed payload to `reputation.omatrust.org/api/eas/delegated-attest` via SDK's `submitDelegatedAttestation`
10. widget shows success state with attestation UID and tx hash

---

## Hard MVP scope constraints

Keep this narrow. Do **not** build advanced proof systems yet.

### In scope

- creation frontend (static form, no auth, generates embed URL)
- hosted iframe widget
- EVM chains only
- contract-address based proof rule only (see omatrust-docs/specification/omatrust-specification-proofs.md)
- proof rule = wallet has at least one tx to the configured contract
- proof check via Thirdweb Insight API (using OMA3 Thirdweb account client ID)
- `tx-interaction` proof type in attestation (see common.schema.json)
- automatic DID construction from game URL (`did:web:{domain}` via `@oma3/omatrust/identity`)
- verified labeling
- delegated attestation via `@oma3/omatrust` SDK → `reputation.omatrust.org` relay
- wallet address passthrough via embed URL query param (optional)
- user-review EAS schema (UID: `0x7ab3911527e5e47eaab9f5a2c571060026532dde8cb4398185553053963b2a47`)
- Vercel-friendly architecture
- no database — all config in URL params, attestations on-chain
- simple embed snippet generation

### Out of scope

- function selector configuration
- event signature configuration
- thresholds like minimum tx count > 1
- recency windows
- identity / proof-of-personhood
- non-EVM chains
- complex theming system
- advanced reputation scoring
- moderation tooling beyond minimal internal controls
- general-purpose SDK
- decentralized storage design
- portable proof bundles
- multi-tenant billing
- analytics dashboards beyond basic logging

### Non-goals (explicit)

- The widget does NOT infer contract ownership
- The widget does NOT enforce or verify binding attestations
- The widget does NOT implement binding creation
- Binding between contracts and subject DIDs is out of scope — handled by separate OMATrust tools

If there is ambiguity, choose the simpler implementation.

---

## Architecture recommendation

Use a small Vercel-native architecture.

### Repos

Create a **new dedicated git repository** for this project.

Suggested repo name:

`omatrust-review-widget`

### Deploy target

Host everything in Vercel:

- frontend
- hosted iframe frontend
- API routes / serverless functions as appropriate

### Recommended stack

Use a standard modern TypeScript stack:

- **Next.js** (App Router)
- **TypeScript**
- **React**
- **Tailwind CSS**
- **Vercel**
- **Zod** for input validation
- **Thirdweb SDK** (`thirdweb`) for wallet connection in the iframe widget (matches `app-registry-frontend` and `rep-attestation-frontend`)
- **`@oma3/omatrust`** SDK for delegated attestation (EIP-712 typed data, ABI encoding, relay submission) and DID construction (`buildDidWeb`, `normalizeDomain`)
- **Thirdweb Insight API** for transaction history lookups (proof check) — use the OMA3 Thirdweb account client ID

---

## System components

Build these components.

### 1. Creation frontend

Widget creator UI for OMA3 internal operators, and possibly later member studios.

- input form
- generate iframe URL
- generate iframe HTML snippet
- allow copy/paste of embed code
- display binding notice (reviews are collected immediately; binding required for full verifiability)

### 2. Hosted widget / iframe app

A public route, for example:

- `/embed?[parameters]`

This route renders the review widget UI.

Inputs supported:
- query param for theme overrides
- query param for wallet address
- query param for source domain if useful

This widget should:
- display game name/URL
- check proof status (tx-interaction against configured contract)
- display verified status
- collect rating + text
- request EIP-712 signature
- submit to delegated attestation API
- show result

### 3. Proof-check API

An internal API endpoint used by the widget.

- `POST /api/proof/check`

Input:
- wallet address
- contract address (from snippet config — treated as candidate)
- chain ID

Output:
- `verified: boolean`
- chain ID used for proof, if any
- matched contract address, if any
- example transaction hash, if any
- human-readable reason string

Implementation: call Thirdweb Insight API server-side to look up transactions from the wallet to the contract.

Proof rule for MVP:

> Verified Player = wallet has at least one transaction to the configured contract on the configured EVM chain.

The widget trusts the snippet's contract address for this check. Downstream verifiers confirm the contract-to-subject binding via Linked Identifier attestations — that is not the widget's responsibility.

---

## Widget UX requirements

The widget should feel polished but minimal.

### States

- loading
- wallet missing
- wallet connected
- checking verification
- verified player
- signature requested
- submitting
- success
- error

### Required fields

- rating: 1 to 5
- review text

### Messaging

Use clear labels:
- `Verified Player`

Do **not** imply:
- verified human
- verified identity
- verified personhood

### Wallet and signing architecture

The widget supports two signing modes. Both modes require the host site to pass the user's wallet address via the `&wallet=` query param (set dynamically via JS when the user is connected on the host site).

#### Integrated mode (recommended)

The host site handles EIP-712 signing on behalf of the widget via `window.postMessage`. The widget never shows a wallet UI. This provides the best UX because the user stays in the same wallet context they already trust.

Flow:
1. Host site injects wallet address into the iframe URL via `&wallet=0x...`
2. Widget runs proof check using that address
3. When the user submits, the widget sends a `postMessage` to the parent with the EIP-712 typed data
4. Host site receives the message, calls `signTypedData` on its own wallet provider
5. Host site posts the signature back to the widget
6. Widget submits the signed payload to the delegated attestation API

`postMessage` protocol:

```
widget → host:  { type: "omatrust:signTypedData", id, domain, types, message }
host → widget:  { type: "omatrust:signature", id, signature }
host → widget:  { type: "omatrust:signatureError", id, error }
```

The host-side bridge code is ~20 lines. The builder generates this snippet alongside the iframe HTML.

This mode is required for:
- Custodial or abstracted-wallet apps (Privy, Sequence, etc.)
- Apps where the user's wallet context cannot be reproduced in an iframe
- Best conversion rates for mainstream users

#### Basic mode (fallback)

The widget runs its own Thirdweb wallet connect inside the iframe. When the user submits, the widget calls `signTypedData` directly via the Thirdweb ethers6 adapter.

This works for crypto-native users with browser extension wallets (MetaMask, Coinbase Wallet, Rabby). The extension is injected globally in the browser, so it responds to signing requests from the iframe without requiring a second connection step.

This mode is appropriate when:
- The host site has no wallet integration (static sites, simple embeds)
- The developer wants zero integration effort beyond pasting the iframe snippet
- Users have browser extension wallets

#### Mode detection

The widget detects which mode to use automatically:
1. On load, the widget sends a `postMessage` handshake to the parent: `{ type: "omatrust:ready" }`
2. If the parent responds with `{ type: "omatrust:hostReady" }`, the widget uses integrated mode
3. If no response within a short timeout, the widget falls back to basic mode with Thirdweb wallet connect

#### Wallet address for proof checking

The host site should inject the wallet address dynamically:

```js
const iframe = document.getElementById("omatrust-widget");
const url = new URL(iframe.src);
url.searchParams.set("wallet", userWalletAddress);
iframe.src = url.toString();
```

If no wallet param is present and the widget is in basic mode, the widget shows a "Connect Wallet" button using Thirdweb.

Both existing frontends (`app-registry-frontend` and `rep-attestation-frontend`) use Thirdweb for wallet connection. The widget uses the same stack: `ThirdwebProvider` + `useActiveAccount()` + `ethers6Adapter.signer.toEthers()` for signing.

---

## Proof verification design

This is the key MVP rule:

### Proof definition

A review is `Verified User` if the wallet address has sent at least one successful transaction to the configured contract address on an EVM chain.

The contract address comes from the snippet config. The widget trusts it at review time. The binding between the contract and the subject DID is verified externally by consumers, not by the widget.

### Implementation: Thirdweb Insight API

Use the **Thirdweb Insight API** to check transaction history. This is a free, multi-chain API that avoids per-chain API key management.

Endpoint pattern:
```
GET https://insight.thirdweb.com/v1/transactions?chain={chainId}&from_address={wallet}&to_address={contractAddress}&limit=1
```

This returns transactions where `from` = wallet and `to` = contract. If at least one result is returned, the wallet is verified.

Thirdweb Insight supports all major EVM chains. No API key is required for basic usage, though a client ID can be used for higher rate limits.

The proof-check API route (`/api/proof/check`) calls this endpoint server-side and returns the result to the widget.

### Important note

Do **not** attempt to infer gameplay semantics in MVP.
Do **not** ask studios to provide function selectors.
Do **not** add event filtering.

Just check:
- from = wallet
- to = configured contract

If yes, review can be labeled `Verified Player`.

### Proof output shape

Internal proof result object:

```ts
type ProofCheckResult = {
  verified: boolean;
  chainId?: number;
  contractAddress?: string;
  txHash?: string;
  reason: string;
};
```

---

## Delegated attestation integration

### Existing infrastructure

The delegated attestation API is already deployed at `reputation.omatrust.org`. See `developer-docs/docs/api/delegated-attestation.md` for full API docs.

### SDK

Use the `@oma3/omatrust` SDK package (source: `omatrust-sdk/src/reputation/`). It provides:

- `prepareDelegatedAttestation(params)` — builds the EIP-712 typed data for the user to sign
- `submitDelegatedAttestation(params)` — sends the signed attestation to the relay server
- `encodeAttestationData(schema, data)` — ABI-encodes the attestation fields
- `splitSignature(sig)` — splits an EIP-712 signature into `{ v, r, s }`

The widget should use these functions directly rather than reimplementing the EIP-712 flow.

### User Review EAS Schema

The user-review schema is already deployed on OMAchain Testnet.

| Property | Value |
|---|---|
| Schema ID | `user-review` |
| Chain | OMAchain Testnet (chain ID `66238`) |
| Schema UID | `0x7ab3911527e5e47eaab9f5a2c571060026532dde8cb4398185553053963b2a47` |
| EAS schema string | `string subject, string version, uint256 ratingValue, string reviewBody, string[] screenshotUrls, string[] proofs` |
| Revocable | No (default) |
| Gas-subsidized | Yes (server pays gas via delegated attestation) |

Schema field reference (see `rep-attestation-tools-evm-solidity/schemas-json/user-review.schema.json`):

| Field | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | DID of the game being reviewed — constructed automatically as `did:web:{domain}` from the game URL |
| `version` | string | No | Version of the reviewed subject |
| `ratingValue` | uint256 | Yes | Rating 1–5 |
| `reviewBody` | string | No | Free-form review text (max 500 chars) |
| `screenshotUrls` | string[] | No | Optional screenshot URLs |
| `proofs` | string[] | No | JSON-stringified proof objects (see below) |

The review attestation includes the subject DID and the interaction proof. It does NOT include binding information. Binding is resolved externally via Linked Identifier attestations.

### DID construction

The developer enters a plain URL (e.g., `mygame.com`). The widget constructs the subject DID at attestation time:

```ts
import { buildDidWeb } from "@oma3/omatrust/identity";

const subjectDid = buildDidWeb("mygame.com"); // → "did:web:mygame.com"
```

This matches the pattern used by `rep-attestation-frontend`'s `DidWebInput` component, which shows a `did:web:` prefix and lets the user enter just the domain. The SDK's `normalizeDomain()` handles lowercasing and trailing-dot removal.

### Proof object for verified reviews

When the proof check confirms the wallet has interacted with the game contract, include a `tx-interaction` proof in the `proofs` array:

```json
{
  "proofType": "tx-interaction",
  "proofPurpose": "commercial-tx",
  "proofObject": {
    "chainId": "eip155:8453",
    "txHash": "0xabc...def",
    "contractAddress": "0x1234...5678"
  }
}
```

Each proof is JSON-stringified before being placed in the `proofs` string array for ABI encoding.

See `rep-attestation-tools-evm-solidity/schemas-json/common.schema.json` for the full proof type definitions.

### Attestation relay URL

The widget submits to:
```
POST https://reputation.omatrust.org/api/eas/delegated-attest
```

Nonce endpoint:
```
GET https://reputation.omatrust.org/api/eas/nonce?attester={walletAddress}
```

### Widget attestation flow

1. Widget calls `/api/eas/nonce?attester={wallet}` to get the current EAS nonce
2. Widget calls `prepareDelegatedAttestation()` from the SDK with the schema UID, encoded review data, and nonce
3. Widget prompts the user to sign the EIP-712 typed data via their wallet (`eth_signTypedData_v4`)
4. Widget calls `submitDelegatedAttestation()` from the SDK with the signed payload
5. Relay server verifies signature, checks schema allowlist, submits `attestByDelegation` on-chain
6. Widget displays the returned attestation UID and tx hash

---

## Widget config

The embed snippet URL carries all config as query parameters:

| Param | Required | Description |
|---|---|---|
| `url` | Yes | Game URL / domain (used to construct `did:web:` subject) |
| `contract` | Yes | Contract address (candidate for proof check — not automatically trusted by verifiers) |
| `chainId` | Yes | EVM chain ID where the contract resides |
| `name` | No | Game display name |
| `icon` | No | Game icon URL |
| `wallet` | No | Pre-populated reviewer wallet address |

The `contract` parameter is a candidate. The widget uses it for the `tx-interaction` proof check. Downstream verifiers confirm the contract-to-subject binding via Linked Identifier attestations on EAS.

---

## Security requirements

### Input validation
Validate all inbound data with Zod.

### Spam controls
Implemented by the delegation API.

### CORS / iframe
Set correct headers to allow embedding where needed.
Support an allowlist model for parent origins later, but do not overengineer in MVP.

### postMessage signing bridge security

The host-mediated signing bridge (`postMessage`) is an untrusted channel in both directions. Both the host and the widget must validate messages. The relay server provides a third validation layer.

#### Three-layer validation model

1. **Host validates before signing** — the host must not blindly sign whatever the iframe requests
2. **Widget validates after receiving** — the widget must not trust the host's response without checking
3. **Relay server validates before submitting** — the delegated attestation API independently verifies the signature, schema, nonce, and deadline

#### What the host must validate before signing

- `event.origin` matches the expected widget origin (e.g., `reputation.omatrust.org`)
- `event.data.type` is exactly `"omatrust:signTypedData"`
- EIP-712 domain `name` is `"EAS"` and `version` is `"1.4.0"`
- `chainId` in the domain matches the expected attestation chain
- schema UID in the message matches the allowed user-review schema
- `recipient` and `attester` fields are consistent with the connected wallet
- `deadline` is short-lived (e.g., within 10 minutes)
- the signer wallet matches the currently connected user wallet

The host should reject any request that doesn't pass these checks. The host should never sign arbitrary typed data from the iframe.

#### What the widget must validate on response

- `event.origin` matches the expected host origin
- `event.data.id` matches an outstanding request ID
- `event.data.type` is exactly `"omatrust:signature"` or `"omatrust:signatureError"`
- signature exists and is a valid hex string
- if possible, recover the signer from the signature and confirm it matches the expected wallet address

#### Cross-origin message spoofing

Any window can send `postMessage`. Both sides must:
- Check `event.origin` against an expected origin
- Check `event.source` to confirm the message came from the expected window
- Use unique `requestId` values to prevent confused-request and replay attacks

#### postMessage protocol reference

```
widget → host:  { type: "omatrust:ready" }
host → widget:  { type: "omatrust:hostReady" }

widget → host:  { type: "omatrust:signTypedData", id: string, domain: object, types: object, message: object }
host → widget:  { type: "omatrust:signature", id: string, signature: string }
host → widget:  { type: "omatrust:signatureError", id: string, error: string }
```

All `id` values are UUIDs generated by the widget. The host must echo the same `id` in its response.

### Post-signature verification

After receiving the EIP-712 signature (from either integrated or basic mode), the widget must verify the signer before submitting to the delegated attestation API. This applies to both signing modes.

#### Verification steps

1. **Recover the signer** — use `ethers.verifyTypedData(domain, types, message, signature)` to recover the actual address that produced the signature
2. **Confirm signer matches claimed wallet** — the recovered address must match the wallet address used for the initial proof check. If it doesn't, reject the submission. Since the proof check already verified this wallet address interacted with the contract, and the signature proves the wallet owns the private key, no re-verification of the proof is needed.

#### Why this matters

- In integrated mode, the host could return a signature from a different wallet than the one it claimed via the `wallet` query param. Recovering the signer catches this.
- In basic mode, the risk is lower (Thirdweb controls the signing flow), but re-verifying against the actual signer is cheap (one API call) and closes any manipulation of the wallet query param.
- The delegated attestation relay server verifies the signature independently, but it has no knowledge of the contract interaction. The widget is the only layer that confirms the signer actually used the app.

#### Submission flow (both modes)

1. Get wallet address (query param or Thirdweb connect)
2. Run proof check → display Verified User badge if tx found
3. User fills in rating and text, clicks submit
4. Get EIP-712 signature (postMessage bridge or Thirdweb signer)
5. Recover signer address from signature
6. Verify: recovered signer === claimed wallet address → reject if mismatch
7. Submit to delegated attestation API
8. Show success or error

---

## No-database architecture

All game configuration is encoded directly in the widget embed URL as query parameters. There is no server-side persistence layer for MVP.

The attestation record itself lives on-chain via EAS. Binding attestations live on-chain via EAS. No database, no ORM, no migrations.

This means:
- No Prisma / Drizzle
- No `/lib/db`
- No login / auth system for the creation frontend (it's a static form that generates a URL)
- Game configs are not stored server-side — they exist only in the embed snippet

If persistence is needed later (e.g., for analytics, moderation, or game directory), it can be added as a separate concern.

---

## Implementation order

Build in this order:

### Phase 1 (completed)
- bootstrap Next.js repo with Tailwind, TypeScript
- install `@oma3/omatrust` SDK, `thirdweb`, Zod
- implement `/create` form UI (game URL, contract address, chain ID, optional wallet address, game name, icon)
- implement embed snippet generation (URL with query params + iframe HTML + optional JS injection snippet)
- include binding notice in creation form UI

### Phase 2 (completed)
- build `/embed` public widget route
- build widget UI: rating stars, review text, wallet connect button (Thirdweb)
- implement wallet resolution: query param → Thirdweb connect fallback
- stub proof check (always returns unverified) and attestation submission

### Phase 3
- implement `/api/proof/check` using Thirdweb Insight API (with OMA3 client ID)
- wire up real proof check in widget flow
- implement DID construction from game URL: `buildDidWeb(domain)` from `@oma3/omatrust/identity`
- implement EIP-712 signing flow using SDK's `prepareDelegatedAttestation`
- implement attestation submission using SDK's `submitDelegatedAttestation`
- include `tx-interaction` proof in attestation when verified

### Phase 4
- success/error state handling and polish
- one-review-per-wallet-per-game guard (check EAS for existing attestation before submitting)
- deploy to Vercel

---

## Future compatibility

Because reviews target the `did:web` subject (not the contract), this architecture supports:

- Cross-chain expansion via additional binding attestations without changing the review schema
- Reputation portability when a game migrates contracts (new bindings, same review history)
- Consumption by scanners, wallets, and AI agents that can resolve the identity graph

No changes to the User Review schema are required for any of these.

---

