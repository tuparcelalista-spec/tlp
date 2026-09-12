import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo/site";

/**
 * Fase 3.7. No bloquea `/`, `/propiedades` ni `/propiedades/[codigo]`.
 * Bloquea explícitamente `/search-demo` (herramienta interna, Bloque 2.4)
 * — no debe indexarse. `/mi-parcela` (Fase 4) es una ruta privada por
 * token — bloqueada acá además del `noindex` propio de la página, como
 * segunda capa (la página ya no depende solo de esto).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/search-demo", "/mi-parcela", "/design-system"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
