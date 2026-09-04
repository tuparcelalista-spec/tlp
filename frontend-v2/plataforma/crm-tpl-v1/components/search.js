/**
 * Buscador universal del topbar.
 *
 * QUÉ PASABA
 *   Este archivo existía pero NADIE lo importaba: la caja de búsqueda más
 *   visible del CRM, en el centro de la barra superior, no hacía absolutamente
 *   nada al escribir en ella. Además solo emitía un evento que ningún módulo
 *   escuchaba.
 *
 * QUÉ HACE AHORA
 *   Busca de verdad sobre lo que el CRM ya tiene cargado en memoria
 *   (state.snapshot), sin ir a la base en cada tecla, y muestra los resultados
 *   agrupados con un enlace directo a la ficha. Sigue emitiendo el evento
 *   'universalsearch' para que un módulo pueda filtrar su propia vista.
 */

import state, { arr } from '../core/state.js';

const MAX_POR_GRUPO = 5;
const MINIMO = 2;

const norm = (v) => String(v ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim();

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const clp = (n) => (Number(n) > 0
  ? '$' + Math.round(Number(n)).toLocaleString('es-CL')
  : 'Sin precio');

// Cada grupo dice de qué colección del snapshot sale, qué campos mira y cómo
// se pinta cada resultado.
const GRUPOS = [
  {
    clave: 'propiedades',
    etiqueta: 'Parcelas',
    fuentes: ['propiedades', 'parcelas'],
    campos: (r) => [r.titulo, r.codigo, r.comuna, r.region, r.sector],
    titulo: (r) => r.titulo || r.codigo || 'Parcela sin título',
    detalle: (r) => [r.comuna, r.superficie_m2 ? `${Number(r.superficie_m2).toLocaleString('es-CL')} m²` : null, clp(r.precio_publicado)].filter(Boolean).join(' · '),
    href: (r) => `#parcelas`,
    id: (r) => r.id,
  },
  {
    clave: 'actores',
    etiqueta: 'Personas',
    fuentes: ['actores', 'clientes'],
    campos: (r) => [r.nombre, r.email, r.telefono, r.rut, r.comuna],
    titulo: (r) => r.nombre || r.email || 'Sin nombre',
    detalle: (r) => [r.email, r.telefono, r.comuna].filter(Boolean).join(' · '),
    href: () => '#actores',
    id: (r) => r.id,
  },
  {
    clave: 'oportunidades',
    etiqueta: 'Oportunidades',
    fuentes: ['oportunidades', 'crm_oportunidades'],
    campos: (r) => [r.nombre_contacto, r.telefono, r.estado, r.origen],
    titulo: (r) => r.nombre_contacto || 'Oportunidad',
    detalle: (r) => [r.estado, r.origen, r.telefono].filter(Boolean).join(' · '),
    href: () => '#pipeline',
    id: (r) => r.id,
  },
];

function buscar(consulta) {
  const q = norm(consulta);
  const partes = q.split(/\s+/).filter(Boolean);
  const resultados = [];

  for (const grupo of GRUPOS) {
    let filas = [];
    for (const fuente of grupo.fuentes) {
      const datos = arr(fuente);
      if (datos.length) { filas = datos; break; }
    }
    if (!filas.length) continue;

    const encontrados = filas.filter((r) => {
      const texto = norm(grupo.campos(r).filter(Boolean).join(' '));
      // Todas las palabras deben aparecer: "quillon 5000" no trae media comuna.
      return partes.every((p) => texto.includes(p));
    });

    if (encontrados.length) {
      resultados.push({ grupo, filas: encontrados.slice(0, MAX_POR_GRUPO), total: encontrados.length });
    }
  }
  return resultados;
}

function panel() {
  let el = document.getElementById('universalSearchResults');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'universalSearchResults';
  el.className = 'search-results';
  el.hidden = true;
  document.querySelector('.search-box')?.appendChild(el);
  return el;
}

function pintar(resultados, consulta) {
  const el = panel();

  if (!resultados.length) {
    el.innerHTML = `<div class="search-results__empty">Sin coincidencias para “${esc(consulta)}”.</div>`;
    el.hidden = false;
    return;
  }

  el.innerHTML = resultados.map((r) => `
    <div class="search-results__group">
      <div class="search-results__label">
        ${esc(r.grupo.etiqueta)}
        ${r.total > r.filas.length ? `<span>${r.filas.length} de ${r.total}</span>` : `<span>${r.total}</span>`}
      </div>
      ${r.filas.map((fila) => `
        <a class="search-results__item" href="${r.grupo.href(fila)}" data-id="${esc(r.grupo.id(fila) ?? '')}">
          <strong>${esc(r.grupo.titulo(fila))}</strong>
          <small>${esc(r.grupo.detalle(fila))}</small>
        </a>`).join('')}
    </div>`).join('');
  el.hidden = false;
}

export function initSearch() {
  const input = document.getElementById('universalSearch');
  if (!input) return;

  let timer = null;

  const cerrar = () => { const el = document.getElementById('universalSearchResults'); if (el) el.hidden = true; };

  input.addEventListener('input', (e) => {
    const consulta = e.target.value.trim();

    // Se sigue emitiendo para que una vista pueda filtrarse a sí misma.
    document.dispatchEvent(new CustomEvent('universalsearch', { detail: { query: consulta.toLowerCase() } }));

    clearTimeout(timer);
    if (consulta.length < MINIMO) return cerrar();
    timer = setTimeout(() => pintar(buscar(consulta), consulta), 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; cerrar(); input.blur(); }
  });

  // Atajo: "/" enfoca el buscador desde cualquier vista.
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) {
      e.preventDefault();
      input.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) cerrar();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.search-results__item')) cerrar();
  });
}

export default initSearch;
