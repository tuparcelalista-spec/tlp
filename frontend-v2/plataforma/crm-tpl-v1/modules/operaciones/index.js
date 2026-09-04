import { arr } from '../../core/state.js';
import { escapeHtml } from '../../core/utils.js';
import { getClient } from '../../core/supabase.js';
import { toast } from '../../components/toast.js';
import { refrescarSnapshot } from '../../core/refresh.js';

/**
 * Etapas del flujo de venta de PARCELA SOLA (sin casa), en orden.
 * Coincide con el CHECK de tpl_proyectos.estado agregado en la migración
 * 20260903110000: reserva -> solicitud_info -> notaria_escritura ->
 * visita_escritura -> finalizado. Todo empieza cuando el cliente paga la
 * reserva (tpl_confirmar_reserva_pagada_v1, disparado por flow-webhook).
 */
const ETAPAS_PARCELA = [
    { id: 'reserva', label: 'Reserva pagada' },
    { id: 'solicitud_info', label: 'Solicitar información' },
    { id: 'notaria_escritura', label: 'Notaría / escritura' },
    { id: 'visita_escritura', label: 'Visita de escritura' },
    { id: 'finalizado', label: 'Finalizado' },
];

// Otros estados (proyectos de casa+parcela, simulaciones) muestran solo una
// etiqueta legible en vez del stepper de parcela.
const ETIQUETAS_GENERICAS = {
    simulacion: 'Simulación',
    guardado: 'Guardado',
    interes: 'Interés',
    visita: 'Visita agendada',
    negociacion: 'En negociación',
    aprobado: 'Aprobado',
    contrato: 'En contrato',
    esperando_pago: 'Esperando pago',
    activo: 'Activo',
    en_ejecucion: 'En ejecución',
    cancelado: 'Cancelado',
};

function esFlujoParcela(estado) {
    return ETAPAS_PARCELA.some((e) => e.id === estado);
}

function siguienteEtapa(estado) {
    const idx = ETAPAS_PARCELA.findIndex((e) => e.id === estado);
    if (idx === -1 || idx >= ETAPAS_PARCELA.length - 1) return null;
    return ETAPAS_PARCELA[idx + 1];
}

function renderStepper(estadoActual) {
    const idxActual = ETAPAS_PARCELA.findIndex((e) => e.id === estadoActual);
    return `
        <div class="flex items-center gap-1 flex-wrap">
            ${ETAPAS_PARCELA.map((etapa, idx) => {
                const alcanzada = idx <= idxActual;
                const esActual = idx === idxActual;
                return `
                    <span class="text-[10px] px-2 py-1 rounded-full border font-medium ${esActual
                        ? 'bg-blue-600 text-white border-blue-600'
                        : alcanzada
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-400 border-gray-200'}">${escapeHtml(etapa.label)}</span>
                    ${idx < ETAPAS_PARCELA.length - 1 ? '<span class="text-gray-300 text-xs">›</span>' : ''}
                `;
            }).join('')}
        </div>
    `;
}

export function render() {
    const operaciones = arr('operaciones');
    return `
        <div class="operaciones-module p-4">
            <h1 class="text-2xl font-bold mb-6 text-gray-800">Operaciones Activas</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${operaciones.map(op => `
                    <div class="bg-white p-5 border border-gray-200 rounded-lg shadow-sm hover:shadow transition relative flex flex-col h-full">
                        ${op.requiere_revision ? `
                            <div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow border-2 border-white animate-pulse">
                                REVISIÓN
                            </div>
                        ` : ''}

                        <div class="flex justify-between items-start mb-3">
                            <h3 class="font-mono font-bold text-lg text-gray-800">${escapeHtml(op.codigo)}</h3>
                            <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-medium border border-yellow-200 uppercase tracking-wider">${escapeHtml(op.estado)}</span>
                        </div>

                        <div class="mb-3 flex-1">
                            <p class="text-sm font-medium text-gray-800 line-clamp-2 mb-1">${escapeHtml(op.propiedad_titulo || 'Propiedad no vinculada')}</p>
                            ${op.comuna ? `<p class="text-xs text-gray-500 flex items-center gap-1 mb-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>${escapeHtml(op.comuna)}</p>` : ''}
                            ${op.comprador_nombre ? `<p class="text-xs text-gray-600">👤 ${escapeHtml(op.comprador_nombre)}${op.comprador_telefono ? ' · ' + escapeHtml(op.comprador_telefono) : ''}</p>` : ''}
                            ${op.partner_sugerido_nombre ? `<p class="text-xs text-emerald-700">🤝 Partner sugerido: ${escapeHtml(op.partner_sugerido_nombre)}</p>` : ''}
                        </div>

                        <div class="bg-gray-50 p-3 rounded-md border border-gray-100">
                            <div class="text-xs text-gray-500 mb-2">Etapa</div>
                            ${esFlujoParcela(op.estado)
                                ? renderStepper(op.estado)
                                : `<div class="font-medium text-sm text-gray-700">${escapeHtml(ETIQUETAS_GENERICAS[op.estado] || op.estado_operativo || 'Iniciando')}</div>`}
                        </div>

                        ${esFlujoParcela(op.estado) && siguienteEtapa(op.estado) ? `
                            <div class="mt-3 flex gap-2">
                                <button
                                    class="btn-avanzar-etapa flex-1 text-xs font-semibold px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                                    data-proyecto-id="${escapeHtml(op.id)}"
                                    data-siguiente="${escapeHtml(siguienteEtapa(op.estado).id)}"
                                >Avanzar a: ${escapeHtml(siguienteEtapa(op.estado).label)}</button>
                                <!-- No habia forma de cerrar una operacion que se cayo: solo se
                                     podia avanzar. tpl_proyectos.estado ya acepta 'cancelado' y
                                     tpl_avanzar_etapa_proyecto_v1 permite la transicion desde
                                     cualquiera de las cuatro etapas activas, asi que esto no
                                     necesita nada nuevo en la base. -->
                                <button
                                    class="btn-cancelar-operacion text-xs font-semibold px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
                                    data-proyecto-id="${escapeHtml(op.id)}"
                                    data-codigo="${escapeHtml(op.codigo || 'esta operación')}"
                                    title="Cancelar esta operación"
                                >Cancelar</button>
                            </div>
                        ` : ''}

                        <div class="mt-4 pt-3 border-t flex justify-between items-center text-xs text-gray-400">
                            <span>Actualizado: ${op.updated_at ? new Date(op.updated_at).toLocaleDateString() : '-'}</span>
                            <!-- "Gestionar" no tenia handler: no abria nada. La
                                 gestion real de una operacion es la parcela y su
                                 oportunidad, asi que ahora lleva a la ficha. -->
                            ${op.propiedad_id
                                ? `<a class="text-blue-600 font-medium hover:underline" href="../../parcela.html?id=${escapeHtml(op.propiedad_id)}" target="_blank" rel="noopener">Ver propiedad</a>`
                                : '<span class="text-gray-300">Sin propiedad vinculada</span>'}
                        </div>
                    </div>
                `).join('') || `
                    <div class="col-span-full py-12 flex flex-col items-center justify-center bg-white border border-dashed rounded-lg text-gray-500">
                        <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        <p class="text-lg font-medium">No hay operaciones activas</p>
                        <p class="text-sm">Las ventas en progreso aparecerán aquí</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

/**
 * Mueve un proyecto de parcela a otro estado vía tpl_avanzar_etapa_proyecto_v1.
 *
 * Tiene que ser esta RPC y no un update directo: tpl_proyectos tiene RLS
 * habilitado y ninguna policy, así que un `.from('tpl_proyectos').update(...)`
 * desde el navegador afecta 0 filas en silencio. La RPC es security definer y
 * además valida la transición y deja el evento en tpl_eventos.
 */
async function cambiarEtapa(proyectoId, estadoDestino, boton, mensajeOk) {
    if (boton) boton.disabled = true;
    try {
        const { data, error } = await getClient().rpc('tpl_avanzar_etapa_proyecto_v1', {
            p_proyecto_id: proyectoId,
            p_estado: estadoDestino,
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'La base no confirmó el cambio.');
        toast(mensajeOk, 'success');
        await refrescarSnapshot();
    } catch (err) {
        console.error('No se pudo cambiar la etapa del proyecto', err);
        const msg = String(err?.message || '');
        toast(msg.includes('TRANSICION_NO_PERMITIDA')
            ? 'Esa transición no está permitida desde la etapa actual.'
            : 'No se pudo actualizar la etapa: ' + (msg || err), 'error');
        if (boton) boton.disabled = false;
    }
}

export function init() {
    document.querySelectorAll('.btn-avanzar-etapa').forEach((boton) => {
        boton.addEventListener('click', () => {
            const proyectoId = boton.getAttribute('data-proyecto-id');
            const siguiente = boton.getAttribute('data-siguiente');
            if (!proyectoId || !siguiente) return;
            cambiarEtapa(proyectoId, siguiente, boton, 'Etapa actualizada.');
        });
    });

    document.querySelectorAll('.btn-cancelar-operacion').forEach((boton) => {
        boton.addEventListener('click', () => {
            const proyectoId = boton.getAttribute('data-proyecto-id');
            const codigo = boton.getAttribute('data-codigo');
            if (!proyectoId) return;
            if (!confirm(`¿Cancelar ${codigo}?\n\nLa operación sale del tablero y queda como descartada. No se borra nada: el proyecto y su historial se conservan.`)) return;
            cambiarEtapa(proyectoId, 'cancelado', boton, 'Operación cancelada.');
        });
    });
}
