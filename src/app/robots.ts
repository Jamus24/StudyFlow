import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/uploads/"],
      },
    ],
    sitemap: "https://lumina.study/sitemap.xml",
    host: "https://lumina.study",
  };
}
