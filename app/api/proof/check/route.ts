import { NextResponse } from "next/server"
import { proofCheckRequestSchema } from "@/lib/validation"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = proofCheckRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid proof check request",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    verified: false,
    chainId: parsed.data.chainId,
    contractAddress: parsed.data.contractAddress,
    reason:
      "Proof check integration is not wired yet. This route currently validates input and reserves the API boundary for the Thirdweb Insight integration pass.",
  })
}
