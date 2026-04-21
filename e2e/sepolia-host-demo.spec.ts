import { test, expect } from "@playwright/test"
import { SEPOLIA_PROTOCOL_PRESETS } from "../lib/protocol-presets"

test.describe("Sepolia host demo", () => {
  test("loads host page and switches protocol preset", async ({ page }) => {
    await page.goto("/widgets/reviews/examples/host", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Sepolia Host Demo")).toBeVisible()

    const summary = page.getByTestId("host-preset-summary")
    await expect(summary).toContainText(SEPOLIA_PROTOCOL_PRESETS.uniswap.contractAddress)

    await page.getByRole("button", { name: "Aave" }).click()
    await expect(summary).toContainText(SEPOLIA_PROTOCOL_PRESETS.aave.contractAddress)

    await page.getByRole("button", { name: "Uniswap" }).click()
    await expect(summary).toContainText(SEPOLIA_PROTOCOL_PRESETS.uniswap.contractAddress)
  })

  test("embed iframe targets Sepolia chain", async ({ page }) => {
    await page.goto("/widgets/reviews/examples/host", { waitUntil: "domcontentloaded" })
    const iframe = page.locator("#omatrust-widget")
    await expect(iframe).toBeVisible()
    const src = await iframe.getAttribute("src")
    expect(src).toContain("chainId=11155111")
    expect(src).toContain(`contract=${encodeURIComponent(SEPOLIA_PROTOCOL_PRESETS.uniswap.contractAddress)}`)
  })

  test("integrated mode completes handshake", async ({ page }) => {
    // `signing=integrated` defers mounting the iframe until URL mode is applied so the host bridge
    // listener is registered before the widget's `omatrust:ready` retries end (~3s).
    await page.goto("/widgets/reviews/examples/host?signing=integrated", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("host-bridge-status")).toContainText("Integrated bridge ready", {
      timeout: 90_000,
    })
  })

  test("proof check API accepts valid JSON body", async ({ request }) => {
    const res = await request.post("/api/proof/check", {
      data: {
        walletAddress: "0x1111111111111111111111111111111111111111",
        contractAddress: "0x2222222222222222222222222222222222222222",
        chainId: 11155111,
      },
      headers: { "Content-Type": "application/json" },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toHaveProperty("verified")
    expect(body).toHaveProperty("chainId")
  })
})
