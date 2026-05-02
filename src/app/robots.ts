import type { MetadataRoute } from "next";

/**
 * Auto-generated robots.txt.
 * Allow Google to index public pages.
 * Block crawlers from dashboard, admin, and API routes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow:     ["/", "/login", "/register"],
        disallow:  ["/dashboard", "/admin", "/api/", "/create/", "/settings", "/history", "/projects"],
      },
    ],
    sitemap: "https://fixoravideo.com/sitemap.xml",
  };
}
