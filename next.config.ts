import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  devIndicators: false,
  // Lets phones/laptops on the same Wi-Fi open the dev server at http://192.168.110.9:4040.
  allowedDevOrigins: ["192.168.110.9"],
  // Mock room photos come from picsum.photos; remove once real photo URLs exist.
  images: { remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }] },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // All dashboard pages are client-rendered behind AuthGuard, so there is no
    // static shell to validate. Opt in per-page with `export const instant = true`.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;