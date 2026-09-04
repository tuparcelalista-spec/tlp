import { escapeHtml } from '../core/utils.js';

export function statusBadge(estado, tipo = 'default') {
  if (!estado) return '';
  const normalized = estado.toLowerCase().trim();
  
  let color = 'gray';
  
  if (['publicada', 'activa', 'completada'].includes(normalized)) {
    color = 'green';
  } else if (['revision', 'pendiente', 'proceso'].includes(normalized)) {
    color = 'amber';
  } else if (['vendida'].includes(normalized)) {
    color = 'blue';
  } else if (['archivada', 'cancelada'].includes(normalized)) {
    color = 'gray';
  } else if (['reservada', 'negociacion'].includes(normalized)) {
    color = 'purple';
  } else if (['urgente', 'alta', 'rechazada'].includes(normalized)) {
    color = 'red';
  }
  
  return `<span class="badge badge--${color} badge--${escapeHtml(tipo)}">${escapeHtml(estado)}</span>`;
}
