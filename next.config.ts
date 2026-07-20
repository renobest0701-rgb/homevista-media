import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server components external packages — keep Prisma/pg on server only, skip client bundle
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bcryptjs"],

  // Compress responses
  compress: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },

  async headers() {
    const noRobots = [
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
    ];
    return [
      // Block all crawlers on every route
      { source: "/(.*)", headers: noRobots },
      // Long cache for immutable static assets
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
