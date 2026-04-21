import { NextResponse } from "next/server"
import { getActiveChain } from "@/lib/chains"
import { evmAddressSchema } from "@/lib/validation"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const attester = searchParams.get("attester")

  if (!attester) {
    return NextResponse.json({ error: "Missing attester parameter" }, { status: 400 })
  }

  const attesterParsed = evmAddressSchema.safeParse(attester)
  if (!attesterParsed.success) {
    return NextResponse.json({ error: "Invalid attester address" }, { status: 400 })
  }

  const chain = getActiveChain()

  // Local dev: relay points to rep-attestation-frontend directly (/api/eas/nonce)
  // Production: relay points to api.omatrust.org (/v1/nonce)
  const isGateway = chain.relayBaseUrl.includes("api.omatrust.org")
  const path = isGateway ? "/v1/nonce" : "/api/eas/nonce"

  const relayOrigin = chain.relayBaseUrl.replace(/\/+$/, "")
  const relayUrl = new URL(`${relayOrigin}${path}`)
  relayUrl.searchParams.set("attester", attesterParsed.data)

  const res = await fetch(relayUrl.toString())
  const data = await res.json()

  return NextResponse.json(data, { status: res.status })
}
