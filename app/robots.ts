import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/jaramooz",
          "/tools",
          "/contact",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/dashboard",
          "/dashboard/",
          "/profile",
          "/profile/",
          "/api",
          "/api/",
          "/specialist/portfolio",
          "/checkout/",
          "/jaramooz/payment/",
        ],
      },
    ],
    sitemap: "https://app.jarorg.ir/sitemap.xml",
  };
}
