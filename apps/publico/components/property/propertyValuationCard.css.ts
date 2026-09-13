export const propertyValuationCardCss = `
.tpl-valuation-section {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--tpl-border-color, #e2e8f0);
}

.tpl-valuation-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.tpl-valuation-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--tpl-ink-900, #0f172a);
  margin: 0;
}

.tpl-valuation-badge-ai {
  background: #0f172a;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 9999px;
  letter-spacing: 0.04em;
}

.tpl-valuation-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.tpl-metric-card {
  background: var(--tpl-surface-sunken, #f8fafc);
  border: 1px solid var(--tpl-border-color, #e2e8f0);
  border-radius: var(--tpl-radius-md, 12px);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.tpl-metric-card--recommended {
  border-left: 4px solid #10b981;
  background: #f0fdf4;
}

.tpl-metric-card--commune {
  border-left: 4px solid #f59e0b;
}

.tpl-metric-card--score {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.tpl-metric-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tpl-content-muted, #64748b);
  margin-bottom: 4px;
}

.tpl-metric-val {
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--tpl-ink-900, #0f172a);
  line-height: 1.2;
}

.tpl-metric-val--green {
  color: #059669;
}

.tpl-metric-note {
  font-size: 0.75rem;
  color: var(--tpl-content-muted, #64748b);
  margin-top: 4px;
}

.tpl-score-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
}

.tpl-score-max {
  font-size: 1rem;
  color: #94a3b8;
  font-weight: 600;
}

.tpl-score-badge-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ede9fe;
  color: #7c3aed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tpl-score-badge-icon svg {
  width: 24px;
  height: 24px;
}

/* Posicionamiento de Mercado / Track */
.tpl-comparison-card {
  background: #ffffff;
  border: 1px solid var(--tpl-border-color, #e2e8f0);
  border-radius: var(--tpl-radius-lg, 16px);
  padding: 24px 28px 36px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.tpl-comparison-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.tpl-comparison-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
}

.tpl-comparison-header svg {
  width: 22px;
  height: 22px;
  color: var(--tpl-color-brand, #005aa0);
}

.tpl-position-verdict {
  font-size: 0.95rem;
  margin-bottom: 48px;
}

.tpl-verdict--opportunity {
  color: #059669;
  font-weight: 700;
}

.tpl-verdict--over {
  color: #e11d48;
  font-weight: 700;
}

.tpl-verdict--fair {
  color: #0284c7;
  font-weight: 700;
}

.tpl-position-track {
  position: relative;
  height: 6px;
  background: #e2e8f0;
  border-radius: 9999px;
  margin: 40px 16px 54px;
}

.tpl-position-dot {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  box-shadow: 0 0 0 4px #ffffff, 0 2px 8px rgba(0,0,0,0.15);
}

.tpl-position-dot--base {
  width: 18px;
  height: 18px;
  background: #94a3b8;
  z-index: 2;
}

.tpl-position-dot--tpl {
  width: 22px;
  height: 22px;
  background: #005aa0;
  z-index: 3;
}

.tpl-position-dot--pub {
  width: 18px;
  height: 18px;
  z-index: 4;
}

.tpl-position-label {
  position: absolute;
  top: 18px;
  transform: translateX(-50%);
  font-size: 0.78rem;
  text-align: center;
  white-space: nowrap;
  line-height: 1.35;
  color: #64748b;
}

.tpl-position-label strong {
  display: block;
  font-size: 0.85rem;
  color: #0f172a;
}

.tpl-position-callout {
  position: absolute;
  bottom: 18px;
  transform: translateX(-50%);
  font-size: 0.78rem;
  font-weight: 700;
  color: #ffffff;
  background: #005aa0;
  padding: 5px 12px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(0, 90, 160, 0.25);
  z-index: 5;
}

.tpl-position-callout::after {
  content: "";
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #005aa0;
}

/* Veredicto del Asesor Experto */
.tpl-expert-verdict-box {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #cbd5e1;
  border-radius: var(--tpl-radius-md, 12px);
  padding: 20px 24px;
  display: flex;
  gap: 18px;
  align-items: flex-start;
  margin-top: 20px;
}

.tpl-expert-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #005aa0;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tpl-expert-content {
  flex: 1;
}

.tpl-expert-title {
  margin: 0 0 6px;
  color: #005aa0;
  font-size: 1.05rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tpl-expert-title svg {
  width: 18px;
  height: 18px;
}

.tpl-expert-text {
  margin: 0;
  color: #334155;
  font-size: 0.92rem;
  line-height: 1.65;
}

@media (max-width: 700px) {
  .tpl-valuation-metrics-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .tpl-metric-val {
    font-size: 1.35rem;
  }
  .tpl-expert-verdict-box {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px;
  }
  .tpl-expert-title {
    justify-content: center;
  }
  .tpl-position-track {
    margin-left: 30px;
    margin-right: 30px;
  }
}
`;
