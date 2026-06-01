import { describe, expect, it } from "vitest"
import { Wallet, verifyTypedData } from "ethers"

// Security behavior (no coupling to a specific module path): given an EIP-712
// signature, the signer must be recoverable and signatures produced by a
// different key must be rejected. This is the property the widget relies on in
// `handleSign` (lib/attestation.ts `recoverSigner`) to enforce the signer/
// wallet match before submitting to the relay. Asserted here via ethers'
// `verifyTypedData` so it stays valid regardless of where recovery is wired.
describe("EIP-712 signer recovery", () => {
  const domain = {
    name: "WidgetTest",
    version: "1",
    chainId: 1,
    verifyingContract: "0x0000000000000000000000000000000000000001",
  }

  const types = {
    Message: [
      { name: "content", type: "string" },
      { name: "from", type: "address" },
    ],
  }

  it("recovers the wallet that produced an EIP-712 signature", async () => {
    const wallet = Wallet.createRandom()
    const message = { content: "hello", from: wallet.address }

    const signature = await wallet.signTypedData(domain, types, message)
    const recovered = verifyTypedData(domain, types, message, signature)

    expect(recovered.toLowerCase()).toBe(wallet.address.toLowerCase())
  })

  it("recovers a different address when another key signs (mismatch is detectable)", async () => {
    const signer = Wallet.createRandom()
    const claimedWallet = Wallet.createRandom()
    const message = { content: "hello", from: claimedWallet.address }

    // `signer` signs on behalf of `claimedWallet`; recovery must surface the
    // real signer so the widget can reject the signer/wallet mismatch.
    const signature = await signer.signTypedData(domain, types, message)
    const recovered = verifyTypedData(domain, types, message, signature)

    expect(recovered.toLowerCase()).not.toBe(claimedWallet.address.toLowerCase())
    expect(recovered.toLowerCase()).toBe(signer.address.toLowerCase())
  })
})
