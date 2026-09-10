export const selectCss = `
.tpl-select {
  width: 100%;
  min-height: 46px;
  padding: 11px 40px 11px 14px;
  border: 1px solid var(--tpl-border-strong);
  border-radius: var(--tpl-radius-xs);
  background-color: var(--tpl-surface-raised);
  color: var(--tpl-content-primary);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-md);
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%235a6b7d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 8 5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 18px;
  transition: border-color var(--tpl-duration-fast) ease, box-shadow var(--tpl-duration-fast) ease;
}
.tpl-select:hover:not(:disabled) { border-color: var(--tpl-navy-300); }
.tpl-select:focus {
  outline: none;
  border-color: var(--tpl-navy-700);
  box-shadow: var(--tpl-focus-ring);
}
.tpl-select:disabled { background-color: var(--tpl-surface-canvas); color: var(--tpl-content-muted); cursor: not-allowed; }
`;
