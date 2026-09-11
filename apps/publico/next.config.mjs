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
