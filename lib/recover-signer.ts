import { verifyTypedData } from "ethers"

/**
 * Recover the signer address from an EIP-712 signature.
 * Kept in a standalone module so unit tests do not load the OMATrust / EAS SDK graph.
 */
export function recoverSigner(
  domain: Record<string, unknown>,
  types: Record<string, Array<{ name: string; type: string }>>,
  message: Record<string, unknown>,
  signature: string
): string {
  return verifyTypedData(domain, types, message, signature)
}
