import type { PropertyCharacteristics } from "@tpl/core";
import { propertyFeaturesRibbonCss } from "./propertyFeaturesRibbon.css";

export interface PropertyFeaturesRibbonProps {
  characteristics: PropertyCharacteristics;
  areaLabel?: string;
  landAreaM2?: number | null;
  description?: string;
}

function cleanFeatureValue(val: string | null | undefined, fallback: string): string {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (!trimmed || /^(null|undefined|-|por confirmar)$/i.test(trimmed)) return fallback;
  return trimmed;
}

function formatWater(water: string | null | undefined): string {
  if (!water) return "Por confirmar";
  const w = water.toLowerCase();
  if (/^(no|sin)\b/.test(w)) return "Sin agua";
  if (w.includes("apr")) return "Agua APR";
  if (w.includes("pozo")) return "Pozo profundo";
  if (w.includes("vertiente") || w.includes("arroyo") || w.includes("rio") || w.includes("río")) return "Vertiente / Río";
  if (w.includes("factibilidad")) return "Factibilidad de agua";
  if (w.includes("si") || w.includes("sí") || w.includes("con")) return "Con agua";
  return cleanFeatureValue(water, "Por confirmar");
}

function formatPower(power: string | null | undefined): string {
  if (!power) return "Por confirmar";
  const p = power.toLowerCase();
  if (/^(no|sin)\b/.test(p)) return "Sin electricidad";
  if (p.includes("empalme")) return "Empalme listo";
  if (p.includes("solar") || p.includes("fotovoltaic")) return "Energía solar";
  if (p.includes("red") || p.includes("publica") || p.includes("pública")) return "Red eléctrica pública";
  if (p.includes("factibilidad")) return "Factibilidad de luz";
  if (p.includes("si") || p.includes("sí") || p.includes("con")) return "Con electricidad";
  return cleanFeatureValue(power, "Por confirmar");
}

function formatRol(rol: string | null | undefined): string {
  if (!rol) return "Por confirmar";
  const r = rol.toLowerCase();
  if (r.includes("propio") || r.includes("individual") || r.includes("si") || r.includes("sí")) return "Rol Propio Individual";
  if (r.includes("tramite") || r.includes("trámite")) return "Rol en trámite";
  if (r.includes("cesion") || r.includes("cesión") || r.includes("derecho")) return "Cesión de derechos";
  return cleanFeatureValue(rol, "Rol propio");
}

function formatNature(c: PropertyCharacteristics): string {
  if (c.naturalFeatures && c.naturalFeatures.length > 0) {
    return c.naturalFeatures[0]!;
  }
  if (c.vegetation) return c.vegetation;
  if (c.mainView) return `Vista ${c.mainView.toLowerCase()}`;
  return "Entorno natural";
}

export function PropertyFeaturesRibbon({
  characteristics,
  areaLabel,
  landAreaM2,
  description = "",
}: PropertyFeaturesRibbonProps) {
  const waterLabel = formatWater(characteristics.water);
  const powerLabel = formatPower(characteristics.electricity);
  const rolLabel = formatRol(characteristics.legalSituation);
  const natureLabel = formatNature(characteristics);
  const surfaceLabel = areaLabel || (landAreaM2 ? `${landAreaM2.toLocaleString("es-CL")} m²` : "5.000 m²");

  // Deducción de virtudes destacadas para los chips
  const virtudes: { label: string; highlight?: boolean }[] = [];
  const text = `${description} ${JSON.stringify(characteristics)}`.toLowerCase();

  if (rolLabel.toLowerCase().includes("propio")) {
    virtudes.push({ label: "Rol Propio", highlight: true });
  }
  if (!waterLabel.toLowerCase().includes("sin") && !waterLabel.toLowerCase().includes("por confirmar")) {
    virtudes.push({ label: waterLabel });
  }
  if (!powerLabel.toLowerCase().includes("sin") && !powerLabel.toLowerCase().includes("por confirmar")) {
    virtudes.push({ label: powerLabel });
  }
  if (landAreaM2 && landAreaM2 >= 10000) {
    virtudes.push({ label: "1 Hectárea o más", highlight: true });
  }
  if (/credito|crédito|facilidad|cuotas|financiamiento/.test(text)) {
    virtudes.push({ label: "Facilidad de pago", highlight: true });
  }
  if (/bosque|nativo|arboles|árboles|rio|río|estero|laguna/.test(text)) {
    virtudes.push({ label: "Bosque / Naturaleza" });
  }
  if (/camino|pavimento|asfalto|acceso/.test(text)) {
    virtudes.push({ label: "Buen acceso" });
  }
  if (/colegio|supermercado|hospital|comercio|cerca/.test(text)) {
    virtudes.push({ label: "Servicios cerca" });
  }

  return (
    <div className="tpl-features-section">
      <style>{propertyFeaturesRibbonCss}</style>

      {/* Ribbon de 5 Atributos Clave */}
      <div className="tpl-features-ribbon">
        {/* Agua */}
        <div className="tpl-feature-card">
          <div className="tpl-feature-icon-wrap tpl-feature-icon-wrap--water" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <div className="tpl-feature-info">
            <span className="tpl-feature-label">Agua</span>
            <span className="tpl-feature-val" title={waterLabel}>{waterLabel}</span>
          </div>
        </div>

        {/* Luz */}
        <div className="tpl-feature-card">
          <div className="tpl-feature-icon-wrap tpl-feature-icon-wrap--power" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="tpl-feature-info">
            <span className="tpl-feature-label">Luz</span>
            <span className="tpl-feature-val" title={powerLabel}>{powerLabel}</span>
          </div>
        </div>

        {/* Rol */}
        <div className="tpl-feature-card">
          <div className="tpl-feature-icon-wrap tpl-feature-icon-wrap--deed" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="tpl-feature-info">
            <span className="tpl-feature-label">Rol</span>
            <span className="tpl-feature-val" title={rolLabel}>{rolLabel}</span>
          </div>
        </div>

        {/* Entorno */}
        <div className="tpl-feature-card">
          <div className="tpl-feature-icon-wrap tpl-feature-icon-wrap--nature" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div className="tpl-feature-info">
            <span className="tpl-feature-label">Entorno</span>
            <span className="tpl-feature-val" title={natureLabel}>{natureLabel}</span>
          </div>
        </div>

        {/* Superficie */}
        <div className="tpl-feature-card">
          <div className="tpl-feature-icon-wrap tpl-feature-icon-wrap--area" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div className="tpl-feature-info">
            <span className="tpl-feature-label">Superficie</span>
            <span className="tpl-feature-val" title={surfaceLabel}>{surfaceLabel}</span>
          </div>
        </div>
      </div>

      {/* Chips de Virtudes */}
      {virtudes.length > 0 && (
        <div className="tpl-virtudes-wrap" aria-label="Virtudes de la propiedad">
          {virtudes.slice(0, 6).map((v) => (
            <span
              key={v.label}
              className={`tpl-virtud-chip${v.highlight ? " tpl-virtud-chip--highlight" : ""}`}
            >
              {v.highlight ? "✨ " : "✓ "}
              {v.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
