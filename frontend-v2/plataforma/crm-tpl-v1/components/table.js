import { escapeHtml } from '../core/utils.js';

export function renderTable({ columns, data, emptyMessage = 'No hay datos disponibles', id = 'dataTable', onRowClick = null }) {
  if (!data || data.length === 0) {
    return `<div class="table__empty">${escapeHtml(emptyMessage)}</div>`;
  }

  let html = `<div class="table-container"><table id="${id}" class="table">`;
  
  // Header
  html += '<thead><tr>';
  columns.forEach(col => {
    const widthStyle = col.width ? `style="width: ${col.width}"` : '';
    const alignClass = col.align ? `text-${col.align}` : '';
    const sortClass = col.sortable ? 'table__th--sortable' : '';
    const dataKey = col.key ? `data-key="${col.key}"` : '';
    
    html += `<th class="table__th ${alignClass} ${sortClass}" ${widthStyle} ${dataKey}>
               ${escapeHtml(col.label)}
               ${col.sortable ? '<span class="sort-icon">↕</span>' : ''}
             </th>`;
  });
  html += '</tr></thead>';
  
  // Body
  html += '<tbody>';
  data.forEach((row, rowIndex) => {
    html += `<tr class="table__tr" data-index="${rowIndex}">`;
    columns.forEach(col => {
      const alignClass = col.align ? `text-${col.align}` : '';
      let cellValue = '';
      
      if (col.render) {
        cellValue = col.render(row[col.key], row);
      } else {
        cellValue = escapeHtml(row[col.key] != null ? String(row[col.key]) : '');
      }
      
      html += `<td class="table__td ${alignClass}">${cellValue}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  
  return html;
}

export function initTable(id, columns, data, onRowClick) {
  const table = document.getElementById(id);
  if (!table) return;

  if (onRowClick) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        const index = row.dataset.index;
        onRowClick(data[index]);
      });
    });
  }

  const sortableHeaders = table.querySelectorAll('th.table__th--sortable');
  sortableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      let order = th.dataset.order || 'asc';
      
      // Reset all icons
      sortableHeaders.forEach(header => {
        const icon = header.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
        header.dataset.order = '';
      });
      
      // Sort logic
      order = order === 'asc' ? 'desc' : 'asc';
      th.dataset.order = order;
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = order === 'asc' ? '↑' : '↓';
      
      const sortedData = [...data].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
      });
      
      // Re-render body inside existing table
      const tbody = table.querySelector('tbody');
      let tbodyHtml = '';
      sortedData.forEach((row, rowIndex) => {
        tbodyHtml += `<tr class="table__tr" data-index="${rowIndex}">`;
        columns.forEach(col => {
          const alignClass = col.align ? `text-${col.align}` : '';
          let cellValue = col.render ? col.render(row[col.key], row) : escapeHtml(row[col.key] != null ? String(row[col.key]) : '');
          tbodyHtml += `<td class="table__td ${alignClass}">${cellValue}</td>`;
        });
        tbodyHtml += '</tr>';
      });
      tbody.innerHTML = tbodyHtml;
      
      // Re-bind clicks
      if (onRowClick) {
        table.querySelectorAll('tbody tr').forEach((row, idx) => {
          row.style.cursor = 'pointer';
          row.addEventListener('click', () => onRowClick(sortedData[idx]));
        });
      }
    });
  });
}
