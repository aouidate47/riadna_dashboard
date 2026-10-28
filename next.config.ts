import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mock room photos come from picsum.photos; remove once real photo URLs exist.
  images: { remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }] },
  cacheComponents: true,
  partialPrefetching: true,
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
