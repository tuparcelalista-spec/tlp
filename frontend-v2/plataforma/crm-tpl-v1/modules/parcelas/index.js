import state from '../../core/state.js';
import { getClient } from '../../core/supabase.js';
import { formatCLP, escapeHtml } from '../../core/utils.js';
import { showModal } from '../../components/modal.js';
import { openIntegralEditor } from './editor-integral.js';
import { openPremiumReport } from '../tasaciones/premium-report.js?v=20260901-tasador';
import { refrescarSnapshot } from '../../core/refresh.js';

// Helper to show a temporary banner on top of the Parcela view
function showAlert(message, type = 'error') {
  const container = document.getElementById('parcelas-grid-container')?.parentElement;
  if (!container) return;
  const existing = document.getElementById('parcelas-alert');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'parcelas-alert';
  banner.textContent = message;
  banner.style.cssText = `padding:12px 16px; margin-bottom:12px; border-radius:6px; font-weight:600; text-align:center; ${type === 'error' ? 'background:#fef2f2;color:#b91c1c;' : 'background:#ecfdf5;color:#059669;'}`;
  container.insertBefore(banner, container.firstChild);
}

// Utility to clear previous event listeners by resetting container HTML before re‑binding
function resetViewContainer() {
  const container = document.getElementById('parcelas-grid-container');
  if (container) container.innerHTML = '';
}

let localParcelas = [];
let isLoading = true;

/**
 * Tira la caché local de filas.
 *
 * `localParcelas` e `isLoading` viven en el módulo, no en el snapshot: si
 * core/refresh.js repinta esta vista sin avisar, init() ve isLoading=false y
 * vuelve a pintar las filas viejas. El router llama a esto antes de renderizar
 * cuando el repintado viene de un guardado.
 */
export function invalidate() {
    isLoading = true;
    localParcelas = [];
}
let currentSearchQuery = '';
let currentSearchRegion = '';
let currentSearchComuna = '';

export function render() {
    const styles = `
    <style>
        .parcelas-container {
            padding: var(--sp-6) var(--sp-4);
            max-width: 1400px;
            margin: 0 auto;
            font-family: var(--font-family);
            color: var(--c-text);
        }
        
        .loading-state {
            padding: var(--sp-12);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--c-text-muted);
            font-size: var(--fs-lg);
            font-weight: var(--fw-medium);
            text-align: center;
        }

        .loading-spinner {
            width: 32px;
            height: 32px;
            margin-bottom: var(--sp-4);
            animation: spin 1s linear infinite;
        }

        .loading-spinner circle {
            opacity: 0.25;
            stroke: var(--c-primary);
        }

        .loading-spinner path {
            opacity: 0.75;
            fill: var(--c-primary);
        }

        @keyframes spin {
            100% { transform: rotate(360deg); }
        }

        .header-bar {
            display: flex;
            flex-direction: column;
            gap: var(--sp-4);
            margin-bottom: var(--sp-6);
        }

        @media (min-width: 640px) {
            .header-bar {
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
            }
        }

        .header-title {
            font-size: var(--fs-2xl);
            font-weight: var(--fw-bold);
            color: var(--c-text);
            margin: 0;
        }

        .search-group {
            display: flex;
            width: 100%;
            gap: var(--sp-2);
        }

        @media (min-width: 640px) {
            .search-group {
                width: auto;
            }
        }

        .search-input {
            flex: 1;
            border: 1px solid var(--c-border);
            padding: var(--sp-3) var(--sp-4);
            border-radius: var(--radius-md);
            font-size: var(--fs-sm);
            outline: none;
            transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
            color: var(--c-text);
        }

        @media (min-width: 640px) {
            .search-input { width: 250px; }
        }

        .search-input:focus {
            border-color: var(--c-primary);
            box-shadow: 0 0 0 3px rgba(7, 58, 90, 0.1);
        }

        .search-btn {
            background-color: var(--c-primary);
            color: var(--c-surface);
            padding: 0 var(--sp-5);
            border: none;
            border-radius: var(--radius-md);
            font-size: var(--fs-sm);
            font-weight: var(--fw-semibold);
            cursor: pointer;
            transition: background-color var(--transition-fast), box-shadow var(--transition-fast);
            box-shadow: var(--shadow-sm);
        }

        .search-btn:hover {
            background-color: var(--c-primary-light);
            box-shadow: var(--shadow-md);
        }

        .empty-state {
            background-color: var(--c-surface);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--c-border);
            padding: var(--sp-12);
            text-align: center;
            color: var(--c-text-secondary);
            font-size: var(--fs-lg);
        }

        .parcelas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 2rem;
        }

        .card {
            background-color: var(--c-surface);
            border-radius: var(--radius-xl);
            border: 1px solid var(--c-border);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: box-shadow var(--transition-base), transform var(--transition-base);
            box-shadow: var(--shadow-sm);
        }

        .card:hover {
            box-shadow: var(--shadow-xl);
            transform: translateY(-2px);
        }

        .card-image-wrap {
            position: relative;
            height: 200px;
            background-color: var(--c-bg);
            overflow: hidden;
        }

        .card-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform var(--transition-slow);
        }
        
        .card:hover .card-image {
            transform: scale(1.05);
        }

        .card-badges {
            position: absolute;
            top: var(--sp-3);
            left: var(--sp-3);
            display: flex;
            gap: var(--sp-2);
            z-index: 2;
        }

        .badge {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(8px);
            color: var(--c-text);
            padding: var(--sp-1) var(--sp-2);
            border-radius: var(--radius-sm);
            font-size: var(--fs-xs);
            font-weight: var(--fw-bold);
            box-shadow: var(--shadow-xs);
            border: 1px solid rgba(255,255,255,0.4);
        }

        .badge-primary {
            background: rgba(7, 58, 90, 0.85);
            color: var(--c-surface);
            border-color: rgba(7, 58, 90, 0.4);
        }

        .card-body {
            padding: var(--sp-5);
            display: flex;
            flex-direction: column;
            flex: 1;
            gap: var(--sp-4);
        }

        .card-header-meta {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: var(--sp-1);
        }

        .meta-tag {
            font-size: var(--fs-xs);
            color: var(--c-text-secondary);
            background-color: var(--c-bg);
            padding: 2px var(--sp-2);
            border-radius: var(--radius-sm);
            font-weight: var(--fw-semibold);
            border: 1px solid var(--c-border-light);
        }
        
        .meta-tag.mono {
            font-family: monospace;
        }

        .card-title {
            font-size: var(--fs-lg);
            font-weight: var(--fw-bold);
            color: var(--c-text);
            margin: 0 0 var(--sp-1) 0;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .card-location {
            font-size: var(--fs-sm);
            color: var(--c-text-secondary);
            display: flex;
            align-items: center;
            gap: 4px;
            margin: 0;
        }

        .fin-block {
            background-color: var(--c-bg);
            padding: var(--sp-3) var(--sp-4);
            border-radius: var(--radius-md);
            border: 1px solid var(--c-border-light);
            display: flex;
            flex-direction: column;
            gap: var(--sp-2);
        }

        .fin-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .fin-label {
            font-size: var(--fs-xs);
            color: var(--c-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: var(--fw-semibold);
        }

        .fin-value {
            font-size: var(--fs-base);
            font-weight: var(--fw-bold);
            color: var(--c-text);
        }

        .fin-value.primary {
            font-size: var(--fs-lg);
            color: var(--c-primary);
        }

        .fin-trend {
            display: flex;
            align-items: center;
            gap: var(--sp-2);
        }

        .trend-badge {
            font-size: var(--fs-xs);
            font-weight: var(--fw-bold);
            padding: 2px var(--sp-2);
            border-radius: var(--radius-full);
            background-color: rgba(22, 163, 74, 0.1);
            color: var(--c-success);
        }

        .trend-badge.negative {
            background-color: rgba(220, 38, 38, 0.1);
            color: var(--c-danger);
        }

        .commercial-info {
            font-size: var(--fs-sm);
            display: flex;
            flex-direction: column;
            gap: var(--sp-1);
        }

        .plan-name {
            color: var(--c-primary-light);
            font-weight: var(--fw-semibold);
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .exp-warning {
            color: var(--c-warning);
            font-weight: var(--fw-medium);
        }
        
        .exp-danger {
            color: var(--c-danger);
            font-weight: var(--fw-bold);
        }
        
        .exp-normal {
            color: var(--c-text-secondary);
        }

        .alert-box {
            margin-top: var(--sp-2);
            font-size: var(--fs-xs);
            color: var(--c-warning);
            background-color: rgba(217, 119, 6, 0.05);
            padding: var(--sp-2);
            border-radius: var(--radius-sm);
            border: 1px solid rgba(217, 119, 6, 0.2);
            font-weight: var(--fw-medium);
        }

        .spacer {
            flex-grow: 1;
        }

        .card-actions {
            display: flex;
            gap: var(--sp-2);
            margin-top: var(--sp-2);
            padding-top: var(--sp-4);
            border-top: 1px solid var(--c-border-light);
            flex-wrap: wrap;
        }

        .btn-action {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--sp-2) 0;
            border-radius: var(--radius-md);
            font-size: var(--fs-sm);
            font-weight: var(--fw-semibold);
            cursor: pointer;
            text-decoration: none;
            transition: all var(--transition-fast);
            border: none;
            min-width: 80px;
        }

        .btn-edit {
            background-color: var(--c-bg);
            color: var(--c-text);
            border: 1px solid var(--c-border);
        }

        .btn-edit:hover {
            background-color: var(--c-surface-hover);
            border-color: var(--c-text-muted);
        }

        .btn-view {
            background-color: rgba(37, 99, 235, 0.05);
            color: var(--c-info);
            border: 1px solid rgba(37, 99, 235, 0.1);
        }

        .btn-view:hover {
            background-color: rgba(37, 99, 235, 0.1);
            border-color: rgba(37, 99, 235, 0.2);
        }

        .btn-tools {
            background-color: var(--c-primary);
            color: white;
        }

        .btn-tools:hover {
            background-color: var(--c-primary-light);
        }
    </style>
    `;

    if (isLoading) {
        return `
        ${styles}
        <div class="parcelas-container">
            <div class="loading-state">
                <svg class="loading-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="4"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p>Cargando inventario de parcelas...</p>
            </div>
        </div>`;
    }

    const calculateExpiration = (dateStr) => {
        if (!dateStr) return { text: 'Sin fecha de expiración', colorClass: 'exp-normal' };
        const exp = new Date(dateStr);
        const today = new Date();
        const diffTime = exp.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { text: `⏳ Expirado hace ${Math.abs(diffDays)} días`, colorClass: 'exp-danger' };
        if (diffDays < 7) return { text: `⏳ Expira en ${diffDays} días`, colorClass: 'exp-warning' };
        return { text: `⏳ Expira en ${diffDays} días`, colorClass: 'exp-normal' };
    };

    const renderParcela = (p) => {
        let rawFotoUrl = null;
        
        // Find the best photo candidate from various possible column names
        const possibleMainPhoto = p.imagen_principal || p.foto_principal || p.imagen || p.foto;
        
        if (possibleMainPhoto) {
            rawFotoUrl = possibleMainPhoto;
        } else if (p.imagenes) {
            if (Array.isArray(p.imagenes) && p.imagenes.length > 0) {
                rawFotoUrl = p.imagenes[0];
            } else if (typeof p.imagenes === 'string' && p.imagenes.trim() !== '') {
                try {
                    let arr = JSON.parse(p.imagenes);
                    if (Array.isArray(arr) && arr.length > 0) rawFotoUrl = arr[0];
                } catch(e1) {
                    try { 
                        const arr = JSON.parse(p.imagenes.replace(/^{|}$/g, '["').replace(/,/g, '","') + '"]');
                        if (arr.length > 0) rawFotoUrl = arr[0]; 
                    } catch(e2) {
                        if (p.imagenes.startsWith('http') || p.imagenes.startsWith('image/')) rawFotoUrl = p.imagenes;
                    }
                }
            }
        }

        const absoluteAsset = (path) => {
            const val = String(path || '').trim();
            if (!val) return 'https://via.placeholder.com/400x300?text=Sin+Foto';
            if (/^(https?:)?\/\//i.test(val) || val.startsWith('data:') || val.startsWith('blob:')) return val;
            return '../../' + val.replace(/^\.\//, '');
        };

        const fotoUrl = absoluteAsset(rawFotoUrl);
        const foto = escapeHtml(fotoUrl);
        
        const estado = escapeHtml(p.estado || 'Desconocido');
        const dias = p.dias_publicada || 0;
        
        const tasadorValue = p.valor_tpl_tasador || p.valor_tpl_tasador_ajustado || 0;
        const comunalValue = p.valor_comunal || p.valor_tpl_promedio_comunal || 0;
        const recValue = p.valor_tpl_recomendado || p.valor_tpl || 0;
        const apuroValue = p.valor_venta_apuro || 0;
        
        const tasadorStr = tasadorValue > 0 ? formatCLP(tasadorValue) : 'En análisis';
        const comunalStr = comunalValue > 0 ? formatCLP(comunalValue) : 'Sin datos';
        const recStr = recValue > 0 ? formatCLP(recValue) : 'No calculado';
        const apuroStr = apuroValue > 0 ? formatCLP(apuroValue) : '—';

        const expInfo = calculateExpiration(p.expiracion_plan);
        
        // --- COMPLETION SCORE ---
        let compScore = 0;
        let maxComp = 10;
        if (p.precio_publicado > 0) compScore++;
        if (p.superficie_m2 > 0) compScore++;
        if (p.comuna) compScore++;
        if (p.lat && p.lng) compScore++;
        if (p.agua) compScore++;
        if (p.electricidad || p.luz) compScore++;
        if (p.acceso) compScore++;
        if (p.topografia || p.suelo) compScore++;
        if (p.total_fotos >= 6) compScore++;
        let hasVideo = false;
        try {
            const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
            if (meta?.videoUrl) hasVideo = true;
        } catch(e){}
        if (hasVideo) compScore++;
        
        const compPercent = Math.round((compScore / maxComp) * 100);
        const compColor = compPercent < 60 ? '#f44336' : (compPercent < 85 ? '#ff9800' : '#4caf50');
        const alertHtml = (p.total_fotos < 5) ? `<div class="alert-box">⚠️ Faltan fotos (${p.total_fotos || 0}/5)</div>` : '';
        
        return `
            <div class="card">
                <div class="card-image-wrap">
                    <img src="${foto}" alt="${escapeHtml(p.titulo || '')}" class="card-image">
                    <div class="card-badges">
                        <span class="badge">${estado}</span>
                        <span class="badge badge-primary">${dias} días</span>
                        <span class="badge" style="background:${compColor}22; color:${compColor}; border:1px solid ${compColor}55;">Info: ${compPercent}%</span>
                    </div>
                </div>
                
                <div class="card-body">
                    <div>
                        <div class="card-header-meta">
                            <span class="meta-tag mono">${escapeHtml(p.codigo || 'S/N')}</span>
                            <span class="meta-tag">${escapeHtml(p.superficie_m2 || '0')} m²</span>
                        </div>
                        <h3 class="card-title" title="${escapeHtml(p.titulo || '')}">${escapeHtml(p.titulo || 'Sin título')}</h3>
                        <p class="card-location">📍 ${escapeHtml(p.comuna || 'Sin comuna')}</p>
                    </div>

                    <div class="fin-block">
                        <div class="fin-row">
                            <span class="fin-label">Precio Publicado</span>
                            <span class="fin-value primary">${formatCLP(p.precio_publicado || 0)}</span>
                        </div>
                        <div class="fin-row" style="margin-top: 4px;">
                            <span class="fin-label">Tasador Técnico</span>
                            <span class="fin-value">${tasadorStr}</span>
                        </div>
                        <div class="fin-row">
                            <span class="fin-label">Promedio Comunal</span>
                            <span class="fin-value">${comunalStr}</span>
                        </div>
                        <div class="fin-row" style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--c-border-light);">
                            <span class="fin-label" style="color: #2a9d8f;">Recomendado</span>
                            <span class="fin-value" style="color: #2a9d8f;">${recStr}</span>
                        </div>
                        <div class="fin-row">
                            <span class="fin-label" style="color: #e63946;">Venta Apuro</span>
                            <span class="fin-value" style="color: #e63946;">${apuroStr}</span>
                        </div>
                    </div>

                    <div class="commercial-info">
                        <div class="plan-name">💎 ${escapeHtml(p.plan_nombre || 'Sin Plan')}</div>
                        <div class="${expInfo.colorClass}">${expInfo.text}</div>
                        ${alertHtml}
                    </div>

                    <div class="card-actions" style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <button class="btn-action btn-edit btn-view-parcela" data-id="${p.id}">Editar</button>
                        <button class="btn-action btn-tools btn-open-tools" data-id="${p.id}">Herramientas</button>
                        <a href="../../parcela.html?id=${p.id}" target="_blank" class="btn-action btn-view" style="text-align:center;">Ver Web</a>
                        <button class="btn-action btn-copy-link" data-id="${p.id}" style="background:transparent; border:1px solid #ddd; color:#444;" title="Link Propietario">📋 Link</button>
                        <a href="../../tpl-business-v2/studio-mark-ii/index.html?propiedad_id=${p.id}&actor_id=${p.propietario_id || ''}" target="_blank" class="btn-action" style="background:#0284c7; color:white; border:none; grid-column: span 2; text-align:center;">🪄 Abrir en TPL Studio</a>
                        <button class="btn-action btn-delete-parcela" data-id="${p.id}" style="background:#ef4444; color:white; border:none; grid-column: span 2; text-align:center;">🗑️ Eliminar</button>
                    </div>
                </div>
            </div>
        `;
    };

    // Filter logic
    // Identificar IDs de actores que son corredores.
    //
    // Esto leia `window.state`, que NUNCA se define (core/state.js es un modulo
    // ES; su estado no se cuelga de window). La lista salia siempre vacia, asi
    // que el filtro "ocultar parcelas de corredores" no ocultaba nada: era codigo
    // muerto que parecia estar funcionando. Ahora lee el snapshot real.
    const actores = state.snapshot?.actores || [];
    const corredoresIds = actores
        .filter(a => Array.isArray(a.roles) && a.roles.some(r => String(r).toLowerCase() === 'corredor'))
        .map(a => a.id);

    const filteredParcelas = localParcelas.filter(p => {
        // Ocultar parcelas publicadas por corredores
        if (p.propietario_id && corredoresIds.includes(p.propietario_id)) return false;

        if (currentSearchQuery) {
            const q = currentSearchQuery.toLowerCase();
            const text = (p.codigo + ' ' + p.titulo).toLowerCase();
            if (!text.includes(q)) return false;
        }
        if (currentSearchRegion && p.region !== currentSearchRegion) return false;
        if (currentSearchComuna && p.comuna !== currentSearchComuna) return false;
        return true;
    });

    const regiones = [...new Set(localParcelas.map(p => p.region).filter(Boolean))].sort();
    const comunas = [...new Set(localParcelas.map(p => p.comuna).filter(Boolean))].sort();

    return `
        ${styles}
        <div class="parcelas-container" id="parcelas-grid-container">
            <div class="header-bar">
                <h1 class="header-title">Inventario Resumido</h1>
                <div class="search-group" style="flex-wrap: wrap;">
                    <input type="text" id="search-parcelas" value="${escapeHtml(currentSearchQuery)}" placeholder="Buscar código o título..." class="search-input">
                    <select id="filter-region" class="search-input" style="width: auto;">
                        <option value="">Todas las Regiones</option>
                        ${regiones.map(r => `<option value="${escapeHtml(r)}" ${currentSearchRegion === r ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}
                    </select>
                    <select id="filter-comuna" class="search-input" style="width: auto;">
                        <option value="">Todas las Comunas</option>
                        ${comunas.map(c => `<option value="${escapeHtml(c)}" ${currentSearchComuna === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                    </select>
                    <button id="btn-search-parcelas" class="search-btn">Filtrar</button>
                    <button id="btn-sync-tasaciones" class="search-btn" style="background:var(--c-primary); color:white; margin-left: auto;">⚡ Sincronizar Tasaciones</button>
                </div>
            </div>
            
            ${filteredParcelas.length > 0 ? `
                <div class="parcelas-grid">
                    ${filteredParcelas.map(p => renderParcela(p)).join('')}
                </div>
            ` : `
                <div class="empty-state">
                    <p>No se encontraron parcelas.</p>
                </div>
            `}
        </div>
    `;
}

export async function init() {
    const mainView = document.getElementById('content');
    
    // Si está cargando, pedimos los datos directamente a la vista ligera
    if (isLoading) {
        const client = getClient();
        const { data, error } = await client.from('crm_parcelas_resumen').select('*').order('publicada_at', { ascending: false });
        if (!error && data && data.length > 0) {
            localParcelas = data;
        } else {
            console.warn('Vista crm_parcelas_resumen falló o está vacía. Usando snapshot global.', error);
            localParcelas = state.snapshot?.parcelas || [];
        }
        isLoading = false;
        
        // Re-renderizamos inyectando HTML y volvemos a correr init()
        if (mainView) {
            mainView.innerHTML = render();
            init();
        }
        return;
    }

    // Una vez cargados los datos, bindeamos los eventos
    const showDetail = (e) => {
        const id = e.currentTarget.dataset.id;
        state.selectedParcelaId = id;
        openIntegralEditor(id);
    };

    document.querySelectorAll('.btn-view-parcela').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDetail(e);
        });
    });

    document.querySelectorAll('.btn-open-tools').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const record = localParcelas.find(p => p.id === id);
            // Aquí abrimos el Informe Premium que adentro tiene las opciones de copiar, descargar y whatsapp
            openPremiumReport(id, { record });
        });
    });

    document.querySelectorAll('.btn-copy-link').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const btnEl = e.currentTarget;
            const textoOriginal = btnEl.textContent;
            btnEl.textContent = '⏳ Generando...';
            btnEl.disabled = true;

            try {
                // El portal del propietario (frontend-v2/plataforma/propietario/) ya no
                // acepta ?id=: tpl_propietario_actualizar_por_token_v1 exige un token
                // firmado, porque tpl_propiedades no admite escritura anonima directa.
                // Por eso el link se genera aqui con tpl_crm_generar_link_propietario_v1
                // (vence en 30 dias e invalida cualquier link anterior de esta parcela).
                const client = getClient();
                const { data, error } = await client.rpc('tpl_crm_generar_link_propietario_v1', { p_propiedad_id: id, p_dias: 30 });
                if (error) throw error;
                if (!data?.ok || !data?.token) throw new Error(data?.error || 'No fue posible generar el enlace.');

                const baseUrl = window.location.origin + window.location.pathname.replace('/crm-tpl-v1/', '/propietario/');
                const link = `${baseUrl}?token=${data.token}`;
                await navigator.clipboard.writeText(link);

                const vence = data.expires_at
                    ? new Date(data.expires_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
                    : null;
                const toast = document.createElement('div');
                toast.textContent = vence ? `¡Link copiado! Vence el ${vence}.` : '¡Link copiado al portapapeles!';
                toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#10b981; color:white; padding:12px 24px; border-radius:8px; z-index:9999; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.1);';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
            } catch (err) {
                console.error('No se pudo generar el link del propietario', err);
                alert('No se pudo generar el link: ' + (err?.message || err));
            } finally {
                btnEl.textContent = textoOriginal;
                btnEl.disabled = false;
            }
        });
    });

    document.querySelectorAll('.btn-delete-parcela').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            if (!confirm('¿Seguro que deseas eliminar esta parcela de forma permanente? Esta acción no se puede deshacer.')) return;
            
            const btnEl = e.currentTarget;
            btnEl.textContent = 'Borrando...';
            btnEl.disabled = true;
            
            try {
                const client = getClient();
                // .select('id') es clave aqui: sin representacion, Supabase devuelve
                // 200/error:null aunque RLS haya bloqueado el borrado y 0 filas se
                // hayan tocado. Sin este chequeo, un borrado bloqueado por permisos
                // se reportaba como exitoso y la parcela seguia apareciendo en la
                // grilla sin ninguna pista de por que.
                const { data: borradas, error } = await client.from('tpl_propiedades').delete().eq('id', id).select('id');

                if (error && error.code === '23503') { // Foreign Key Violation
                    const softDelete = confirm('No se puede borrar definitivamente porque tiene historial (cotizaciones o tasaciones) asociadas en la base de datos.\n\n¿Deseas MOVERLA A LA PAPELERA (estado: "eliminada") en su lugar para ocultarla?');
                    if (softDelete) {
                        const { data: archivadas, error: updateError } = await client.from('tpl_propiedades').update({ estado: 'eliminada' }).eq('id', id).select('id');
                        if (updateError) throw updateError;
                        if (!archivadas?.length) throw new Error('La base no confirmó el archivado. Revisa que tu usuario tenga permisos de staff en el CRM.');
                        alert('Parcela archivada en papelera exitosamente.');
                        await refrescarSnapshot();
                        return;
                    } else {
                        throw new Error('Borrado cancelado.');
                    }
                } else if (error) {
                    throw error;
                } else if (!borradas?.length) {
                    // No hubo error pero tampoco se borro ninguna fila: normalmente
                    // significa que la politica RLS de borrado (tpl_propiedades_staff_delete)
                    // no reconoce a este usuario como staff.
                    throw new Error('La base no confirmó el borrado (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.');
                }

                alert('Parcela eliminada correctamente.');
                await refrescarSnapshot();
            } catch (err) {
                console.error('Error al eliminar parcela', err);
                alert('Ocurrió un error al intentar eliminar la parcela: ' + err.message);
                btnEl.textContent = '🗑️ Eliminar';
                btnEl.disabled = false;
            }
        });
    });

    const btnSearch = document.getElementById('btn-search-parcelas');
    if (btnSearch) {
        btnSearch.addEventListener('click', () => {
            currentSearchQuery = document.getElementById('search-parcelas')?.value || '';
            currentSearchRegion = document.getElementById('filter-region')?.value || '';
            currentSearchComuna = document.getElementById('filter-comuna')?.value || '';
            resetViewContainer();
            mainView.innerHTML = render();
            init();
        });
    }

    const btnSync = document.getElementById('btn-sync-tasaciones');
    if (btnSync) {
        btnSync.addEventListener('click', async () => {
            if (!confirm('¿Seguro que deseas recalcular la tasación de TODAS las parcelas? Esto tomará unos segundos.')) return;
            
            btnSync.textContent = '⏳ Sincronizando...';
            btnSync.disabled = true;
            
            const client = getClient();
            let successCount = 0;
            let errorCount = 0;
            
            // Recargar todas las parcelas desde Supabase para tener la data más cruda
            const { data: fullParcelas, error: loadErr } = await client.from('tpl_propiedades').select('*').in('estado', ['publicada', 'activa', 'disponible']);
            
            if (loadErr || !fullParcelas) {
                showAlert('Error al cargar parcelas para sincronizar: ' + (loadErr?.message || ''));
                btnSync.textContent = '⚡ Sincronizar Tasaciones';
                btnSync.disabled = false;
                return;
            }

            // References para calcular distancias
            const REFERENCE_POINTS = {
                quillon: { major:{name:'Chillán',category:'capital regional',lat:-36.6066,lng:-72.1034}, local:{name:'Quillón',lat:-36.7385,lng:-72.4597}, tourism:'local' },
                florida: { major:{name:'Gran Concepción',category:'área metropolitana',lat:-36.8201,lng:-73.0444}, local:{name:'Florida',lat:-36.8204,lng:-72.6629}, tourism:'' },
                nacimiento: { major:{name:'Los Ángeles',category:'polo provincial',lat:-37.4697,lng:-72.3537}, local:{name:'Nacimiento',lat:-37.5010,lng:-72.6735}, tourism:'' },
                yumbel: { major:{name:'Los Ángeles',category:'polo provincial',lat:-37.4697,lng:-72.3537}, local:{name:'Yumbel',lat:-37.0988,lng:-72.5608}, tourism:'local' },
                negrete: { major:{name:'Los Ángeles',category:'polo provincial',lat:-37.4697,lng:-72.3537}, local:{name:'Negrete',lat:-37.5857,lng:-72.5293}, tourism:'' },
                ranquil: { major:{name:'Chillán',category:'capital regional',lat:-36.6066,lng:-72.1034}, local:{name:'Ñipas',lat:-36.6247,lng:-72.5385}, tourism:'local' },
                nipas: { major:{name:'Chillán',category:'capital regional',lat:-36.6066,lng:-72.1034}, local:{name:'Ñipas',lat:-36.6247,lng:-72.5385}, tourism:'local' },
                pucon: { major:{name:'Temuco',category:'capital regional',lat:-38.7359,lng:-72.5904}, local:{name:'Pucón',lat:-39.2820,lng:-71.9543}, tourism:'nacional' },
                caburgua: { major:{name:'Temuco',category:'capital regional',lat:-38.7359,lng:-72.5904}, local:{name:'Pucón',lat:-39.2820,lng:-71.9543}, tourism:'nacional' }
            };

            const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            const numberFrom = value => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
            const positive = value => {
                const text = normalize(value);
                return ['si','sí','true','1','disponible','incluido','con','rol propio','factibilidad'].some(token => text === normalize(token) || text.includes(normalize(token)));
            };
            const textOf = p => normalize([p?.nombre,p?.descripcion,p?.detalle,p?.entorno,p?.servicios,p?.sector].join(' '));
            const areaOf = p => Number(p?.tamano || p?.metros || p?.superficie || p?.superficie_m2 || 0);
            const priceOf = p => { const v=p?.precio ?? p?.valor ?? p?.precio_publicado; return typeof v==='number'?v:(Number(String(v||'').replace(/[^0-9]/g,''))||0); };

            function natureAttributes(p){
                const text = textOf(p), list=[];
                if(/\br[ií]o\b|\bestero\b|\barroyo\b/.test(text)) list.push('Río dentro');
                if(/vertiente/.test(text)) list.push('Vertiente');
                if(/orilla.{0,15}(lago|laguna)|acceso.{0,15}(lago|laguna)/.test(text)) list.push('Orilla lago');
                if(/terma|aguas termales/.test(text)) list.push('Termas');
                if(/bosque nativo|nativas|araucaria/.test(text)) list.push('Bosque nativo');
                return list;
            }
            function viewOf(p){
                const text=textOf(p);
                if(/vista.{0,20}mar|mar.{0,20}vista/.test(text)) return 'Vista al mar';
                if(/vista.{0,20}(lago|laguna)|(lago|laguna).{0,20}vista/.test(text)) return 'Vista a lago';
                if(/vista.{0,20}cordillera|cordillera.{0,20}vista/.test(text)) return 'Vista cordillera';
                return String(p?.vista || p?.vistaPrincipal || '');
            }
            function topographyOf(p){
                const raw = normalize(p?.topografia || p?.terreno || p?.tipoSuelo || p?.tipo_suelo || p?.suelo);
                const text = `${raw} ${textOf(p)}`;
                if(/completamente plana|terreno plano|mayormente plana|plano/.test(text)) return 'Mayormente plana';
                return raw;
            }
            function electricityOf(p){
                const raw = normalize(p?.luz || p?.electricidad || '');
                if(/empalme|conectad|instalad/.test(raw) || /poste.{0,20}(interior|parcela)|energ[ií]a el[eé]ctrica instalada/.test(textOf(p))) return 'Empalme instalado';
                if(positive(raw) || /factibilidad.{0,20}(luz|energ[ií]a|el[eé]ctr)/.test(textOf(p))) return 'Factibilidad eléctrica';
                return raw;
            }
            function waterOf(p){
                const raw=normalize(p?.agua||''); const text=textOf(p);
                if(/apr/.test(raw)||/ apr /.test(text))return 'APR';
                if(/puntera/.test(raw)||/puntera/.test(text))return 'Puntera';
                if(/pozo/.test(raw)||/pozo/.test(text))return 'Pozo';
                if(positive(raw)||/agua disponible|disponibilidad de agua/.test(text))return 'Agua disponible';
                if(/factibilidad.{0,15}agua/.test(text))return 'Factibilidad';
                return raw;
            }
            function fencingOf(p){
                const t=textOf(p);
                if(/completamente cercad|cierre perimetral|cerco perimetral/.test(t)) return 'Completamente cercada';
                if(/sin cierre|sin cerco/.test(t)) return 'Sin cierre';
                return '';
            }
            function gateOf(p){ return /port[oó]n|acceso controlado/.test(textOf(p)) ? 'Portón instalado' : ''; }
            function condominiumOf(p){ return /condominio|loteo/.test(textOf(p)) ? 'si' : ''; }
            function vegetationOf(p){ return /bosque nativo|nativas|araucaria/.test(textOf(p)) ? 'Bosque nativo' : String(p?.vegetacion || ''); }

            // Para cada parcela, calculamos y guardamos (de a lotes o individuales)
            for (const p of fullParcelas) {
                if (window.TPLLandEngine) {
                    try {
                        const area = areaOf(p);
                        const asking = priceOf(p);
                        
                        const ctx = (() => {
                            const point = REFERENCE_POINTS[normalize(p.comuna)] || null;
                            if(!point) return null;
                            
                            const haversineKm = (a,b) => {
                                const toRad = n => n * Math.PI / 180;
                                const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
                                const h = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
                                return 6371 * 2 * Math.asin(Math.sqrt(h));
                            };
                            
                            const lat=Number(p.lat), lng=Number(p.lng);
                            if(lat && lng){
                                const here={lat,lng};
                                return {
                                    majorCityDistanceKm:haversineKm(here,point.major),
                                    communeDistanceKm:haversineKm(here,point.local),
                                    distanceKm:haversineKm(here,point.major),
                                    nearestCity:point.major,
                                    tourism:point.tourism
                                };
                            }
                            return null;
                        })();
                        
                        if (!ctx) {
                            console.warn('Sincronizacion omitida por falta de contexto o coordenadas para', p.id);
                            errorCount++;
                            continue;
                        }

                        const payload = {
                            area,
                            asking,
                            distanceKm: ctx.majorCityDistanceKm,
                            majorCityDistanceKm: ctx.majorCityDistanceKm,
                            communeDistanceKm: ctx.communeDistanceKm,
                            nearestCity: { name: ctx.nearestCity.name, category: ctx.nearestCity.category },
                            comuna: p.comuna || '',
                            region: p.region || '',
                            sector: p.sector || '',
                            rol: (positive(p?.rol)||/rol propio/.test(textOf(p)))?'Rol propio':'',
                            electricity: electricityOf(p),
                            water: waterOf(p),
                            topography: topographyOf(p),
                            nature: natureAttributes(p),
                            tourism: ctx.tourism || '',
                            view: viewOf(p),
                            routeDistanceKm: Number(p?.distancia_ruta_km || p?.distanciaRutaKm || 0),
                            fencing: fencingOf(p),
                            condominium: condominiumOf(p),
                            gate: gateOf(p),
                            vegetation: vegetationOf(p),
                            soil: p?.tipoSuelo || p?.tipo_suelo || p?.suelo || ''
                        };

                        const engineResult = window.TPLLandEngine.calculate(payload);
                        
                        if (engineResult.error) {
                            console.error('Error calculando parcela ' + p.id, engineResult.error);
                            errorCount++;
                            continue;
                        }

                        const updateData = {
                            oportunidad_tpl: engineResult.score,
                            valor_tpl_tasador: engineResult.valor_tpl_tasador_base,
                            valor_tpl_tasador_ajustado: engineResult.valor_tpl_tasador_ajustado,
                            valor_comunal: engineResult.valor_comunal,
                            valor_tpl_recomendado: engineResult.valor_recomendado,
                            valor_venta_apuro: engineResult.valor_venta_apuro
                        };
                        
                        // Guardar metadata extendida
                        let currentMeta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
                        currentMeta.tasacion_engine_v2 = engineResult;
                        updateData.metadata = currentMeta;
                        
                        const { error: updErr } = await client.from('tpl_propiedades').update(updateData).eq('id', p.id);
                        if (updErr) {
                            console.error('Error actualizando parcela ' + p.id, updErr);
                            errorCount++;
                        } else {
                            successCount++;
                        }
                    } catch (err) {
                        console.error('Error calculando parcela ' + p.id, err);
                        errorCount++;
                    }
                }
            }
            
            alert(`Sincronización finalizada. Éxitos: ${successCount}. Errores: ${errorCount}. Recargando vista...`);
            await refrescarSnapshot();
        });
    }
}

