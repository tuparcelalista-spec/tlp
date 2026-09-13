import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section, Badge, Button, PropertyLocation, Stack } from "@tpl/ui";
import { getPropertyDetail } from "../../../lib/search/actions";
import { PropertyGallery } from "../../../components/property/PropertyGallery";
import { PropertyFeaturesRibbon } from "../../../components/property/PropertyFeaturesRibbon";
import { PropertyValuationCard } from "../../../components/property/PropertyValuationCard";
import { PropertySidebarCard } from "../../../components/property/PropertySidebarCard";
import { PropertyDistances } from "../../../components/property/PropertyDistances";
import {
  PropertyWeatherHeaderBadge,
  PropertyWeatherWidget,
} from "../../../components/property/PropertyWeatherWidget";
import { RelatedProperties } from "../../../components/property/RelatedProperties";
import { PropertyLocationCard } from "../../../components/property/PropertyLocationCard";
import { ScheduleVisitDialog } from "../../../components/property/ScheduleVisitDialog";
import { PropertyAiFinder } from "../../../components/property/PropertyAiFinder";
import { SITE_URL, SITE_NAME } from "../../../lib/seo/site";
import { WHATSAPP_PHONE } from "../../../lib/contact";
import { propertyPageCss } from "./propertyPage.css";

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
      <style>{propertyPageCss}</style>
      {/* `<` escapado a <: si una descripción real alguna vez contuviera "</script>", no debe poder cerrar esta etiqueta. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Container>
        {/* Encabezado Superior con Breadcrumb y Badge de Clima */}
        <div style={{ marginBottom: "16px" }}>
          <div className="tpl-prop-header-top">
            <PropertyLocation>{property.location}</PropertyLocation>
            <PropertyWeatherHeaderBadge coordinates={property.coordinates} />
          </div>
          <h1 className="tpl-prop-title">{property.title}</h1>
          <Stack direction="row" gap={2} wrap>
            {property.featured ? <Badge variant="accent">Destacada</Badge> : null}
            {property.opportunity ? <Badge variant="accent">Oportunidad TPL</Badge> : null}
            <Badge variant="neutral">Código: {property.code}</Badge>
          </Stack>
        </div>

        {/* Galería Bento Grid con Visor Modal Fullscreen */}
        <PropertyGallery images={property.gallery} title={property.title} />

        {/* Distancias a Ciudades y Servicios Esenciales */}
        <PropertyDistances coordinates={property.coordinates} commune={property.commune} />

        {/* Layout Asimétrico de 2 Columnas (65% Contenido / 35% Sidebar Sticky) */}
        <div className="tpl-property-grid">
          {/* Columna Principal */}
          <div className="tpl-main-col">
            {/* Ribbon de Características Clave (Agua, Luz, Rol, Entorno, Superficie) + Virtudes */}
            <PropertyFeaturesRibbon
              characteristics={property.rawCharacteristics}
              areaLabel={property.areaLabel}
              landAreaM2={property.landAreaM2}
              description={property.description}
            />

            {/* Acerca de esta Parcela */}
            {property.description ? (
              <section className="tpl-prop-section" aria-labelledby="descripcion-heading">
                <h2 id="descripcion-heading" className="tpl-prop-section-title">
                  Acerca de esta parcela
                </h2>
                <p className="tpl-prop-desc">{property.description}</p>
              </section>
            ) : null}

            {/* Video Cinemático Veo / TPL Studio */}
            {property.video?.url ? (
              <section className="tpl-prop-section" aria-labelledby="video-heading">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        background: "#f59e0b",
                        color: "#000",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      TPL Studio · Veo
                    </span>
                    <h2 id="video-heading" className="tpl-prop-section-title" style={{ margin: 0 }}>
                      Video Cinemático de la Parcela
                    </h2>
                  </div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>16:9 Panorámico</span>
                </div>
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

            {/* Tasación Inteligente TPL (4 Métricas + Market Track + Veredicto del Asesor) */}
            <PropertyValuationCard
              valuation={property.rawValuation}
              valuationLabels={property.valuation}
              price={property.price}
              priceLabel={property.priceLabel}
              commune={property.commune}
            />

            {/* Ubicación y Entorno (Clima detallado + Mapa Leaflet) */}
            <section className="tpl-prop-section" aria-labelledby="ubicacion-heading">
              <h2 id="ubicacion-heading" className="tpl-prop-section-title">
                Ubicación y Entorno
              </h2>
              <PropertyWeatherWidget coordinates={property.coordinates} commune={property.commune} region={property.region} />
              <PropertyLocationCard location={property.location} coordinates={property.coordinates} />
            </section>

            {/* Acciones al Pie del Contenido */}
            <section className="tpl-prop-section" aria-labelledby="contacto-heading">
              <h2 id="contacto-heading" className="tpl-prop-section-title">
                ¿Te interesa esta propiedad?
              </h2>
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

            {/* Propiedades Relacionadas */}
            <RelatedProperties
              reference={{ code: property.code, commune: property.commune, propertyType: property.type, price: property.price }}
            />
          </div>

          {/* Columna Lateral Sticky */}
          <div className="tpl-sidebar-col">
            <PropertySidebarCard
              price={property.price}
              priceLabel={property.priceLabel}
              landAreaM2={property.landAreaM2}
              communalBase={property.rawValuation?.communalAverageValue || property.rawValuation?.technicalValue}
              recommendedValue={property.rawValuation?.recommendedValue}
              propertyTitle={property.title}
              propertyCode={property.code}
              whatsappPhone={WHATSAPP_PHONE}
            />
          </div>
        </div>

        {/* Buscador Asistente IA al pie */}
        <PropertyAiFinder />
      </Container>
    </Section>
  );
}
