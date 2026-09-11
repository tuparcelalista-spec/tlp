import type {
  Property,
  PropertyCharacteristics,
  PropertyImage,
  PropertySubtype,
  PropertyType,
  PropertyValuation,
  PropertyVideo,
} from "./property";

/**
 * Fila cruda de `tpl_propiedad_imagenes` — solo las columnas relevantes
 * para el contrato público (`metadata`/`created_at`/`id`/`propiedad_id` de
 * esa tabla se omiten a propósito, no aportan a `PropertyImage`).
 */
export interface RawPropertyImageInput {
  url?: string | null;
  storage_path?: string | null;
  alt?: string | null;
  orden?: number | null;
  es_portada?: boolean | null;
}

/**
 * Fila cruda de `tpl_propiedad_videos` — solo las columnas de exhibición
 * pública. El resto de esa tabla (`prompt_utilizado`, `veo_operation_name`,
 * `estado_generacion`, `error_mensaje`, `creado_por_actor_id`, etc.) es de
 * administración de generación por IA y se omite a propósito: no forma
 * parte del contrato público `Property`.
 *
 * Quien llame a `normalizeProperty()` es responsable de resolver el gate
 * `publicado_en_parcela = true` ANTES de pasar el video — esta función no
 * consulta Supabase ni decide visibilidad, solo mapea lo que recibe.
 */
export interface RawPropertyVideoInput {
  video_url?: string | null;
  thumbnail_url?: string | null;
  titulo?: string | null;
}

/**
 * Fila cruda de `tpl_propiedades` + relaciones ya resueltas por el
 * llamador (`imagenes`, `video`) — es la entrada de `normalizeProperty()`,
 * NO una consulta. Basada estrictamente en las columnas reales auditadas
 * contra producción (`hwyscirbycojwndyzozn`, 2026-09-10).
 *
 * Deliberadamente EXCLUIDAS (columnas reales de `tpl_propiedades` que
 * existen pero son administrativas/CRM, sin relación con el contrato
 * público `Property` — ver Bloque 1.2, regla 1): `ai_analisis`,
 * `analisis_territorial_actual_id`, `clase_activo`, `completitud_pct`,
 * `contacto_publico_actor_id`, `contacto_publico_modo`, `corredor_actor_id`,
 * `corredor_asignado`, `created_at`, `modelo_negocio`, `nombre_comercial`,
 * `plan_codigo`, `propietario_actor_id`, `publicacion_id`,
 * `reservada_hasta`, `reservada_orden_id`, `salud_anuncio_pct`,
 * `version_actual`, `vendida_at`, `cercanias`, `cercanias_calculadas_at`,
 * `direccion_referencia`, `distancia_ruta_principal_km`, `diagnostico`
 * (columna real pero vacía en el 100% de las filas auditadas).
 */
export interface RawPropertyInput {
  // Identidad
  id: string;
  codigo?: string | null;

  // Clasificación
  tipo?: string | null;
  subtipo?: string | null;

  // Publicación
  estado?: string | null;
  destacada?: boolean | null;
  oportunidad_tpl?: boolean | null;
  publicada_at?: string | null;

  // Contenido
  titulo?: string | null;
  descripcion?: string | null;

  // Precio
  precio_publicado?: number | null;
  moneda?: string | null;

  // Ubicación
  region?: string | null;
  comuna?: string | null;
  sector?: string | null;
  lat?: number | null;
  lng?: number | null;

  // Superficie
  superficie_m2?: number | null;

  // Características (12 columnas estructuradas reales)
  rol_situacion?: string | null;
  electricidad?: string | null;
  agua?: string | null;
  acceso?: string | null;
  topografia?: string | null;
  suelo?: string | null;
  exposicion?: string | null;
  vista_principal?: string | null;
  vegetacion?: string | null;
  cierre_perimetral?: string | null;
  porton?: string | null;
  condominio?: boolean | null;
  atributos_naturales?: unknown;

  // Extensión (jsonb real; forma interna variable, ver casa_datos real auditado)
  casa_datos?: Record<string, unknown> | null;

  // Metadata (jsonb real; verificado que a veces llega sin parsear como string)
  metadata?: Record<string, unknown> | string | null;

  // Relaciones ya resueltas por el llamador — normalizeProperty no consulta nada
  imagenes?: RawPropertyImageInput[] | null;
  video?: RawPropertyVideoInput | null;
}

// ---------------------------------------------------------------------------
// Helpers internos (no exportados) — cada uno hace UNA sola cosa defensiva.
// ---------------------------------------------------------------------------

const VALID_PROPERTY_TYPES: readonly PropertyType[] = ["parcela", "casa"];

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * `metadata` verificado en producción como objeto en la mayoría de los
 * casos, pero el código legacy (`tpl-property-view.js`) defiende contra que
 * llegue como string sin parsear — se conserva la misma defensa aquí.
 */
function parseMetadata(raw: RawPropertyInput["metadata"]): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return raw;
}

/**
 * `tpl_propiedades.tipo` solo tiene dos valores reales verificados
 * (`'parcela'`, `'casa'`). Un valor ausente o distinto se normaliza a
 * `'parcela'` — es el caso ampliamente mayoritario en datos reales (32 de
 * 33 filas auditadas) y evita que un dato inesperado rompa el contrato.
 * No se inventa un tercer valor de `PropertyType`.
 */
function normalizePropertyType(value: unknown): PropertyType {
  return VALID_PROPERTY_TYPES.includes(value as PropertyType) ? (value as PropertyType) : "parcela";
}

/**
 * Regla aprobada (Bloque 1.2): `subtype` se mantiene SIEMPRE en `null` en
 * esta fase — la auditoría confirmó que `tpl_propiedades.subtipo` está en
 * `null` en el 100% de las filas reales; no hay datos confiables todavía
 * para poblarlo, y esta función no migra ni corrige datos históricos.
 */
function normalizeSubtype(_raw: RawPropertyInput): PropertySubtype | null {
  return null;
}

/**
 * Señal AUXILIAR, no oficial (ver JSDoc de `Property.hasHouse`). Regla
 * aprobada: `tipo === 'casa'` OR `casa_datos` con contenido. Nunca decide
 * `subtype`.
 */
function deriveHasHouse(raw: RawPropertyInput): boolean {
  const hasCasaDatos = Boolean(raw.casa_datos && Object.keys(raw.casa_datos).length > 0);
  return raw.tipo === "casa" || hasCasaDatos;
}

/**
 * Precedencia aprobada (Bloque 1.2, regla 7). `asFiniteNumber` se aplica a
 * CADA clave antes de encadenar con `??` — es la única forma type-safe de
 * leer un valor `unknown` de `metadata` sin perder la precedencia: si una
 * clave existe pero no es un número finito, se trata como ausente y se
 * prueba la siguiente, en vez de detener la cadena en un valor inválido.
 * La clave que gana cuando SÍ hay un número válido es exactamente la que
 * especifica la regla aprobada — no se reordena ni se inventa nada.
 */
function normalizeValuation(metadata: Record<string, unknown>): PropertyValuation {
  return {
    technicalValue:
      toFiniteNumber(metadata.valor_tpl_tecnico) ??
      toFiniteNumber(metadata.valor_tpl_tasador_base) ??
      toFiniteNumber(metadata.valor_tpl_tasador_ajustado) ??
      null,
    communalAverageValue:
      toFiniteNumber(metadata.valor_comunal) ??
      toFiniteNumber(metadata.valor_promedio_comunal) ??
      toFiniteNumber(metadata.valor_tpl_promedio_comunal) ??
      null,
    recommendedValue: toFiniteNumber(metadata.valor_tpl_recomendado) ?? null,
  };
}

/**
 * Precedencia aprobada (Bloque 1.2, regla 8) para superficie construida.
 * El resto de `casa_datos` que no mapea a un campo propio de `Property`
 * se preserva íntegro en `attributes` — no se pierde información.
 */
function normalizeBuiltAreaM2(casaDatos: Record<string, unknown> | null | undefined): number | null {
  if (!casaDatos) return null;
  return toFiniteNumber(casaDatos.superficie_construida) ?? toFiniteNumber(casaDatos.superficieConstruida) ?? null;
}

function normalizeAttributes(casaDatos: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!casaDatos) return {};
  // superficie_construida/superficieConstruida ya se promovieron a Property.builtAreaM2 — el resto se preserva tal cual.
  const { superficie_construida: _sc, superficieConstruida: _sc2, ...rest } = casaDatos;
  return rest;
}

function normalizeCharacteristics(raw: RawPropertyInput): PropertyCharacteristics {
  return {
    legalSituation: toStringOrNull(raw.rol_situacion),
    electricity: toStringOrNull(raw.electricidad),
    water: toStringOrNull(raw.agua),
    access: toStringOrNull(raw.acceso),
    topography: toStringOrNull(raw.topografia),
    soilType: toStringOrNull(raw.suelo),
    exposure: toStringOrNull(raw.exposicion),
    mainView: toStringOrNull(raw.vista_principal),
    vegetation: toStringOrNull(raw.vegetacion),
    fencing: toStringOrNull(raw.cierre_perimetral),
    gate: toStringOrNull(raw.porton),
    isGatedCommunity: typeof raw.condominio === "boolean" ? raw.condominio : null,
    naturalFeatures: Array.isArray(raw.atributos_naturales)
      ? raw.atributos_naturales.filter((item): item is string => typeof item === "string")
      : [],
  };
}

/**
 * Portada: `es_portada` primero; si ninguna imagen la tiene, `orden === 0`
 * (regla aprobada, Bloque 1.2). URLs (relativas o absolutas) se respetan
 * sin alterar.
 */
function normalizeImages(rawImages: RawPropertyImageInput[] | null | undefined): PropertyImage[] {
  if (!Array.isArray(rawImages) || rawImages.length === 0) return [];

  return rawImages.reduce<PropertyImage[]>((acc, img, index) => {
    const url = img.url || img.storage_path;
    if (!url) return acc;
    acc.push({
      url,
      alt: toStringOrNull(img.alt),
      isCover: Boolean(img.es_portada),
      order: typeof img.orden === "number" ? img.orden : index,
    });
    return acc;
  }, []);
}

/**
 * Precedencia aprobada (Bloque 1.2, regla 9): `es_portada` decide primero;
 * `orden === 0` es el RESPALDO cuando ninguna imagen trae `es_portada`, no
 * una condición independiente por imagen — de lo contrario una imagen en
 * `orden 0` le ganaría a otra con `es_portada: true` en una posición
 * distinta. (Encontrado y corregido con la verificación de fixtures del
 * Caso F antes de cerrar este bloque.)
 */
function resolveCoverImage(images: PropertyImage[]): string {
  if (!images.length) return "";
  const marked = images.find((img) => img.isCover);
  if (marked) return marked.url;
  const firstInOrder = images.find((img) => img.order === 0);
  return (firstInOrder ?? images[0])!.url;
}

function normalizeVideo(rawVideo: RawPropertyVideoInput | null | undefined): PropertyVideo | null {
  if (!rawVideo || !rawVideo.video_url) return null;
  return {
    url: rawVideo.video_url,
    thumbnailUrl: toStringOrNull(rawVideo.thumbnail_url),
    title: toStringOrNull(rawVideo.titulo),
  };
}

// ---------------------------------------------------------------------------
// normalizeProperty — función pura, determinista, sin efectos secundarios.
// No importa Supabase, React, @tpl/ui ni frontend-v2. No hace red ni I/O.
// ---------------------------------------------------------------------------

export function normalizeProperty(raw: RawPropertyInput): Property {
  const metadata = parseMetadata(raw.metadata);
  const landAreaM2 = toFiniteNumber(raw.superficie_m2) ?? null;
  const commune = raw.comuna || "";
  const images = normalizeImages(raw.imagenes);
  const price = toFiniteNumber(raw.precio_publicado) ?? null;

  const title =
    toStringOrNull(raw.titulo) ??
    `${(landAreaM2 ?? 0) >= 10000 ? "Campo" : "Parcela"} en ${commune || "Chile"}`;

  return {
    // Identidad
    id: raw.id,
    code: raw.codigo || raw.id,

    // Clasificación
    type: normalizePropertyType(raw.tipo),
    subtype: normalizeSubtype(raw),
    hasHouse: deriveHasHouse(raw),

    // Publicación
    status: raw.estado || "",
    featured: Boolean(raw.destacada),
    opportunity: Boolean(raw.oportunidad_tpl),
    publishedAt: raw.publicada_at ?? null,

    // Contenido
    title,
    description: raw.descripcion || "",

    // Precio
    // NOTA (discrepancia entre bloques, no resuelta en silencio): la regla
    // 12 del Bloque 1.2 pide un campo `priceDisplay` formateado en CLP,
    // pero `Property` (Bloque 1.1, ya aprobado) no declara ese campo — su
    // propio bloque de compatibilidad con PropertyCard ya dejó explícito
    // que el formateo de precio es responsabilidad del adaptador futuro,
    // no de `Property`. Modificar `property.ts` está fuera de regla en
    // este bloque, así que no se agrega `priceDisplay` aquí. Ver informe
    // de cierre del Bloque 1.2 — pendiente de tu decisión.
    price,
    currency: raw.moneda || "CLP",

    // Ubicación
    region: raw.region || "",
    commune,
    sector: toStringOrNull(raw.sector),
    coordinates:
      typeof raw.lat === "number" && typeof raw.lng === "number" && Number.isFinite(raw.lat) && Number.isFinite(raw.lng)
        ? { lat: raw.lat, lng: raw.lng }
        : null,

    // Superficie
    landAreaM2,
    builtAreaM2: normalizeBuiltAreaM2(raw.casa_datos),

    // Imágenes
    images,
    coverImage: resolveCoverImage(images),
    video: normalizeVideo(raw.video),

    // Características
    characteristics: normalizeCharacteristics(raw),

    // Inteligencia / Tasación — nunca recalculado, solo leído.
    valuation: normalizeValuation(metadata),

    // Extensiones
    attributes: normalizeAttributes(raw.casa_datos),
  };
}
