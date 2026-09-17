import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/['"]/g, "")?.replace(/\/$/, "") ||
  "https://jarorg.ir";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/tools",
          "/tools/locations",
          "/locations/",
          "/jaramooz",
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
          "/tools/locations/new",
          "/checkout/",
          "/jaramooz/payment/",
          "/login",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE.replace(/^https?:\/\//, ""),
  };
}
