import Link from "next/link";
import { trustBarCss } from "./trustBar.css";

export interface TrustBarProps {
  totalPublished: number;
  communeCount: number;
  regionCount: number;
}

/**
 * Paridad con `frontend-v2` (`#trust-parcelas`/`#trust-comunas`/
 * `#trust-regiones`): mismo formato de texto ("${total}+ parcelas
 * publicadas · ${comunas} comunas disponibles · ${regiones} regiones
 * cubiertas · Explorar ahora →"), pero calculado en el servidor a partir
 * del catálogo real (`getHomeCatalogSummary()`) — sin `MutationObserver`
 * ni actualización diferida en el cliente, porque acá el dato ya está
 * completo antes del primer render.
 *
 * Diferencia real respecto al legacy, documentada a propósito:
 * 1) No se aplica el piso artificial `Math.max(regiones, 3)` que tenía
 *    `index.js` — con los 33 datos reales de hoy da 3 regiones igual
 *    (Biobío/Ñuble/La Araucanía), pero si en el futuro hay menos, se
 *    muestra el número real y no uno inflado.
 * 2) El CTA "Explorar ahora →" apunta a `/propiedades` (el catálogo
 *    completo real, ya hidratado por SSR) en vez de a un ancla `#buscador`
 *    en la misma página — el buscador de la Home ya es lo primero visible,
 *    así que un ancla a la misma sección no aportaría nada.
 */
export function TrustBar({ totalPublished, communeCount, regionCount }: TrustBarProps) {
  if (totalPublished === 0) return null;

  return (
    <p className="tpl-trust-bar" aria-label="Estadísticas del catálogo">
      <style>{trustBarCss}</style>
      <span>
        <strong>{totalPublished}+</strong> parcelas publicadas
      </span>
      <span className="tpl-trust-bar__sep" aria-hidden="true">
        ·
      </span>
      <span>
        <strong>{communeCount}</strong> comunas disponibles
      </span>
      <span className="tpl-trust-bar__sep" aria-hidden="true">
        ·
      </span>
      <span>
        <strong>{regionCount}</strong> regiones cubiertas
      </span>
      <span className="tpl-trust-bar__sep" aria-hidden="true">
        ·
      </span>
      <Link href="/propiedades" className="tpl-trust-bar__cta">
        Explorar ahora →
      </Link>
    </p>
  );
}
