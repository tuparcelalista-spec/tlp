/**
 * Contratos de dominio para el Portal del Propietario (Mi Parcela TPL).
 * Refleja exactamente la salida y entrada de las funciones SECURITY DEFINER:
 * - tpl_propietario_resumen_por_token_v1(p_token)
 * - tpl_propietario_actualizar_por_token_v1(p_token, p_payload)
 */

export interface OwnerPropertyData {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string | null;
  region?: string | null;
  comuna?: string | null;
  sector?: string | null;
  superficie_m2?: number | null;
  precio_publicado?: number | null;
  estado?: string | null;
  agua?: string | null;
  electricidad?: string | null;
  acceso?: string | null;
  topografia?: string | null;
  rol_situacion?: string | null;
  cierre_perimetral?: string | null;
  porton?: string | null;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
}

export interface OwnerValuationData {
  valor_tpl_total?: number | null;
  valor_tpl_m2?: number | null;
  clasificacion?: string | null;
  resultado?: {
    valor_apuro?: number | null;
    valor_mercado_estimado?: number | null;
    estrategia_sugerida?: string | null;
    comparables_usados?: number | null;
    [key: string]: unknown;
  } | null;
  created_at?: string | null;
}

export interface OwnerSummarySuccess {
  ok: true;
  expires_at: string;
  propiedad: OwnerPropertyData;
  tasacion: OwnerValuationData;
}

export interface OwnerSummaryFailure {
  ok: false;
  error: string;
}

export type OwnerSummaryResponse = OwnerSummarySuccess | OwnerSummaryFailure;

export interface OwnerPropertyUpdatePayload {
  titulo?: string;
  descripcion?: string;
  precio_publicado?: number;
  superficie_m2?: number;
  agua?: string;
  electricidad?: string;
  acceso?: string;
  topografia?: string;
  rol_situacion?: string;
  cierre_perimetral?: string;
  porton?: string;
  contacto?: {
    nombre?: string;
    telefono?: string;
    email?: string;
  };
  fotos?: Array<{
    url: string;
    name?: string;
  }>;
}

export interface OwnerPropertyUpdateSuccess {
  ok: true;
  campos_modificados?: string[];
  updated_at?: string;
}

export interface OwnerPropertyUpdateFailure {
  ok: false;
  error: string;
}

export type OwnerPropertyUpdateResponse = OwnerPropertyUpdateSuccess | OwnerPropertyUpdateFailure;
