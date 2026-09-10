"use client";

import { useState, type CSSProperties } from "react";
import {
  Container,
  Grid,
  Stack,
  Card,
  PropertyImage,
  Badge,
  Price,
  Area,
  PropertyLocation,
  PropertyMeta,
  Stat,
  PropertyCard,
  Button,
  Input,
  Select,
  SearchBar,
  FilterChip,
  FilterGroup,
  Skeleton,
  LoadingState,
  EmptyState,
  ErrorState,
  typographyRoles,
  fontFamilies,
  fontSizes,
  lineHeights,
  letterSpacing,
  fontWeights,
  type TypographyRole,
} from "@tpl/ui";
import { ShowcaseSection, ColorSwatch } from "./ShowcaseSection";

function roleStyle(role: TypographyRole): CSSProperties {
  const def = typographyRoles[role];
  return {
    fontFamily: fontFamilies[def.family],
    fontSize: fontSizes[def.size],
    fontWeight: fontWeights[def.weight],
    lineHeight: lineHeights[def.leading],
    letterSpacing: letterSpacing[def.tracking],
    margin: 0,
  };
}

const typographySamples: { role: TypographyRole; sample: string }[] = [
  { role: "display", sample: "Tu próximo campo empieza acá" },
  { role: "headline", sample: "Parcelas verificadas en toda la zona centro-sur" },
  { role: "title", sample: "Parcela Los Aromos — 5.000 m²" },
  { role: "subtitle", sample: "Encuentra tu parcela. Después construimos contigo el proyecto completo." },
  { role: "body", sample: "Texto de cuerpo estándar para descripciones y contenido general del sitio." },
  { role: "label", sample: "Explora por zona" },
  { role: "price", sample: "UF 3.200" },
  { role: "technical", sample: "Rol de agua al día · Deslinde cercado" },
  { role: "caption", sample: "Actualizado hace 3 días" },
];

const sampleAttributes = [{ label: "Agua de pozo" }, { label: "Luz eléctrica" }, { label: "Acceso todo el año" }];

export default function DesignSystemShowcase() {
  const [filterActive, setFilterActive] = useState<string | null>("agua");
  const [searchValue, setSearchValue] = useState("");

  return (
    <Container>
      <div style={{ padding: "32px 0 8px" }}>
        <Badge variant="warning">Herramienta interna</Badge>
        <h1 style={{ fontFamily: "var(--tpl-font-display)", marginTop: 12 }}>@tpl/ui — Design System</h1>
        <p style={{ color: "var(--tpl-content-muted)", maxWidth: 640 }}>
          Página de inspección visual de Fase 2. No es una página del producto, no está enlazada desde ninguna
          navegación real y no forma parte de Fase 3 — solo sirve para revisar los componentes del sistema en un solo
          lugar, en desktop y en mobile.
        </p>
      </div>

      <ShowcaseSection title="Colores" description="Primitivos de marca. Los dos fijados por contraste AA (#a8410f, #0f7a4f) están marcados.">
        <Stack gap={4} wrap>
          <ColorSwatch name="Navy 900 (marca)" varName="--tpl-navy-900" />
          <ColorSwatch name="Navy 950" varName="--tpl-navy-950" />
          <ColorSwatch name="Navy 700" varName="--tpl-navy-700" />
          <ColorSwatch name="Orange 600 (CTA, fijado)" varName="--tpl-orange-600" />
          <ColorSwatch name="Gold 500 (acento)" varName="--tpl-gold-500" />
          <ColorSwatch name="Whatsapp (fijado)" varName="--tpl-color-whatsapp" />
          <ColorSwatch name="Teal 600" varName="--tpl-teal-600" />
          <ColorSwatch name="Success" varName="--tpl-state-success" />
          <ColorSwatch name="Warning" varName="--tpl-state-warning" />
          <ColorSwatch name="Danger" varName="--tpl-state-danger" />
          <ColorSwatch name="Info" varName="--tpl-state-info" />
        </Stack>
      </ShowcaseSection>

      <ShowcaseSection title="Tipografía" description="Roles semánticos (typographyRoles), no tamaños sueltos.">
        <Stack direction="column" gap={4}>
          {typographySamples.map(({ role, sample }) => (
            <div key={role}>
              <code style={{ fontSize: 11, color: "var(--tpl-content-muted)" }}>{role}</code>
              <p style={roleStyle(role)}>{sample}</p>
            </div>
          ))}
        </Stack>
      </ShowcaseSection>

      <ShowcaseSection title="Botones" description="Variantes, tamaños y modificadores del primitivo Button.">
        <Stack gap={3} wrap align="center">
          <Button variant="primary">Primary</Button>
          <Button variant="navy">Navy</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="gold">Gold</Button>
          <Button variant="whatsapp">Whatsapp</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="navy" pill>Pill</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </Stack>
        <div style={{ marginTop: 16, maxWidth: 320 }}>
          <Button variant="navy" block>Block</Button>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Badges" description="Vocabulario de estado — siempre sobre tokens semánticos.">
        <Stack gap={2} wrap>
          <Badge variant="success">Disponible</Badge>
          <Badge variant="warning">Reservada</Badge>
          <Badge variant="danger">No disponible</Badge>
          <Badge variant="info">Informativo</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="accent">Destacada</Badge>
        </Stack>
      </ShowcaseSection>

      <ShowcaseSection title="Primitivos de datos inmobiliarios" description="Price, Area, Location, PropertyMeta, Stat — piezas sueltas antes de verlas compuestas en PropertyCard.">
        <Stack direction="column" gap={4}>
          <Stack gap={6} align="baseline" wrap>
            <Price value="UF 3.200" emphasis="primary" />
            <Price value="desde UF 2.900" emphasis="secondary" />
            <Price value="UF 850 / mes" emphasis="technical" />
          </Stack>
          <Stack gap={6} wrap>
            <Area value="5.000 m²" label="Superficie" />
            <PropertyLocation>Pinto, Ñuble</PropertyLocation>
          </Stack>
          <PropertyMeta items={sampleAttributes} />
          <Stack gap={8} wrap>
            <Stat value="32" label="Parcelas publicadas" />
            <Stat value="14" label="Comunas disponibles" />
            <Stat value="6" label="Regiones cubiertas" />
          </Stack>
        </Stack>
      </ShowcaseSection>

      <ShowcaseSection title="Imagen inmobiliaria" description="Aspect ratios, overlay, badge sobre imagen y fallback sin foto.">
        <Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap={4}>
          <PropertyImage alt="Ejemplo landscape" ratio="landscape" overlay badge={<Badge variant="accent">Destacada</Badge>} />
          <PropertyImage alt="Ejemplo wide" ratio="wide" />
          <PropertyImage alt="Ejemplo square" ratio="square" />
          <PropertyImage alt="Sin foto todavía" ratio="landscape" />
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection
        title="Card base"
        description="Composición mínima (Card + Card.Media + Card.Body + Card.Footer) — antes de verla especializada como PropertyCard."
      >
        <div style={{ maxWidth: 360 }}>
          <Card>
            <Card.Media>
              <PropertyImage alt="Ejemplo" ratio="wide" />
            </Card.Media>
            <Card.Body>
              <p style={{ margin: 0, fontWeight: 700 }}>Título de la card</p>
              <p style={{ margin: 0, color: "var(--tpl-content-muted)", fontSize: "var(--tpl-text-sm)" }}>
                Contenido genérico compuesto con los mismos bloques que usa PropertyCard.
              </p>
            </Card.Body>
            <Card.Footer>
              <span style={{ fontSize: "var(--tpl-text-sm)", color: "var(--tpl-content-muted)" }}>Pie</span>
              <Button variant="secondary" size="sm">Acción</Button>
            </Card.Footer>
          </Card>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="PropertyCard"
        description="Jerarquía fija: imagen → ubicación → título → superficie → atributos → precio → acción. Datos de ejemplo, no reales."
      >
        <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap={6}>
          <PropertyCard
            href="#"
            title="Parcela Los Aromos, sector cordillera"
            location="Pinto, Ñuble"
            area="5.000 m²"
            attributes={sampleAttributes}
            price="UF 3.200"
            status={{ label: "Disponible", variant: "success" }}
            ctaLabel="Ver detalle"
          />
          <PropertyCard
            href="#"
            title="Parcela con vista al valle y acceso pavimentado durante todo el año, ideal para segunda vivienda"
            location="San José de Maipo"
            area="1,2 ha"
            attributes={[{ label: "Con casa" }, { label: "Piscina natural" }]}
            price="UF 5.800"
            featured
            badges={[{ label: "Nuevo", variant: "accent" }]}
            ctaLabel="Ver detalle"
          />
          <PropertyCard href="#" title="Parcela sin fotos todavía" location="Colbún, Maule" status={{ label: "Reservada", variant: "warning" }} ctaLabel="Ver detalle" />
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Formulario y búsqueda" description="Solo capa visual — sin lógica de catálogo conectada.">
        <Stack direction="column" gap={5} style={{ maxWidth: 480 }}>
          <SearchBar value={searchValue} onChange={setSearchValue} onSubmit={() => undefined} />
          <Input placeholder="Nombre de contacto" />
          <Input placeholder="Con error" invalid aria-describedby="input-error" />
          <Select defaultValue="">
            <option value="" disabled>
              Selecciona una comuna
            </option>
            <option value="pinto">Pinto</option>
            <option value="colbun">Colbún</option>
          </Select>
          <FilterGroup label="Características">
            <FilterChip label="Con agua" active={filterActive === "agua"} onClick={() => setFilterActive(filterActive === "agua" ? null : "agua")} />
            <FilterChip label="Con luz" active={filterActive === "luz"} onClick={() => setFilterActive(filterActive === "luz" ? null : "luz")} />
            <FilterChip label="Con casa" active={filterActive === "casa"} onClick={() => setFilterActive(filterActive === "casa" ? null : "casa")} />
          </FilterGroup>
        </Stack>
      </ShowcaseSection>

      <ShowcaseSection title="Estados" description="Loading/Skeleton/Empty/Error — capa visual, sin fetching real conectado.">
        <Stack direction="column" gap={6}>
          <LoadingState />
          <Stack gap={3} align="center">
            <Skeleton width="64px" height="64px" radius="var(--tpl-radius-md)" />
            <Stack direction="column" gap={2} style={{ flex: 1 }}>
              <Skeleton height="14px" width="60%" />
              <Skeleton height="12px" width="40%" />
            </Stack>
          </Stack>
          <EmptyState title="Sin resultados para esta comuna" description="Prueba ampliando el radio de búsqueda." />
          <ErrorState description="No pudimos cargar el catálogo. Intenta de nuevo." action={<Button variant="secondary" size="sm">Reintentar</Button>} />
        </Stack>
      </ShowcaseSection>

      <div style={{ padding: "24px 0 60px", color: "var(--tpl-content-muted)", fontSize: "var(--tpl-text-sm)" }}>
        Responsive: reduce el ancho de la ventana — las grillas de arriba pasan de 3-4 columnas a 1 (mobile ≤480px),
        el header/menú móvil se prueban en <code>/</code>.
      </div>
    </Container>
  );
}
