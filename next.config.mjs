/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
}

export default nextConfig
