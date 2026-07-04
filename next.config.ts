import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // remove console logs in production
  compiler: {
    removeConsole: {
      exclude: ["error"],
    },
  },

  // allow loading images from external domains
  images: {
    remotePatterns: [new URL("https://example.com/account123/**")],
  },

  // enable route types
  typedRoutes: true,

  // experimental: {
  //   viewTransition: true,
  //   authInterrupts: true,
  // },
}

export default nextConfig
