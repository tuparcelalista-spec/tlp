export const scheduleVisitDialogCss = `
.tpl-visit-dialog {
  z-index: var(--tpl-z-modal);
  border: none;
  border-radius: var(--tpl-radius-lg);
  box-shadow: var(--tpl-shadow-xl);
  padding: 0;
  width: min(420px, calc(100vw - var(--tpl-space-6)));
  color: var(--tpl-content-primary);
  background: var(--tpl-surface-raised);
}
.tpl-visit-dialog::backdrop {
  background: rgba(0, 20, 40, 0.5);
}
.tpl-visit-dialog__form {
  display: flex;
  flex-direction: column;
  gap: var(--tpl-space-4);
  padding: var(--tpl-space-6);
}
.tpl-visit-dialog__title { margin: 0; }
.tpl-visit-dialog__intro { margin: 0; color: var(--tpl-content-secondary); }
.tpl-visit-dialog__field { display: flex; flex-direction: column; gap: var(--tpl-space-1); }
.tpl-visit-dialog__field label { font-weight: 600; font-size: 0.875rem; }
.tpl-visit-dialog__actions { display: flex; gap: var(--tpl-space-3); justify-content: flex-end; margin-top: var(--tpl-space-2); }
`;
