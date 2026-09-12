"use client";

import { Grid, Button, EmptyState, ErrorState, LoadingState, Skeleton, Stack } from "@tpl/ui";
import type { SearchViewModel } from "../../lib/search/presentation";
import type { SearchStatus } from "./searchState";
import { GENERIC_SEARCH_ERROR_MESSAGE } from "./searchState";
import { SearchResultCard, SearchProjectCombinationCard } from "./SearchResultCard";

import { buildWhatsAppLink } from "../../lib/contact";

export interface SearchResultsProps {
  status: SearchStatus;
  viewModel: SearchViewModel | null;
  projectModeUnavailable: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
}

/**
 * Renderiza `SearchViewModel` (nunca `Property`/`SearchResult` directo).
 * Cada rama de `status` es mutuamente excluyente — nunca se combinan dos
 * estados a la vez.
 */
export function SearchResults({ status, viewModel, projectModeUnavailable, onRetry, onClearFilters }: SearchResultsProps) {
  if (projectModeUnavailable) {
    return (
      <div className="tpl-search-state-container">
        <EmptyState
          title="Búsqueda de proyectos disponible próximamente"
          description="La búsqueda de proyectos parcela + casa estará disponible próximamente. Por ahora puedes buscar parcelas y casas por separado en el modo Propiedades."
        />
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="tpl-search-state-container">
        <EmptyState
          title="Encuentra tu parcela o proyecto ideal"
          description="Usa los filtros para buscar parcelas por comuna, precio o cercanía — o explora el modo Proyecto para calcular combinaciones de parcela + casa prefabricada dentro de tu presupuesto."
        />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="tpl-search-state-container">
        <LoadingState label="Buscando en catálogo y calculando opciones…" />
        <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} style={{ marginTop: "24px", textAlign: "left" }}>
          {[0, 1, 2].map((key) => (
            <Stack key={key} direction="column" gap={2}>
              <Skeleton height="180px" radius="12px" />
              <Skeleton height="1.2em" width="70%" />
              <Skeleton height="1em" width="40%" />
            </Stack>
          ))}
        </Grid>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="tpl-search-state-container">
        <ErrorState title={GENERIC_SEARCH_ERROR_MESSAGE} description="Puedes intentarlo de nuevo en unos segundos." action={<Button onClick={onRetry}>Reintentar</Button>} />
      </div>
    );
  }

  if (status === "empty") {
    const radarWaLink = buildWhatsAppLink(
      "Hola, busqué propiedades en el Buscador TPL y no encontré parcelas disponibles con esos filtros. Me interesa activar el Radar TPL para que me avisen o me asesoren con opciones en la zona.",
    );

    return (
      <div className="tpl-search-state-container">
        <EmptyState
          title="No encontramos propiedades con estos criterios directos."
          description="Intenta ampliar el rango de precio o superficie, o quitar alguna característica."
          action={<Button variant="secondary" onClick={onClearFilters}>Limpiar filtros</Button>}
        />

        {/* P2-07 — Radar de Mercado TPL (paridad con frontend-v2/js/index.js) */}
        <div
          style={{
            marginTop: "32px",
            background: "linear-gradient(135deg, #0f2942 0%, #1e3a8a 100%)",
            color: "#fff",
            borderRadius: "16px",
            padding: "32px 24px",
            textAlign: "left",
            boxShadow: "0 10px 25px rgba(0, 40, 80, 0.15)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: "#60a5fa",
              border: "1px solid #60a5fa",
              padding: "3px 10px",
              borderRadius: "999px",
              marginBottom: "14px",
            }}
          >
            RADAR DE MERCADO TPL
          </span>
          <h3 style={{ fontSize: "1.35rem", color: "#fff", margin: "0 0 10px" }}>
            ¿No encontraste lo que buscabas? Activamos el Radar por ti
          </h3>
          <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 18px" }}>
            Tu Parcela Lista monitorea transacciones y propiedades en el mercado abierto. Si buscas en una comuna específica o con un presupuesto definido, nuestro equipo puede rastrear opciones fuera de catálogo, auditar títulos legales y negociar el precio justo.
          </p>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "16px 20px",
              marginBottom: "20px",
            }}
          >
            <strong style={{ display: "block", color: "#93c5fd", marginBottom: "8px", fontSize: "0.9rem" }}>
              ¿Cómo te ayuda el Radar TPL?
            </strong>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#e2e8f0", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <li>Rastreamos parcelas y campos en portales externos y contactos directos.</li>
              <li>Validamos antecedentes legales (Rol Propio, CBR, SAG) antes de que firmes nada.</li>
              <li>Acompañamiento imparcial de tasadores y especialistas locales en terreno.</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Button href={radarWaLink} variant="whatsapp">
              Activar Radar TPL por WhatsApp
            </Button>
            <Button variant="secondary" onClick={onClearFilters}>
              Ver todo el catálogo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // status === "success"
  if (!viewModel) return null;

  if (viewModel.mode === "project") {
    return (
      <Grid columns={{ mobile: 1, tablet: 1, desktop: 2 }}>
        {viewModel.items.map((combination) => (
          <SearchProjectCombinationCard key={`${combination.property.id}-${combination.houseName}`} combination={combination} />
        ))}
      </Grid>
    );
  }

  return (
    <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
      {viewModel.items.map((card, index) => (
        <SearchResultCard key={card.id} card={card} priority={index === 0} />
      ))}
    </Grid>
  );
}
