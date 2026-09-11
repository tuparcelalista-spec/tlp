import Link from "next/link";
import type { CommuneRegionGroup } from "../../lib/search/presentation";
import { communeRibbonCss } from "./communeRibbon.css";

export interface CommuneRibbonProps {
  communesByRegion: CommuneRegionGroup[];
}

/**
 * Paridad con `frontend-v2/js/index.js:populateCommunes()` (agrupación
 * por región, mismo orden real: Biobío, Ñuble, La Araucanía, Maule, Otras
 * zonas) — la diferencia real es que cada chip es un `<Link>` navegable
 * (`/propiedades?comuna=...`), no un `<button>` que dispara JS en la
 * misma página. Eso es justo lo que le da valor SEO real: Google puede
 * rastrear cada comuna como su propia URL indexable (ver `generateMetadata`
 * de `/propiedades`), no solo lo que un usuario ve tras un clic.
 *
 * Scroll horizontal solo con CSS (`overflow-x:auto` + `scroll-behavior:
 * smooth`) — sin flechas ni JS de desplazamiento como en el legacy: el
 * gesto nativo de touch/trackpad ya cubre "suave y limpio en mobile/
 * desktop" sin agregar una dependencia ni un Client Component.
 */
export function CommuneRibbon({ communesByRegion }: CommuneRibbonProps) {
  if (communesByRegion.length === 0) return null;

  return (
    <nav className="tpl-commune-ribbon" aria-label="Comunas disponibles por región">
      <style>{communeRibbonCss}</style>
      <div className="tpl-commune-ribbon__track">
        {communesByRegion.map(({ region, communes }) => (
          <div className="tpl-commune-ribbon__group" key={region}>
            <span className="tpl-commune-ribbon__region">{region}</span>
            {communes.map((commune) => (
              <Link key={commune} href={`/propiedades?comuna=${encodeURIComponent(commune)}`} className="tpl-commune-ribbon__chip">
                {commune}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
