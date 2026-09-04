import { arr } from '../../core/state.js';
import { escapeHtml, relativeDate } from '../../core/utils.js';

export function render(id) {
    const a = arr('actores').find(x => x.id === id);
    if (!a) return `<div class="p-6 bg-white rounded text-center text-gray-500">Actor no encontrado en el sistema.</div>`;
    
    // El snapshot expone el vinculo como actor_id (asi lo usa el resto del CRM);
    // se aceptan ambos nombres para no depender de una sola forma de la vista.
    const opps = arr('oportunidades').filter(op => (op.actor_id || op.actor_cliente_id) === id);
    // `window.state` NUNCA se define en este proyecto: core/state.js es un modulo
    // ES y su estado no se cuelga de window. La expresion anterior evaluaba
    // siempre a [], asi que "Inventario de Propiedades" mostraba (0) para todos
    // los actores, incluso para corredores con parcelas cargadas. Se lee del
    // snapshot real, igual que el resto de los modulos.
    const parcelas = arr('parcelas').filter(p => p.propietario_id === id);
    
    return `
        <div class="actor-detail bg-white p-0 max-w-3xl mx-auto w-full rounded overflow-hidden shadow-lg">
            <div class="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-700 text-2xl font-bold shadow-sm">
                        ${(a.nombre || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold m-0">${escapeHtml(a.nombre || 'Sin nombre')}</h2>
                        <div class="flex gap-2 mt-2">
                            ${(a.roles || []).map(r => `<span class="px-2 py-0.5 bg-blue-500 bg-opacity-50 text-white text-xs rounded-full border border-blue-400">${escapeHtml(r)}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="space-y-4">
                        <div>
                            <span class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contacto</span>
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center gap-2 text-gray-700">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    ${escapeHtml(a.email || 'No registrado')}
                                </div>
                                <div class="flex items-center gap-2 text-gray-700">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                    ${escapeHtml(a.telefono || 'No registrado')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <span class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Identificación y Ubicación</span>
                            <div class="grid grid-cols-2 gap-y-2 text-sm">
                                <span class="text-gray-500">RUT:</span> <span class="font-mono text-gray-800">${escapeHtml(a.rut || '-')}</span>
                                <span class="text-gray-500">Región:</span> <span class="text-gray-800">${escapeHtml(a.region || '-')}</span>
                                <span class="text-gray-500">Comuna:</span> <span class="text-gray-800">${escapeHtml(a.comuna || '-')}</span>
                                <span class="text-gray-500">Registro:</span> <span class="text-gray-800">${a.created_at ? relativeDate(a.created_at) : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h3 class="font-bold text-lg mb-4 text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    Oportunidades Asociadas (${opps.length})
                </h3>
                
                ${opps.length > 0 ? `
                    <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mb-8">
                        <ul class="divide-y divide-gray-200">
                            ${opps.map(op => `
                                <li class="p-3 hover:bg-white transition flex justify-between items-center">
                                    <div>
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="font-mono text-xs font-semibold text-gray-500">${escapeHtml(op.codigo)}</span>
                                            <span class="font-medium text-gray-900">${escapeHtml(op.nombre || op.etapa || 'Lead')}</span>
                                        </div>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : `
                    <div class="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 mb-8">
                        Este actor no tiene oportunidades de negocio asociadas actualmente.
                    </div>
                `}

                <h3 class="font-bold text-lg mb-4 text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    Inventario de Propiedades (${parcelas.length})
                </h3>

                ${parcelas.length > 0 ? `
                    <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                        <ul class="divide-y divide-gray-200">
                            ${parcelas.map(p => `
                                <li class="p-3 hover:bg-white transition flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <div class="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                            <img src="${p.foto_principal || p.imagen || ''}" onerror="this.src='../../assets/placeholder.png'" class="w-full h-full object-cover">
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="font-mono text-xs font-semibold text-gray-500">${escapeHtml(p.codigo)}</span>
                                                <span class="font-medium text-gray-900">${escapeHtml(p.titulo || 'Parcela')}</span>
                                            </div>
                                            <div class="text-xs text-gray-500">
                                                ${escapeHtml(p.comuna || 'Comuna N/D')} • ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(p.precio_publicado || 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <a href="../../parcela.html?id=${p.id}" target="_blank" class="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition">Ver Web</a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : `
                    <div class="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                        Este corredor no ha publicado parcelas en el sistema.
                    </div>
                `}

            </div>
        </div>
        `;
}

export function init(id) {}
