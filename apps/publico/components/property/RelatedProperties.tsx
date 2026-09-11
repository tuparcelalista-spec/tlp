import { Grid } from "@tpl/ui";
import { getRelatedProperties, type RelatedPropertiesReference } from "../../lib/search/actions";
import { SearchResultCard } from "../search/SearchResultCard";

/**
 * Fase 3.5 — Server Component (hace su propio fetch server-side, sin
 * pasar por el Client Component del buscador). Regla conservadora
 * documentada en `getRelatedProperties()` — no hay algoritmo nuevo aquí,
 * solo reutiliza `searchProperties()` con filtros ya existentes.
 */
export async function RelatedProperties({ reference }: { reference: RelatedPropertiesReference }) {
  const related = await getRelatedProperties(reference, 6);
  if (related.length === 0) return null;

  return (
    <section aria-labelledby="propiedades-relacionadas-heading">
      <h2 id="propiedades-relacionadas-heading">Propiedades relacionadas</h2>
      <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
        {related.map((card) => (
          <SearchResultCard key={card.id} card={card} />
        ))}
      </Grid>
    </section>
  );
}
