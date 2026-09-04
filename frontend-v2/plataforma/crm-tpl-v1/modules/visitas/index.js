/**
 * Agenda de visitas.
 *
 * QUÉ ESTABA MAL
 *   1. Los estados que pintaba no eran los que la tabla puede tener. El CHECK
 *      de tpl_visitas (202608090000_tpl_crm_visitas_v1) es:
 *          programada · confirmada · realizada · cancelada · no_asistio
 *      y el módulo coloreaba 'agendada' — un valor que la base RECHAZA, así que
 *      esa rama no se podía ejecutar nunca. En cambio 'programada' (el default
 *      de la tabla, o sea el estado de casi todas las filas), 'confirmada' y
 *      'no_asistio' caían todas en el gris de "desconocido".
 *   2. "Agendar Visita" era un botón sin ningún handler.
 *   3. No había forma de cancelar una visita: la pantalla era 100% de lectura
 *      y cancelar solo se podía entrando a la base.
 *
 * QUÉ HACE AHORA
 *   Los cinco estados reales, cada uno con su color y su etiqueta en español;
 *   se pueden cancelar visitas (RLS lo permite: tpl_visitas_staff_all cubre
 *   `for all` a staff autenticado); y las canceladas se ocultan por defecto
 *   detrás de un contador, con un botón para verlas — el mismo patrón de
 *   papelera que ya usa la grilla de parcelas.
 */

import { arr } from '../../core/state.js';
import { escapeHtml } from '../../core/utils.js';
import { getClient } from '../../core/supabase.js';
import { toast } from '../../components/toast.js';
import { refrescarSnapshot } from '../../core/refresh.js';

// Estados reales de tpl_visitas, en el orden del ciclo de vida.
const ESTADOS = {
    programada:  { etiqueta: 'Programada', clase: 'bg-blue-100 text-blue-800 border-blue-200' },
    confirmada:  { etiqueta: 'Confirmada', clase: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    realizada:   { etiqueta: 'Realizada',  clase: 'bg-green-100 text-green-800 border-green-200' },
    no_asistio:  { etiqueta: 'No asistió', clase: 'bg-amber-100 text-amber-800 border-amber-200' },
    cancelada:   { etiqueta: 'Cancelada',  clase: 'bg-red-100 text-red-800 border-red-200' },
};

// Estados en los que todavía tiene sentido cancelar.
const CANCELABLES = ['programada', 'confirmada'];

let verCanceladas = false;

/** Permite a core/refresh.js volver al estado inicial tras un cambio. */
export function invalidate() {
    verCanceladas = false;
}

function badge(estado) {
    const info = ESTADOS[estado] || { etiqueta: estado || 'Sin estado', clase: 'bg-gray-100 text-gray-800 border-gray-200' };
    return `<span class="px-2.5 py-1 border rounded-full text-xs font-semibold tracking-wide ${info.clase}">${escapeHtml(info.etiqueta)}</span>`;
}

function fila(v) {
    const fecha = new Date(v.fecha_hora);
    const fStr = fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
    const hStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const cancelable = CANCELABLES.includes(v.estado);
    const pasada = fecha.getTime() < Date.now();

    return `
        <tr class="hover:bg-gray-50 transition ${v.estado === 'cancelada' ? 'opacity-60' : ''}">
            <td class="p-4">
                <div class="flex flex-col">
                    <span class="font-medium text-gray-900 capitalize">${escapeHtml(fStr)}</span>
                    <span class="text-sm text-gray-500">${escapeHtml(hStr)}${pasada && cancelable ? ' · ya pasó' : ''}</span>
                </div>
            </td>
            <td class="p-4">${badge(v.estado)}</td>
            <td class="p-4 font-medium text-gray-800">${escapeHtml(v.actor_nombre || '-')}</td>
            <td class="p-4 text-sm text-gray-600 max-w-xs truncate" title="${escapeHtml(v.propiedad_titulo || '')}">${escapeHtml(v.propiedad_titulo || '-')}</td>
            <td class="p-4 text-sm font-mono text-gray-500">${escapeHtml(v.oportunidad_codigo || '-')}</td>
            <td class="p-4 text-sm">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        ${escapeHtml(v.staff_nombre ? v.staff_nombre.charAt(0) : '?')}
                    </div>
                    ${escapeHtml(v.staff_nombre || 'Sin asignar')}
                </div>
            </td>
            <td class="p-4 text-right">
                ${cancelable
                    ? `<button class="btn-cancelar-visita text-xs font-semibold px-3 py-1.5 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition" data-id="${escapeHtml(v.id)}">Cancelar</button>`
                    : '<span class="text-xs text-gray-300">—</span>'}
            </td>
        </tr>`;
}

export function render() {
    const todas = arr('visitas').sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    const canceladas = todas.filter((v) => v.estado === 'cancelada');
    const visibles = verCanceladas ? todas : todas.filter((v) => v.estado !== 'cancelada');

    return `
        <div class="visitas-module p-4">
            <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Agenda de Visitas</h1>
                    <p class="text-sm text-gray-500 mt-1">Las visitas se crean desde una oportunidad del pipeline; acá se consultan y se cancelan.</p>
                </div>
                <div class="flex items-center gap-3">
                    ${canceladas.length ? `
                        <button id="btn-ver-canceladas" class="text-xs font-semibold px-3 py-2 rounded border ${verCanceladas
                            ? 'border-gray-300 bg-gray-100 text-gray-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'} transition">
                            ${verCanceladas ? 'Ocultar' : 'Ver'} ${canceladas.length} cancelada${canceladas.length === 1 ? '' : 's'}
                        </button>` : ''}
                    <a href="#pipeline" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm transition text-sm font-medium">Agendar desde el pipeline</a>
                </div>
            </div>

            <div class="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                                <th class="p-4 font-semibold">Fecha y Hora</th>
                                <th class="p-4 font-semibold">Estado</th>
                                <th class="p-4 font-semibold">Cliente</th>
                                <th class="p-4 font-semibold">Propiedad</th>
                                <th class="p-4 font-semibold">Oportunidad</th>
                                <th class="p-4 font-semibold">Staff Asignado</th>
                                <th class="p-4 font-semibold text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${visibles.map(fila).join('') || `<tr><td colspan="7" class="p-8 text-center text-gray-500">${
                                todas.length
                                    ? 'Todas las visitas están canceladas.'
                                    : 'No hay visitas agendadas en el sistema.'
                            }</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function cancelarVisita(visitaId, boton) {
    const motivo = prompt('¿Por qué se cancela la visita? (queda en la nota de la visita)');
    // prompt devuelve null si el usuario cancela el diálogo: eso es "no hagas nada".
    if (motivo === null) return;

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Cancelando…';

    try {
        // tpl_visitas SÍ tiene policy de staff (tpl_visitas_staff_all, `for all`),
        // así que acá el update directo sirve — a diferencia de tpl_actores y
        // tpl_proyectos, que tienen RLS sin ninguna policy y obligan a pasar por
        // una RPC security definer.
        //
        // .select('id') igual es obligatorio: sin representación Supabase
        // responde 200/error:null aunque se hayan tocado 0 filas.
        const { data, error } = await getClient()
            .from('tpl_visitas')
            .update({
                estado: 'cancelada',
                notas: motivo.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', visitaId)
            .select('id');

        if (error) throw error;
        if (!data?.length) {
            throw new Error('La base no confirmó la cancelación (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.');
        }

        toast('Visita cancelada.', 'success');
        await refrescarSnapshot();
    } catch (err) {
        console.error('No se pudo cancelar la visita', err);
        toast('No se pudo cancelar: ' + (err?.message || err), 'error');
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

export function init() {
    document.querySelectorAll('.btn-cancelar-visita').forEach((boton) => {
        boton.addEventListener('click', () => cancelarVisita(boton.dataset.id, boton));
    });

    document.getElementById('btn-ver-canceladas')?.addEventListener('click', () => {
        verCanceladas = !verCanceladas;
        const contenido = document.getElementById('content');
        if (!contenido) return;
        contenido.innerHTML = render();
        init();
    });
}
