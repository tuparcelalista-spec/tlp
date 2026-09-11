import { PropertyCard, Badge, Area, Stat, type PropertyCardBadge } from "@tpl/ui";
import type { PropertyCardViewModel, ProjectCombinationViewModel } from "../../lib/search/presentation";

/**
 * Traduce `PropertyCardViewModel` (Bloque 2.3) → props de `PropertyCard`
 * de `@tpl/ui` (Fase 2). No recalcula NADA — todos los valores ya vienen
 * resueltos del adapter de presentación; esta función solo redistribuye
 * campos ya formateados a los nombres de prop que `PropertyCard` espera.
 */
export function SearchResultCard({ card, priority = false }: { card: PropertyCardViewModel; priority?: boolean }) {
  const badges: PropertyCardBadge[] = [];
  if (card.opportunity) badges.push({ label: "Oportunidad TPL", variant: "accent" });

  return (
    <PropertyCard
      href={card.href}
      title={card.title}
      location={card.distanceKm !== undefined ? `${card.location} · a ${Math.round(card.distanceKm)} km` : card.location}
      imageSrc={card.imageSrc}
      imageAlt={card.imageAlt}
      imageRatio="landscape"
      area={card.areaLabel}
      attributes={card.attributes}
      price={card.priceLabel}
      noPriceLabel="Precio a consultar"
      badges={badges}
      featured={card.featured}
      ctaLabel="Ver propiedad"
    />
  );
}

/**
 * Modo "project": no existe una `ProjectCard` en `@tpl/ui` todavía (Fase 2
 * no la construyó — el combo terreno+casa es una función nueva de Fase 3).
 * Se compone con los mismos primitivos ya auditados (`PropertyCard.Media`
 * no aplica aquí, así que se arma con `Badge`/`Area`/`Stat`, que sí son de
 * `@tpl/ui`) en vez de crear una segunda tarjeta de propiedad desde cero.
 */
export function SearchProjectCombinationCard({ combination }: { combination: ProjectCombinationViewModel }) {
  return (
    <div className="tpl-search-project-card">
      <div className="tpl-search-project-card__section">
        <span className="tpl-search-project-card__label">Parcela</span>
        <strong>{combination.property.title}</strong>
        <span>{combination.property.location}</span>
        {combination.property.areaLabel ? <Area value={combination.property.areaLabel} /> : null}
        {combination.property.priceLabel ? <Stat value={combination.property.priceLabel} label="Precio parcela" /> : null}
      </div>
      <div className="tpl-search-project-card__section">
        <span className="tpl-search-project-card__label">Casa</span>
        <strong>{combination.houseName}</strong>
        {combination.houseAreaLabel ? <Area value={combination.houseAreaLabel} /> : null}
        {combination.houseRoomsLabel ? <span>{combination.houseRoomsLabel}</span> : null}
      </div>
      <div className="tpl-search-project-card__total">
        <span>Total proyecto</span>
        <Badge variant="accent">{combination.totalPriceLabel ?? "Consultar"}</Badge>
      </div>
    </div>
  );
}
