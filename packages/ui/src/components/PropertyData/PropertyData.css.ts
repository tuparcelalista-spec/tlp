export const propertyDataCss = `
.tpl-price { margin: 0; font-family: var(--tpl-font-numeric); }
.tpl-price--primary {
  font-size: var(--tpl-text-price);
  font-weight: var(--tpl-weight-bold);
  line-height: var(--tpl-leading-tight);
  letter-spacing: var(--tpl-tracking-tight);
  color: var(--tpl-color-brand);
}
.tpl-price--secondary {
  font-size: var(--tpl-text-md);
  font-weight: var(--tpl-weight-bold);
  color: var(--tpl-content-secondary);
}
.tpl-price--technical {
  font-size: var(--tpl-text-sm);
  font-weight: var(--tpl-weight-medium);
  color: var(--tpl-content-muted);
}
.tpl-price__suffix {
  margin-left: 4px;
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-sm);
  font-weight: var(--tpl-weight-medium);
  color: var(--tpl-content-muted);
}

.tpl-area, .tpl-location {
  display: inline-flex;
  align-items: center;
  gap: var(--tpl-space-2);
  font-family: var(--tpl-font-sans);
  color: var(--tpl-content-secondary);
}
.tpl-area svg, .tpl-location svg { width: 16px; height: 16px; flex: none; color: var(--tpl-content-muted); }
.tpl-area__value { font-size: var(--tpl-text-base); font-weight: var(--tpl-weight-medium); color: var(--tpl-content-primary); }
.tpl-area__label { font-size: var(--tpl-text-sm); color: var(--tpl-content-muted); }
.tpl-location { font-size: var(--tpl-text-sm); font-weight: var(--tpl-weight-medium); letter-spacing: var(--tpl-tracking-wide); text-transform: uppercase; }

.tpl-property-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tpl-space-1) var(--tpl-space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
.tpl-property-meta__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--tpl-font-numeric);
  font-size: var(--tpl-text-sm);
  font-weight: var(--tpl-weight-medium);
  color: var(--tpl-content-secondary);
}
.tpl-property-meta__item svg { width: 15px; height: 15px; flex: none; color: var(--tpl-content-muted); }

.tpl-stat { display: flex; flex-direction: column; gap: var(--tpl-space-1); }
.tpl-stat--center { align-items: center; text-align: center; }
.tpl-stat__value {
  font-family: var(--tpl-font-numeric);
  font-size: var(--tpl-text-xl);
  font-weight: var(--tpl-weight-bold);
  color: var(--tpl-color-brand);
  line-height: var(--tpl-leading-tight);
}
.tpl-stat__label {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-sm);
  color: var(--tpl-content-muted);
}
`;
