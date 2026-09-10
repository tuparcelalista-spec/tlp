export const inputCss = `
.tpl-input {
  width: 100%;
  min-height: 46px;
  padding: 11px 14px;
  border: 1px solid var(--tpl-border-strong);
  border-radius: var(--tpl-radius-xs);
  background: var(--tpl-surface-raised);
  color: var(--tpl-content-primary);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-md);
  transition: border-color var(--tpl-duration-fast) ease, box-shadow var(--tpl-duration-fast) ease;
}
.tpl-input:hover:not(:disabled) { border-color: var(--tpl-navy-300); }
.tpl-input:focus {
  outline: none;
  border-color: var(--tpl-navy-700);
  box-shadow: var(--tpl-focus-ring);
}
.tpl-input::placeholder { color: var(--tpl-content-muted); }
.tpl-input:disabled { background: var(--tpl-surface-canvas); color: var(--tpl-content-muted); cursor: not-allowed; }
.tpl-input[aria-invalid="true"] {
  border-color: var(--tpl-state-danger);
  box-shadow: 0 0 0 3px rgba(165, 50, 43, 0.18);
}
`;
