export type HostSignatureMessageType = "omatrust:signature" | "omatrust:signatureError"

export type HostSignatureMessageData = {
  id?: string
  type?: unknown
  signature?: unknown
  error?: unknown
}

/**
 * Parse parent origin from referrer when available.
 * In cross-origin iframe contexts this is typically the embedding page URL.
 */
export function getExpectedHostOriginFromReferrer(referrer: string): string | null {
  if (!referrer) return null
  try {
    return new URL(referrer).origin
  } catch {
    return null
  }
}

/**
 * Validate host -> widget signing bridge responses.
 * Checks request id, message type, window source, and (when known) origin.
 */
export function isTrustedHostSignatureMessage(params: {
  data: HostSignatureMessageData
  expectedId: string
  source: MessageEventSource | null
  parentWindow: Window
  origin: string
  expectedHostOrigin: string | null
}): params is {
  data: HostSignatureMessageData & { id: string; type: HostSignatureMessageType }
  expectedId: string
  source: MessageEventSource
  parentWindow: Window
  origin: string
  expectedHostOrigin: string | null
} {
  const { data, expectedId, source, parentWindow, origin, expectedHostOrigin } = params
  if (data.id !== expectedId) return false
  if (data.type !== "omatrust:signature" && data.type !== "omatrust:signatureError") return false
  if (source !== parentWindow) return false
  if (expectedHostOrigin && origin !== expectedHostOrigin) return false
  return true
}
