# OMATrust Widgets

Hosted widget platform for OMATrust on OMA3. This repository is designed to host multiple embeddable widgets. The first and currently only widget is the **User Review Widget**.

---

## User Review Widget

A hosted widget that lets users rate EVM web3 apps using the same wallet they already use with the app. Reviews are submitted as on-chain attestations via the OMATrust delegated attestation API on EAS. Developers embed the widget with a single iframe snippet — no backend integration required.

### For developers

1. Go to the widget builder at `reputation.omatrust.org/widgets/reviews/create`
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
5. The signed payload is submitted to the delegated attestation API at `reputation.omatrust.org`, which submits it on-chain to EAS on OMAchain
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

This project deploys as its own Vercel project but is served under the `reputation.omatrust.org` domain via rewrites. This keeps the widget codebase isolated from the main reputation frontend while sharing the same public URL.

### Step 1: Create the Vercel project

1. Go to Vercel → "Add New Project"
2. Import this repository (`omatrust-widgets`)
3. Framework preset: **Next.js**
4. Root directory: leave as repository root
5. Deploy

The project will be assigned a `.vercel.app` URL (e.g., `omatrust-widgets.vercel.app`). The rewrite rules in the reputation project already point to this URL.

### Step 2: Set environment variables

In the Vercel project settings → Environment Variables, add:

| Variable                         | Description                                                          |
|----------------------------------|----------------------------------------------------------------------|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Thirdweb client ID for Insight API and wallet connect                |
| `NEXT_PUBLIC_ASSET_PREFIX`       | The widgets project's own Vercel URL (e.g., `https://omatrust-widgets.vercel.app`). Required so CSS/JS assets load correctly when served through the reputation project's rewrite. |

Add more as integrations are wired up (e.g., attestation relay URL if it becomes configurable).

### Step 3: Rewrite rules and iframe headers

The rewrite rules and iframe header overrides have already been added to `rep-attestation-frontend/vercel.json`. They proxy `/widgets/*` and `/api/proof/*` to the widgets Vercel project, and allow the embed route to be loaded in third-party iframes.

The rewrites added to `rep-attestation-frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/widgets/:path*",
      "destination": "https://omatrust-widgets.vercel.app/widgets/:path*"
    },
    {
      "source": "/api/proof/:path*",
      "destination": "https://omatrust-widgets.vercel.app/api/proof/:path*"
    }
  ]
}
```

The iframe header override added to the `headers` array in the same file (must appear before the catch-all `/(.*)`  entry):

```json
{
  "source": "/widgets/reviews/embed",
  "headers": [
    {
      "key": "X-Frame-Options",
      "value": "ALLOWALL"
    },
    {
      "key": "Content-Security-Policy",
      "value": "frame-ancestors *;"
    }
  ]
}
```

This overrides the global `X-Frame-Options: SAMEORIGIN` so the embed route can be loaded in iframes on third-party sites.

If the widgets project Vercel URL differs from `omatrust-widgets.vercel.app`, update the `destination` values in the `rewrites` array.

### Step 4: Redeploy the reputation project

If the `vercel.json` changes haven't been deployed yet, push them to the `rep-attestation-frontend` repo and redeploy. The rewrite rules take effect on the next deployment.

### How the URL mapping works

After deployment, the public URLs resolve like this:

| Public URL                                                    | Proxied to                                                          |
|---------------------------------------------------------------|---------------------------------------------------------------------|
| `reputation.omatrust.org/widgets/reviews/create`              | `omatrust-widgets.vercel.app/widgets/reviews/create`                |
| `reputation.omatrust.org/widgets/reviews/embed?...`           | `omatrust-widgets.vercel.app/widgets/reviews/embed?...`             |
| `reputation.omatrust.org/widgets/reviews/examples/host`       | `omatrust-widgets.vercel.app/widgets/reviews/examples/host`         |
| `reputation.omatrust.org/api/proof/check`                     | `omatrust-widgets.vercel.app/api/proof/check`                       |

The widgets project can also be accessed directly at its `.vercel.app` URL for testing, but production embed snippets should use the `reputation.omatrust.org` URLs.

<!-- TODO: Add developer instructions for contract-to-did:web binding attestation setup -->