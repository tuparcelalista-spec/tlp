import { tasadorBannerCss } from "./tasadorBanner.css";

/**
 * Paridad con el "Banner tasador" de `frontend-v2/index.html` (líneas
 * 454-465): mismo copy exacto, misma posición relativa en la página
 * (después de los resultados destacados/oportunidades, antes de la
 * franja final "¿Listo para encontrar tu parcela?").
 *
 * Decisión de destino del CTA — flagueada a propósito: la herramienta
 * "Tasador TPL" standalone (`plataforma/publicar/tasador.html`) NO está
 * migrada a Next.js todavía (0% según el Plan Maestro, §Fase de
 * herramientas internas). Como `SITE_URL` de este proyecto todavía NO es
 * el dominio de producción real (`www.parcelalista.cl` sigue sirviendo
 * `frontend-v2`, ver `lib/seo/site.ts`), apuntar el CTA a esa misma URL
 * absoluta de producción reproduce exactamente el comportamiento actual
 * en vivo — no es una regresión ni una promesa rota, es la misma
 * herramienta real que ya usa el sitio legacy hoy. Cuando el tasador
 * standalone se porte a Next.js, este único `href` es lo que hay que
 * cambiar a una ruta interna (ej. `/tasador`).
 */
const TASADOR_LEGACY_HREF = "https://www.parcelalista.cl/plataforma/publicar/tasador.html";

export function TasadorBanner() {
  return (
    <aside className="tpl-valuation-banner" role="complementary" aria-label="Tasador TPL">
      <style>{tasadorBannerCss}</style>
      <div className="tpl-valuation-banner__copy">
        <span>Tasador TPL</span>
        <strong>¿Quieres conocer el valor de tu propiedad?</strong>
        <p>
          Referencia orientativa considerando ubicación, superficie, servicios, atributos y mercado comunal.
        </p>
      </div>
      <a href={TASADOR_LEGACY_HREF} className="tpl-valuation-banner__cta">
        Tasar mi propiedad →
      </a>
    </aside>
  );
}
