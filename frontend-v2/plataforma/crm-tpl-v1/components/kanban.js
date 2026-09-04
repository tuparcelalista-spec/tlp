import { escapeHtml } from '../core/utils.js';

export function renderKanban({ columns, cards, onDrop = null }) {
  let html = '<div class="kanban-board">';
  
  columns.forEach(col => {
    const colCards = cards.filter(c => c.columnId === col.id);
    html += `
      <div class="kanban__column" data-col-id="${escapeHtml(col.id)}">
        <div class="kanban__column-header" style="border-top-color: ${escapeHtml(col.color || '#ccc')}">
          <h3 class="kanban__column-title">${escapeHtml(col.label)}</h3>
          <span class="kanban__column-count">${colCards.length}</span>
        </div>
        <div class="kanban__column-body drop-zone">
    `;
    
    colCards.forEach(card => {
      html += `
          <div class="kanban__card" draggable="true" data-card-id="${escapeHtml(card.id)}">
            ${card.dismissable ? `<button type="button" class="kanban__card-dismiss" data-dismiss-id="${escapeHtml(card.id)}" title="Descartar o eliminar esta oportunidad" aria-label="Descartar oportunidad">×</button>` : ''}
            <h4 class="kanban__card-title">${escapeHtml(card.title)}</h4>
            ${card.subtitle ? `<p class="kanban__card-subtitle">${escapeHtml(card.subtitle)}</p>` : ''}
            <div class="kanban__card-footer">
              ${card.meta ? `<span class="kanban__card-meta">${escapeHtml(card.meta)}</span>` : ''}
              ${card.badge ? `<span class="kanban__card-badge">${escapeHtml(card.badge)}</span>` : ''}
            </div>
          </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

export function initKanban(onDrop) {
  const cards = document.querySelectorAll('.kanban__card');
  const dropZones = document.querySelectorAll('.kanban__column-body');
  
  let draggedCard = null;
  let sourceColId = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      sourceColId = card.closest('.kanban__column').dataset.colId;
      setTimeout(() => card.classList.add('kanban__card--dragging'), 0);
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('kanban__card--dragging');
      draggedCard = null;
    });
  });
  
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('kanban__column-body--hover');
    });
    
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('kanban__column-body--hover');
    });
    
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('kanban__column-body--hover');
      if (draggedCard) {
        const targetCol = zone.closest('.kanban__column');
        const targetColId = targetCol.dataset.colId;
        const cardId = draggedCard.dataset.cardId;
        
        if (sourceColId !== targetColId) {
          zone.appendChild(draggedCard);
          
          // Update counts
          const sourceCol = document.querySelector(`.kanban__column[data-col-id="${sourceColId}"]`);
          const sourceCount = sourceCol.querySelector('.kanban__column-count');
          const targetCount = targetCol.querySelector('.kanban__column-count');
          
          if(sourceCount) sourceCount.textContent = parseInt(sourceCount.textContent) - 1;
          if(targetCount) targetCount.textContent = parseInt(targetCount.textContent) + 1;
          
          if (onDrop) {
            onDrop(cardId, sourceColId, targetColId);
          }
        }
      }
    });
  });
}
