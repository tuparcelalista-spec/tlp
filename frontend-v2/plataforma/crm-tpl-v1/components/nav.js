import { groups } from '../core/router.js';

export function renderNav() {
  let html = '<nav class="sidebar__nav">';
  groups.forEach(group => {
    html += `
      <div class="sidebar__group">
        <h3 class="sidebar__group-label">${group.label}</h3>
        <ul class="sidebar__group-list">
    `;
    group.links.forEach(link => {
      html += `
          <li class="sidebar__item">
            <a href="#${link.id}" class="sidebar__link" data-view-id="${link.id}">
              ${link.icon || ''} <span class="sidebar__link-text">${link.label}</span>
            </a>
          </li>
      `;
    });
    html += `
        </ul>
      </div>
    `;
  });
  html += '</nav>';
  return html;
}

export function setActiveNav(viewId) {
  const links = document.querySelectorAll('.sidebar__link');
  links.forEach(link => {
    if (link.dataset.viewId === viewId) {
      link.classList.add('sidebar__link--active');
    } else {
      link.classList.remove('sidebar__link--active');
    }
  });
}
