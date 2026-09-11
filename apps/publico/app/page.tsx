import { Container, Section, Grid, Button, Stack } from "@tpl/ui";
import { SearchWidgetServer } from "../components/search";
import { getFeaturedProperties, getOpportunityProperties, getHomeCatalogSummary } from "../lib/search/actions";
import { SearchResultCard } from "../components/search/SearchResultCard";
import { CommuneRibbon } from "../components/home/CommuneRibbon";
import { TrustBar } from "../components/home/TrustBar";

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
export default async function Home() {
  const [featured, opportunities, catalogSummary] = await Promise.all([
    getFeaturedProperties(6),
    getOpportunityProperties(6),
    getHomeCatalogSummary(),
  ]);

  return (
    <>
      <CommuneRibbon communesByRegion={catalogSummary.communesByRegion} />
      <TrustBar
        totalPublished={catalogSummary.totalPublished}
        communeCount={catalogSummary.communeCount}
        regionCount={catalogSummary.regionCount}
      />

      <Section tone="canvas">
        <Container>
          <h1>En tu proyecto de campo te acompañamos.</h1>
          <p>Libertad, inversión y tranquilidad — busca la parcela o el campo que necesitas, con datos reales y sin sorpresas.</p>
          <SearchWidgetServer />
        </Container>
      </Section>

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
            {/* Placeholders intencionales — Business/Publisher no forman parte de esta misión (Fase 3, solo catálogo público). */}
            <Button href="#publicar" variant="secondary">
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
