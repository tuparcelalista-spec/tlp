/**
 * Estado y lógica pura del wizard de Publicar — sin JSX, sin React, sin
 * `@tpl/core` en tiempo de ejecución (mismo criterio ya establecido en
 * `components/search/searchState.ts`): testeable con `node:assert` plano.
 *
 * Alcance de este bloque, a propósito acotado (autorizado explícitamente,
 * no una decisión mía): 4 pasos — Ubicación (región/comuna/sector/mapa),
 * Características (superficie/rol/agua/luz), Precio & Tasación, Planes &
 * Salida. NO incluye multimedia, video, redacción con IA, datos de
 * contacto (nombre/teléfono/correo/RUT) ni el bloque de vivienda del
 * wizard legacy completo (`publicar-v2` real, ver auditoría previa) — el
 * cierre es un mensaje de WhatsApp, no una escritura a Supabase todavía.
 */

const CLP_FORMATTER = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export function formatPriceCLP(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  return CLP_FORMATTER.format(value);
}

export function parseCLPInput(text: string): number | undefined {
  const digitsOnly = text.replace(/[^0-9]/g, "");
  if (!digitsOnly) return undefined;
  const value = Number(digitsOnly);
  return Number.isFinite(value) ? value : undefined;
}

export type RolPropio = "" | "si" | "no" | "en_tramite";
export type FactibilidadAgua = "" | "pozo" | "apr" | "vertiente";
export type FactibilidadLuz = "" | "red" | "paneles";

export interface PublishWizardFormState {
  regionCode: string;
  comuna: string;
  sector: string;
  lat: number | null;
  lng: number | null;
  superficieM2Text: string;
  rolPropio: RolPropio;
  agua: FactibilidadAgua;
  luz: FactibilidadLuz;
  precioEsperadoText: string;
}

export const INITIAL_PUBLISH_WIZARD_STATE: PublishWizardFormState = {
  regionCode: "",
  comuna: "",
  sector: "",
  lat: null,
  lng: null,
  superficieM2Text: "",
  rolPropio: "",
  agua: "",
  luz: "",
  precioEsperadoText: "",
};

export const ROL_PROPIO_OPTIONS: { value: RolPropio; label: string }[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "en_tramite", label: "En trámite" },
];

export const AGUA_OPTIONS: { value: FactibilidadAgua; label: string }[] = [
  { value: "pozo", label: "Pozo" },
  { value: "apr", label: "APR" },
  { value: "vertiente", label: "Vertiente" },
];

export const LUZ_OPTIONS: { value: FactibilidadLuz; label: string }[] = [
  { value: "red", label: "Red eléctrica" },
  { value: "paneles", label: "Paneles solares" },
];

export interface PublishPlan {
  codigo: string;
  nombre: string;
  precioLabel: string;
}

/** Mismos 3 planes y precios ya usados en `apps/publico/app/mi-parcela/[token]/page.tsx` — no una tabla nueva inventada aparte. */
export const PUBLISH_PLANS: PublishPlan[] = [
  { codigo: "basico", nombre: "Plan Básico", precioLabel: "$50.000" },
  { codigo: "destacado", nombre: "Plan Destacado", precioLabel: "$120.000" },
  { codigo: "exito", nombre: "Comisión de Éxito", precioLabel: "2% al cerrar" },
];

function labelFrom<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? "";
}

export interface PublishStepValidation {
  ok: boolean;
  mensaje?: string;
}

/** Mismo criterio que `SearchFiltersPanel`/legacy `validateStep`: dice QUÉ falta, no solo que algo falta. */
export function validatePublishStep(step: number, form: PublishWizardFormState): PublishStepValidation {
  if (step === 1) {
    if (!form.regionCode) return { ok: false, mensaje: "Selecciona una región." };
    if (!form.comuna) return { ok: false, mensaje: "Selecciona una comuna." };
    if (form.lat === null || form.lng === null) return { ok: false, mensaje: "Marca la ubicación de tu propiedad en el mapa." };
    return { ok: true };
  }
  if (step === 2) {
    const superficie = parseCLPInput(form.superficieM2Text);
    if (!superficie || superficie <= 0) return { ok: false, mensaje: "Indica la superficie del terreno en m²." };
    if (!form.rolPropio) return { ok: false, mensaje: "Indica la situación del rol." };
    if (!form.agua) return { ok: false, mensaje: "Indica la factibilidad de agua." };
    if (!form.luz) return { ok: false, mensaje: "Indica la factibilidad eléctrica." };
    return { ok: true };
  }
  if (step === 3) {
    const precio = parseCLPInput(form.precioEsperadoText);
    if (!precio || precio <= 0) return { ok: false, mensaje: "Indica el precio que esperas obtener." };
    return { ok: true };
  }
  return { ok: true };
}

/**
 * Mensaje de WhatsApp — mismo patrón ya usado en
 * `PartnerApplicationDialog`/`ScheduleVisitDialog`: los datos reales que la
 * persona acaba de declarar, en texto plano, para que el asesor no tenga
 * que volver a preguntarlos.
 */
export function buildPublishWhatsAppMessage(form: PublishWizardFormState, comunaLabel: string, regionLabel: string, plan: PublishPlan): string {
  const superficie = parseCLPInput(form.superficieM2Text);
  const precio = parseCLPInput(form.precioEsperadoText);

  const partes = [
    "Hola, quiero postular mi parcela a Tu Parcela Lista.",
    comunaLabel ? `Comuna: ${comunaLabel}${regionLabel ? ", " + regionLabel : ""}.` : "",
    form.sector.trim() ? `Sector: ${form.sector.trim()}.` : "",
    superficie ? `Superficie: ${superficie.toLocaleString("es-CL")} m².` : "",
    form.rolPropio ? `Rol propio: ${labelFrom(ROL_PROPIO_OPTIONS, form.rolPropio)}.` : "",
    form.agua ? `Agua: ${labelFrom(AGUA_OPTIONS, form.agua)}.` : "",
    form.luz ? `Luz: ${labelFrom(LUZ_OPTIONS, form.luz)}.` : "",
    precio ? `Precio que espero: ${formatPriceCLP(precio)}.` : "",
    form.lat !== null && form.lng !== null ? `Ubicación marcada en el mapa: ${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}.` : "",
    `Me interesa el ${plan.nombre} (${plan.precioLabel}).`,
  ].filter(Boolean);

  return partes.join(" ");
}
