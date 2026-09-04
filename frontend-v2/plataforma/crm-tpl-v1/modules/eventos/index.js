import { arr } from '../../core/state.js';
import { escapeHtml, relativeDate } from '../../core/utils.js';

export function render() {
    const eventos = arr('eventos').sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    const getIcon = (cat) => {
        const c = (cat || '').toLowerCase();
        if (c.includes('oportunidad') || c.includes('venta')) return '<div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>';
        if (c.includes('sistema') || c.includes('motor')) return '<div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>';
        if (c.includes('contacto') || c.includes('visita')) return '<div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg></div>';
        return '<div class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>';
    };

    return `
        <div class="eventos-module p-4">
            <h1 class="text-2xl font-bold mb-6 text-gray-800">Registro de Actividad</h1>
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-4xl">
                <div class="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
                    ${eventos.map(e => `
                        <div class="relative pl-6">
                            <div class="absolute -left-[17px] bg-white top-0">
                                ${getIcon(e.categoria)}
                            </div>
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                <div>
                                    <h3 class="font-bold text-gray-800 text-base">${escapeHtml(e.evento)}</h3>
                                    <div class="flex flex-wrap gap-2 mt-1">
                                        <span class="text-[10px] uppercase tracking-wider font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-600 border">${escapeHtml(e.categoria || 'General')}</span>
                                        <span class="text-[10px] uppercase tracking-wider font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-600 border">${escapeHtml(e.origen || 'Sistema')}</span>
                                    </div>
                                </div>
                                <span class="text-xs text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded">${relativeDate(e.created_at)}</span>
                            </div>
                            <p class="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">${escapeHtml(e.descripcion || 'Sin descripción detallada.')}</p>
                        </div>
                    `).join('') || '<div class="pl-6 py-4 text-gray-500">No hay eventos registrados recientemente.</div>'}
                </div>
            </div>
        </div>
    `;
}

export function init() {}
