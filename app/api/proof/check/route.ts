import { NextResponse } from "next/server"
import { proofCheckRequestSchema } from "@/lib/validation"
import { checkProofOnChain } from "@/lib/proof-check"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = proofCheckRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid proof check request", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await checkProofOnChain(
    parsed.data,
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
  )

  return NextResponse.json(result)
}
