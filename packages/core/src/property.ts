/**
 * Contrato de dominio `Property` — V1 (Bloque 1.1: solo tipos, sin runtime).
 *
 * Frontera aprobada: fila cruda de Supabase (`tpl_propiedades` +
 * `tpl_propiedad_imagenes` + `tpl_propiedad_videos`) → normalización
 * (`normalizeProperty()`, NO implementado todavía) → `Property` → adaptador
 * hacia `@tpl/ui` `PropertyCard` (tampoco implementado todavía).
 *
 * `tpl_propiedades` sigue siendo la única fuente de verdad — este archivo
 * NO define una tabla nueva, es exclusivamente una capa de dominio
 * TypeScript. No hay conexión a Supabase, no hay lógica, no hay valores por
 * defecto: solo forma.
 *
 * Todos los campos están documentados con su columna real de origen. Nada
 * aquí fue inventado: cada tipo corresponde a una columna verificada
 * directamente contra producción (proyecto `hwyscirbycojwndyzozn`,
 * 2026-09-10) — ver `docs/TPL-FASE-3-AUDITORIA-ARQUITECTURA.md` y la
 * auditoría del contrato `Property` para el detalle completo y la
 * evidencia.
 */

/**
 * Valor real de la columna `tpl_propiedades.tipo`. Únicamente estos dos
 * valores fueron observados en producción — no es la clasificación futura
 * (ver `PropertySubtype`), es el campo legacy tal como existe hoy.
 */
export type PropertyType = "parcela" | "casa";

/**
 * Convención CERRADA para la futura clasificación de propiedades,
 * destinada a vivir en `tpl_propiedades.subtipo`.
 *
 * Estado real verificado: `subtipo` existe como columna pero está en
 * `null` en el 100% de las filas de producción auditadas — ninguno de
 * estos cuatro valores está efectivamente en uso todavía. Esta unión de
 * tipos es la convención propuesta y aprobada para cuando se empiece a
 * escribir, no una descripción del estado actual de los datos.
 *
 * No se migran ni se rellenan datos históricos para poblar este campo
 * como parte de este bloque ni de ninguno futuro sin decisión explícita.
 */
export type PropertySubtype = "parcel" | "parcel_with_house" | "urban_land" | "house";

/** `tpl_propiedades.lat` + `tpl_propiedades.lng`, combinadas. `null` si falta cualquiera de las dos. */
export interface PropertyCoordinates {
  lat: number;
  lng: number;
}

/**
 * Una imagen normalizada. Origen: `tpl_propiedad_imagenes` (columnas
 * `url`/`storage_path`, `alt`, `orden`, `es_portada`) o, como respaldo,
 * `tpl_propiedades.metadata.imagenes`.
 *
 * `url` puede ser una ruta relativa heredada (`image/<captador>/foto.webp`,
 * servida hoy por `frontend-v2`) o una URL absoluta de Supabase Storage —
 * ambas formas conviven en datos reales. Este tipo no las distingue ni las
 * normaliza; eso es responsabilidad de `normalizeProperty()` (no
 * implementado en este bloque).
 */
export interface PropertyImage {
  url: string;
  alt: string | null;
  isCover: boolean;
  order: number;
}

/**
 * Origen: `tpl_propiedad_videos`, filtrado por `publicado_en_parcela =
 * true` (el resto de las columnas de esa tabla — `prompt_utilizado`,
 * `veo_operation_name`, `estado_generacion`, etc. — son de administración
 * de generación por IA y no forman parte del contrato público).
 */
export interface PropertyVideo {
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
}

/**
 * Atributos descriptivos estructurados. Todas las columnas existen hoy en
 * `tpl_propiedades` como texto libre nullable (verificado: la mayoría son
 * `null` en filas reales) — se listan aquí porque ya son columnas propias,
 * no porque estén siempre pobladas.
 */
export interface PropertyCharacteristics {
  /** `tpl_propiedades.rol_situacion` */
  legalSituation: string | null;
  /** `tpl_propiedades.electricidad` */
  electricity: string | null;
  /** `tpl_propiedades.agua` */
  water: string | null;
  /** `tpl_propiedades.acceso` */
  access: string | null;
  /** `tpl_propiedades.topografia` */
  topography: string | null;
  /** `tpl_propiedades.suelo` */
  soilType: string | null;
  /** `tpl_propiedades.exposicion` */
  exposure: string | null;
  /** `tpl_propiedades.vista_principal` */
  mainView: string | null;
  /** `tpl_propiedades.vegetacion` */
  vegetation: string | null;
  /** `tpl_propiedades.cierre_perimetral` */
  fencing: string | null;
  /** `tpl_propiedades.porton` */
  gate: string | null;
  /** `tpl_propiedades.condominio` */
  isGatedCommunity: boolean | null;
  /** `tpl_propiedades.atributos_naturales` (array real, jsonb) */
  naturalFeatures: string[];
}

/**
 * Valores públicos de tasación — EXCLUSIVAMENTE los tres oficiales
 * (decisión del dueño). `metadata.valor_venta_apuro` (`quickSaleValue`)
 * queda deliberadamente fuera del contrato público V1 hasta que exista una
 * decisión explícita de negocio sobre su exposición.
 *
 * Estos tres valores viven hoy dentro de `tpl_propiedades.metadata`
 * (jsonb), no como columnas propias, y bajo MÁS DE UNA clave histórica
 * cada uno (ver auditoría §1 y §6) — `frontend-v2/js/index.js` y
 * `frontend-v2/js/parcela.js` leen conjuntos de claves de respaldo
 * distintos entre sí para el mismo valor. Este bloque NO resuelve esa
 * precedencia — eso es tarea explícita de `normalizeProperty()` (no
 * implementado) y requiere su propia aprobación antes de escribirse.
 * Ninguna capa de Next.js recalcula estos valores; solo se leen.
 */
export interface PropertyValuation {
  /** Valor TPL Técnico. Claves históricas observadas: `valor_tpl_tecnico`, `valor_tpl_tasador_base`, `valor_tpl_tasador_ajustado` — sin precedencia definida todavía. */
  technicalValue: number | null;
  /** Valor TPL Promedio Comunal. Claves históricas observadas: `valor_comunal`, `valor_promedio_comunal`, `valor_tpl_promedio_comunal` — sin precedencia definida todavía. */
  communalAverageValue: number | null;
  /** Valor Recomendado. Claves históricas observadas: `valor_tpl_recomendado`, `valor_tpl_tasador_ajustado`, `valor_tpl_tasador` — sin precedencia definida todavía. */
  recommendedValue: number | null;
}

/**
 * Contrato de dominio público de una propiedad TPL.
 *
 * Ningún campo de esta interfaz se calcula ni se deriva en tiempo de
 * ejecución dentro de este archivo — es solo forma. La normalización real
 * (`normalizeProperty()`) es un bloque futuro, no autorizado todavía.
 */
export interface Property {
  // Identidad
  /** `tpl_propiedades.id` (UUID real, clave primaria). */
  id: string;
  /** `tpl_propiedades.codigo` — código público usado hoy en URLs (`parcela.html?id=`). */
  code: string;

  // Clasificación
  /** `tpl_propiedades.tipo`. Ver `PropertyType` — es el campo legacy, no la clasificación futura. */
  type: PropertyType;
  /**
   * `tpl_propiedades.subtipo`. Verificado: `null` en el 100% de las filas
   * reales de producción auditadas — columna reservada, todavía sin usar.
   * Será la clasificación oficial futura una vez poblada.
   */
  subtype: PropertySubtype | null;
  /**
   * Señal AUXILIAR e informativa únicamente — derivada de si
   * `tpl_propiedades.casa_datos` tiene contenido. NO es la clasificación
   * oficial del dominio: la auditoría encontró que `tipo` y `casa_datos`
   * son inconsistentes entre sí en datos reales (ej. la única fila con
   * `tipo = 'casa'` tiene `casa_datos` vacío, mientras que filas con
   * `tipo = 'parcela'` sí tienen `casa_datos` con contenido). La
   * clasificación oficial debe depender de `subtype`, nunca de este campo.
   * Opcional a propósito — un consumidor que no la necesite no debería
   * verse obligado a manejarla.
   */
  hasHouse?: boolean;

  // Publicación
  /** `tpl_propiedades.estado`. Solo `'publicada'` fue verificado como visible vía `anon`/RLS; otros valores no verificados. */
  status: string;
  /** `tpl_propiedades.destacada` */
  featured: boolean;
  /** `tpl_propiedades.oportunidad_tpl` */
  opportunity: boolean;
  /** `tpl_propiedades.publicada_at` (ISO 8601) */
  publishedAt: string | null;

  // Contenido
  /** `tpl_propiedades.titulo` */
  title: string;
  /** `tpl_propiedades.descripcion` */
  description: string;

  // Precio
  /** `tpl_propiedades.precio_publicado`. Nunca recalculado. */
  price: number | null;
  /** `tpl_propiedades.moneda`. Único valor observado en producción: `'CLP'`. */
  currency: string;

  // Ubicación
  /** `tpl_propiedades.region` */
  region: string;
  /** `tpl_propiedades.comuna` */
  commune: string;
  /** `tpl_propiedades.sector`. Nullable — observado `null` en filas reales. */
  sector: string | null;
  /** Combinación de `tpl_propiedades.lat` + `.lng`. `null` si falta cualquiera de las dos. */
  coordinates: PropertyCoordinates | null;

  // Superficie
  /** `tpl_propiedades.superficie_m2` */
  landAreaM2: number | null;
  /**
   * Superficie construida. Origen real: anidada dentro de
   * `tpl_propiedades.casa_datos`, bajo DOS claves distintas observadas en
   * producción (`superficie_construida` y `superficieConstruida`) sin que
   * se haya confirmado cuál es la que efectivamente escribe el
   * publicador/CRM hoy. Este bloque no resuelve esa precedencia.
   */
  builtAreaM2: number | null;

  // Imágenes
  /** Ver `PropertyImage`. Puede ser un arreglo vacío. */
  images: PropertyImage[];
  /** Derivado de `images` (primera imagen o portada) — no es una columna propia. */
  coverImage: string;
  /** Ver `PropertyVideo`. `null` si no hay video publicado en la ficha. */
  video: PropertyVideo | null;

  // Características
  characteristics: PropertyCharacteristics;

  // Inteligencia / Tasación
  valuation: PropertyValuation;

  // Extensiones
  /**
   * Bolsa JSONB para atributos genuinamente variables y NO destinados a
   * búsqueda/filtro/orden frecuente (ej. `piscina_mat`, `cabana`,
   * `quincho`, `materialidad` — hoy dentro de `tpl_propiedades.casa_datos`).
   * Campos que sí necesiten filtrarse u ordenarse con frecuencia (ej.
   * dormitorios, baños, superficie construida) deben promoverse a campos
   * propios de `Property`, no vivir aquí — ver auditoría §3.
   */
  attributes: Record<string, unknown>;
}

/**
 * === Compatibilidad con `@tpl/ui` `PropertyCard` — documentada, no parcheada ===
 *
 * `PropertyCard` (packages/ui/src/components/PropertyCard/PropertyCard.tsx)
 * NO se modifica en este bloque. Sus props no coinciden 1:1 con `Property`
 * — el adaptador (`propertyToCardProps`, no implementado todavía) deberá
 * resolver:
 *
 * - `PropertyCard.location` espera un string ya compuesto (ej. "Pinto,
 *   Ñuble"); `Property` tiene `region`/`commune`/`sector` por separado.
 * - `PropertyCard.area` espera un string ya formateado (ej. "5.000 m²");
 *   `Property.landAreaM2` es `number | null`.
 * - `PropertyCard.price` espera un string ya formateado (ej.
 *   "$54.000.000" o "UF 3.200"); `Property.price` es `number | null` sin
 *   formatear — el formateo (moneda, `Intl.NumberFormat`) no está resuelto
 *   en este bloque.
 * - `PropertyCard.attributes` espera `{ icon?, label }[]`; `Property`
 *   expone `characteristics` como objeto estructurado — no existe todavía
 *   un mapeo de qué características se muestran como chips ni con qué
 *   ícono.
 * - `PropertyCard.status`/`badges` esperan `{ label, variant }` ya
 *   resueltos; `Property.opportunity`/`featured`/`valuation` no incluyen
 *   ninguna lógica de qué texto o color usar — esa decisión de
 *   presentación pertenece al adaptador, no a este contrato de datos.
 *
 * Ninguno de estos puntos es una incompatibilidad que bloquee el
 * contrato — son, todos, responsabilidad de un adaptador futuro
 * (`propertyToCardProps`), no de `Property` ni de `PropertyCard`.
 */
