# OMATrust Review Widget

Hosted OMATrust review widget MVP for OMA3.

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

## Scripts

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```
