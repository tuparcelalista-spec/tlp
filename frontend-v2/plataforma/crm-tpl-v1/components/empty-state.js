import { escapeHtml } from '../core/utils.js';

export function renderEmpty(icon, title, subtitle, actionLabel = null, actionId = null) {
  let actionHtml = '';
  if (actionLabel && actionId) {
    actionHtml = `<button id="${escapeHtml(actionId)}" class="btn btn--primary mt-4">${escapeHtml(actionLabel)}</button>`;
  }
  
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${icon}</div>
      <h3 class="empty-state__title">${escapeHtml(title)}</h3>
      ${subtitle ? `<p class="empty-state__subtitle">${escapeHtml(subtitle)}</p>` : ''}
      ${actionHtml}
    </div>
  `;
}
