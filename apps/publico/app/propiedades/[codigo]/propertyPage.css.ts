export const propertyPageCss = `
.tpl-prop-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.tpl-prop-title {
  font-size: 2.3rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.15;
  margin: 6px 0 12px;
  letter-spacing: -0.01em;
}

.tpl-property-grid {
  display: grid;
  grid-template-columns: 2fr 1.05fr;
  gap: 48px;
  align-items: start;
  margin-top: 12px;
}

.tpl-main-col {
  min-width: 0;
}

.tpl-sidebar-col {
  position: relative;
}

.tpl-prop-section {
  margin-top: 36px;
  padding-top: 28px;
  border-top: 1px solid #e2e8f0;
}

.tpl-prop-section-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 16px;
}

.tpl-prop-desc {
  font-size: 1.05rem;
  line-height: 1.75;
  color: #334155;
  white-space: pre-line;
}

@media (max-width: 960px) {
  .tpl-property-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .tpl-sidebar-col {
    order: -1;
  }
  .tpl-prop-title {
    font-size: 1.85rem;
  }
}
`;
