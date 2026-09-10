import type { ReactNode } from "react";
import { Card } from "../Card/Card";
import { PropertyImage, type PropertyImageRatio } from "../Media/PropertyImage";
import { Badge, type BadgeVariant } from "../Badge/Badge";
import { Price, Area, PropertyLocation, PropertyMeta, type PropertyMetaItem } from "../PropertyData";
import { Button } from "../Button/Button";

export interface PropertyCardBadge {
  label: string;
  variant: BadgeVariant;
}

export interface PropertyCardProps {
  /** Ruta a la ficha de la propiedad — toda la card es clickeable hacia acá. */
  href: string;
  title: string;
  location: string;
  imageSrc?: string;
  imageAlt?: string;
  imageRatio?: PropertyImageRatio;
  /** Ya formateada (ej. "5.000 m²"). */
  area?: string;
  attributes?: PropertyMetaItem[];
  /** Ya formateado (ej. "UF 3.200"). Ausente = se muestra `noPriceLabel`. */
  price?: string;
  priceSuffix?: string;
  noPriceLabel?: string;
  /** Badge de estado (ej. "Disponible" / "Reservada") — el texto y color los decide quien lo usa. */
  status?: PropertyCardBadge;
  /** Badges adicionales (ej. "Nuevo") además de estado/destacada. */
  badges?: PropertyCardBadge[];
  featured?: boolean;
  ctaLabel?: string;
  className?: string;
}

/**
 * Pieza central del catálogo. Jerarquía fija (no configurable por prop a
 * propósito, para que todas las cards del sitio se vean consistentes):
 * imagen → ubicación → título → superficie → atributos → precio → acción.
 *
 * Solo recibe datos ya resueltos vía props — no calcula precio, no decide
 * disponibilidad, no sabe de Supabase. Esa lógica vive en la capa de datos
 * que arme Fase 3/4 (ver `@tpl/core`/`@tpl/valuation-*`).
 */
export function PropertyCard({
  href,
  title,
  location,
  imageSrc,
  imageAlt,
  imageRatio = "landscape",
  area,
  attributes = [],
  price,
  priceSuffix,
  noPriceLabel = "Precio a consultar",
  status,
  badges = [],
  featured = false,
  ctaLabel = "Ver detalle",
  className,
}: PropertyCardProps) {
  const hasImageBadges = featured || Boolean(status) || badges.length > 0;
  const imageBadges: ReactNode = hasImageBadges ? (
    <>
      {featured ? <Badge variant="accent">Destacada</Badge> : null}
      {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
      {badges.map((badge) => (
        <Badge key={badge.label} variant={badge.variant}>
          {badge.label}
        </Badge>
      ))}
    </>
  ) : null;

  return (
    <Card tone={featured ? "featured" : "default"} className={className}>
      <Card.Media>
        <PropertyImage src={imageSrc} alt={imageAlt ?? title} ratio={imageRatio} overlay badge={imageBadges} />
      </Card.Media>
      <Card.Body>
        <PropertyLocation>{location}</PropertyLocation>
        <h3 className="tpl-property-card__title">
          <a className="tpl-property-card__link" href={href}>
            {title}
          </a>
        </h3>
        {area ? <Area value={area} /> : null}
        <PropertyMeta items={attributes} />
      </Card.Body>
      <Card.Footer>
        {price ? <Price value={price} suffix={priceSuffix} /> : <Price value={noPriceLabel} emphasis="secondary" />}
        <Button
          href={href}
          variant="secondary"
          size="sm"
          className="tpl-property-card__cta"
          aria-label={`${ctaLabel}: ${title}`}
        >
          {ctaLabel}
        </Button>
      </Card.Footer>
    </Card>
  );
}
