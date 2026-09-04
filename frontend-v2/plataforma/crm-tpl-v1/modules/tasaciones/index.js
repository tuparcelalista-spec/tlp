import { arr } from '../../core/state.js';
import { formatCLP, escapeHtml } from '../../core/utils.js';

export function render() {
    const tasaciones = arr('tasaciones').sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return `
        <div class="tasaciones-module p-4">
            <h1 class="text-2xl font-bold mb-6 text-gray-800">Historial de Tasaciones Global</h1>
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider text-xs">
                                <th class="p-4 font-semibold">Fecha</th>
                                <th class="p-4 font-semibold">Propiedad ID</th>
                                <th class="p-4 font-semibold">Motor</th>
                                <th class="p-4 font-semibold text-right">Superficie</th>
                                <th class="p-4 font-semibold text-right">Precio Publicado</th>
                                <th class="p-4 font-semibold text-right">Valor TPL M2</th>
                                <th class="p-4 font-semibold text-right">Valor Total Estimado</th>
                                <th class="p-4 font-semibold text-center">Oportunidad</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${tasaciones.map(t => `
                                <tr class="hover:bg-blue-50 transition">
                                    <td class="p-4 whitespace-nowrap text-gray-700">${new Date(t.created_at).toLocaleDateString('es-CL')}</td>
                                    <td class="p-4 text-gray-500 font-mono text-xs">${t.propiedad_id ? String(t.propiedad_id).substring(0,8) + '...' : '-'}</td>
                                    <td class="p-4 text-gray-600"><span class="bg-gray-100 px-2 py-1 rounded text-xs border">${escapeHtml(t.version_motor || 'v1')}</span></td>
                                    <td class="p-4 text-right text-gray-700">${t.superficie_m2} m²</td>
                                    <td class="p-4 text-right text-gray-600">${formatCLP(t.precio_publicado)}</td>
                                    <td class="p-4 text-right text-blue-600 font-medium">${formatCLP(t.valor_tpl_m2)}</td>
                                    <td class="p-4 text-right font-bold text-gray-900">${formatCLP(t.valor_tpl_total)}</td>
                                    <td class="p-4 text-center">
                                        ${t.es_oportunidad ? '<span class="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full" title="Sí">✓</span>' : '<span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-400 rounded-full" title="No">-</span>'}
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="8" class="p-8 text-center text-gray-500">Sin registros de tasaciones en el sistema.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

export function init() {}
