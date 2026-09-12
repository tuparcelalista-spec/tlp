import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section, Badge, Button, Area, PropertyLocation, Stat, Stack } from "@tpl/ui";
import { getPropertyDetail } from "../../../lib/search/actions";
import { PropertyGallery } from "../../../components/property/PropertyGallery";
import { RelatedProperties } from "../../../components/property/RelatedProperties";
import { PropertyLocationCard } from "../../../components/property/PropertyLocationCard";
import { ScheduleVisitDialog } from "../../../components/property/ScheduleVisitDialog";
import { SITE_URL, SITE_NAME } from "../../../lib/seo/site";
import { WHATSAPP_PHONE } from "../../../lib/contact";

/**
 * `/cotizador` ya existe en `apps/publico` (creado fuera de esta tarea,
 * verificado leyendo `app/cotizador/page.tsx`: lee `searchParams.parcelaId`
 * y lo pasa como `preselectedParcelCode`) — no se creó ninguna ruta nueva
 * acá, solo se enlaza a la que ya está real y funcionando (`GET
 * /cotizador?parcelaId=...` responde 200). No se toca ese archivo.
 */
function cotizadorHref(codigo: string): string {
  return `/cotizador?parcelaId=${encodeURIComponent(codigo)}`;
}

interface PageParams {
  codigo: string;
}

/**
 * Ficha de detalle — Fase 3.2/3.4. `getPropertyDetail()` (Server Action,
 * Bloque 1.3 `PropertyRepository.getByCode()` + Bloque 2.6 resolver de
 * imágenes) es la única fuente de datos — sin `select('*')`, sin
 * `service_role`, sin `casas.js`, sin fallback a un catálogo local.
 *
 * Nota de performance (documentada, no resuelta en este bloque):
 * `generateMetadata` y el componente de página llaman ambos a
 * `getPropertyDetail(codigo)`. Supabase-js usa `fetch()` internamente, que
 * Next.js memoiza automáticamente por request dentro del mismo render —
 * en teoría esto ya evita la consulta duplicada, pero no se verificó de
 * forma explícita en este bloque. Si se confirma que sí duplica, la
 * solución estándar es envolver `getPropertyDetail` con `React.cache()`.
 */
/**
 * Fase 3.15 — auditoría QA. `params.codigo` puede llegar todavía
 * percent-encoded (confirmado con logging real: para el código real
 * "venega_ñipas" el segmento de ruta llegaba tal cual como el string
 * "venega_%C3%B1ipas", no decodificado) — `getByCode()` comparaba esa
 * cadena cruda contra `codigo` en Supabase, nunca encontraba coincidencia
 * y la página devolvía 404 para cualquier código con caracteres no-ASCII.
 * `decodeURIComponent` es un no-op seguro para códigos que ya vienen
 * decodificados (el caso común, sin caracteres especiales).
 */
function decodeCodigo(codigo: string): string {
  try {
    return decodeURIComponent(codigo);
  } catch {
    return codigo;
  }
}

async function loadProperty(codigo: string) {
  return getPropertyDetail(decodeCodigo(codigo));
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { codigo } = await params;
  const property = await loadProperty(codigo);
  if (!property) return { title: "Propiedad no encontrada" };

  const description = property.description
    ? property.description.slice(0, 160)
    : `${property.title} en ${property.location}${property.areaLabel ? `, ${property.areaLabel}` : ""}.`;
  const canonical = `${SITE_URL}/propiedades/${property.code}`;

  return {
    title: property.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${property.title} | ${SITE_NAME}`,
      description,
      url: canonical,
      type: "website",
      images: property.coverImageUrl ? [{ url: property.coverImageUrl }] : undefined,
    },
    twitter: { card: "summary_large_image", title: property.title, description },
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<PageParams> }) {
  const { codigo } = await params;
  const property = await loadProperty(codigo);
  if (!property) notFound();

  const whatsappMessage = encodeURIComponent(`Hola, quiero más información sobre "${property.title}" (código ${property.code}).`);
  const hasValuation = property.valuation.technicalValueLabel || property.valuation.communalAverageValueLabel || property.valuation.recommendedValueLabel;

  /**
   * P1-07 — Datos estructurados schema.org para buscadores:
   * Se utiliza `RealEstateListing` (paridad con el legacy `frontend-v2/js/tpl-seo.js`)
   * enriquecido con `PostalAddress` (`comuna`, `region`, `CL`) y `Offer` (`price`, `currency`, `InStock`).
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description || undefined,
    url: `${SITE_URL}/propiedades/${encodeURIComponent(property.code)}`,
    image: property.gallery.map((img) => img.url).filter((url): url is string => Boolean(url)),
    address: {
      "@type": "PostalAddress",
      addressLocality: property.commune || undefined,
      addressRegion: property.region || undefined,
      addressCountry: "CL",
    },
    ...(property.price !== null
      ? {
          offers: {
            "@type": "Offer",
            price: property.price,
            priceCurrency: property.currency,
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/propiedades/${encodeURIComponent(property.code)}`,
          },
        }
      : {}),
  };

  return (
    <Section tone="canvas">
      {/* `<` escapado a <: si una descripción real alguna vez contuviera "</script>", no debe poder cerrar esta etiqueta. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Container>
        <Stack direction="column" gap={2}>
          <PropertyLocation>{property.location}</PropertyLocation>
          <h1>{property.title}</h1>
          <Stack direction="row" gap={2} wrap>
            {property.featured ? <Badge variant="accent">Destacada</Badge> : null}
            {property.opportunity ? <Badge variant="accent">Oportunidad TPL</Badge> : null}
            <Badge variant="neutral">Código: {property.code}</Badge>
          </Stack>
        </Stack>

        <PropertyGallery images={property.gallery} title={property.title} />

        <Stack direction="row" gap={6} wrap>
          {property.areaLabel ? <Area value={property.areaLabel} label="Superficie del terreno" /> : null}
          {property.builtAreaLabel ? <Area value={property.builtAreaLabel} label="Superficie construida" /> : null}
          {property.priceLabel ? <Stat value={property.priceLabel} label="Precio publicado" /> : null}
        </Stack>

        {property.description ? (
          <section aria-labelledby="descripcion-heading">
            <h2 id="descripcion-heading">Descripción</h2>
            <p>{property.description}</p>
          </section>
        ) : null}

        {property.characteristics.length > 0 ? (
          <section aria-labelledby="caracteristicas-heading">
            <h2 id="caracteristicas-heading">Características</h2>
            <ul>
              {property.characteristics.map((item) => (
                <li key={item.label}>{item.label}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasValuation ? (
          <section aria-labelledby="valoracion-heading">
            <h2 id="valoracion-heading">Valoración TPL</h2>
            <Stack direction="row" gap={6} wrap>
              {property.valuation.technicalValueLabel ? <Stat value={property.valuation.technicalValueLabel} label="Valor TPL Técnico" /> : null}
              {property.valuation.communalAverageValueLabel ? (
                <Stat value={property.valuation.communalAverageValueLabel} label="Valor TPL Promedio Comunal" />
              ) : null}
              {property.valuation.recommendedValueLabel ? (
                <Stat value={property.valuation.recommendedValueLabel} label="Valor TPL Recomendado" />
              ) : null}
            </Stack>
          </section>
        ) : null}

        {property.video?.url ? (
          <section aria-labelledby="video-heading">
            <h2 id="video-heading">Video de la Parcela</h2>
            <div
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                background: "#0f172a",
                maxWidth: "850px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              }}
            >
              <video
                controls
                playsInline
                preload="metadata"
                poster={property.video.thumbnailUrl || undefined}
                style={{ width: "100%", maxHeight: "500px", display: "block" }}
              >
                <source src={property.video.url} type="video/mp4" />
                Tu navegador no soporta la reproducción de video HTML5.
              </video>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="ubicacion-heading">
          <h2 id="ubicacion-heading">Ubicación</h2>
          {/*
            Sin Leaflet ni ninguna librería de mapas nueva (regla vigente:
            eso requiere aprobación explícita aparte) — `PropertyLocationCard`
            es un componente limpio con link real a Google Maps.
            `property.coordinates`/`distanceKm` (Search Core, @tpl/core)
            siguen disponibles para cuando se apruebe un mapa embebido.
          */}
          <PropertyLocationCard location={property.location} coordinates={property.coordinates} />
        </section>

        <section aria-labelledby="contacto-heading">
          <h2 id="contacto-heading">¿Te interesa esta propiedad?</h2>
          <Stack direction="row" gap={3} wrap>
            <Button href={`https://wa.me/${WHATSAPP_PHONE}?text=${whatsappMessage}`} variant="whatsapp">
              Consultar por WhatsApp
            </Button>
            <Button
              href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                `Hola, me interesa hacer una oferta por "${property.title}" (código ${property.code}). ¿Podemos conversar?`,
              )}`}
              variant="secondary"
            >
              Hacer una oferta
            </Button>
            <ScheduleVisitDialog propertyTitle={property.title} propertyCode={property.code} whatsappPhone={WHATSAPP_PHONE} />
            <Button href={cotizadorHref(property.code)} variant="gold">
              Cotizar casa en esta parcela
            </Button>
          </Stack>
        </section>

        <RelatedProperties
          reference={{ code: property.code, commune: property.commune, propertyType: property.type, price: property.price }}
        />
      </Container>
    </Section>
  );
}
