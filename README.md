# OMATrust Widgets

Hosted widget platform for OMATrust on OMA3. This repository is designed to host multiple embeddable widgets. The first and currently only widget is the **User Review Widget**.

---

## User Review Widget

A hosted widget that lets users rate EVM web3 apps using the same wallet they already use with the app. Reviews are submitted as on-chain attestations via the OMATrust delegated attestation API on EAS. Developers embed the widget with a single iframe snippet — no backend integration required.

### For developers

1. Go to the widget builder at `widgets.omatrust.org/widgets/reviews/create`
2. Enter your app URL, one contract address, and the chain ID
3. Click "Generate embed" and copy the iframe snippet
4. Paste the snippet into your site

That's it. Users can now submit reviews from your site. The widget handles wallet connection, proof checking, EIP-712 signing, and attestation submission.

### Embed URL reference

The widget is loaded via iframe. All configuration is passed as query parameters — there is no server-side storage.

```
/widgets/reviews/embed?url=myapp.com&contract=0x...&chainId=8453
```

| Param      | Required | Description                                                                              |
|------------|----------|------------------------------------------------------------------------------------------|
| `url`      | Yes      | App domain (e.g., `myapp.com`). The widget derives the `did:web:` subject automatically. |
| `contract` | Yes      | Contract address for the app on the specified chain.                                     |
| `chainId`  | Yes      | EVM chain ID where the contract lives (e.g., `8453` for Base).                           |
| `name`     | No       | Display name shown in the widget header.                                                 |
| `icon`     | No       | URL to an app icon shown in the widget header.                                           |
| `wallet`   | No       | Pre-populated reviewer wallet address for proof checking.                                |

### Wallet passthrough

The widget needs a wallet address for two things: checking if the user has interacted with the app's contract (proof check), and signing the EIP-712 attestation.

There are two ways the widget gets a wallet:

1. **Dynamic injection (recommended)** — The host site already knows the user's wallet from its own auth or wallet connection flow. It sets the `wallet` query param on the iframe URL at runtime:
   ```js
   const iframe = document.getElementById("omatrust-widget");
   const url = new URL(iframe.src);
   url.searchParams.set("wallet", userWalletAddress);
   iframe.src = url.toString();
   ```
   This lets the widget run the proof check immediately using the address the host site provides. The user still connects a wallet inside the widget to sign the attestation.

2. **Direct connect (fallback)** — If no wallet param is present, the widget shows a "Connect Wallet" button. The user connects inside the iframe. This works but means the user connects twice (once on the host site, once in the widget).

Most integrations should use option 1: leave the wallet out of the static embed snippet and inject it dynamically from the host site's existing wallet state.

See the host example at `/widgets/reviews/examples/host` for a working demo of both modes.

### What happens when a user submits a review

1. The widget checks if the user's wallet has sent at least one transaction to the configured contract (via the proof-check API using Thirdweb Insight)
2. If yes, the review is labeled "Verified User"
3. The user enters a rating (1–5) and optional review text
4. The widget builds an EIP-712 typed data structure for a User Review attestation and prompts the user to sign
5. The signed payload is submitted to the delegated attestation API at `api.omatrust.org`, which submits it on-chain to EAS on OMAChain
6. The widget shows the attestation UID and transaction hash

### Architecture

This is a Next.js (App Router) project. Each widget family lives under `/widgets/{type}/`. It serves three things for the review widget:

- **Builder UI** — a form that generates embed snippets from app config
- **Embeddable widget** — the iframe-loadable review UI
- **Proof-check API** — a serverless endpoint that checks transaction history via Thirdweb Insight

All app configuration lives in URL query parameters. There is no database. The attestation record lives on-chain via EAS.

The `did:web` subject DID is constructed automatically from the app URL using `buildDidWeb()` from the `@oma3/omatrust/identity` SDK. The binding between the contract and the `did:web` subject is handled by separate OMATrust attestations outside of this widget.

#### Routes

| Route                                  | Purpose                                                       |
|----------------------------------------|---------------------------------------------------------------|
| `/widgets/reviews/create`              | Builder UI — enter app config, generate embed snippets        |
| `/widgets/reviews/embed?...`           | Embeddable widget — loaded inside iframes on app sites        |
| `/widgets/reviews/examples/host`       | Integration demo — shows wallet passthrough in action         |
| `/api/proof/check`                     | Proof-check API — verifies wallet interaction with a contract |

Legacy paths `/create` and `/embed` redirect to the namespaced routes above.

---

### Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The root redirects to the builder UI.

Other scripts:

```bash
pnpm build       # production build
pnpm typecheck   # TypeScript check without emitting
```

---

## Deploying to Vercel

> **Environment variable values and Vercel environment configuration** are documented in the [Deployment Guide](https://github.com/oma3dao/omatrust-docs/blob/main/operations/deployment-rep-attestation.md) (Section 7). This section covers the project-specific setup steps.

This project deploys as its own Vercel project with its own domain (`widgets.omatrust.org`).

### Step 1: Create the Vercel project

1. Go to Vercel → "Add New Project"
2. Import this repository (`omatrust-widgets`)
3. Framework preset: **Next.js**
4. Root directory: leave as repository root
5. Deploy

### Step 2: Set environment variables

In the Vercel project settings → Environment Variables, add:

| Variable                         | Description                                                          |
|----------------------------------|----------------------------------------------------------------------|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Thirdweb client ID for Insight API and wallet connect                |
| `NEXT_PUBLIC_ACTIVE_CHAIN`       | `omachain-mainnet` for production, `omachain-testnet` for public-test|

Optional (leave unset unless needed):

| Variable                         | Description                                                                       |
|----------------------------------|-----------------------------------------------------------------------------------|
| `NEXT_PUBLIC_ASSET_PREFIX`       | Only set if iframe assets fail to load. Use the widgets project's own Vercel URL. |
| `NEXT_PUBLIC_RELAY_BASE_URL`     | Only for local dev. Defaults to `https://api.omatrust.org`.                       |

### Step 3: Configure domains

Configure custom domains per environment as described in the Deployment Guide (Sections 4 and 7).

| Environment | Domain                       |
|-------------|------------------------------|
| Production  | `widgets.omatrust.org`       |
| public-test | `test.widgets.omatrust.org`  |
| Development | `dev.widgets.omatrust.org`   |

### Step 4: Iframe headers

The widget embed route must be loadable in third-party iframes. A `vercel.json` is included in the repo that explicitly allows framing on the embed route via `Content-Security-Policy: frame-ancestors *`. No manual configuration needed — it deploys with the project.

### Public URL reference

| URL                                                    | Purpose                                        |
|--------------------------------------------------------|------------------------------------------------|
| `widgets.omatrust.org/widgets/reviews/create`          | Builder UI — generate embed snippets           |
| `widgets.omatrust.org/widgets/reviews/embed?...`       | Embeddable widget — loaded inside iframes      |
| `widgets.omatrust.org/widgets/reviews/examples/host`   | Integration demo — wallet passthrough example  |
| `widgets.omatrust.org/api/proof/check`                 | Proof-check API — verifies wallet interaction  |

<!-- TODO: Add developer instructions for contract-to-did:web binding attestation setup -->