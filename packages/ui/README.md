# @tpl/ui

Design system compartido de Tu Parcela Lista — la base del sistema visual de
la próxima generación de TPL (Next.js). No es una copia 1:1 de
`frontend-v2/css` y `frontend-v2/js` en componentes React, ni una migración
visual: son las piezas reutilizables que Fase 3 en adelante va a componer
para construir producto inmobiliario premium.

`frontend-v2` sigue siendo la **referencia** de identidad, colores, contenido
y comportamiento probado — nunca la plantilla a copiar tal cual.

**Este documento es el contrato de trabajo del paquete.** Cualquier persona
o agente que agregue un componente nuevo debería poder leer esto y saber:
qué ya existe, cómo se compone, y qué no se debe hacer.

## Cómo inspeccionar el sistema

```
apps/publico → /design-system
```

Página de inspección visual interna (Fase 2). **No es una página del
producto**: no está enlazada desde ninguna navegación real, tiene
`robots: noindex`, y no cuenta como parte de Fase 3. Muestra colores,
tipografía, botones, cards, PropertyCard, badges, imágenes, formularios,
filtros y estados en un solo lugar, para revisar el sistema sin tener que
mirar código.

## Arquitectura

```
src/
  tokens/              Fuente única de verdad de diseño
    colors.ts             primitivos de marca + capa semántica (rol, no valor)
    typography.ts          familias, escala, pesos + ROLES (display/price/label/...)
    layout.ts                espaciado, breakpoints con nombre, contenedor, alturas de cromo
    effects.ts                radios, sombras, motion, z-index, focus ring
    index.ts                  combina todo en `tplTokensCss` (custom properties de :root)
  styles/
    foundation.ts          reset mínimo + fondo/color de body + foco + reduced-motion
    GlobalStyles.tsx      <TplDesignSystemStyles/> — se renderiza UNA vez en el layout raíz
  components/
    Container/              ancho máximo centrado (lo componen Header/Footer/Section)
    Section/                  ritmo vertical + tono de fondo
    Stack/, Grid/             utilidades de flex/grid responsive
    Card/                      base composable: Card + Card.Media + Card.Body + Card.Footer
    Media/                     PropertyImage — aspect-ratio, overlay, badge, fallback
    Badge/                     vocabulario de estado sobre tokens semánticos
    PropertyData/            Price, Area, PropertyLocation, PropertyMeta, Stat
    PropertyCard/            compone todo lo anterior con jerarquía fija
    Button/                    variantes portadas de `.tpl-btn`
    Input/, Select/            controles de formulario escopados (no estilan el selector global)
    SearchBar/                composición visual de Input+Button, sin lógica de catálogo
    Filter/                     FilterChip, FilterGroup
    States/                     Skeleton, LoadingState, EmptyState, ErrorState
    Header/, Footer/           chrome del sitio público
  types.ts               tipos compartidos entre componentes (TplNavLink, ...)
  isCurrentPath.ts       equivalente sin DOM de markCurrentPage() de tpl-shell.js
```

**Regla de dependencia:** un componente nunca declara un color/tamaño/sombra
"a mano" — siempre consume un token. Un componente nunca lee
`window`/`document` fuera de un efecto explícito (SSR-safe). Un componente
de `@tpl/ui` no sabe de Supabase, no calcula precios ni disponibilidad —
todo dato de negocio entra por props ya resuelto.

## Tokens

Tres capas:

1. **Primitivos** (`colorPrimitives`, `fontSizes`, `space`, `radii`, `shadows`...): valores tal como existen hoy en `tpl-foundation.css`. Se conservan literales, incluyendo los dos colores fijados por contraste AA (`#a8410f` naranjo CTA, `#0f7a4f` whatsapp) — no se inventa paleta nueva.
2. **Semánticos** (`--tpl-color-cta`, `--tpl-surface-canvas`, `--tpl-content-primary`...): nombran un ROL, no un valor. Un rediseño de marca futuro cambia un lugar, no cada componente.
3. **Roles de componente** (`typographyRoles.price`, `.tpl-btn--primary`, `.tpl-badge--success`...): combinan las capas anteriores para un uso concreto.

Todo se inyecta una vez por app como custom properties de CSS vía `<TplDesignSystemStyles />` en el layout raíz — reemplazo directo del `<link rel="stylesheet" href="tpl-foundation.css">` de frontend-v2.

## Tipografía

`typographyRoles` nombra el USO, no el tamaño: `display` (titular editorial), `headline`, `title` (nombre de propiedad), `subtitle`, `body`, `bodySmall`, `label`/`eyebrow`, **`price`** (cifra destacada, familia numérica), `technical` (specs/m²/UF), `caption`. Se mantiene el par tipográfico actual (Lora editorial + Inter UI) porque ya transmite "inmobiliaria premium" — el salto de calidad es tener roles documentados y consistentes, no cambiar la fuente.

## Cards — cómo componer, no cuándo crear un componente nuevo

`Card` es la única base. **No existe (ni debería existir) un componente por
tipo de listado.** Para construir una card de proyecto/casa/partner/contenido
nueva:

```tsx
<Card tone={featured ? "featured" : "default"}>
  <Card.Media>
    <PropertyImage src={...} alt={...} ratio="landscape" overlay badge={<Badge variant="accent">...</Badge>} />
  </Card.Media>
  <Card.Body>
    <PropertyLocation>...</PropertyLocation>
    <h3>...</h3>
    <Area value="..." />
    <PropertyMeta items={[...]} />
  </Card.Body>
  <Card.Footer>
    <Price value="..." />
    <Button href={...} variant="secondary" size="sm">Ver detalle</Button>
  </Card.Footer>
</Card>
```

`PropertyCard` es exactamente esta composición ya armada para el caso de
parcela/propiedad, con la jerarquía fija **imagen → ubicación → título →
superficie → atributos → precio → acción** (no es configurable por prop a
propósito: todas las cards del catálogo deben verse consistentes). Antes de
crear `ProjectCard`/`HouseCard`/`PartnerCard`, evaluá si de verdad necesitan
una jerarquía distinta o si alcanza con `PropertyCard` + props distintos.

**Patrón de card clickeable accesible:** el título es el único `<a>` real
(el lector de pantalla anuncia el nombre de la propiedad, no "enlace"),
estirado sobre toda la card vía `::after`. El botón del footer queda por
encima en z-index para seguir siendo clickeable aparte. Replicar este
patrón (no envolver toda la card en un `<a>`) si se arma una card nueva.

## Sistema de imágenes

`PropertyImage` es el único patrón de imagen inmobiliaria: `ratio`
(landscape 4:3 por defecto, wide 16:9, square, portrait) fija el
aspect-ratio para que fotos de proporciones distintas no rompan una grilla;
`object-fit: cover` recorta consistente; sin `src` muestra un placeholder
(nunca un ícono de imagen rota); `overlay` da legibilidad a badges/texto
sobre la foto; `badge` es un slot posicionado arriba-izquierda. Una galería
de múltiples fotos (ficha de propiedad, Fase 4) es un componente futuro que
debería componer este mismo primitivo, no reinventar el aspect-ratio/fallback.

## Componentes implementados

| Componente | Qué es | Nota |
|---|---|---|
| `Button` | Primitivo de acción | Portado de `.tpl-btn` — ya era el único sistema de variantes bien diseñado del CSS anterior |
| `Header`, `MobileMenu`, `Footer` | Chrome del sitio público | Ver Fase 2 (hito anterior) |
| `Container`, `Section`, `Stack`, `Grid` | Layout | `Grid` decide columnas por breakpoint (mobile/tablet/desktop), no "desktop que se achica" |
| `Card` | Base composable | Ver §Cards |
| `PropertyImage` | Imagen inmobiliaria | Ver §Sistema de imágenes |
| `Badge` | Vocabulario de estado | Variantes: success/warning/danger/info/neutral/accent, siempre semánticas |
| `Price`, `Area`, `PropertyLocation`, `PropertyMeta`, `Stat` | Datos inmobiliarios | Solo presentación — reciben valores ya formateados, no calculan nada. `PropertyLocation` (no `Location`) para no sombrear el global del DOM |
| `PropertyCard` | Card de propiedad | Ver §Cards |
| `Input`, `Select` | Controles de formulario | Clases escopadas (`.tpl-input`/`.tpl-select`), a diferencia del CSS anterior que estilaba el selector `input`/`select` global |
| `SearchBar` | Buscador (solo visual) | Sin lógica de catálogo — Fase 3 conecta `value`/`onChange`/`onSubmit` reales |
| `FilterChip`, `FilterGroup` | Filtros (solo visual) | Sin estado de filtrado real conectado |
| `Skeleton`, `LoadingState`, `EmptyState`, `ErrorState` | Estados | Capa visual — sin fetching; pensados para cuando los datos vengan de Supabase |

## Qué NO hacer

- No crear un componente de card nuevo sin antes intentar componer `Card` + primitivos existentes.
- No calcular ni formatear precios/superficies dentro de `@tpl/ui` — reciben el valor ya resuelto.
- No conectar `SearchBar`/`FilterChip`/estados a datos reales todavía — eso es Fase 3/4.
- No usar un color/tamaño/sombra fuera de `tokens/` "solo por esta vez".
- No hacer un componente dependiente de `window`/`document` fuera de un `useEffect` (rompe SSR).
- No envolver una card completa en un `<a>` — usar el patrón de link estirado (ver §Cards).
- No agregar la página de showcase (`apps/publico/app/design-system`) a ninguna navegación real ni quitarle `noindex`.
- No traer una librería de UI completa (Radix, MUI, shadcn, etc.) mientras los primitivos propios alcancen — evaluarlo explícitamente si algún día no alcanzan (ej. `Modal`/`Drawer` con manejo de foco complejo).

## Roadmap (arquitectura preparada, no implementado todavía)

- **Overlay:** `Modal`, `Drawer`, `Tabs` — `--tpl-z-modal`/`--tpl-z-toast` ya reservados en `tokens/effects.ts`.
- **Galería de imágenes:** múltiples fotos por propiedad, componiendo `PropertyImage`. Necesita fotos reales para no improvisarse (Fase 4, ficha de parcela).
- **Alert:** feedback inline de formulario — hoy `EmptyState`/`ErrorState` cubren el caso de "sección vacía", falta el caso "mensaje corto tipo toast/inline".
- **Icon wrapper:** hoy cada SVG (Header, Footer, PropertyData, States) se escribe inline sin una convención compartida de tamaño/stroke — vale la pena un wrapper cuando haya 15-20 íconos distintos, no antes.
- **Variantes de card especializadas** (`ProjectCard`, `HouseCard`, `PartnerCard`) — solo si `PropertyCard` con props distintos no alcanza (ver §Cards).

## Deuda técnica conocida

- El CSS se inyecta como string de JS vía `<style>` (no `.css`/CSS Modules reales), porque `@tpl/ui` no tiene paso de build propio. Es una decisión pragmática de "cero configuración" (evita `transpilePackages` en cada app consumidora), no la forma final.
- `GlobalStyles.tsx` conoce a mano cada componente. Con ~20 componentes ya es el límite razonable de "agregarlo a mano" — el próximo componente nuevo debería evaluar si toca que cada uno inyecte su propio `<style>` co-ubicado.
- No se portó el reset tipográfico global (`h1`-`h6` con estilos de foundation.css), ni `.tpl-skip-link` — no hay una página real todavía que los necesite.
- `Stack`/`Grid` usan `style` en línea para las combinaciones de gap/columnas en vez de clases — deliberado (demasiadas combinaciones para justificar una clase por cada una), pero significa que no son inspeccionables solo por nombre de clase en devtools.

## Accesibilidad

Foco visible (`:focus-visible`, con variante dorada sobre `.tpl-footer`),
`prefers-reduced-motion` respetado (animaciones/transiciones se apagan,
excepto el spinner de `LoadingState`, que es funcional no decorativo),
botones y roles semánticos (`role="search"`, `role="status"`,
`aria-pressed`, `aria-current`, `aria-expanded`), contraste AA en los
colores de marca fijados. Pendiente: auditoría de contraste de los colores
nuevos agregados en Fase 2 (ninguno reemplaza los fijados, pero no se
verificó contraste AA de cada combinación badge/fondo uno por uno).
