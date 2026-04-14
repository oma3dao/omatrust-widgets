/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding")
    return config
  },
}

export default nextConfig
