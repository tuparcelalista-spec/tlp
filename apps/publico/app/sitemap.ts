import type { MetadataRoute } from "next";
import { searchProperties } from "../lib/search/supabaseSearchRepository";
import { SITE_URL } from "../lib/seo/site";

/**
 * Fase 3.7. Solo propiedades publicadas: `searchProperties()` delega en
 * `PropertyRepository.list()` (Bloque 1.3), que ya filtra
 * `estado='publicada'` — no se repite ese filtro aquí ni se consulta
 * Supabase directamente.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/propiedades`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/cotizador`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/como-comprar`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/campo-chileno`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/red-partner`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const result = await searchProperties({ intent: "property" });
  if (result.intent === "property") {
    for (const property of result.properties) {
      entries.push({
        url: `${SITE_URL}/propiedades/${property.code}`,
        lastModified: property.publishedAt ?? undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
