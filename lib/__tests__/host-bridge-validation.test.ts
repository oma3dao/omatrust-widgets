import { describe, it } from "vitest"

// Pending behavioral spec — NOT coupled to an implementation module.
//
// In integrated signing mode the host page receives `omatrust:signTypedData`
// requests from the widget iframe and signs them with the user's wallet.
// Before signing, the host MUST validate the request so a malicious or
// confused iframe cannot coax the user into signing arbitrary EIP-712 data
// (e.g. a different protocol's domain or a non-attestation payload).
//
// These specs define the *expected host-side validation behavior* at the
// boundary where a signing request is accepted, without prescribing where the
// validator lives. They are written as `it.todo` because the host bridge
// validation surface (and the example host page that should exercise it) is
// part of the integrated-signing feature work, not this PR. Promote to real
// assertions once that boundary exists — ideally driven through the host
// example component or a route rather than a specific internal function.
//
// Maps to threat-model case S3.1 in
// docs/testing/review-widget-security-tests.md.
describe("host bridge — signing request validation", () => {
  it.todo("accepts a well-formed omatrust:signTypedData request with a request id and EAS EIP-712 domain")

  it.todo("rejects a request whose message type is not 'omatrust:signTypedData'")

  it.todo("rejects a request that is missing a request id")

  it.todo("rejects a request whose EIP-712 domain is not the expected EAS domain/version")

  it.todo("rejects a request that does not carry the Attest typed-data type")
})
