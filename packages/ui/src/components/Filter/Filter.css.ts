export const filterCss = `
.tpl-filter-chip {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 16px;
  border: 1px solid var(--tpl-border-strong);
  border-radius: var(--tpl-radius-pill);
  background: var(--tpl-surface-raised);
  color: var(--tpl-content-secondary);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-sm);
  font-weight: var(--tpl-weight-medium);
  cursor: pointer;
  transition: background-color var(--tpl-duration-fast) ease, border-color var(--tpl-duration-fast) ease, color var(--tpl-duration-fast) ease;
}
.tpl-filter-chip:hover { border-color: var(--tpl-navy-300); color: var(--tpl-navy-900); }
.tpl-filter-chip--active {
  background: var(--tpl-navy-900);
  border-color: var(--tpl-navy-900);
  color: var(--tpl-content-inverse);
}

.tpl-filter-group {
  margin: 0;
  padding: 0;
  border: none;
}
.tpl-filter-group__label {
  padding: 0 0 var(--tpl-space-2);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-xs);
  font-weight: var(--tpl-weight-black);
  letter-spacing: var(--tpl-tracking-caps);
  text-transform: uppercase;
  color: var(--tpl-content-muted);
}
.tpl-filter-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tpl-space-2);
}
`;
