import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// Lets phones/laptops on the same Wi-Fi open the dev server at http://<lan-ip>:4040
// and receive live reloads. Derived from the machine's current IPv4 addresses so
// it keeps working when the router hands out a different IP.
const lanOrigins = Object.values(networkInterfaces())
  .flatMap((nets) => nets ?? [])
  .filter((net) => net.family === "IPv4" && !net.internal)
  .map((net) => net.address);

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: lanOrigins,
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