export const propertyWeatherWidgetCss = `
/* Badge Header */
.tpl-weather-header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 5px 14px;
  border-radius: 9999px;
  font-size: 0.85rem;
  color: #166534;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.tpl-weather-header-badge__temp {
  font-weight: 800;
  color: #14532d;
}

/* Full Weather Widget */
.tpl-weather-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid var(--tpl-border-color, #e2e8f0);
  border-radius: var(--tpl-radius-md, 12px);
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.tpl-weather-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.tpl-weather-temp-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tpl-weather-icon-large {
  font-size: 2.8rem;
  line-height: 1;
}

.tpl-weather-temp-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.tpl-weather-temp-val {
  font-size: 2.1rem;
  font-weight: 800;
  color: #0f172a;
}

.tpl-weather-temp-desc {
  font-size: 1.05rem;
  font-weight: 600;
  color: #334155;
}

.tpl-weather-range {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  margin-top: 2px;
}

.tpl-weather-meta-grid {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.tpl-weather-meta-col {
  display: flex;
  flex-direction: column;
}

.tpl-weather-meta-label {
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tpl-weather-meta-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin-top: 2px;
}

.tpl-weather-note {
  margin: 14px 0 0 0;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  font-size: 0.85rem;
  color: #475569;
  line-height: 1.5;
}
`;
