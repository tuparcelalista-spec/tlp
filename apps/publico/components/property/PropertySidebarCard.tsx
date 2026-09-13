"use client";

import { ScheduleVisitDialog } from "./ScheduleVisitDialog";
import { propertySidebarCardCss } from "./propertySidebarCard.css";

export interface PropertySidebarCardProps {
  price: number | null;
  priceLabel?: string;
  landAreaM2?: number | null;
  communalBase?: number | null;
  recommendedValue?: number | null;
  propertyTitle: string;
  propertyCode: string;
  whatsappPhone: string;
}

const MONEY_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function formatMoney(amount: number): string {
  return MONEY_FORMATTER.format(amount);
}

export function PropertySidebarCard({
  price,
  priceLabel,
  landAreaM2,
  communalBase,
  recommendedValue,
  propertyTitle,
  propertyCode,
  whatsappPhone,
}: PropertySidebarCardProps) {
  const pubPrice = price || 0;
  const recPrice = recommendedValue || 0;
  const basePrice = communalBase || 0;

  // Cálculo de valor m²
  const valorM2 = pubPrice && landAreaM2 && landAreaM2 > 0 ? Math.round(pubPrice / landAreaM2) : null;

  // Clasificación de alineación de mercado
  let badgeText = "Alineado al mercado";
  let badgeVariant = "fair";
  if (pubPrice > 0 && recPrice > 0) {
    if (pubPrice <= recPrice * 0.9) {
      badgeText = "Oportunidad TPL";
      badgeVariant = "opportunity";
    } else if (pubPrice > recPrice * 1.1) {
      badgeText = "Sobre mercado";
      badgeVariant = "over";
    }
  }

  const whatsappMsg = encodeURIComponent(
    `Hola, me interesa recibir más información sobre "${propertyTitle}" (código ${propertyCode}).`,
  );
  const offerMsg = encodeURIComponent(
    `Hola, me interesa hacer una oferta formal por "${propertyTitle}" (código ${propertyCode}). ¿Podemos conversar?`,
  );
  const cotizadorUrl = `/cotizador?parcelaId=${encodeURIComponent(propertyCode)}`;

  return (
    <aside className="tpl-sidebar-sticky" aria-label="Información comercial y contacto">
      <style>{propertySidebarCardCss}</style>

      {/* Bloque de Precio */}
      <div className="tpl-sidebar-price-block">
        <div className="tpl-sidebar-price">{priceLabel || (pubPrice ? formatMoney(pubPrice) : "Consultar precio")}</div>
        <div className="tpl-sidebar-price-sub">Valor publicado por el propietario</div>
      </div>

      {/* Caja de Inteligencia de Mercado TPL */}
      <div className="tpl-sidebar-intel-box">
        <div className="tpl-sidebar-intel-head">
          <span>Inteligencia de Mercado TPL</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>

        {basePrice > 0 && (
          <div className="tpl-sidebar-intel-row">
            <span>Mediana comunal suelo:</span>
            <strong>{formatMoney(basePrice)}</strong>
          </div>
        )}

        {valorM2 && (
          <div className="tpl-sidebar-intel-row">
            <span>Valor por m²:</span>
            <strong>{formatMoney(valorM2)} / m²</strong>
          </div>
        )}

        <div className={`tpl-sidebar-badge tpl-sidebar-badge--${badgeVariant}`}>
          {badgeText}
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="tpl-sidebar-actions">
        {/* Agendar Visita (Modal interactivo) */}
        <ScheduleVisitDialog
          propertyTitle={propertyTitle}
          propertyCode={propertyCode}
          whatsappPhone={whatsappPhone}
        />

        {/* Consultar por WhatsApp */}
        <a
          href={`https://wa.me/${whatsappPhone}?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tpl-btn-action tpl-btn-action--whatsapp"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.031 2c-5.513 0-9.997 4.476-9.997 9.989 0 1.76.46 3.477 1.332 4.989L2 22.016l5.176-1.337a9.96 9.96 0 0 0 4.855 1.258h.004c5.513 0 9.997-4.476 9.997-9.99 0-2.67-1.04-5.178-2.928-7.065A9.92 9.92 0 0 0 12.031 2zm0 18.27h-.003a8.27 8.27 0 0 1-4.218-1.154l-.302-.18-3.136.81.836-3.048-.198-.314a8.27 8.27 0 0 1-1.27-4.405c0-4.57 3.72-8.29 8.293-8.29a8.24 8.24 0 0 1 5.867 2.428 8.23 8.23 0 0 1 2.43 5.869c0 4.57-3.72 8.293-8.297 8.293z" />
          </svg>
          Consultar por WhatsApp
        </a>

        {/* Hacer una oferta */}
        <a
          href={`https://wa.me/${whatsappPhone}?text=${offerMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tpl-btn-action tpl-btn-action--secondary"
        >
          Hacer una oferta
        </a>

        {/* Cotizar Casa en esta parcela */}
        <a href={cotizadorUrl} className="tpl-btn-action tpl-btn-action--gold">
          ✨ Cotizar proyecto de casa
        </a>
      </div>

      {/* Sello de Asesoría Humana TPL */}
      <div className="tpl-sidebar-advisor">
        <div className="tpl-sidebar-advisor-avatar" aria-hidden="true">
          TPL
        </div>
        <div className="tpl-sidebar-advisor-info">
          <span className="tpl-sidebar-advisor-title">Asesoría Humana</span>
          <span className="tpl-sidebar-advisor-desc">
            Verificamos cada aspecto legal, técnico y territorial de tu compra.
          </span>
        </div>
      </div>
    </aside>
  );
}
