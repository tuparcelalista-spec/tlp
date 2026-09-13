/**
 * Deliberadamente similar a `components/property/scheduleVisitDialog.css.ts`
 * (mismo patrón de `<dialog>` nativo + tokens de diseño) pero con su propio
 * prefijo de clases — es la segunda vez que aparece este patrón, no la
 * tercera, así que todavía no amerita extraerlo a un primitivo compartido
 * (`@tpl/ui` ya reserva `--tpl-z-modal` para cuando eso pase).
 *
 * Ampliado (2026-09-13) con estilos para chips de especialidades/
 * diferenciadores, grilla de comunas y secciones tituladas — el formulario
 * pasó de 5 campos a un formulario real de postulación de ~20.
 */
export const partnerApplicationDialogCss = `
.tpl-partner-dialog {
  z-index: var(--tpl-z-modal);
  border: none;
  border-radius: var(--tpl-radius-lg);
  box-shadow: var(--tpl-shadow-xl);
  padding: 0;
  width: min(560px, calc(100vw - var(--tpl-space-6)));
  max-height: min(720px, calc(100vh - var(--tpl-space-8)));
  overflow-y: auto;
  color: var(--tpl-content-primary);
  background: var(--tpl-surface-raised);
}
.tpl-partner-dialog::backdrop {
  background: rgba(0, 20, 40, 0.5);
}
.tpl-partner-dialog__form {
  display: flex;
  flex-direction: column;
  gap: var(--tpl-space-4);
  padding: var(--tpl-space-6);
}
.tpl-partner-dialog__title { margin: 0; }
.tpl-partner-dialog__intro { margin: 0; color: var(--tpl-content-secondary); }
.tpl-partner-dialog__section-title {
  margin: var(--tpl-space-2) 0 0;
  padding-top: var(--tpl-space-3);
  border-top: 1px solid var(--tpl-border-default);
  font-size: var(--tpl-text-sm);
  font-weight: 700;
  letter-spacing: var(--tpl-tracking-wide);
  text-transform: uppercase;
  color: var(--tpl-content-secondary);
}
.tpl-partner-dialog__field { display: flex; flex-direction: column; gap: var(--tpl-space-1); }
.tpl-partner-dialog__field label,
.tpl-partner-dialog__field > span { font-weight: 600; font-size: 0.875rem; }
.tpl-partner-dialog__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--tpl-space-3);
}
@media (max-width: 480px) {
  .tpl-partner-dialog__row { grid-template-columns: 1fr; }
}
.tpl-partner-dialog__checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--tpl-space-2);
  font-size: 0.875rem;
  font-weight: 400;
  cursor: pointer;
}
.tpl-partner-dialog__checkbox input { margin-top: 3px; }
.tpl-partner-dialog__checkbox a { color: var(--tpl-color-brand); }
.tpl-partner-dialog__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tpl-space-2);
  margin-bottom: var(--tpl-space-2);
}
.tpl-partner-dialog__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--tpl-border-strong);
  border-radius: var(--tpl-radius-pill);
  font-size: 0.85rem;
  font-weight: 400;
  cursor: pointer;
  background: var(--tpl-surface-raised);
}
.tpl-partner-dialog__comunas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--tpl-border-default);
  border-radius: var(--tpl-radius-md);
  padding: var(--tpl-space-3);
}
.tpl-partner-dialog__comuna {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 400;
  cursor: pointer;
}
.tpl-partner-dialog__actions {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: var(--tpl-space-3);
  justify-content: flex-end;
  margin-top: var(--tpl-space-2);
  padding-top: var(--tpl-space-3);
  background: var(--tpl-surface-raised);
}
`;
