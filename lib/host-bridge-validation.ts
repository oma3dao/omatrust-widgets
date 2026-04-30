type SignTypedDataRequest = {
  id?: unknown
  domain?: unknown
  types?: unknown
  message?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * Validate incoming signTypedData requests from widget -> host bridge.
 * Keeps host signing scope narrow and rejects malformed payloads.
 */
export function validateHostSignTypedDataRequest(data: unknown): {
  ok: boolean
  error?: string
  parsed?: {
    id: string
    domain: Record<string, unknown>
    types: Record<string, Array<{ name: string; type: string }>>
    message: Record<string, unknown>
  }
} {
  if (!isRecord(data) || data.type !== "omatrust:signTypedData") {
    return { ok: false, error: "Unsupported message type" }
  }

  const req = data as SignTypedDataRequest
  if (typeof req.id !== "string" || req.id.length === 0) {
    return { ok: false, error: "Missing request id" }
  }
  if (!isRecord(req.domain) || !isRecord(req.types) || !isRecord(req.message)) {
    return { ok: false, error: "Malformed signTypedData request" }
  }

  const domainName = req.domain.name
  const domainVersion = req.domain.version
  if (domainName !== "EAS" || domainVersion !== "1.4.0") {
    return { ok: false, error: "Unexpected EIP-712 domain for attestation signing" }
  }

  if (!Array.isArray((req.types as Record<string, unknown>).Attest)) {
    return { ok: false, error: "Missing Attest type definition" }
  }

  return {
    ok: true,
    parsed: {
      id: req.id,
      domain: req.domain,
      types: req.types as Record<string, Array<{ name: string; type: string }>>,
      message: req.message,
    },
  }
}

