import { escapeHtml } from '../core/utils.js';

export function showModal({ title, body, actions, size = 'md' }) {
  const sizes = { sm: '400px', md: '560px', lg: '720px' };
  const modalWidth = sizes[size] || sizes.md;
  
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'modalBackdrop';
  
  let actionsHtml = '';
  if (actions && actions.length > 0) {
    actionsHtml = '<div class="modal__footer">';
    actions.forEach((action, index) => {
      actionsHtml += `<button class="btn btn--${action.variant || 'secondary'}" id="modalBtn${index}">${escapeHtml(action.label)}</button>`;
    });
    actionsHtml += '</div>';
  }

  const modalHtml = `
    <div class="modal" style="max-width: ${modalWidth};">
      <div class="modal__header">
        <h3 class="modal__title">${escapeHtml(title)}</h3>
        <button class="modal__close" id="modalClose">&times;</button>
      </div>
      <div class="modal__body">
        ${body}
      </div>
      ${actionsHtml}
    </div>
  `;
  
  backdrop.innerHTML = modalHtml;
  document.body.appendChild(backdrop);
  
  // Animate in
  setTimeout(() => backdrop.classList.add('modal-backdrop--visible'), 10);
  
  // Events
  document.getElementById('modalClose').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    // if (e.target === backdrop) closeModal(); // REMOVED: Prevent accidental closing
  });
  
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  // Wire actions
  if (actions && actions.length > 0) {
    actions.forEach((action, index) => {
      const btn = document.getElementById(`modalBtn${index}`);
      if (btn) {
        btn.addEventListener('click', (e) => {
          if (action.onClick) action.onClick(e);
        });
      }
    });
  }
}

export function closeModal() {
  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) {
    backdrop.classList.remove('modal-backdrop--visible');
    setTimeout(() => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    }, 300); // match animation duration
  }
}
