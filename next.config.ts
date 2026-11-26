import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proof screenshots go through a Server Action; the default body limit (1 MB) is too small.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
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
