// NOTA: este módulo no está enlazado en el router de tpl-business-v2
// (core/router.js -> VISTAS) ni en el menú lateral: no es alcanzable hoy
// desde la aplicación. Antes tampoco funcionaba si se abría directo por
// hash, porque importaba "store" desde core/store.js, un nombre que ese
// archivo no exporta (exporta "state"). Se corrige el import y se deja
// documentado que falta, además, la RPC "manifestar_interes" en el
// servidor y una fuente real de datos para "state.oportunidades" antes de
// sumarlo al router.
import { state } from '../../core/store.js';
import { supabase } from '../../core/supabase.js';

export function render() {
    return `
        <div class="partner-oportunidades-module">
            <header class="module-header">
                <h2>Oportunidades Disponibles</h2>
                <p>Descubre y manifiesta interés en nuevos proyectos de desmonte, topografía, estudios de suelo y más.</p>
            </header>
            <div class="oportunidades-grid" id="oportunidades-container">
                <div class="loader-state">Cargando oportunidades...</div>
            </div>
        </div>
    `;
}

export function init() {
    const container = document.getElementById('oportunidades-container');
    if (!container) return;

    // Use data from state, fallback to empty array if undefined
    const oportunidades = state.oportunidades || [];

    const renderOportunidades = () => {
        if (oportunidades.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; color: var(--text-muted, #888);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <h3>No hay oportunidades disponibles</h3>
                    <p>En este momento no hay proyectos listados. Te notificaremos cuando surjan nuevas oportunidades.</p>
                </div>`;
            return;
        }

        container.innerHTML = oportunidades.map(op => `
            <div class="oportunidad-card">
                <div class="op-header">
                    <span class="badge op-type">${escapeHTML(op.tipo)}</span>
                    <span class="op-date">${escapeHTML(op.fecha)}</span>
                </div>
                <h3 class="op-title">${escapeHTML(op.titulo)}</h3>
                <p class="op-location">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    ${escapeHTML(op.ubicacion)}
                </p>
                <p class="op-desc">${escapeHTML(op.descripcion)}</p>
                <div class="op-footer">
                    <div class="op-value-container">
                        <span class="op-label">Presupuesto estimado:</span>
                        <span class="op-value">${escapeHTML(op.valor_estimado)}</span>
                    </div>
                    <button class="btn btn-primary btn-manifestar" data-id="${escapeHTML(op.id.toString())}">
                        Manifestar Interés
                    </button>
                </div>
            </div>
        `).join('');
    };

    renderOportunidades();

    // Event Delegation for buttons
    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-manifestar');
        if (!btn) return;

        const opId = btn.getAttribute('data-id');
        
        // Optimistic UI update
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span> Enviando...`;
        
        try {
            // Call Supabase RPC
            const { data, error } = await supabase.rpc('manifestar_interes', { oportunidad_id: opId });
            
            if (error) throw error;
            
            // Success state
            btn.innerHTML = `✓ Interés Registrado`;
            btn.classList.add('btn-success');
        } catch (err) {
            console.error('Error al manifestar interés:', err);
            // Revert state
            btn.disabled = false;
            btn.innerHTML = originalText;
            alert('Hubo un error al registrar tu interés. Por favor, intenta nuevamente.');
        }
    });
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
