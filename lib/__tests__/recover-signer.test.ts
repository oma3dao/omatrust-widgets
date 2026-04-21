import { describe, expect, it } from "vitest"
import { Wallet } from "ethers"
import { recoverSigner } from "@/lib/recover-signer"

describe("recoverSigner", () => {
  it("recovers the wallet that produced an EIP-712 signature", async () => {
    const wallet = Wallet.createRandom()

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

    const message = {
      content: "hello",
      from: wallet.address,
    }

    const signature = await wallet.signTypedData(domain, types, message)

    const recovered = recoverSigner(
      domain as Record<string, unknown>,
      types as Record<string, Array<{ name: string; type: string }>>,
      message as Record<string, unknown>,
      signature
    )

    expect(recovered.toLowerCase()).toBe(wallet.address.toLowerCase())
  })
})
