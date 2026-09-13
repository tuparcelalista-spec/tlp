/**
 * URLs hacia el sitio público legacy (`frontend-v2/`), que sigue sirviendo
 * producción en Vercel (ver la regla del usuario: NO se borra esa carpeta
 * hasta el corte de dominio). Varias pantallas del CRM enlazan a páginas
 * estáticas de ese sitio que todavía no se migran (ficha pública, TPL
 * Studio, Informe de Valores) — antes eran rutas relativas dentro del mismo
 * SPA (`../../parcela.html`, `../tpl-business-v2/studio/index.html`,
 * `../informe-valores/index.html`, todas resueltas contra
 * `.../frontend-v2/plataforma/crm-tpl-v1/index.html`); como `apps/crm` es
 * ahora una app aparte, se vuelven absolutas contra `LEGACY_SITE_BASE`.
 */
const LEGACY_SITE_BASE = (process.env.NEXT_PUBLIC_LEGACY_SITE_URL || "https://www.parcelalista.cl").replace(/\/+$/, "");

/** Ficha pública de una parcela (antes `../../parcela.html?id=`). */
export function urlFichaPublica(propiedadId: string): string {
  return `${LEGACY_SITE_BASE}/parcela.html?id=${encodeURIComponent(propiedadId)}`;
}

/** TPL Studio / Video Veo (antes `../tpl-business-v2/studio/index.html?property=`). */
export function urlTplStudio(propiedadId: string): string {
  return `${LEGACY_SITE_BASE}/plataforma/tpl-business-v2/studio/index.html?property=${encodeURIComponent(propiedadId)}`;
}

/** Informe de Metodología TPL (antes `../informe-valores/index.html?id=`). */
export function urlInformeValores(propiedadId: string): string {
  return `${LEGACY_SITE_BASE}/plataforma/informe-valores/index.html?id=${encodeURIComponent(propiedadId)}`;
}

/** Portal del propietario con token (antes `${origin}/frontend-v2/plataforma/propietario/?token=`). */
export function urlPortalPropietario(token: string): string {
  return `${LEGACY_SITE_BASE}/plataforma/propietario/?token=${encodeURIComponent(token)}`;
}

/** Informe de valoración con token, mismo portal que el propietario (antes `.../plataforma/informe-valores/?token=`). */
export function urlInformeConToken(token: string): string {
  return `${LEGACY_SITE_BASE}/plataforma/informe-valores/?token=${encodeURIComponent(token)}`;
}
