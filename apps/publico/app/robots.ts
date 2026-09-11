import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo/site";

/**
 * Fase 3.7. No bloquea `/`, `/propiedades` ni `/propiedades/[codigo]`.
 * Bloquea explícitamente `/search-demo` (herramienta interna, Bloque 2.4)
 * — no debe indexarse.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/search-demo"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
