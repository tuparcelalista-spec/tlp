import state, { arr } from '../../core/state.js';
import { formatCLP, formatUF, escapeHtml } from '../../core/utils.js';

export function render() {
    const id = state.selectedParcelaId;
    const p = arr('parcelas').find(x => x.id === id);
    if (!p) return `<div class="p-4 bg-white rounded">Parcela no encontrada.</div>`;
    
    return `
        <div class="parcela-detail bg-white p-6 rounded max-w-4xl mx-auto w-full">
            <h2 class="text-2xl font-bold mb-4 border-b pb-2">${escapeHtml(p.titulo || 'Sin título')}</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                <div><strong>Código:</strong> <span class="text-gray-700">${escapeHtml(p.codigo || '-')}</span></div>
                <div><strong>Región:</strong> <span class="text-gray-700">${escapeHtml(p.region || '-')}</span></div>
                <div><strong>Comuna:</strong> <span class="text-gray-700">${escapeHtml(p.comuna || '-')}</span></div>
                <div><strong>Sector:</strong> <span class="text-gray-700">${escapeHtml(p.sector || '-')}</span></div>
                <div><strong>Estado:</strong> <span class="px-2 py-1 bg-gray-100 rounded text-xs">${escapeHtml(p.estado || '-')}</span></div>
                <div><strong>Tipo:</strong> <span class="text-gray-700">${escapeHtml(p.tipo || '-')}</span></div>
                <div><strong>Superficie:</strong> <span class="text-gray-700">${p.superficie_m2 || 0} m²</span></div>
                <div><strong>Precio:</strong> <span class="text-blue-600 font-bold">${formatCLP(p.precio_publicado || 0)}</span></div>
                <div><strong>Clasificación:</strong> <span class="text-gray-700">${escapeHtml(p.clasificacion || '-')}</span></div>
                <div><strong>Es Oportunidad:</strong> ${p.es_oportunidad ? '<span class="text-green-600 font-bold">Sí ✅</span>' : '<span class="text-gray-500">No ❌</span>'}</div>
            </div>
            
            <div class="bg-gray-100 p-4 rounded mb-6 h-64 flex flex-col items-center justify-center border border-dashed border-gray-300">
                <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                <span class="text-gray-500 font-medium">Mapa de Parcela</span>
                <span class="text-xs text-gray-400 mt-1">Lat: ${p.lat || '-'}, Lng: ${p.lng || '-'}</span>
            </div>
            
            <div class="mt-4">
                <h3 class="text-xl font-bold mb-3 border-b pb-2">Historial de Tasaciones</h3>
                <div class="bg-gray-50 p-4 rounded border">
                    <ul class="space-y-2">
                        ${arr('tasaciones').filter(t => t.propiedad_id === p.id).map(t => `
                            <li class="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                <span><i class="far fa-calendar-alt text-gray-400 mr-1"></i> ${new Date(t.created_at).toLocaleDateString('es-CL')}</span>
                                <span class="text-gray-600">${t.superficie_m2}m²</span>
                                <span class="font-bold text-gray-800">${formatCLP(t.valor_tpl_total)}</span>
                            </li>
                        `).join('') || '<li class="text-gray-500 text-sm">No hay tasaciones previas para esta propiedad.</li>'}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

export function init() {}
