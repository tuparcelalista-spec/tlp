/**
 * CSS del SearchWidget — Bloque 2.4. Mismo patrón que `@tpl/ui` (texto CSS
 * plano, inyectado una vez vía `<style>`), pero vive en `apps/publico`
 * porque el widget es específico de esta app, no un primitivo de diseño
 * reutilizable — no se agregó a `TplDesignSystemStyles`. Usa exclusivamente
 * las variables ya inyectadas por `@tpl/ui` (`--tpl-*`) — ningún color,
 * espaciado o tipografía nuevo.
 */
export const searchWidgetCss = `
.tpl-search-widget-block {
  display: flex;
  flex-direction: column;
  gap: var(--tpl-space-6);
}

/* Alternador property/project */
.tpl-search-mode-toggle {
  display: inline-flex;
  gap: var(--tpl-space-2);
  padding: var(--tpl-space-1);
  background: var(--tpl-surface-sunken);
  border-radius: var(--tpl-radius-pill);
  align-self: flex-start;
}
.tpl-search-mode-toggle__btn {
  border: none;
  background: transparent;
  padding: var(--tpl-space-2) var(--tpl-space-5);
  border-radius: var(--tpl-radius-pill);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-sm);
  font-weight: var(--tpl-weight-medium);
  color: var(--tpl-content-secondary);
  cursor: pointer;
  transition: background-color var(--tpl-duration-fast) ease, color var(--tpl-duration-fast) ease;
}
.tpl-search-mode-toggle__btn--active {
  background: var(--tpl-surface-raised);
  color: var(--tpl-color-brand);
  box-shadow: var(--tpl-shadow-xs);
}

/* Panel de filtros */
.tpl-search-panel {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: var(--tpl-space-5);
  padding: var(--tpl-space-6);
  background: var(--tpl-surface-raised);
  border: 1px solid var(--tpl-border-default);
  border-radius: var(--tpl-radius-lg);
}
@media (min-width: 821px) {
  .tpl-search-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1281px) {
  .tpl-search-panel { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.tpl-search-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--tpl-space-2);
}
.tpl-search-panel__field--wide {
  grid-column: 1 / -1;
}
.tpl-search-panel__label {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-xs);
  font-weight: var(--tpl-weight-black);
  letter-spacing: var(--tpl-tracking-caps);
  text-transform: uppercase;
  color: var(--tpl-content-muted);
}
.tpl-search-panel__range {
  display: flex;
  align-items: center;
  gap: var(--tpl-space-2);
}
.tpl-search-panel__range-sep {
  color: var(--tpl-content-muted);
  font-size: var(--tpl-text-sm);
}
.tpl-search-panel__nearby {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--tpl-space-3);
}
.tpl-search-panel__radius-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tpl-space-2);
}
.tpl-search-panel__hint {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-xs);
  color: var(--tpl-content-muted);
}
.tpl-search-panel__error {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-xs);
  color: var(--tpl-state-danger);
}
.tpl-search-panel__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--tpl-space-3);
  padding-top: var(--tpl-space-2);
  border-top: 1px solid var(--tpl-border-default);
}

/* Resumen de resultados */
.tpl-search-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--tpl-space-3);
}
.tpl-search-summary__count {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-md);
  font-weight: var(--tpl-weight-bold);
  color: var(--tpl-content-primary);
}
.tpl-search-summary__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tpl-space-2);
}
.tpl-search-summary__ranking {
  display: flex;
  align-items: center;
  gap: var(--tpl-space-2);
}
.tpl-search-summary__ranking label {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-sm);
  color: var(--tpl-content-secondary);
  white-space: nowrap;
}

/* Estado de proyecto (sin fuente real de casas todavía) */
.tpl-search-project-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  border: 1px solid var(--tpl-border-default);
  border-radius: var(--tpl-radius-lg);
  overflow: hidden;
  background: var(--tpl-surface-raised);
}
@media (min-width: 481px) {
  .tpl-search-project-card { grid-template-columns: 1fr 1fr; }
}
.tpl-search-project-card__section {
  padding: var(--tpl-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--tpl-space-2);
}
.tpl-search-project-card__section + .tpl-search-project-card__section {
  border-top: 1px solid var(--tpl-border-default);
}
@media (min-width: 481px) {
  .tpl-search-project-card__section + .tpl-search-project-card__section {
    border-top: none;
    border-left: 1px solid var(--tpl-border-default);
  }
}
.tpl-search-project-card__label {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-xs);
  font-weight: var(--tpl-weight-black);
  letter-spacing: var(--tpl-tracking-caps);
  text-transform: uppercase;
  color: var(--tpl-content-muted);
}
.tpl-search-project-card__total {
  grid-column: 1 / -1;
  padding: var(--tpl-space-4) var(--tpl-space-5);
  border-top: 1px solid var(--tpl-border-default);
  background: var(--tpl-surface-sunken);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Estados idle/loading/error viven sobre EmptyState/LoadingState de @tpl/ui; solo se ajusta el contenedor. */
.tpl-search-state-container {
  padding: var(--tpl-space-10) var(--tpl-space-6);
  text-align: center;
  background: var(--tpl-surface-raised);
  border: 1px dashed var(--tpl-border-default);
  border-radius: var(--tpl-radius-lg);
}
`;
