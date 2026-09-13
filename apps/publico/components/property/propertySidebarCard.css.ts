export const propertySidebarCardCss = `
.tpl-sidebar-sticky {
  position: sticky;
  top: 24px;
  background: #ffffff;
  border-radius: var(--tpl-radius-lg, 16px);
  border: 1px solid var(--tpl-border-color, #e2e8f0);
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tpl-sidebar-price-block {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--tpl-border-color, #e2e8f0);
}

.tpl-sidebar-price {
  font-size: 2.3rem;
  font-weight: 800;
  color: var(--tpl-ink-900, #0f172a);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.tpl-sidebar-price-sub {
  font-size: 0.85rem;
  color: var(--tpl-content-muted, #64748b);
  margin-top: 6px;
  font-weight: 500;
}

/* Inteligencia de Mercado Box */
.tpl-sidebar-intel-box {
  background: var(--tpl-surface-sunken, #f8fafc);
  border: 1px solid var(--tpl-border-color, #e2e8f0);
  border-radius: var(--tpl-radius-md, 12px);
  padding: 16px;
}

.tpl-sidebar-intel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tpl-content-muted, #64748b);
  margin-bottom: 12px;
}

.tpl-sidebar-intel-head svg {
  width: 16px;
  height: 16px;
  color: var(--tpl-color-brand, #005aa0);
}

.tpl-sidebar-intel-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
  margin-bottom: 6px;
}

.tpl-sidebar-intel-row span {
  color: #475569;
}

.tpl-sidebar-intel-row strong {
  color: #0f172a;
  font-weight: 700;
}

.tpl-sidebar-badge {
  margin-top: 10px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
}

.tpl-sidebar-badge--opportunity {
  background: #d1fae5;
  color: #065f46;
}

.tpl-sidebar-badge--over {
  background: #fee2e2;
  color: #991b1b;
}

.tpl-sidebar-badge--fair {
  background: #e0f2fe;
  color: #0369a1;
}

/* Grupo de Botones de Acción */
.tpl-sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tpl-btn-action {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 18px;
  border-radius: var(--tpl-radius-md, 10px);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  border: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.tpl-btn-action--primary {
  background: #0f172a;
  color: #ffffff;
}

.tpl-btn-action--primary:hover {
  background: #1e293b;
  transform: translateY(-1px);
}

.tpl-btn-action--whatsapp {
  background: #25d366;
  color: #ffffff;
}

.tpl-btn-action--whatsapp:hover {
  background: #22bf5b;
  transform: translateY(-1px);
}

.tpl-btn-action--secondary {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}

.tpl-btn-action--secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.tpl-btn-action--gold {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: #ffffff;
}

.tpl-btn-action--gold:hover {
  background: linear-gradient(135deg, #b45309 0%, #92400e 100%);
  transform: translateY(-1px);
}

/* Sello Asesoría Humana */
.tpl-sidebar-advisor {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--tpl-border-color, #e2e8f0);
}

.tpl-sidebar-advisor-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #005aa0;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.tpl-sidebar-advisor-info {
  display: flex;
  flex-direction: column;
}

.tpl-sidebar-advisor-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
}

.tpl-sidebar-advisor-desc {
  font-size: 0.78rem;
  color: var(--tpl-content-muted, #64748b);
  line-height: 1.4;
}

@media (max-width: 860px) {
  .tpl-sidebar-sticky {
    position: static;
    margin-bottom: 24px;
  }
}
`;
