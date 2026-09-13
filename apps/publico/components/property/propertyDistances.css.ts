export const propertyDistancesCss = `
.tpl-distances-container {
  margin: 16px 0 24px;
}

.tpl-city-distances {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.95rem;
  color: #475569;
  margin-bottom: 16px;
}

.tpl-city-distance-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tpl-city-distance-item svg {
  width: 18px;
  height: 18px;
  color: var(--tpl-color-brand, #005aa0);
  flex-shrink: 0;
}

.tpl-city-distance-item strong {
  color: #0f172a;
}

/* Tarjetas de Distancias a Servicios */
.tpl-services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  background: #ffffff;
  border: 1px solid var(--tpl-border-color, #e2e8f0);
  border-radius: var(--tpl-radius-md, 12px);
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.tpl-service-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tpl-service-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tpl-service-icon--route {
  background: #eff6ff;
  color: #3b82f6;
}

.tpl-service-icon--health {
  background: #fef2f2;
  color: #ef4444;
}

.tpl-service-icon--commerce {
  background: #f0fdf4;
  color: #10b981;
}

.tpl-service-icon svg {
  width: 20px;
  height: 20px;
}

.tpl-service-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--tpl-content-muted, #64748b);
}

.tpl-service-val {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

@media (max-width: 640px) {
  .tpl-services-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
`;
