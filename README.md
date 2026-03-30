# OMATrust Widgets

Hosted widget platform for OMATrust on OMA3.

## Current status

This repository now contains the first implementation pass for:

- `/widgets/reviews/create` builder UI
- `/widgets/reviews/embed` hosted widget UI
- `/widgets/reviews/examples/host` example host integration page
- shared OMATrust product styling and components
- `POST /api/proof/check` stub route with validation

The current build intentionally focuses on structure, styling, and the correct product model. Real integrations are still pending for:

- Thirdweb wallet connect
- Thirdweb Insight proof lookup
- delegated attestation via `@oma3/omatrust`
- one-review-per-wallet-per-game checks

Legacy short paths `/create` and `/embed` currently redirect to the new namespace.

The builder UI does not ask for a reviewer wallet anymore. Wallet passthrough is demonstrated in the host example and optional JavaScript snippet instead.

## Vercel strategy

Long term, this repository is intended to deploy as its own Vercel project while still appearing under the main reputation host.

Recommended setup:

- Create a dedicated Vercel project from this repository
- Set the Vercel Root Directory to the repository root
- Deploy this project independently
- Keep `reputation.omatrust.org` attached to the main reputation project
- Add a single rewrite in the reputation project for `/widgets/:path*`

Public URL strategy:

- `reputation.omatrust.org/widgets/reviews/create`
- `reputation.omatrust.org/widgets/reviews/embed`
- `reputation.omatrust.org/widgets/reviews/examples/host`

Suggested rewrite in the reputation project:

```json
{
  "rewrites": [
    {
      "source": "/widgets/:path*",
      "destination": "https://YOUR-WIDGETS-PROJECT.vercel.app/widgets/:path*"
    }
  ]
}
```

Why this approach:

- keeps widgets isolated from the main reputation codebase
- supports multiple future widget families under one namespace
- only requires one rewrite rule in the reputation project
- preserves the long-term public URL structure under `reputation.omatrust.org`

## Scripts

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```
