import { Container, Section, Grid, Button, Stack } from "@tpl/ui";
import { listAvailableCommunes, getFeaturedProperties, getOpportunityProperties, getHomeCatalogSummary } from "../lib/search/actions";
import { SearchResultCard } from "../components/search/SearchResultCard";
import { CommuneRibbon } from "../components/home/CommuneRibbon";
import { TrustBar } from "../components/home/TrustBar";
import { HomeHero } from "../components/home/HomeHero";
import { SITE_URL, SITE_NAME } from "../lib/seo/site";

/**
 * Home pública — Fase 3.6. Reutiliza el mismo `SearchWidgetServer`/
 * `SearchWidget` de `/propiedades` (Bloque 2.4) — no se construyó un
 * segundo buscador. `featured`/`opportunity` se resuelven en
 * `getFeaturedProperties()`/`getOpportunityProperties()` (`actions.ts`) —
 * ver ahí por qué ese filtro vive a nivel de llamador y no en Search Core.
 * Header/Footer viven en `app/layout.tsx` (`SiteChrome`).
 *
 * Commune Ribbon + Trust Bar (paridad con `frontend-v2`): mismo orden real
 * del legacy (ribbon, luego trust bar, luego hero/buscador) — `catalogSummary`
 * viene de `getHomeCatalogSummary()`, una sola consulta real, calculada acá
 * en el servidor antes del primer render.
 */

/**
 * P0-02 — ISR (2026-09-12). Antes esta ruta se prerenderizaba en el build y
 * NUNCA se volvía a generar: una parcela publicada o editada en Supabase no
 * aparecía en la Home (destacadas, oportunidades, ribbon de comunas, trust
 * bar) hasta un redeploy manual. Verificado en el log de build real:
 * `○ / ` marcado como Static, y `grep revalidate` sin un solo resultado en
 * todo `apps/publico`.
 *
 * Con `revalidate = 3600` la página sigue sirviéndose desde caché —el
 * visitante no espera nunca a Supabase— pero Next la regenera en segundo
 * plano como máximo una hora después del primer pedido que la encuentre
 * vencida. Es exactamente el "SSG + ISR" que pide el Plan Maestro §5 para
 * la Fase 3.
 */
export const revalidate = 3600;

export default async function Home() {
  const [featured, opportunities, catalogSummary, availableCommunes] = await Promise.all([
    getFeaturedProperties(6),
    getOpportunityProperties(6),
    getHomeCatalogSummary(),
    listAvailableCommunes(),
  ]);

  const realEstateAgentSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/legacy-image/logo_compartir.png`,
    description:
      "Portal de venta de parcelas y campos en Chile: comparación de alternativas, tasación técnica TPL y acompañamiento para proyectos de vivienda rural.",
    areaServed: {
      "@type": "Country",
      name: "Chile",
    },
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/propiedades?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(realEstateAgentSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <CommuneRibbon communesByRegion={catalogSummary.communesByRegion} />
      <TrustBar
        totalPublished={catalogSummary.totalPublished}
        communeCount={catalogSummary.communeCount}
        regionCount={catalogSummary.regionCount}
      />

      <HomeHero initialCommunes={availableCommunes} />

      {featured.length > 0 ? (
        <Section tone="raised">
          <Container>
            <h2>Propiedades destacadas</h2>
            <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
              {featured.map((card) => (
                <SearchResultCard key={card.id} card={card} />
              ))}
            </Grid>
          </Container>
        </Section>
      ) : null}

      {opportunities.length > 0 ? (
        <Section tone="canvas">
          <Container>
            <h2>Oportunidades TPL</h2>
            <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
              {opportunities.map((card) => (
                <SearchResultCard key={card.id} card={card} />
              ))}
            </Grid>
          </Container>
        </Section>
      ) : null}

      <Section tone="inverse">
        <Container>
          <h2>¿Listo para encontrar tu parcela?</h2>
          <Stack direction="row" gap={3} wrap>
            <Button href="/propiedades" variant="navy">
              Ver propiedades
            </Button>
            <Button href="/publicar" variant="secondary">
              Publicar propiedad
            </Button>
            <Button href="/cotizador" variant="ghost">
              Cotizar proyecto
            </Button>
          </Stack>
        </Container>
      </Section>
    </>
  );
}
