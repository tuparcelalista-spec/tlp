export const badgeCss = `
.tpl-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--tpl-radius-pill);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-xs);
  font-weight: var(--tpl-weight-black);
  letter-spacing: var(--tpl-tracking-wide);
  text-transform: uppercase;
  line-height: 1.4;
  white-space: nowrap;
}
.tpl-badge--success { background: var(--tpl-state-success-bg); color: var(--tpl-state-success); }
.tpl-badge--warning { background: var(--tpl-state-warning-bg); color: var(--tpl-state-warning); }
.tpl-badge--danger  { background: var(--tpl-state-danger-bg); color: var(--tpl-state-danger); }
.tpl-badge--info    { background: var(--tpl-state-info-bg); color: var(--tpl-state-info); }
.tpl-badge--neutral { background: var(--tpl-surface-sunken); color: var(--tpl-content-secondary); }
.tpl-badge--accent  { background: var(--tpl-color-accent-gold); color: var(--tpl-navy-950); }
`;
