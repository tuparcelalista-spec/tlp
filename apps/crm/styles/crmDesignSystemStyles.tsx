/**
 * Estilos base del CRM — puerto directo de
 * `crm-tpl-v1/styles/{tokens,layout,components}.css`, NO del sistema de
 * `@tpl/ui` (`--tpl-*`): el CRM interno tiene su propia identidad visual
 * (navy `#002b54`, tokens `--c-*`/`--sp-*`/`--fs-*`) que el equipo ya
 * conoce de memoria — inventar una paleta nueva o forzar la del sitio
 * público solo confundiría a quien lo usa a diario. Igual que
 * `TplDesignSystemStyles` de `@tpl/ui`, se renderiza una vez en el layout
 * raíz vía `<style>` plano (mismo patrón ya usado en
 * `apps/publico/components/home/tasadorBanner.css.ts`: este proyecto no usa
 * vanilla-extract ni CSS Modules, son strings de CSS crudo).
 *
 * Alcance deliberadamente acotado al piloto: solo se portaron los tokens y
 * las clases que el shell (sidebar/topbar) y el tablero Kanban usan de
 * verdad hoy. `components.css` (botones, formularios, toasts) NO se porta
 * 1:1 — son ~250 líneas de estilos de formulario/alertas que no bloquean
 * validar el patrón; se escribieron versiones mínimas propias con los
 * mismos tokens (ver clases `.btn`, `.form-*`, `.login-*` más abajo). Si el
 * piloto se aprueba, portar `components.css` completo es el primer paso
 * natural antes de replicar a los otros 14 módulos.
 */
const tokensCss = `
:root {
  --c-primary: #002b54;
  --c-primary-light: #003f7a;
  --c-accent: #3eb8a0;
  --c-success: #16a34a;
  --c-warning: #d97706;
  --c-danger: #dc2626;
  --c-info: #2563eb;

  --c-bg: #f7f8fa;
  --c-surface: #ffffff;
  --c-surface-hover: #f0f2f5;
  --c-border: #e2e5ea;
  --c-border-light: #eef0f3;
  --c-text: #14212e;
  --c-text-secondary: #33465a;
  --c-text-muted: #5f7183;

  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --fs-xs: 0.75rem;
  --fs-sm: 0.875rem;
  --fs-base: 1rem;
  --fs-lg: 1.125rem;
  --fs-xl: 1.25rem;
  --fs-2xl: 1.5rem;

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  --sp-1: 0.25rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-6: 1.5rem;
  --sp-8: 2rem;
  --sp-12: 3rem;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 400ms ease;

  --sidebar-width: 260px;
  --topbar-height: 64px;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-family); background: var(--c-bg); color: var(--c-text); }
a { color: inherit; text-decoration: none; }
`;

const shellCss = `
.crm-app { display: grid; grid-template-columns: var(--sidebar-width) 1fr; min-height: 100vh; }
.crm-sidebar {
  background-color: var(--c-primary); color: #fff;
  display: flex; flex-direction: column;
  position: fixed; top: 0; left: 0; bottom: 0; width: var(--sidebar-width); z-index: 40;
}
.crm-sidebar__brand {
  height: var(--topbar-height); display: flex; align-items: center; gap: var(--sp-2);
  padding: 0 var(--sp-6); font-size: var(--fs-xl); font-weight: var(--fw-bold);
  border-bottom: 1px solid rgba(255,255,255,.1);
}
.crm-sidebar__nav { flex: 1; overflow-y: auto; padding: var(--sp-4) 0; }
.crm-sidebar__group { margin-bottom: var(--sp-6); }
.crm-sidebar__label {
  padding: 0 var(--sp-6); font-size: var(--fs-xs); text-transform: uppercase;
  color: rgba(255,255,255,.5); margin-bottom: var(--sp-2); letter-spacing: .05em; font-weight: var(--fw-medium);
}
.crm-sidebar__link {
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-6); color: rgba(255,255,255,.8); font-size: var(--fs-sm);
  transition: all var(--transition-fast);
}
.crm-sidebar__link:hover, .crm-sidebar__link--active {
  background-color: rgba(255,255,255,.05); color: var(--c-accent); border-right: 3px solid var(--c-accent);
}
.crm-sidebar__link--disabled { color: rgba(255,255,255,.35); cursor: default; }
.crm-sidebar__soon {
  font-size: 10px; font-weight: var(--fw-semibold); text-transform: uppercase;
  background: rgba(255,255,255,.1); border-radius: var(--radius-full); padding: 1px var(--sp-2);
}
.crm-sidebar__foot {
  padding: var(--sp-4) var(--sp-6); border-top: 1px solid rgba(255,255,255,.1);
  display: flex; flex-direction: column; gap: var(--sp-2);
}
.crm-sidebar__staff-name { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.crm-sidebar__staff-role { font-size: var(--fs-xs); color: rgba(255,255,255,.6); }

.crm-main { grid-column: 2; display: flex; flex-direction: column; min-height: 100vh; }
.crm-topbar {
  height: var(--topbar-height); background: rgba(255,255,255,.9); border-bottom: 1px solid var(--c-border);
  display: flex; align-items: center; padding: 0 var(--sp-6); position: sticky; top: 0; z-index: 20;
}
.crm-topbar h1 { margin: 0; font-size: var(--fs-lg); font-weight: var(--fw-bold); }
.crm-content { flex: 1; padding: var(--sp-6); max-width: 1440px; width: 100%; margin: 0 auto; }

@media (max-width: 1024px) {
  .crm-app { grid-template-columns: 1fr; }
  .crm-main { grid-column: 1; }
  .crm-sidebar { display: none; }
}
`;

const kanbanCss = `
.pipeline-module { display: flex; flex-direction: column; gap: var(--sp-4); }
.pipeline-module__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); flex-wrap: wrap; }
.pipeline-module__head h2 { margin: 0; font-size: var(--fs-xl); font-weight: var(--fw-bold); color: var(--c-text); }
.pipeline-module__head p { margin: var(--sp-1) 0 0; font-size: var(--fs-sm); color: var(--c-text-secondary); }
.pipeline-module__ayuda {
  font-size: var(--fs-xs); color: var(--c-text-muted); background: var(--c-surface);
  border: 1px solid var(--c-border); border-radius: var(--radius-full); padding: var(--sp-1) var(--sp-3); white-space: nowrap;
}
.pipeline-module__board { flex: 1; overflow-x: auto; overflow-y: hidden; padding-bottom: var(--sp-4); }

.kanban-board { display: flex; gap: var(--sp-4); align-items: flex-start; height: 100%; padding-bottom: var(--sp-2); }
.kanban__column { min-width: 280px; width: 280px; background-color: var(--c-bg); border-radius: var(--radius-md); display: flex; flex-direction: column; max-height: calc(100vh - var(--topbar-height) - 220px); }
.kanban__column-header { padding: var(--sp-3); font-weight: var(--fw-semibold); font-size: var(--fs-sm); border-top: 3px solid; border-radius: var(--radius-md) var(--radius-md) 0 0; display: flex; align-items: center; justify-content: space-between; background: var(--c-surface); }
.kanban__column-title { margin: 0; font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--c-text); }
.kanban__column-count { background: var(--c-surface); border: 1px solid var(--c-border); color: var(--c-text-secondary); font-size: var(--fs-xs); font-weight: var(--fw-semibold); min-width: 22px; text-align: center; border-radius: var(--radius-full); padding: 0 var(--sp-2); }
.kanban__column-body { padding: var(--sp-2); display: flex; flex-direction: column; gap: var(--sp-2); min-height: 120px; flex: 1; overflow-y: auto; border-radius: 0 0 var(--radius-md) var(--radius-md); }
.kanban__column-body--hover { background-color: var(--c-surface-hover); box-shadow: inset 0 0 0 2px var(--c-accent); }
.kanban__card { background-color: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-sm); padding: var(--sp-3); cursor: grab; position: relative; }
.kanban__card:hover { box-shadow: var(--shadow-sm); }
.kanban__card--dragging { opacity: .5; }
.kanban__card-dismiss {
  position: absolute; top: var(--sp-1); right: var(--sp-1); width: 20px; height: 20px; line-height: 18px;
  border: none; background: transparent; color: var(--c-text-muted); font-size: var(--fs-base); cursor: pointer; border-radius: var(--radius-sm);
}
.kanban__card-dismiss:hover { background: var(--c-surface-hover); color: var(--c-danger); }
.kanban__card-title { margin: 0; font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--c-text); padding-right: var(--sp-4); }
.kanban__card-subtitle { margin: var(--sp-1) 0 0; font-size: var(--fs-xs); color: var(--c-text-secondary); }
.kanban__card-footer { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); margin-top: var(--sp-2); }
.kanban__card-footer:empty { display: none; }
.kanban__card-meta { font-size: var(--fs-xs); color: var(--c-text-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.kanban__card-badge { font-size: var(--fs-xs); font-weight: var(--fw-semibold); background: var(--c-surface-hover); color: var(--c-primary); border-radius: var(--radius-sm); padding: 2px var(--sp-2); }
`;

const authCss = `
.crm-auth { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--c-bg); padding: var(--sp-6); }
.crm-auth__card { width: 100%; max-width: 380px; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-md); padding: var(--sp-8); box-shadow: var(--shadow-sm); }
.crm-auth__card h1 { margin: 0 0 var(--sp-1); font-size: var(--fs-xl); color: var(--c-primary); }
.crm-auth__card p { margin: 0 0 var(--sp-6); font-size: var(--fs-sm); color: var(--c-text-secondary); }
.crm-field { display: flex; flex-direction: column; gap: var(--sp-1); margin-bottom: var(--sp-4); }
.crm-field label { font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--c-text-secondary); }
.crm-field input {
  font: inherit; padding: var(--sp-2) var(--sp-3); border: 1px solid var(--c-border); border-radius: var(--radius-sm);
  background: var(--c-surface); color: var(--c-text);
}
.crm-field input:focus { outline: 2px solid var(--c-primary-light); outline-offset: 1px; }
.crm-btn {
  font: inherit; font-weight: var(--fw-semibold); font-size: var(--fs-sm); width: 100%;
  padding: var(--sp-3); border-radius: var(--radius-sm); border: none; cursor: pointer;
  background: var(--c-primary); color: #fff; transition: background var(--transition-fast);
}
.crm-btn:hover { background: var(--c-primary-light); }
.crm-btn:disabled { opacity: .6; cursor: not-allowed; }
.crm-btn--ghost { background: transparent; color: rgba(255,255,255,.85); border: 1px solid rgba(255,255,255,.25); }
.crm-btn--ghost:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.5); }
.crm-alert { margin-top: var(--sp-4); padding: var(--sp-3); border-radius: var(--radius-sm); font-size: var(--fs-sm); background: #fee2e2; color: var(--c-danger); }
`;

const directoryCss = `
.crm-list-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); flex-wrap: wrap; margin-bottom: var(--sp-4); }
.crm-list-head h2 { margin: 0; font-size: var(--fs-xl); font-weight: var(--fw-bold); color: var(--c-text); }
.crm-list-head__actions { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; }
.crm-list-head__hint { font-size: var(--fs-xs); color: var(--c-text-muted); background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-full); padding: var(--sp-1) var(--sp-3); }
.crm-btn-chip { font: inherit; font-size: var(--fs-xs); font-weight: var(--fw-semibold); padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-sm); border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text-secondary); cursor: pointer; }
.crm-btn-chip:hover { background: var(--c-surface-hover); }

.crm-table-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-md); overflow: hidden; overflow-x: auto; }
.crm-table { width: 100%; border-collapse: collapse; text-align: left; }
.crm-table thead tr { background: var(--c-bg); border-bottom: 1px solid var(--c-border); }
.crm-table th { padding: var(--sp-3) var(--sp-4); font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: .04em; color: var(--c-text-secondary); font-weight: var(--fw-semibold); }
.crm-table td { padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--c-border-light); font-size: var(--fs-sm); color: var(--c-text); vertical-align: top; }
.crm-table tbody tr:hover { background: var(--c-surface-hover); }
.crm-table__row--muted { opacity: .6; }
.crm-table__empty { text-align: center; padding: var(--sp-8); color: var(--c-text-muted); }
.crm-table__mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--c-text-secondary); }
.crm-table__stack { display: flex; flex-direction: column; gap: 2px; }
.crm-table__chips { display: flex; flex-wrap: wrap; gap: 4px; }
.crm-link-btn { font: inherit; font-size: var(--fs-sm); font-weight: var(--fw-medium); color: var(--c-info); background: none; border: none; cursor: pointer; padding: var(--sp-1) var(--sp-2); border-radius: var(--radius-sm); }
.crm-link-btn:hover { background: var(--c-surface-hover); }
.crm-link-btn--muted { color: var(--c-text-muted); }
.crm-link-btn:disabled { opacity: .5; cursor: not-allowed; }

.crm-chip { display: inline-block; font-size: var(--fs-xs); font-weight: var(--fw-medium); padding: 2px var(--sp-2); border-radius: var(--radius-full); background: var(--c-surface-hover); color: var(--c-text-secondary); border: 1px solid var(--c-border); margin-left: 4px; }
.crm-chip--muted { background: var(--c-bg); }
.crm-chip--onbrand { background: rgba(255,255,255,.15); border-color: rgba(255,255,255,.3); color: #fff; margin-left: 0; margin-right: 4px; }

.crm-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,32,.5); display: flex; align-items: center; justify-content: center; padding: var(--sp-4); z-index: 200; }
.crm-modal-panel { background: var(--c-surface); border-radius: var(--radius-md); max-width: 640px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-lg, 0 20px 25px -5px rgba(0,0,0,.2)); }
.crm-modal-panel__head { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4) var(--sp-6); background: linear-gradient(135deg, var(--c-primary), var(--c-primary-light)); color: #fff; position: sticky; top: 0; }
.crm-modal-panel__head h2 { margin: 0; font-size: var(--fs-lg); }
.crm-modal-panel__close { background: transparent; border: none; color: #fff; font-size: 22px; line-height: 1; cursor: pointer; padding: var(--sp-1) var(--sp-2); }
.crm-modal-panel__body { padding: var(--sp-6); }

.crm-actor-detail__head { display: flex; align-items: center; gap: var(--sp-4); margin-bottom: var(--sp-6); }
.crm-actor-detail__avatar { width: 56px; height: 56px; border-radius: var(--radius-full); background: var(--c-bg); color: var(--c-primary); display: flex; align-items: center; justify-content: center; font-size: var(--fs-xl); font-weight: var(--fw-bold); flex-shrink: 0; }
.crm-actor-detail__head h3 { margin: 0 0 var(--sp-1); font-size: var(--fs-lg); }
.crm-actor-detail__roles { display: flex; flex-wrap: wrap; }
.crm-actor-detail__grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-6); margin-bottom: var(--sp-6); }
.crm-actor-detail__label { display: block; font-size: var(--fs-xs); font-weight: var(--fw-semibold); text-transform: uppercase; color: var(--c-text-muted); margin-bottom: var(--sp-2); }
.crm-actor-detail__lines { display: flex; flex-direction: column; gap: var(--sp-1); font-size: var(--fs-sm); }
.crm-actor-detail__kv { display: grid; grid-template-columns: auto 1fr; gap: 2px var(--sp-2); font-size: var(--fs-sm); }
.crm-actor-detail__kv span:nth-child(odd) { color: var(--c-text-muted); }
.crm-actor-detail__section-title { font-size: var(--fs-base); font-weight: var(--fw-semibold); border-bottom: 1px solid var(--c-border); padding-bottom: var(--sp-2); margin: var(--sp-6) 0 var(--sp-3); }
.crm-actor-detail__list { list-style: none; margin: 0; padding: 0; background: var(--c-bg); border: 1px solid var(--c-border); border-radius: var(--radius-md); overflow: hidden; }
.crm-actor-detail__list li { padding: var(--sp-3); border-bottom: 1px solid var(--c-border); font-size: var(--fs-sm); display: flex; flex-direction: column; gap: 2px; }
.crm-actor-detail__list li:last-child { border-bottom: none; }
.crm-actor-detail__code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--fs-xs); color: var(--c-text-muted); margin-right: var(--sp-2); }
.crm-actor-detail__meta { font-size: var(--fs-xs); color: var(--c-text-muted); }
.crm-actor-detail__empty { text-align: center; padding: var(--sp-6); color: var(--c-text-muted); background: var(--c-bg); border: 1px dashed var(--c-border); border-radius: var(--radius-md); font-size: var(--fs-sm); }

@media (max-width: 640px) {
  .crm-actor-detail__grid { grid-template-columns: 1fr; }
}
`;

/**
 * Puerto del `<style>` inline de `render()` en `modules/parcelas/index.js`.
 * Clases renombradas con prefijo `parcela-`/`parcelas-` (el original usaba
 * nombres genéricos como `.card`, `.badge`, que aquí colisionarían con otros
 * módulos) — mismos valores, mismos tokens, solo el nombre cambia.
 */
const parcelasCss = `
.parcelas-view { display: flex; flex-direction: column; gap: var(--sp-6); }

.parcelas-loading {
  padding: var(--sp-12); display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--c-text-muted); font-size: var(--fs-lg); font-weight: var(--fw-medium); text-align: center;
}
.parcelas-loading__spinner { width: 32px; height: 32px; margin-bottom: var(--sp-4); animation: parcelas-spin 1s linear infinite; }
.parcelas-loading__spinner circle { opacity: 0.25; stroke: var(--c-primary); }
.parcelas-loading__spinner path { opacity: 0.75; fill: var(--c-primary); }
@keyframes parcelas-spin { 100% { transform: rotate(360deg); } }

.parcelas-header-bar { display: flex; flex-direction: column; gap: var(--sp-4); }
@media (min-width: 640px) { .parcelas-header-bar { flex-direction: row; justify-content: space-between; align-items: center; } }
.parcelas-header-bar h1 { font-size: var(--fs-2xl); font-weight: var(--fw-bold); color: var(--c-text); margin: 0; }

.parcelas-search-group { display: flex; width: 100%; gap: var(--sp-2); flex-wrap: wrap; }
@media (min-width: 640px) { .parcelas-search-group { width: auto; } }
.parcelas-search-input {
  flex: 1; border: 1px solid var(--c-border); padding: var(--sp-3) var(--sp-4); border-radius: var(--radius-md);
  font-size: var(--fs-sm); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); color: var(--c-text);
}
@media (min-width: 640px) { .parcelas-search-input { width: 220px; } }
.parcelas-search-input:focus { border-color: var(--c-primary); box-shadow: 0 0 0 3px rgba(7, 58, 90, 0.1); }
.parcelas-search-btn {
  background-color: var(--c-primary); color: var(--c-surface); padding: 0 var(--sp-5); border: none; border-radius: var(--radius-md);
  font-size: var(--fs-sm); font-weight: var(--fw-semibold); cursor: pointer; transition: background-color var(--transition-fast), box-shadow var(--transition-fast); box-shadow: var(--shadow-sm);
}
.parcelas-search-btn:hover { background-color: var(--c-primary-light); box-shadow: var(--shadow-md); }

.parcelas-empty-state {
  background-color: var(--c-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); border: 1px solid var(--c-border);
  padding: var(--sp-12); text-align: center; color: var(--c-text-secondary); font-size: var(--fs-lg);
}

.parcelas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 2rem; }

.parcela-card {
  background-color: var(--c-surface); border-radius: var(--radius-xl); border: 1px solid var(--c-border); overflow: hidden;
  display: flex; flex-direction: column; transition: box-shadow var(--transition-base), transform var(--transition-base); box-shadow: var(--shadow-sm);
}
.parcela-card:hover { box-shadow: var(--shadow-xl); transform: translateY(-2px); }
.parcela-card__image-wrap { position: relative; height: 200px; background-color: var(--c-bg); overflow: hidden; }
.parcela-card__image { width: 100%; height: 100%; object-fit: cover; transition: transform var(--transition-slow); }
.parcela-card:hover .parcela-card__image { transform: scale(1.05); }
.parcela-card__badges { position: absolute; top: var(--sp-3); left: var(--sp-3); display: flex; gap: var(--sp-2); z-index: 2; flex-wrap: wrap; }
.parcela-badge {
  background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(8px); color: var(--c-text); padding: var(--sp-1) var(--sp-2);
  border-radius: var(--radius-sm); font-size: var(--fs-xs); font-weight: var(--fw-bold); box-shadow: var(--shadow-xs); border: 1px solid rgba(255,255,255,0.4);
}
.parcela-badge--primary { background: rgba(7, 58, 90, 0.85); color: var(--c-surface); border-color: rgba(7, 58, 90, 0.4); }

.parcela-card__body { padding: var(--sp-5); display: flex; flex-direction: column; flex: 1; gap: var(--sp-4); }
.parcela-card__meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--sp-1); }
.parcela-meta-tag { font-size: var(--fs-xs); color: var(--c-text-secondary); background-color: var(--c-bg); padding: 2px var(--sp-2); border-radius: var(--radius-sm); font-weight: var(--fw-semibold); border: 1px solid var(--c-border-light); }
.parcela-meta-tag--mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.parcela-card__title { font-size: var(--fs-lg); font-weight: var(--fw-bold); color: var(--c-text); margin: 0 0 var(--sp-1) 0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.parcela-card__location { font-size: var(--fs-sm); color: var(--c-text-secondary); display: flex; align-items: center; gap: 4px; margin: 0; }

.parcela-fin-block { background-color: var(--c-bg); padding: var(--sp-3) var(--sp-4); border-radius: var(--radius-md); border: 1px solid var(--c-border-light); display: flex; flex-direction: column; gap: var(--sp-2); }
.parcela-fin-row { display: flex; justify-content: space-between; align-items: center; }
.parcela-fin-row--divider { margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--c-border-light); }
.parcela-fin-label { font-size: var(--fs-xs); color: var(--c-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--fw-semibold); }
.parcela-fin-value { font-size: var(--fs-base); font-weight: var(--fw-bold); color: var(--c-text); }
.parcela-fin-value--primary { font-size: var(--fs-lg); color: var(--c-primary); }

.parcela-commercial-info { font-size: var(--fs-sm); display: flex; flex-direction: column; gap: var(--sp-1); }
.parcela-plan-name { color: var(--c-primary-light); font-weight: var(--fw-semibold); display: flex; align-items: center; gap: 4px; }
.parcela-exp-warning { color: var(--c-warning); font-weight: var(--fw-medium); }
.parcela-exp-danger { color: var(--c-danger); font-weight: var(--fw-bold); }
.parcela-exp-normal { color: var(--c-text-secondary); }
.parcela-alert-box { margin-top: var(--sp-2); font-size: var(--fs-xs); color: var(--c-warning); background-color: rgba(217, 119, 6, 0.05); padding: var(--sp-2); border-radius: var(--radius-sm); border: 1px solid rgba(217, 119, 6, 0.2); font-weight: var(--fw-medium); }

.parcela-card__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: var(--sp-2); padding-top: var(--sp-4); border-top: 1px solid var(--c-border-light); }
.parcela-btn-action {
  display: flex; align-items: center; justify-content: center; padding: var(--sp-2) 0; border-radius: var(--radius-md); font-size: var(--fs-sm);
  font-weight: var(--fw-semibold); cursor: pointer; text-decoration: none; transition: all var(--transition-fast); border: none; min-width: 80px;
}
.parcela-btn-action--full { grid-column: span 2; }
.parcela-btn-action--edit { background-color: var(--c-bg); color: var(--c-text); border: 1px solid var(--c-border); }
.parcela-btn-action--edit:hover { background-color: var(--c-surface-hover); border-color: var(--c-text-muted); }
.parcela-btn-action--view { background-color: rgba(37, 99, 235, 0.05); color: var(--c-info); border: 1px solid rgba(37, 99, 235, 0.1); }
.parcela-btn-action--view:hover { background-color: rgba(37, 99, 235, 0.1); border-color: rgba(37, 99, 235, 0.2); }
.parcela-btn-action--tools { background-color: var(--c-primary); color: white; }
.parcela-btn-action--tools:hover { background-color: var(--c-primary-light); }
.parcela-btn-action--share { background: #f8fafc; border: 1px solid #cbd5e1; color: #0f172a; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.parcela-btn-action--studio { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; border: none; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.parcela-btn-action--delete { background: #ef4444; color: white; border: none; }
.parcela-btn-action:disabled { opacity: .6; cursor: wait; }
`;

/**
 * Puerto del `<style>` inline de `renderEditorHTML()` en
 * `modules/parcelas/editor-integral.js` — mismos nombres de clase (`.ei-*`,
 * ya suficientemente específicos), mismos valores.
 */
const editorIntegralCss = `
.ei-wrapper { display: flex; flex-direction: column; height: 100%; color: #1e293b; font-family: system-ui, -apple-system, sans-serif; }
.ei-tabs { display: flex; gap: 1.5rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1.5rem; overflow-x: auto; }
.ei-tab-btn { background: none; border: none; padding: 0.75rem 0.25rem; font-weight: 600; font-size: 0.95rem; color: #64748b; cursor: pointer; position: relative; transition: color 0.2s; white-space: nowrap; }
.ei-tab-btn:hover { color: #0f172a; }
.ei-tab-btn.active { color: #0f172a; }
.ei-tab-btn.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 3px; background: #3b82f6; border-radius: 3px 3px 0 0; }
.ei-form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }
.ei-form-group { display: flex; flex-direction: column; gap: 0.35rem; }
.ei-form-group.full-width { grid-column: 1 / -1; }
.ei-form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.02em; }
.ei-form-group input, .ei-form-group select, .ei-form-group textarea {
  padding: 0.65rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; color: #0f172a; background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit;
}
.ei-form-group input:focus, .ei-form-group select:focus, .ei-form-group textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
.ei-form-group textarea { min-height: 80px; resize: vertical; }
.ei-panel { display: none; animation: ei-fade-in 0.3s ease-in-out; }
.ei-panel.active { display: block; }
@keyframes ei-fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.ei-footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; }
.ei-tasacion-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; border-radius: 8px; display: flex; gap: 1.5rem; flex-wrap: wrap; }
.ei-tasacion-item { display: flex; flex-direction: column; gap: 0.25rem; }
.ei-tasacion-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
.ei-tasacion-value { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
.ei-btn { padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
.ei-btn:disabled { opacity: .6; cursor: wait; }
.ei-btn-primary { background: #3b82f6; color: white; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2); }
.ei-btn-primary:hover { background: #2563eb; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transform: translateY(-1px); }
.ei-btn-secondary { background: white; color: #475569; border: 1px solid #cbd5e1; }
.ei-btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }
.ei-fotos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem; min-height: 60px; }
.ei-fotos-vacio { grid-column: 1 / -1; color: #94a3b8; font-size: 0.9rem; margin: 0; }
.ei-fotos-item { position: relative; border-radius: 8px; overflow: hidden; border: 2px solid transparent; aspect-ratio: 1; background: #f1f5f9; }
.ei-fotos-item.es-portada { border-color: #3b82f6; }
.ei-fotos-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ei-fotos-item .ei-fotos-actions { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: space-between; padding: 0.3rem; opacity: 0; background: linear-gradient(rgba(0,0,0,.35), transparent 40%, transparent 60%, rgba(0,0,0,.35)); transition: opacity 0.15s; }
.ei-fotos-item:hover .ei-fotos-actions, .ei-fotos-item:focus-within .ei-fotos-actions { opacity: 1; }
.ei-fotos-btn { border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem; line-height: 1; padding: 0.3rem 0.45rem; background: rgba(255,255,255,.92); color: #0f172a; }
.ei-fotos-btn.activo { background: #3b82f6; color: #fff; }
.ei-fotos-btn:disabled { opacity: 0.5; cursor: wait; }
.ei-fotos-portada-tag { position: absolute; bottom: 0.3rem; left: 0.3rem; background: #3b82f6; color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; }
.ei-fotos-contador { font-size: 0.75rem; color: #94a3b8; text-transform: none; letter-spacing: 0; font-weight: 500; }
.ei-fotos-nota { margin: 0; font-size: 0.78rem; color: #94a3b8; }
.ei-mapa { height: 350px; width: 100%; border: 1px solid #cbd5e1; margin-top: 0.5rem; border-radius: 8px; z-index: 1; }
.ei-analytics-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 2rem; text-align: center; }
.ei-analytics-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ei-analytics-table th { padding: 8px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; text-align: left; }
.ei-analytics-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
`;

/**
 * Puerto de `modules/tasaciones/index.js` (tabla de historial, clases
 * genéricas de Tailwind del original reescritas con los tokens `--c-*`) y de
 * `modules/tasaciones/premium-report.js` (`toolsDialogHtml()`, estilos antes
 * inline en el HTML armado a mano — aquí se declaran una vez como clases
 * `.herr-*`, reutilizando los botones `.ei-btn`/`.ei-btn-primary`/
 * `.ei-btn-secondary` ya definidos arriba en vez de las clases `.btn` que
 * `components.css` todavía no porta — ver el comentario al inicio de este
 * archivo).
 */
const tasacionesCss = `
.tasaciones-module { padding: var(--sp-4); }
.tasaciones-title { font-size: var(--fs-2xl); font-weight: var(--fw-bold); margin: 0 0 var(--sp-6); color: var(--c-text); }
.tasaciones-table-card { background: var(--c-surface); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--c-border); overflow: hidden; }
.tasaciones-table-scroll { overflow-x: auto; }
.tasaciones-table { width: 100%; border-collapse: collapse; text-align: left; font-size: var(--fs-sm); }
.tasaciones-table thead tr { background: var(--c-bg); border-bottom: 1px solid var(--c-border); color: var(--c-text-secondary); text-transform: uppercase; letter-spacing: .03em; font-size: var(--fs-xs); }
.tasaciones-table th { padding: var(--sp-4); font-weight: var(--fw-semibold); }
.tasaciones-table tbody tr { border-bottom: 1px solid var(--c-border-light); }
.tasaciones-table tbody tr:hover { background: #eff6ff; }
.tasaciones-table td { padding: var(--sp-4); color: var(--c-text-secondary); }
.tasaciones-th-right { text-align: right; }
.tasaciones-th-center { text-align: center; }
.tasaciones-td-right { text-align: right; }
.tasaciones-td-center { text-align: center; }
.tasaciones-td-nowrap { white-space: nowrap; }
.tasaciones-td-mono { font-family: ui-monospace, monospace; font-size: var(--fs-xs); color: var(--c-text-muted); }
.tasaciones-td-valor { color: var(--c-info); font-weight: var(--fw-medium); }
.tasaciones-td-total { color: var(--c-text); font-weight: var(--fw-bold); }
.tasaciones-pill { background: var(--c-bg); padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--fs-xs); border: 1px solid var(--c-border); }
.tasaciones-check { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: var(--radius-full); }
.tasaciones-check--si { background: #dcfce7; color: var(--c-success); }
.tasaciones-check--no { background: var(--c-bg); color: var(--c-text-muted); }
.tasaciones-empty { padding: var(--sp-8); text-align: center; color: var(--c-text-muted); }

.herr-head { text-align: center; padding: var(--sp-6) 0 var(--sp-4); }
.herr-emoji { font-size: 3rem; margin-bottom: var(--sp-2); }
.herr-kicker { color: var(--c-primary); font-weight: var(--fw-bold); letter-spacing: 1.5px; }
.herr-title { font-size: var(--fs-xl); margin-top: var(--sp-2); color: var(--c-text); }
.herr-subtitle { color: var(--c-text-secondary); margin-bottom: var(--sp-4); }
.herr-valores-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-2); background: var(--c-bg); padding: var(--sp-3); border-radius: var(--radius-sm); border: 1px solid var(--c-border); text-align: center; margin-bottom: var(--sp-6); }
.herr-valor small { display: block; font-size: 0.7rem; color: var(--c-text-secondary); text-transform: uppercase; font-weight: var(--fw-semibold); }
.herr-valor strong { font-size: 0.95rem; }
.herr-tools-grid { display: grid; gap: var(--sp-4); margin-bottom: var(--sp-6); }
.herr-tool-card { border: 1px solid var(--c-border); border-radius: var(--radius-md); padding: var(--sp-4); }
.herr-tool-card h3 { font-size: var(--fs-base); margin: 0 0 var(--sp-2); display: flex; align-items: center; gap: var(--sp-2); }
.herr-tool-card p { font-size: var(--fs-sm); color: var(--c-text-secondary); margin: 0 0 var(--sp-4); }
.herr-tool-card--tasador { background: rgba(7, 58, 90, 0.03); }
.herr-tool-card--tasador h3 { color: var(--c-primary); }
.herr-tool-card--ia { background: linear-gradient(145deg, #f3f4f6 0%, #e5e7eb 100%); }
.herr-tool-card--ia h3 { color: #4b5563; }
.herr-tool-actions { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.herr-btn-sm { flex: 1; padding: 0.45rem 0.9rem; font-size: var(--fs-sm); }
.herr-btn-full { width: 100%; }
.herr-btn-whatsapp { color: var(--c-success); border-color: var(--c-success); }
.herr-btn-ia { background: #2563eb; }
.herr-ia-status { font-size: var(--fs-sm); margin-bottom: var(--sp-2); color: var(--c-success); font-weight: var(--fw-bold); }
.herr-ia-texto { color: var(--c-text-secondary); font-weight: var(--fw-regular); font-size: var(--fs-sm); white-space: pre-wrap; }
`;

/**
 * Puerto de `modules/visitas/index.js` (tabla + badges de estado, clases
 * genéricas de Tailwind reescritas con los tokens `--c-*`, igual criterio
 * que `tasacionesCss`) y del formulario nuevo `AgendarVisitaModal` (sin
 * equivalente legacy — ver el comentario de `agendarVisitaAction`).
 */
const visitasCss = `
.visitas-module { padding: var(--sp-4); }
.visitas-header-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--sp-4); margin-bottom: var(--sp-6); }
.visitas-title { font-size: var(--fs-2xl); font-weight: var(--fw-bold); margin: 0; color: var(--c-text); }
.visitas-subtitle { font-size: var(--fs-sm); color: var(--c-text-muted); margin: var(--sp-1) 0 0; }
.visitas-header-actions { display: flex; align-items: center; gap: var(--sp-3); }
.visitas-btn-ver-canceladas { font-size: var(--fs-xs); font-weight: var(--fw-semibold); padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-sm); border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text-muted); cursor: pointer; transition: var(--transition-fast); }
.visitas-btn-ver-canceladas:hover { background: var(--c-surface-hover); }
.visitas-btn-ver-canceladas.is-active { background: var(--c-bg); border-color: var(--c-text-muted); color: var(--c-text-secondary); }
.visitas-btn-agendar { font-size: var(--fs-sm); font-weight: var(--fw-medium); padding: var(--sp-2) var(--sp-4); border-radius: var(--radius-sm); border: none; background: var(--c-primary); color: #fff; cursor: pointer; box-shadow: var(--shadow-xs); transition: var(--transition-fast); }
.visitas-btn-agendar:hover { background: var(--c-primary-light); }
.visitas-btn-agendar:disabled { opacity: .6; cursor: wait; }

.visitas-table-card { background: var(--c-surface); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); border: 1px solid var(--c-border); overflow: hidden; }
.visitas-table-scroll { overflow-x: auto; }
.visitas-table { width: 100%; border-collapse: collapse; text-align: left; }
.visitas-table thead tr { background: var(--c-bg); border-bottom: 1px solid var(--c-border); color: var(--c-text-secondary); text-transform: uppercase; letter-spacing: .03em; font-size: var(--fs-xs); }
.visitas-table th { padding: var(--sp-4); font-weight: var(--fw-semibold); }
.visitas-table tbody tr { border-bottom: 1px solid var(--c-border-light); transition: var(--transition-fast); }
.visitas-table tbody tr:hover { background: var(--c-surface-hover); }
.visitas-table td { padding: var(--sp-4); vertical-align: middle; }
.visitas-th-right { text-align: right; }
.visitas-row--cancelada { opacity: .6; }
.visitas-fecha-cell { display: flex; flex-direction: column; }
.visitas-fecha-dia { font-weight: var(--fw-medium); color: var(--c-text); text-transform: capitalize; }
.visitas-fecha-hora { font-size: var(--fs-sm); color: var(--c-text-muted); }
.visitas-td-cliente { font-weight: var(--fw-medium); color: var(--c-text); }
.visitas-td-propiedad { font-size: var(--fs-sm); color: var(--c-text-secondary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.visitas-td-mono { font-size: var(--fs-sm); font-family: ui-monospace, monospace; color: var(--c-text-muted); }
.visitas-staff-cell { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-sm); }
.visitas-staff-avatar { width: 24px; height: 24px; border-radius: var(--radius-full); background: var(--c-border); display: flex; align-items: center; justify-content: center; font-size: var(--fs-xs); font-weight: var(--fw-bold); color: var(--c-text-secondary); }

.visita-badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--fs-xs); font-weight: var(--fw-semibold); letter-spacing: .02em; border: 1px solid transparent; }
.visita-badge--programada { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
.visita-badge--confirmada { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
.visita-badge--realizada { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.visita-badge--no-asistio { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.visita-badge--cancelada { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.visita-badge--desconocido { background: var(--c-bg); color: var(--c-text-muted); border-color: var(--c-border); }

.visitas-acciones { display: flex; align-items: center; justify-content: flex-end; gap: var(--sp-2); flex-wrap: wrap; }
.visitas-select-transicion { font-size: var(--fs-xs); padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text-secondary); }
.visitas-btn-cancelar { font-size: var(--fs-xs); font-weight: var(--fw-semibold); padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; cursor: pointer; transition: var(--transition-fast); }
.visitas-btn-cancelar:hover { background: #fee2e2; }
.visitas-btn-cancelar:disabled { opacity: .6; cursor: wait; }
.visitas-sin-accion { font-size: var(--fs-xs); color: var(--c-border); }
.visitas-empty { padding: var(--sp-8); text-align: center; color: var(--c-text-muted); }

.visitas-toasts { position: fixed; bottom: var(--sp-4); right: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-2); z-index: 300; }
.visitas-toast { padding: 10px 16px; border-radius: var(--radius-sm); font-size: var(--fs-sm); color: #fff; box-shadow: var(--shadow-md); max-width: 360px; }
.visitas-toast--success { background: var(--c-success); }
.visitas-toast--error { background: var(--c-danger); }

.agendar-visita-form { display: flex; flex-direction: column; gap: var(--sp-4); }
.agendar-visita-field { display: flex; flex-direction: column; gap: var(--sp-1); }
.agendar-visita-field label { font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--c-text-secondary); text-transform: uppercase; letter-spacing: .02em; }
.agendar-visita-field select, .agendar-visita-field input, .agendar-visita-field textarea {
  padding: 0.6rem 0.75rem; border: 1px solid var(--c-border); border-radius: var(--radius-sm); font-size: var(--fs-base); color: var(--c-text); background: var(--c-surface); font-family: inherit;
}
.agendar-visita-field textarea { min-height: 70px; resize: vertical; }
.agendar-visita-aviso { font-size: var(--fs-sm); color: var(--c-warning); background: #fffbeb; border: 1px solid #fde68a; padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-sm); margin: 0; }
.agendar-visita-error { font-size: var(--fs-sm); color: var(--c-danger); margin: 0; }
.agendar-visita-actions { display: flex; justify-content: flex-end; gap: var(--sp-2); margin-top: var(--sp-2); }
.visitas-btn-secundario { font-size: var(--fs-sm); padding: var(--sp-2) var(--sp-4); border-radius: var(--radius-sm); border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text-secondary); cursor: pointer; }
.visitas-btn-secundario:hover { background: var(--c-surface-hover); }
`;

/**
 * Puerto de las clases `.rev-*`/`.dash-vacio` que usa `modules/revision/index.js`
 * (la bandeja en sí no tenía hoja de estilos propia en el legacy — vivía de
 * clases genéricas de `components.css` que este piloto no porta; se
 * construyen aquí versiones propias con los mismos tokens, igual que se hizo
 * para Parcelas/Tasaciones/Visitas).
 */
const revisionCss = `
.revision-modulo { display: flex; flex-direction: column; gap: var(--sp-6); }
.revision-cabecera { display: flex; align-items: baseline; gap: var(--sp-3); flex-wrap: wrap; }
.revision-titulo { font-size: var(--fs-2xl); font-weight: var(--fw-bold); color: var(--c-text); margin: 0; }
.revision-contador { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: #fff; background: var(--c-warning); padding: 2px 10px; border-radius: var(--radius-full); }

.revision-tabla-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-md); box-shadow: var(--shadow-xs); overflow: hidden; }
.revision-tabla-scroll { overflow-x: auto; }
.revision-vacio { padding: var(--sp-8); text-align: center; color: var(--c-text-muted); margin: 0; }

.revision-tabla { width: 100%; border-collapse: collapse; }
.revision-tabla th { text-align: left; padding: var(--sp-3) var(--sp-4); font-size: var(--fs-xs); font-weight: var(--fw-semibold); text-transform: uppercase; letter-spacing: .02em; color: var(--c-text-muted); border-bottom: 1px solid var(--c-border); }
.revision-tabla tbody tr { border-bottom: 1px solid var(--c-border-light); transition: var(--transition-fast); }
.revision-tabla tbody tr:hover { background: var(--c-surface-hover); }
.revision-tabla td { padding: var(--sp-4); vertical-align: middle; }
.revision-tabla td strong { display: block; color: var(--c-text); }
.revision-tabla td small { display: block; font-size: var(--fs-xs); color: var(--c-text-muted); }
.revision-btn-revisar { font-size: var(--fs-sm); font-weight: var(--fw-semibold); padding: 0.4rem 0.9rem; border-radius: var(--radius-sm); border: none; background: var(--c-primary); color: #fff; cursor: pointer; transition: var(--transition-fast); }
.revision-btn-revisar:hover { background: var(--c-primary-light); }

.revision-toasts { position: fixed; bottom: var(--sp-4); right: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-2); z-index: 300; }
.revision-toast { padding: 10px 16px; border-radius: var(--radius-sm); font-size: var(--fs-sm); color: #fff; box-shadow: var(--shadow-md); max-width: 360px; }
.revision-toast--success { background: var(--c-success); }
.revision-toast--error { background: var(--c-danger); }

.rev-detalle { display: flex; }
.rev-panel { flex: 1; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); padding: var(--sp-6); display: flex; flex-direction: column; gap: var(--sp-6); }
.rev-panel__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); }
.rev-panel__head h2 { margin: var(--sp-1) 0; font-size: var(--fs-xl); color: var(--c-text); }
.rev-kicker { font-size: var(--fs-xs); font-weight: var(--fw-semibold); text-transform: uppercase; letter-spacing: .04em; color: var(--c-text-muted); }
.rev-sub { margin: 0; font-size: var(--fs-sm); color: var(--c-text-secondary); }
.rev-btn-cerrar { font-size: var(--fs-sm); padding: var(--sp-2) var(--sp-4); border-radius: var(--radius-sm); border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text-secondary); cursor: pointer; white-space: nowrap; }
.rev-btn-cerrar:hover { background: var(--c-surface-hover); }

.rev-seccion h3 { margin: 0 0 var(--sp-3); font-size: var(--fs-base); font-weight: var(--fw-semibold); color: var(--c-text); }
.rev-seccion--alerta { background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: var(--sp-4); }
.rev-alerta { font-size: var(--fs-sm); color: var(--c-warning); margin: 0 0 var(--sp-2); }
.rev-faltantes { margin: 0; padding-left: 1.25rem; font-size: var(--fs-sm); color: var(--c-text-secondary); }

.rev-datos { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--sp-3); }
.rev-dato { display: flex; flex-direction: column; gap: 2px; }
.rev-dato span { font-size: var(--fs-xs); color: var(--c-text-muted); }
.rev-dato strong { font-size: var(--fs-sm); color: var(--c-text); font-weight: var(--fw-medium); }

.rev-descripcion { margin: 0; font-size: var(--fs-sm); color: var(--c-text-secondary); white-space: pre-wrap; }

.rev-cuenta { font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--c-text-muted); }
.rev-fotos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--sp-3); }
.rev-fotos-item { display: block; aspect-ratio: 4 / 3; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--c-border); background: var(--c-bg); }
.rev-fotos-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rev-fotos-item--rota { display: flex; align-items: center; justify-content: center; font-size: var(--fs-xs); color: var(--c-text-muted); }

.rev-decision { display: flex; flex-direction: column; gap: var(--sp-3); padding-top: var(--sp-4); border-top: 1px solid var(--c-border-light); }
.rev-decision label { font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--c-text-secondary); text-transform: uppercase; letter-spacing: .02em; }
.rev-decision textarea { padding: 0.6rem 0.75rem; border: 1px solid var(--c-border); border-radius: var(--radius-sm); font-size: var(--fs-base); color: var(--c-text); background: var(--c-surface); font-family: inherit; min-height: 70px; resize: vertical; }
.rev-estado { margin: 0; font-size: var(--fs-sm); color: var(--c-danger); }
.rev-estado--ok { color: var(--c-success); }
.rev-botones { display: flex; justify-content: flex-end; gap: var(--sp-2); }
.rev-btn-rechazar { font-size: var(--fs-sm); font-weight: var(--fw-semibold); padding: var(--sp-2) var(--sp-4); border-radius: var(--radius-sm); border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; cursor: pointer; transition: var(--transition-fast); }
.rev-btn-rechazar:hover { background: #fee2e2; }
.rev-btn-rechazar:disabled, .rev-btn-aprobar:disabled { opacity: .6; cursor: wait; }
.rev-btn-aprobar { font-size: var(--fs-sm); font-weight: var(--fw-semibold); padding: var(--sp-2) var(--sp-4); border-radius: var(--radius-sm); border: none; background: var(--c-success); color: #fff; cursor: pointer; transition: var(--transition-fast); }
.rev-btn-aprobar:hover { background: #15803d; }
.rev-nota { margin: 0; font-size: var(--fs-xs); color: var(--c-text-muted); }
`;

const styles = [tokensCss, shellCss, kanbanCss, authCss, directoryCss, parcelasCss, editorIntegralCss, tasacionesCss, visitasCss, revisionCss].join("\n");

/** Renderizar una sola vez en el layout raíz (`app/layout.tsx`). */
export function CrmDesignSystemStyles() {
  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}
