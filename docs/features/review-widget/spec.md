# Review Widget — Spec

Status: Implemented

## Goal

Provide an embeddable iframe widget that lets users submit on-chain reviews for web3 apps, with automatic proof-of-interaction verification and delegated EAS attestation.

## References

| Resource                  | URL                                                                                  |
|---------------------------|--------------------------------------------------------------------------------------|
| Widget builder (live)     | https://reputation.omatrust.org/widgets/reviews/create                               |
| Host example (live)       | https://reputation.omatrust.org/widgets/reviews/examples/host                        |
| Developer docs: Overview  | https://docs.omatrust.org/widgets/overview                                           |
| Developer docs: Basic     | https://docs.omatrust.org/widgets/basic-mode                                         |
| Developer docs: Integrated| https://docs.omatrust.org/widgets/integrated-mode                                    |
| Signing protocol spec     | [omatrust-sdk/docs/features/widget-signing-bridge/spec.md](https://github.com/oma3dao/omatrust-sdk/blob/main/docs/features/widget-signing-bridge/spec.md) |
| Trust policy endpoint     | https://api.omatrust.org/v1/trust-policy                                             |
| EAS attestation API docs  | https://docs.omatrust.org/api/delegated-attestation                                  |

## Widget builder

### Inputs

| Field            | Required | Description                                          |
|------------------|----------|------------------------------------------------------|
| App URL          | Yes      | Domain for the app. Derives `did:web:` subject.      |
| Contract address | Yes      | Contract users transact with directly.                |
| Chain ID         | Yes      | EVM chain ID (free-form numeric input).               |
| App name         | No       | Display name in widget header.                        |
| App icon URL     | No       | Icon URL in widget header.                            |
| Explorer API URL | No       | Etherscan-compatible API for proof check fallback.    |

### Outputs

Two modes selectable via tabs:

**Basic mode:**
- Iframe snippet with wallet injection script

**Integrated mode:**
- npm install command
- Iframe snippet
- `createSigningBridge` setup code

### Behavior
- Output hidden until Generate is clicked
- Clear Form resets everything
- `www.` stripped from domains automatically
- `did:web:` subject constructed at attestation time, not shown to developer

## Embed widget

### Query parameters

| Param      | Required | Description                                    |
|------------|----------|------------------------------------------------|
| `url`      | Yes      | App domain                                     |
| `contract` | Yes      | Contract address                               |
| `chainId`  | Yes      | EVM chain ID                                   |
| `name`     | No       | Display name                                   |
| `icon`     | No       | Icon URL                                       |
| `wallet`   | No       | Pre-populated wallet for proof check            |
| `explorer` | No       | Explorer API URL for proof check fallback       |

### Widget states

- Idle: rating stars (default 0), review text, wallet display
- Confirming: chain, contract, action, rating, comment summary
- Signing/submitting: spinner with status text
- Success: review summary with attestation UID and tx hash, Done button
- Error: error message with retry

### Proof check

- Runs automatically when wallet address is available
- Thirdweb Insight first, explorer API fallback
- Verified User badge shown when proof passes
- Unverified users can still submit reviews

### Signing modes

- **Basic:** Thirdweb ConnectButton (MetaMask, Coinbase, Rainbow, WalletConnect). Chain switch before signing.
- **Integrated:** postMessage bridge to host. Protocol defined in [omatrust-sdk spec](https://github.com/oma3dao/omatrust-sdk/blob/main/docs/features/widget-signing-bridge/spec.md).
- **Detection:** handshake retries at 0/500/1000/2000ms, 3-second fallback to basic.

### Attestation flow

1. Fetch nonce via `/api/eas/nonce` proxy
2. `prepareDelegatedAttestation` with user-review schema
3. Sign EIP-712 typed data (basic or integrated mode)
4. Recover signer, verify matches claimed wallet
5. Submit via `/api/eas/delegated-attest` proxy
6. Display attestation UID and tx hash

### User Review schema

| Field            | Type     | Required |
|------------------|----------|----------|
| `subject`        | string   | Yes      |
| `version`        | string   | No       |
| `ratingValue`    | uint256  | Yes      |
| `reviewBody`     | string   | No       |
| `screenshotUrls` | string[] | No       |
| `proofs`         | string[] | No       |

Schema UID (OMAchain Testnet): `0x7ab3911527e5e47eaab9f5a2c571060026532dde8cb4398185553053963b2a47`

## Acceptance Criteria

- [ ] Builder generates correct iframe snippets for both modes
- [ ] Widget loads config from query params
- [ ] Proof check runs against Thirdweb Insight
- [ ] Proof check falls back to explorer API when Insight fails
- [ ] Explorer API URL validated for SSRF (HTTPS, no IPs, no localhost)
- [ ] Verified User badge shown when proof passes
- [ ] Unverified users can submit reviews without badge
- [ ] Rating is required (1-5), review text is optional
- [ ] Confirmation panel shows chain, contract, action, rating, comment
- [ ] Basic mode: wallet connect works in iframe
- [ ] Basic mode: chain switch prompted before signing
- [ ] Integrated mode: handshake detected within 3 seconds
- [ ] Integrated mode: signing request sent via postMessage
- [ ] Signer recovered from signature matches claimed wallet
- [ ] Attestation submitted to relay and UID returned
- [ ] Success view shows rating, comment, subject, wallet, UID, tx hash
- [ ] Cancel and Done buttons send `omatrust:close` to parent
- [ ] Proxy routes forward to correct relay (api.omatrust.org or local)

## Edge Cases

- No wallet param and no Thirdweb connect → widget shows Connect button
- Thirdweb Insight unsupported chain → falls back to explorer API
- No explorer API configured → proof check returns unverified
- User rejects chain switch → clear error message
- User rejects signature → clear error message
- Relay returns error → displayed in widget
- Iframe in basic mode but inside iframe (missed handshake) → tries postMessage as last resort
