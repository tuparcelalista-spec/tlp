/**
 * Constantes de SEO — Fase 3.7, endurecido en P0-01 (2026-09-12).
 *
 * `SITE_URL` NO se hardcodea a `www.parcelalista.cl`: ese dominio sigue
 * siendo de `frontend-v2` durante la coexistencia (ver
 * `docs/TPL-FASE-3-COEXISTENCIA-AUDITORIA.md`; el mecanismo de corte de
 * tráfico no se ha ejecutado). Se lee de `NEXT_PUBLIC_SITE_URL` — cuando
 * se decida el dominio real de coexistencia (subdominio de prueba u otro),
 * solo hace falta definir esa variable, sin tocar código.
 *
 * === POR QUÉ ESTE ARCHIVO YA NO TIENE UN FALLBACK SILENCIOSO ===
 *
 * Hasta el 2026-09-12 esta constante era:
 *
 *     export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
 *
 * Con `NEXT_PUBLIC_SITE_URL` sin definir (su estado real en el proyecto
 * Vercel `tpl-publico-preview`: 0 variables de entorno, verificado en la
 * auditoría de coexistencia §2), ese `||` hacía que CADA build de
 * producción emitiera:
 *
 *   - `<link rel="canonical" href="http://localhost:3000/...">` en las 14
 *     rutas públicas,
 *   - Open Graph y Twitter apuntando a localhost,
 *   - y un `/sitemap.xml` completo — las 8 URLs fijas MÁS una entrada por
 *     cada parcela publicada — con todas sus URLs en `localhost:3000`.
 *
 * Mientras el proyecto de preview no tenga dominio, eso es inofensivo.
 * Pero la decisión de coexistencia ya aprobada (Opción D) empieza
 * precisamente por asignarle un subdominio. En el instante en que ese
 * subdominio exista, el sitio quedaría publicado declarándole a Google que
 * el contenido canónico de Tu Parcela Lista vive en `localhost`. Un
 * canonical incorrecto no es un bug que se arregla y desaparece: es una
 * señal que el buscador ya procesó.
 *
 * Regla nueva, deliberadamente estricta:
 *
 *   - `next dev` (NODE_ENV === "development") → si falta la variable, usa
 *     `http://localhost:3000` y AVISA por consola. El desarrollo local no
 *     se rompe.
 *   - Cualquier otro entorno (`next build`, `next start`, Vercel preview y
 *     production, CI) → NO hay fallback. Si la variable falta, está vacía,
 *     no es una URL http(s) válida, o apunta a localhost, el módulo LANZA
 *     y el build falla con un mensaje explícito.
 *
 * El fallo ocurre en tiempo de build, no en el índice de Google. Ese es
 * todo el objetivo.
 *
 * Nota de seguridad de ejecución: los 13 consumidores de `SITE_URL` /
 * `SITE_NAME` (`app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts` y 10
 * `page.tsx`) son Server Components — verificado archivo por archivo. Este
 * `throw` a nivel de módulo nunca se evalúa en el navegador.
 */

const DEV_FALLBACK_SITE_URL = "http://localhost:3000";

/**
 * `process.env.NEXT_PUBLIC_*` y `process.env.NODE_ENV` se escriben de forma
 * literal a propósito: Next.js los reemplaza estáticamente en tiempo de
 * build y ese reemplazo NO ocurre si se accede a ellos de forma computada
 * (`process.env[nombre]`).
 */
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

/** Solo informativo dentro del mensaje de error: Vercel la define como "production" | "preview" | "development". */
const VERCEL_ENV = process.env.VERCEL_ENV;

function describeEntorno(): string {
  const partes = [`NODE_ENV=${process.env.NODE_ENV ?? "(sin definir)"}`];
  if (VERCEL_ENV) partes.push(`VERCEL_ENV=${VERCEL_ENV}`);
  return partes.join(", ");
}

function errorDeConfiguracion(problema: string): Error {
  return new Error(
    [
      "",
      "═══════════════════════════════════════════════════════════════════",
      " CONFIGURACIÓN INVÁLIDA: NEXT_PUBLIC_SITE_URL",
      "═══════════════════════════════════════════════════════════════════",
      "",
      ` Problema: ${problema}`,
      ` Entorno:  ${describeEntorno()}`,
      "",
      " Esta variable define el dominio canónico del sitio. Sin ella, cada",
      " canonical, cada etiqueta Open Graph/Twitter y TODAS las URLs de",
      " /sitemap.xml quedarían apuntando a un dominio incorrecto. Por eso",
      " el build falla acá en vez de publicar SEO roto.",
      "",
      " Cómo resolverlo:",
      "",
      "  · Vercel (preview o production):",
      "      vercel env add NEXT_PUBLIC_SITE_URL preview",
      "      vercel env add NEXT_PUBLIC_SITE_URL production",
      "    …o Project Settings → Environment Variables. Después, redeploy.",
      "",
      "  · Build local (`pnpm next:build` corre con NODE_ENV=production):",
      "      agregar a apps/publico/.env.local:",
      "      NEXT_PUBLIC_SITE_URL=https://<dominio-de-este-entorno>",
      "    (o traerla desde Vercel con `vercel env pull`)",
      "",
      "  · Desarrollo (`pnpm next:dev`): no hace falta — se usa",
      `    ${DEV_FALLBACK_SITE_URL} automáticamente.`,
      "",
      " Formato esperado: URL absoluta http(s), sin barra final.",
      "   Ej.: https://next-preview.parcelalista.cl",
      "",
      " Ver docs/TPL-REPORTE-MAESTRO-ESTADO-MIGRACION.md → P0-01.",
      "═══════════════════════════════════════════════════════════════════",
      "",
    ].join("\n"),
  );
}

function resolverSiteUrl(): string {
  const valor = (RAW_SITE_URL ?? "").trim();

  // 1. Ausente o vacía.
  if (!valor) {
    if (IS_DEVELOPMENT) {
      console.warn(
        `[TPL] NEXT_PUBLIC_SITE_URL no está definida — usando ${DEV_FALLBACK_SITE_URL} (solo desarrollo). ` +
          "En preview/production el build fallará sin esta variable.",
      );
      return DEV_FALLBACK_SITE_URL;
    }
    throw errorDeConfiguracion("la variable no está definida o está vacía.");
  }

  // 2. Tiene que ser una URL absoluta parseable.
  let parsed: URL;
  try {
    parsed = new URL(valor);
  } catch {
    throw errorDeConfiguracion(`"${valor}" no es una URL absoluta válida (falta el esquema, p. ej. "https://").`);
  }

  // 3. Solo http(s): `metadataBase` de Next.js y los canonical lo exigen.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw errorDeConfiguracion(`"${valor}" usa el esquema "${parsed.protocol}"; solo se admite http o https.`);
  }

  // 4. localhost fuera de desarrollo = el mismo bug por la puerta trasera.
  //    Definir la variable con este valor en Vercel reintroduciría
  //    exactamente el fallback silencioso que este archivo elimina.
  if (!IS_DEVELOPMENT && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1")) {
    throw errorDeConfiguracion(
      `apunta a "${parsed.hostname}", que no puede ser el dominio canónico de un entorno de preview o producción.`,
    );
  }

  // 5. Sin barra final: los 13 consumidores componen `${SITE_URL}/ruta`.
  //    Una barra final produciría "https://dominio//ruta", que Google trata
  //    como una URL distinta de la real.
  return valor.replace(/\/+$/, "");
}

export const SITE_URL = resolverSiteUrl();
export const SITE_NAME = "Tu Parcela Lista";
