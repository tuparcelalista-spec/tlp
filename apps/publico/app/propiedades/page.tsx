import type { Metadata } from "next";
import { Container, Section } from "@tpl/ui";
import { SearchWidgetServer } from "../../components/search";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const BASE_TITLE = "Parcelas y campos en venta en Chile";
const BASE_DESCRIPTION =
  "Busca parcelas y campos en venta en Chile por comuna, precio, superficie y cercanía. Catálogo real y actualizado de Tu Parcela Lista.";

interface PropiedadesPageProps {
  searchParams?: Promise<{ comuna?: string }>;
}

/**
 * Bloque Home-paridad: `?comuna=` llega de los chips de la Commune Ribbon
 * de la Home (`/propiedades?comuna=Chillán`). Con valor, la página tiene
 * título/descripción/canonical propios para esa comuna — es exactamente
 * lo que le da "soporte SEO nativo" a cada comuna (páginas indexables
 * distintas, no solo un parámetro que Google ignora). Sin `comuna`, el
 * comportamiento es idéntico al de antes.
 */
export async function generateMetadata({ searchParams }: PropiedadesPageProps): Promise<Metadata> {
  const comuna = (await searchParams)?.comuna?.trim();
  const title = comuna ? `Parcelas en ${comuna}` : BASE_TITLE;
  const description = comuna
    ? `Parcelas y campos en venta en ${comuna}. Catálogo real y actualizado de Tu Parcela Lista.`
    : BASE_DESCRIPTION;
  const canonical = comuna ? `${SITE_URL}/propiedades?comuna=${encodeURIComponent(comuna)}` : `${SITE_URL}/propiedades`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: canonical, type: "website" },
    twitter: { card: "summary", title: `${title} | ${SITE_NAME}`, description },
  };
}

/**
 * Catálogo público real — Fase 3.1. Flujo: SearchWidgetServer (Server
 * Component, Bloque 2.4) → SearchWidget (Client) → runPropertySearch()
 * (Server Action) → searchProperties() → repository → Supabase. Ninguna
 * lógica de búsqueda vive en esta página — solo la envuelve con
 * metadata/layout.
 *
 * `hydrateCatalog` (Bloque 3.16): esta es la única ruta donde se pide el
 * catálogo hidratado por SSR — la Home no lo necesita (ya muestra su
 * propio catálogo real más abajo, en destacadas/oportunidades).
 */
export default async function PropiedadesPage({ searchParams }: PropiedadesPageProps) {
  const comuna = (await searchParams)?.comuna?.trim();

  return (
    <Section tone="canvas">
      <Container>
        <h1>{comuna ? `Parcelas en ${comuna}` : BASE_TITLE}</h1>
        <p>Busca por comuna, precio, superficie, cercanía o palabras clave.</p>
        <SearchWidgetServer hydrateCatalog initialCommune={comuna} />
      </Container>
    </Section>
  );
}
