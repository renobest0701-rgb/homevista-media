import type { MetadataRoute } from "next";

// Disallow all bots — this is a private internal system.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
