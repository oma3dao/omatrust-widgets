import { createThirdwebClient } from "thirdweb"

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID

const isBuildTime = process.env.NEXT_PHASE === "phase-production-build"

if (!clientId && !isBuildTime) {
  console.warn(
    "Warning: NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set. Wallet connect will not work."
  )
}

export const thirdwebClient = createThirdwebClient({
  clientId: clientId || "placeholder-for-build",
})
