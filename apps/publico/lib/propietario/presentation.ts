/**
 * Portal del propietario — Fase 4, Paso 1. Transformación PURA (sin I/O)
 * del jsonb real que devuelve `tpl_propietario_resumen_por_token_v1`
 * (Supabase, `supabase/migrations/202608050013_tpl_tasador_canonico_mi_propiedad_v1.sql`
 * — es la redefinición vigente, no la original de agosto 4). `actions.ts`
 * hace la llamada RPC y le pasa el jsonb crudo a `toOwnerPortalViewModel()`.
 *
 * La lógica de `deriveValuation()` porta EXACTAMENTE los mismos fallbacks
 * que `frontend-v2/plataforma/propietario/js/app.js:valoresDesdeTasacion()`
 * (y el equivalente en `mi-parcela.js`) — `resultado` es un jsonb cuyo
 * esquema fue cambiando con el motor de tasación real, así que el legacy
 * nunca confía en un solo nombre de campo. No se simplifica esa cadena de
 * `??` aquí: cada alternativa está resolviendo un caso real de datos ya
 * guardados con una versión anterior del motor.
 */

const CLP_FORMATTER = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function formatPriceCLP(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  return CLP_FORMATTER.format(value);
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Solo los campos que esta página realmente usa — `resultado` trae mucho más, pero el resto no se muestra todavía. */
export interface RawOwnerTasacion {
  valor_tpl_oficial?: number | string | null;
  valor_tpl_total?: number | string | null;
  valor_tpl_m2?: number | string | null;
  clasificacion?: string | null;
  resultado?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface RawOwnerPropiedad {
  id: string;
  codigo: string;
  titulo?: string | null;
  descripcion?: string | null;
  region?: string | null;
  comuna?: string | null;
  sector?: string | null;
  superficie_m2?: number | string | null;
  precio_publicado?: number | string | null;
  estado?: string | null;
  agua?: string | null;
  electricidad?: string | null;
  acceso?: string | null;
  topografia?: string | null;
  rol_situacion?: string | null;
  cierre_perimetral?: string | null;
  porton?: string | null;
  propietario_contacto?: { nombre?: string | null } | null;
  updated_at?: string | null;
}

export interface RawOwnerResumenSuccess {
  ok: true;
  expires_at?: string | null;
  propiedad: RawOwnerPropiedad;
  tasacion?: RawOwnerTasacion | Record<string, never> | null;
}

export interface RawOwnerResumenError {
  ok: false;
  error?: string;
}

export type RawOwnerResumenResponse = RawOwnerResumenSuccess | RawOwnerResumenError;

export interface OwnerValuationSummary {
  valorFinal: number;
  valorFinalLabel: string | undefined;
  ventaApuro: number;
  ventaApuroLabel: string | undefined;
  m2: number;
  clasificacion: string;
  calculadaAt: string | null;
}

export interface OwnerPropertySummary {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  region: string;
  comuna: string;
  sector: string | null;
  superficieM2: number | null;
  precioPublicado: number | null;
  precioPublicadoLabel: string | undefined;
  estado: string;
  agua: string | null;
  electricidad: string | null;
  acceso: string | null;
  topografia: string | null;
  rolSituacion: string | null;
  cierrePerimetral: string | null;
  porton: string | null;
  /** Primer nombre solamente — mismo criterio que el legacy (`contacto.nombre.split(' ')[0]`). */
  contactoNombre: string | null;
  updatedAt: string | null;
}

export interface OwnerPortalViewModel {
  expiresAt: string | null;
  propiedad: OwnerPropertySummary;
  valuation: OwnerValuationSummary | null;
}

function deriveValuation(
  tasacion: RawOwnerTasacion | Record<string, never> | null | undefined,
  superficieM2: number | null,
): OwnerValuationSummary | null {
  if (!tasacion || Object.keys(tasacion).length === 0) return null;
  const t = tasacion as RawOwnerTasacion;
  const r = (t.resultado ?? {}) as Record<string, unknown>;

  const valorFinal = toNumber(t.valor_tpl_oficial ?? t.valor_tpl_total ?? r.valorFinal);
  if (!valorFinal) return null;

  const ventaApuro = toNumber(r.valor_venta_apuro ?? r.valorPorApuro);
  const m2 = toNumber(t.valor_tpl_m2) || (superficieM2 ? Math.round(valorFinal / superficieM2) : 0);
  const priceAnalysis = r.priceAnalysis as { classification?: string } | undefined;
  const clasificacion = String(t.clasificacion ?? priceAnalysis?.classification ?? "");

  return {
    valorFinal,
    valorFinalLabel: formatPriceCLP(valorFinal),
    ventaApuro,
    ventaApuroLabel: formatPriceCLP(ventaApuro),
    m2,
    clasificacion,
    calculadaAt: t.created_at ?? null,
  };
}

/**
 * `null` cubre TODO caso `ok:false` (token inválido, vencido, o dato
 * interno corrupto) — la página muestra un único estado limpio para
 * cualquiera de esos casos, no un mensaje distinto por causa (así lo pidió
 * el bloque: "un estado limpio de 'Enlace no disponible o vencido'").
 */
export function toOwnerPortalViewModel(raw: RawOwnerResumenResponse | null | undefined): OwnerPortalViewModel | null {
  if (!raw || !raw.ok) return null;

  const p = raw.propiedad;
  const superficieM2 = p.superficie_m2 !== null && p.superficie_m2 !== undefined ? toNumber(p.superficie_m2) : null;
  const precioPublicado = p.precio_publicado !== null && p.precio_publicado !== undefined ? toNumber(p.precio_publicado) : null;
  const nombreCompleto = p.propietario_contacto?.nombre?.trim();

  return {
    expiresAt: raw.expires_at ?? null,
    propiedad: {
      id: p.id,
      codigo: p.codigo,
      titulo: p.titulo?.trim() || "Tu propiedad",
      descripcion: p.descripcion?.trim() || "",
      region: p.region?.trim() ?? "",
      comuna: p.comuna?.trim() ?? "",
      sector: p.sector?.trim() || null,
      superficieM2,
      precioPublicado,
      precioPublicadoLabel: formatPriceCLP(precioPublicado),
      estado: p.estado ?? "",
      agua: p.agua?.trim() || null,
      electricidad: p.electricidad?.trim() || null,
      acceso: p.acceso?.trim() || null,
      topografia: p.topografia?.trim() || null,
      rolSituacion: p.rol_situacion?.trim() || null,
      cierrePerimetral: p.cierre_perimetral?.trim() || null,
      porton: p.porton?.trim() || null,
      contactoNombre: nombreCompleto ? nombreCompleto.split(/\s+/)[0]! : null,
      updatedAt: p.updated_at ?? null,
    },
    valuation: deriveValuation(raw.tasacion, superficieM2),
  };
}
