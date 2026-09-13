export const propertyFeaturesRibbonCss = `
.tpl-features-section {
  margin-bottom: 32px;
}

.tpl-features-ribbon {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.tpl-feature-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--tpl-surface-sunken, #f8fafc);
  padding: 14px 16px;
  border-radius: var(--tpl-radius-md, 12px);
  border: 1px solid var(--tpl-border-color, #e2e8f0);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tpl-feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.tpl-feature-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tpl-feature-icon-wrap--water {
  background: #e0f2fe;
  color: #0284c7;
}

.tpl-feature-icon-wrap--power {
  background: #fef3c7;
  color: #d97706;
}

.tpl-feature-icon-wrap--deed {
  background: #f3e8ff;
  color: #7c3aed;
}

.tpl-feature-icon-wrap--nature {
  background: #dcfce7;
  color: #16a34a;
}

.tpl-feature-icon-wrap--area {
  background: #f1f5f9;
  color: #0f172a;
}

.tpl-feature-icon-wrap svg {
  width: 22px;
  height: 22px;
}

.tpl-feature-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tpl-feature-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tpl-content-muted, #64748b);
  margin-bottom: 2px;
}

.tpl-feature-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--tpl-ink-900, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tpl-virtudes-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tpl-virtud-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
}

.tpl-virtud-chip--highlight {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}

@media (max-width: 640px) {
  .tpl-features-ribbon {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .tpl-feature-card {
    padding: 10px 12px;
  }
  .tpl-feature-icon-wrap {
    width: 36px;
    height: 36px;
  }
  .tpl-feature-icon-wrap svg {
    width: 18px;
    height: 18px;
  }
  .tpl-feature-val {
    font-size: 0.88rem;
  }
}
`;
