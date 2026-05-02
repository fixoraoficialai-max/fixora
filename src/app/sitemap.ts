import type { MetadataRoute } from "next";

const BASE_URL = "https://fixoravideo.com";

/**
 * Auto-generated sitemap.xml for Google Search Console.
 * Only public-facing pages — dashboard routes are excluded (auth required).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:              BASE_URL,
      lastModified:     new Date(),
      changeFrequency:  "weekly",
      priority:         1,
    },
    {
      url:              `${BASE_URL}/login`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.8,
    },
    {
      url:              `${BASE_URL}/register`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.8,
    },
  ];
}
