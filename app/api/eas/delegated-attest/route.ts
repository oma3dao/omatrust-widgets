import { NextResponse } from "next/server"
import { getActiveChain } from "@/lib/chains"

export async function POST(request: Request) {
  const body = await request.text()
  const chain = getActiveChain()

  // Local dev: relay points to rep-attestation-frontend directly (/api/eas/delegated-attest)
  // Production: relay points to api.omatrust.org (/v1/delegated-attest)
  const isGateway = chain.relayBaseUrl.includes("api.omatrust.org")
  const path = isGateway ? "/v1/delegated-attest" : "/api/eas/delegated-attest"

  if (process.env.NODE_ENV === "development") {
    console.log("[delegated-attest proxy] Forwarding to:", `${chain.relayBaseUrl}${path}`)
  }

  const res = await fetch(`${chain.relayBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })

  const responseText = await res.text()

  if (process.env.NODE_ENV === "development") {
    console.log("[delegated-attest proxy] Relay status:", res.status, "body:", responseText.slice(0, 500))
  }

  try {
    const data = JSON.parse(responseText)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: `Relay returned non-JSON response (${res.status}): ${responseText.slice(0, 200)}` },
      { status: res.status || 502 }
    )
  }
}
