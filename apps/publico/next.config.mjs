/** @type {import('next').NextConfig} */
// Bloque 3.16 (autorizado explícitamente por el usuario, reemplaza la
// decisión "sin rewrites" de Fase 1/Bloque 2.6): rewrite same-origin hacia
// las imágenes legacy de `frontend-v2` para eliminar el bloqueo real de
// `Cross-Origin-Resource-Policy: same-site` que `www.parcelalista.cl`
// envía en `/image/**` (confirmado con `curl -I` real, Fase 3.15) — un
// <img> plano cross-origin queda bloqueado en cualquier navegador real,
// pero al pedirse desde el propio origen de `apps/publico` el navegador
// nunca aplica esa política. Es un simple proxy de solo lectura hacia una
// URL que YA es pública hoy — no crea infraestructura nueva, no toca
// `frontend-v2` ni Vercel ni DNS, es reversible borrando esta entrada.
const nextConfig = {
  async rewrites() {
    return [{ source: "/legacy-image/:path*", destination: "https://www.parcelalista.cl/image/:path*" }];
  },
  /**
   * P1-08 — Redirecciones 301 permanentes desde URLs legacy (.html)
   * hacia las rutas canónicas de Next.js para preservar SEO y enlaces entrantes.
   */
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/cotizador.html", destination: "/cotizador", permanent: true },
      { source: "/como-comprar.html", destination: "/como-comprar", permanent: true },
      { source: "/campo-chileno.html", destination: "/campo-chileno", permanent: true },
      { source: "/terminos.html", destination: "/terminos", permanent: true },
      { source: "/politica-privacidad.html", destination: "/privacidad", permanent: true },
      { source: "/privacidad.html", destination: "/privacidad", permanent: true },
      { source: "/red-partner-v2.html", destination: "/red-partner", permanent: true },
      { source: "/red-partner-v2/:path*", destination: "/red-partner", permanent: true },
      { source: "/red-partner.html", destination: "/red-partner", permanent: true },
      { source: "/publicar.html", destination: "/publicar", permanent: true },
      { source: "/publicar-v2.html", destination: "/publicar", permanent: true },
      { source: "/tasador.html", destination: "/publicar", permanent: true },
      { source: "/propiedades.html", destination: "/propiedades", permanent: true },
      { source: "/parcela.html", destination: "/propiedades", permanent: true },
    ];
  },
  /**
   * P0-01 — protección anti-indexación del dominio temporal (2026-09-12).
   *
   * `NEXT_PUBLIC_SITE_URL` apunta hoy a `tpl-publico-preview.vercel.app`
   * por decisión del dueño, y ese dominio NO debe entrar al índice de
   * Google: la decisión de coexistencia aprobada
   * (`docs/TPL-FASE-3-COEXISTENCIA-AUDITORIA.md`, Opción D) exige que el
   * entorno de prueba vaya con `noindex` para no competir con contenido
   * duplicado contra `www.parcelalista.cl`.
   *
   * Se resuelve con una cabecera condicionada por host y NO dentro de
   * `app/robots.ts`, por una razón concreta: `robots.ts` se prerenderiza
   * de forma estática y no tiene acceso al host de la petición, así que no
   * puede distinguir "me están sirviendo desde vercel.app" de "me están
   * sirviendo desde el dominio definitivo". El `has: [{ type: "host" }]`
   * de Next.js sí se evalúa por petición.
   *
   * Efecto: cualquier host terminado en `.vercel.app` — el dominio de
   * producción de este proyecto y TODAS las URLs de deployment de preview —
   * responde `X-Robots-Tag: noindex, nofollow` en cada ruta. El día que el
   * sitio se sirva desde un dominio propio, la regla deja de aplicar sola,
   * sin tocar código.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: ".*\\.vercel\\.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Supabase Storage — bucket público tpl-propiedades-propietario.
      // (El dominio legacy ya no se usa como URL absoluta — ver el
      // rewrite `/legacy-image/**` arriba y `resolvePropertyImageUrl.ts`.)
      { protocol: "https", hostname: "hwyscirbycojwndyzozn.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
