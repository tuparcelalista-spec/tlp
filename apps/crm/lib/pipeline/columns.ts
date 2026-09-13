/**
 * Puerto 1:1 de `COLUMNAS` en
 * `frontend-v2/plataforma/crm-tpl-v1/modules/pipeline/index.js` — mismo
 * orden (es el del embudo comercial), mismos ids (deben calzar con la
 * whitelist de estados de `tpl_crm_actualizar_estado_oportunidad_v1`,
 * ver `202608090002_tpl_crm_snapshot_comercial_v1.sql`) y mismos colores.
 */
export interface PipelineColumn {
  id: string;
  label: string;
  color: string;
}

export const COLUMNAS: PipelineColumn[] = [
  { id: "nueva", label: "Nuevas", color: "#0b6ea8" },
  { id: "contactada", label: "Contactadas", color: "#1a8fc4" },
  { id: "calificada", label: "Calificadas", color: "#3eb8a0" },
  { id: "agendada", label: "Visita agendada", color: "#16a34a" },
  { id: "negociacion", label: "En negociación", color: "#d97706" },
  { id: "reservada", label: "Reservadas", color: "#2563eb" },
  { id: "vendida", label: "Vendidas", color: "#15803d" },
  { id: "perdida", label: "Perdidas", color: "#dc2626" },
  { id: "cancelada", label: "Canceladas", color: "#8d96a3" },
];

export const COLUMNA_IDS = COLUMNAS.map((c) => c.id);
