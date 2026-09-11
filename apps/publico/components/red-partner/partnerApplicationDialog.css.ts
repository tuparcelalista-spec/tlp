/**
 * Deliberadamente similar a `components/property/scheduleVisitDialog.css.ts`
 * (mismo patrón de `<dialog>` nativo + tokens de diseño) pero con su propio
 * prefijo de clases — es la segunda vez que aparece este patrón, no la
 * tercera, así que todavía no amerita extraerlo a un primitivo compartido
 * (`@tpl/ui` ya reserva `--tpl-z-modal` para cuando eso pase).
 */
export const partnerApplicationDialogCss = `
.tpl-partner-dialog {
  z-index: var(--tpl-z-modal);
  border: none;
  border-radius: var(--tpl-radius-lg);
  box-shadow: var(--tpl-shadow-xl);
  padding: 0;
  width: min(480px, calc(100vw - var(--tpl-space-6)));
  max-height: min(640px, calc(100vh - var(--tpl-space-8)));
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
.tpl-partner-dialog__field { display: flex; flex-direction: column; gap: var(--tpl-space-1); }
.tpl-partner-dialog__field label { font-weight: 600; font-size: 0.875rem; }
.tpl-partner-dialog__actions { display: flex; gap: var(--tpl-space-3); justify-content: flex-end; margin-top: var(--tpl-space-2); }
`;
