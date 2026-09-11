import type { Property, PropertyImage } from "@tpl/core";

/**
 * Resolver de imágenes de propiedad — Bloque 2.6.
 *
 * AUDITORÍA REAL (2026-09-11, `tpl_propiedad_imagenes`, clave anon,
 * solo lectura): 190 filas — 6 URLs absolutas de Supabase Storage
 * (bucket `tpl-propiedades-propietario`, verificado público con HTTP 200
 * real) y 184 rutas relativas legacy (ej. `image/duenos/yumbel/...`).
 * Las 184 existen físicamente en `frontend-v2/image/` (verificado con
 * `fs.access`, 0 faltantes) y ADEMÁS ya se sirven públicamente hoy desde
 * producción (`https://www.parcelalista.cl/image/...`, Root Directory
 * `frontend-v2` — verificado con HTTP 200 real). 157 de esas 184 rutas
 * contienen espacios en el nombre de archivo — sin codificar
 * correctamente, la URL resultante sería inválida (verificado: una ruta
 * con espacio solo respondió 200 con `%20`, no con el espacio literal).
 * 0 filas vacías, 0 caracteres no-ASCII, 18 valores de URL repetidos en
 * más de una fila (imágenes de ejemplo/plantilla compartidas entre
 * fichas — dato de calidad a nivel de contenido, no un problema de este
 * resolver).
 *
 * Arquitectura elegida para la coexistencia (sin migrar nada
 * físicamente todavía): las rutas legacy se resuelven contra el dominio
 * de producción que YA las sirve hoy — no se copian archivos a
 * `apps/publico/public` (evitado a propósito: infla el repo, exige
 * mantener una copia sincronizada, y no acerca nada a la arquitectura
 * futura de Storage), no se crea un endpoint interno que lea del disco
 * de `frontend-v2` (evitado a propósito: `apps/publico` y `frontend-v2`
 * son proyectos Vercel separados — ver
 * `docs/TPL-FASE-3-COEXISTENCIA-AUDITORIA.md` — un endpoint así
 * funcionaría en desarrollo local pero NUNCA en un despliegue real,
 * porque no comparten sistema de archivos). Apuntar al dominio de
 * producción ya público es la única opción de las evaluadas que:
 * (a) no toca `frontend-v2` ni Vercel, (b) funciona igual en local y en
 * cualquier despliegue futuro, (c) no duplica ni un byte de imágenes,
 * (d) es trivialmente reversible (se borra este archivo y ya).
 *
 * ACTUALIZACIÓN Bloque 3.16: se sigue apuntando al mismo dominio de
 * producción — lo único que cambia es que ahora se hace vía un rewrite
 * same-origin (`/legacy-image/:path*` en `next.config.mjs`) en vez de una
 * URL absoluta a `https://www.parcelalista.cl`. Motivo real, no
 * cosmético: ese dominio responde `Cross-Origin-Resource-Policy:
 * same-site` en `/image/**` (confirmado con `curl -I`, Fase 3.15), que
 * bloquea cualquier `<img>` plano cross-origin en cualquier navegador
 * real. Al pedirse desde el propio origen de `apps/publico`, el
 * navegador nunca evalúa esa política — mismo mecanismo que ya usaba
 * `next/image` internamente (su proxy `/_next/image`), ahora aplicado
 * también a los `<img>` planos de `@tpl/ui`. Sigue sin copiar ni un byte
 * de imágenes y sigue siendo reversible (se borra el rewrite y esta
 * constante vuelve a ser la URL absoluta).
 *
 * Migración futura a Storage (Fases A–E, diseñadas, NO ejecutadas en
 * este bloque):
 *   A. Subir las 184 imágenes legacy a Storage (mismo bucket
 *      `tpl-propiedades-propietario`, mismo esquema de carpeta por
 *      `propiedad_id` que ya usan las 6 existentes).
 *   B. Validar cada objeto subido (tamaño > 0, content-type imagen,
 *      HTTP 200 real contra la URL pública resultante — mismo método
 *      de verificación ya usado en esta auditoría).
 *   C. Actualizar `tpl_propiedad_imagenes.url` fila por fila a la nueva
 *      URL de Storage — SOLO tras (B), y en lotes verificables, nunca
 *      en una escritura masiva sin validar. (Esto es un UPDATE de
 *      Supabase — explícitamente fuera de alcance de esta misión.)
 *   D. Una vez que el 100% de las filas apunten a Storage, este
 *      resolver deja de producir nunca más `origin: "legacy"" en la
 *      práctica — no hace falta borrar el caso, simplemente deja de
 *      usarse.
 *   E. Recién con builds de producción funcionando 100% sobre Storage
 *      durante un período de rollback razonable, se podría evaluar
 *      eliminar `frontend-v2/image/` — decisión explícitamente fuera
 *      de esta misión y de cualquier misión de solo-imágenes.
 */

export type ResolvedImageOrigin = "storage" | "legacy" | "external" | "missing";

export interface ResolvedImage {
  /** `null` únicamente cuando `origin === "missing"` — nunca una URL adivinada. */
  url: string | null;
  origin: ResolvedImageOrigin;
}

/**
 * Bloque 3.16: path LOCAL (mismo origen), no el dominio externo. El
 * rewrite `/legacy-image/:path* -> https://www.parcelalista.cl/image/:path*`
 * (`next.config.mjs`) hace el proxy server-side — el navegador nunca ve el
 * dominio externo, así que nunca aplica el `Cross-Origin-Resource-Policy:
 * same-site` real que `www.parcelalista.cl` envía en `/image/**`
 * (confirmado con `curl -I`, Fase 3.15: eso bloqueaba cualquier `<img>`
 * plano cross-origin en cualquier navegador real, no solo en el sandbox
 * de desarrollo). Reemplaza la estrategia anterior (URL absoluta al
 * dominio legacy) — ver historial de este archivo para esa version y su
 * justificación original.
 */
const LEGACY_IMAGE_LOCAL_PREFIX = "/legacy-image";

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isSupabaseStorageUrl(value: string): boolean {
  return value.includes("/storage/v1/object/public/");
}

/**
 * Codifica cada segmento de ruta por separado — NUNCA la ruta completa
 * con un solo `encodeURIComponent` (que también codificaría las "/" que
 * deben seguir separando carpetas). Necesario por evidencia real: 157 de
 * 184 rutas legacy contienen espacios en el nombre de archivo.
 */
function encodeLegacyPath(relativePath: string): string {
  return relativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Única función de resolución de imágenes de propiedad. Centralizada a
 * propósito: ningún componente (`PropertyGallery`, `SearchResultCard`,
 * la ficha de detalle) decide por su cuenta si una URL es de Storage o
 * legacy — todos llaman aquí.
 *
 * Caso A — URL absoluta de Supabase Storage: se conserva tal cual.
 * Caso B — ruta relativa legacy: se resuelve contra `LEGACY_IMAGE_LOCAL_PREFIX`
 *   (rewrite same-origin, ver `next.config.mjs`) con cada segmento
 *   correctamente codificado.
 * Caso C — vacío/null: `{ url: null, origin: "missing" }` — explícito,
 *   nunca silencioso. La decisión de qué mostrar (placeholder) es de la
 *   capa visual (`PropertyImage` de `@tpl/ui`, que ya maneja `src`
 *   ausente), no de este resolver.
 *
 * No incluye un caso de "verificar que el archivo realmente responda
 * 200" — eso exigiría una petición de red por imagen en cada render, lo
 * cual no es apropiado aquí. Ese último nivel de seguridad (una imagen
 * que sí resuelve pero falla al cargar) es responsabilidad de un
 * `onError` en el componente que renderiza el `<img>`, como último nivel
 * de seguridad — nunca como sustituto de esta arquitectura.
 */
export function resolvePropertyImageUrl(rawUrl: string | null | undefined): ResolvedImage {
  const value = (rawUrl ?? "").trim();
  if (!value) return { url: null, origin: "missing" };

  if (isAbsoluteUrl(value)) {
    return { url: value, origin: isSupabaseStorageUrl(value) ? "storage" : "external" };
  }

  // El dato crudo real siempre viene con el prefijo "image/" (ej.
  // "image/nacimiento/nac_el_roble/el_roble (5).webp") — el rewrite ya
  // agrega ese "/image/" en su destino, así que se quita acá para no
  // duplicarlo (evita "/legacy-image/image/...", que rompería el rewrite).
  const cleanPath = value.replace(/^\/+/, "").replace(/^image\//i, "");
  return { url: `${LEGACY_IMAGE_LOCAL_PREFIX}/${encodeLegacyPath(cleanPath)}`, origin: "legacy" };
}

export interface ResolvedPropertyImage extends ResolvedImage {
  alt: string | null;
  isCover: boolean;
  order: number;
}

/** Resuelve el arreglo completo de imágenes de una propiedad, preservando alt/isCover/orden ya calculados por `normalizeProperty()`. */
export function resolvePropertyGallery(images: PropertyImage[]): ResolvedPropertyImage[] {
  return images.map((image) => ({ ...resolvePropertyImageUrl(image.url), alt: image.alt, isCover: image.isCover, order: image.order }));
}

/** Conveniencia: portada ya resuelta de una `Property` completa. */
export function resolvePropertyCoverImage(property: Pick<Property, "coverImage">): ResolvedImage {
  return resolvePropertyImageUrl(property.coverImage);
}
