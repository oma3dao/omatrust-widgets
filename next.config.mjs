import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid inferring the workspace root from a parent `package-lock.json` when running `next dev` from this repo.
  outputFileTracingRoot: path.join(__dirname),
  typedRoutes: true,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding")
    return config
  },
}

export default nextConfig
