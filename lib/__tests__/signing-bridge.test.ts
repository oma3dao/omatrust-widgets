import { describe, it } from "vitest"

// Pending behavioral spec — NOT coupled to an implementation module.
//
// The review widget requests EIP-712 signatures from its host page over
// `postMessage` (integrated signing mode, see `requestHostSignature` in
// components/embed/review-widget.tsx). Because any window can post a message
// into the iframe, the widget must only trust a signature response when it is
// proven to come from the legitimate host.
//
// These specs define the *expected security behavior* at the widget's
// public boundary (the message handler the widget installs). They are written
// as `it.todo` so they don't assert against an implementation that doesn't
// exist yet and don't prescribe where the trust check lives (a helper, an
// inline guard in the component, etc.). When the trust check is implemented,
// promote these to real assertions — ideally driven through the widget's
// message handling rather than a specific internal function.
//
// Maps to threat-model cases S3.2 / S3.3 in
// docs/testing/review-widget-security-tests.md.
describe("widget signing bridge — trusted host signature responses", () => {
  it.todo("derives the expected host origin from document.referrer (origin only, preserves localhost port)")

  it.todo("treats an empty or unparseable referrer as 'host origin unknown'")

  it.todo("accepts a signature response whose requestId, type, source window, and origin all match the outstanding request")

  it.todo("rejects a signature response carrying a request id the widget did not issue")

  it.todo("rejects a message whose type is not 'omatrust:signature'")

  it.todo("rejects a signature response not sent by the parent window (event.source !== window.parent)")

  it.todo("rejects a signature response from an origin other than the known host origin")

  it.todo("accepts any origin only when the host origin cannot be determined (referrer unavailable)")
})
