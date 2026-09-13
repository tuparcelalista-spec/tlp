/**
 * Estado y lógica pura del wizard de Publicar — sin JSX, sin React, sin
 * `@tpl/core` en tiempo de ejecución (mismo criterio ya establecido en
 * `components/search/searchState.ts`): testeable con `node:assert` plano.
 *
 * Alcance, ampliado (2026-09-13) para que `/publicar` publique de verdad:
 * 5 pasos — Ubicación (región/comuna/sector/mapa), Características
 * (tipo/superficie/rol/agua/luz), Precio & Tasación, **Contacto** (nuevo:
 * nombre + teléfono/correo — el dato que el propio wizard documentaba como
 * faltante para poder llamar a `tpl_publicar_propiedad_v3`), Planes &
 * Salida. Al elegir un plan se llama `publicarPropiedadAction()`
 * (`lib/publicar/actions.ts`) ANTES de abrir WhatsApp — la propiedad queda
 * real en Supabase (`estado: 'pendiente_revision'`, igual que el
 * publicador legacy) y el mensaje de WhatsApp incluye el código real.
 *
 * Sigue sin incluir (fuera de este bloque, no un olvido): multimedia/fotos,
 * video, redacción con IA, pago real de planes vía Flow — eso es
 * `publicar-v2` completo, una migración de producto aparte.
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
/** Mismos 3 valores que acepta `tpl_publicar_propiedad_v3_core` (`v_tipo not in (...)`). */
export type TipoPropiedad = "" | "parcela" | "campo" | "casa_con_terreno";

export interface PublishWizardFormState {
  tipoPropiedad: TipoPropiedad;
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
  titulo: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoCorreo: string;
}

export const INITIAL_PUBLISH_WIZARD_STATE: PublishWizardFormState = {
  tipoPropiedad: "parcela",
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
  titulo: "",
  contactoNombre: "",
  contactoTelefono: "",
  contactoCorreo: "",
};

export const TIPO_PROPIEDAD_OPTIONS: { value: TipoPropiedad; label: string }[] = [
  { value: "parcela", label: "Parcela" },
  { value: "campo", label: "Campo" },
  { value: "casa_con_terreno", label: "Parcela con casa" },
];

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
    if (!form.tipoPropiedad) return { ok: false, mensaje: "Indica el tipo de propiedad." };
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
  if (step === 4) {
    if (form.contactoNombre.trim().length < 2) return { ok: false, mensaje: "Indica tu nombre." };
    const telefonoValido = form.contactoTelefono.replace(/\D/g, "").length >= 8;
    const correoValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactoCorreo.trim());
    if (!telefonoValido && !correoValido) {
      return { ok: false, mensaje: "Indica un teléfono o un correo válido para contactarte." };
    }
    return { ok: true };
  }
  return { ok: true };
}

/**
 * Mensaje de WhatsApp — mismo patrón ya usado en
 * `PartnerApplicationDialog`/`ScheduleVisitDialog`: los datos reales que la
 * persona acaba de declarar, en texto plano, para que el asesor no tenga
 * que volver a preguntarlos. Si la publicación ya se guardó en Supabase
 * (`codigoPropiedad`), el mensaje lo incluye — el asesor abre la ficha real
 * en vez de tener que crearla desde el chat.
 */
export function buildPublishWhatsAppMessage(
  form: PublishWizardFormState,
  comunaLabel: string,
  regionLabel: string,
  plan: PublishPlan,
  codigoPropiedad?: string,
): string {
  const superficie = parseCLPInput(form.superficieM2Text);
  const precio = parseCLPInput(form.precioEsperadoText);

  const partes = [
    "Hola, quiero postular mi parcela a Tu Parcela Lista.",
    form.contactoNombre.trim() ? `Soy ${form.contactoNombre.trim()}.` : "",
    comunaLabel ? `Comuna: ${comunaLabel}${regionLabel ? ", " + regionLabel : ""}.` : "",
    form.sector.trim() ? `Sector: ${form.sector.trim()}.` : "",
    superficie ? `Superficie: ${superficie.toLocaleString("es-CL")} m².` : "",
    form.rolPropio ? `Rol propio: ${labelFrom(ROL_PROPIO_OPTIONS, form.rolPropio)}.` : "",
    form.agua ? `Agua: ${labelFrom(AGUA_OPTIONS, form.agua)}.` : "",
    form.luz ? `Luz: ${labelFrom(LUZ_OPTIONS, form.luz)}.` : "",
    precio ? `Precio que espero: ${formatPriceCLP(precio)}.` : "",
    form.lat !== null && form.lng !== null ? `Ubicación marcada en el mapa: ${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}.` : "",
    `Me interesa el ${plan.nombre} (${plan.precioLabel}).`,
    codigoPropiedad ? `Código de mi publicación: ${codigoPropiedad}.` : "",
  ].filter(Boolean);

  return partes.join(" ");
}

/**
 * Arma el `payload` real que espera `tpl_publicar_propiedad_v3` (ver
 * `supabase/migrations/20260901180000_..._v1.sql`, función `_v3_core`) a
 * partir del estado del wizard — sin inventar campos ni nombres nuevos,
 * uno a uno contra lo que esa función lee de `p_payload`.
 */
export function buildPublicarPropiedadPayload(
  form: PublishWizardFormState,
  comunaLabel: string,
  regionLabel: string,
): Record<string, unknown> {
  const superficie = parseCLPInput(form.superficieM2Text) ?? 0;
  const precio = parseCLPInput(form.precioEsperadoText) ?? 0;
  const tituloFinal =
    form.titulo.trim() ||
    `${labelFrom(TIPO_PROPIEDAD_OPTIONS, form.tipoPropiedad) || "Parcela"} en ${comunaLabel || "comuna por confirmar"}`;

  return {
    tipo: form.tipoPropiedad || "parcela",
    titulo: tituloFinal,
    region: regionLabel || form.regionCode,
    comuna: comunaLabel || form.comuna,
    localidad: form.sector.trim() || undefined,
    superficie,
    precio,
    coords: form.lat !== null && form.lng !== null ? { lat: form.lat, lng: form.lng } : {},
    terreno: {
      rol: form.rolPropio ? labelFrom(ROL_PROPIO_OPTIONS, form.rolPropio) : undefined,
      agua: form.agua ? labelFrom(AGUA_OPTIONS, form.agua) : undefined,
      luz: form.luz ? labelFrom(LUZ_OPTIONS, form.luz) : undefined,
    },
    contacto: {
      nombre: form.contactoNombre.trim(),
      telefono: form.contactoTelefono.trim() || undefined,
      email: form.contactoCorreo.trim() || undefined,
      responsable: "propietario",
    },
    publicApproximate: true,
  };
}
