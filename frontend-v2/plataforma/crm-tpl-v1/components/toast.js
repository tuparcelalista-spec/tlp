import { escapeHtml } from '../core/utils.js';

export function toast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toastEl = document.createElement('div');
  toastEl.className = `toast toast--${escapeHtml(type)}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';
  
  toastEl.innerHTML = `
    <span class="toast__icon">${icon}</span>
    <span class="toast__message">${escapeHtml(message)}</span>
    <button class="toast__close">&times;</button>
  `;
  
  container.appendChild(toastEl);
  
  setTimeout(() => toastEl.classList.add('toast--visible'), 10);
  
  const removeToast = () => {
    toastEl.classList.remove('toast--visible');
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 300);
  };
  
  toastEl.querySelector('.toast__close').addEventListener('click', removeToast);
  
  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
}
