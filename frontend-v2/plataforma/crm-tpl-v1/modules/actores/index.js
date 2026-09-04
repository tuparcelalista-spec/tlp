import { arr } from '../../core/state.js';
import { escapeHtml } from '../../core/utils.js';
import { showModal } from '../../components/modal.js';
import { getClient } from '../../core/supabase.js';
import { toast } from '../../components/toast.js';
import { refrescarSnapshot } from '../../core/refresh.js';
import { render as detailRender, init as detailInit } from './detail.js';

// Archivar en vez de borrar.
//
// Un actor cuelga de oportunidades, proyectos, visitas y propiedades: borrar la
// fila de alguien que cerro una venta romperia la trazabilidad de esa venta.
// tpl_actores.estado ya acepta 'archivado' desde el nucleo, asi que archivar no
// inventa nada nuevo, solo usa lo que la tabla ya permitia.
//
// OJO: tpl_actores tiene RLS habilitado y CERO policies, asi que un update
// directo desde el navegador afecta 0 filas EN SILENCIO aunque seas staff (el
// directorio se ve solo porque tpl_crm_snapshot_v1 es security definer). Por eso
// esto pasa si o si por la RPC tpl_crm_archivar_actor_v1.
let verArchivados = false;

/** Permite a core/refresh.js volver al estado inicial tras un cambio. */
export function invalidate() {
    verArchivados = false;
}

export function render() {
    const todos = arr('actores');
    const archivados = todos.filter((a) => a.estado === 'archivado');
    const actores = verArchivados ? todos : todos.filter((a) => a.estado !== 'archivado');
    return `
        <div class="actores-list p-4">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold">Directorio de Actores</h1>
                <div class="flex items-center gap-3">
                    ${archivados.length ? `
                        <button id="btn-ver-archivados" class="text-xs font-semibold px-3 py-2 rounded border ${verArchivados
                            ? 'border-gray-300 bg-gray-100 text-gray-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'} transition">
                            ${verArchivados ? 'Ocultar' : 'Ver'} ${archivados.length} archivado${archivados.length === 1 ? '' : 's'}
                        </button>` : ''}
                    <!-- El boton "Nuevo Actor" existia sin ningun handler: hacer clic
                         no producia absolutamente nada y parecia que el CRM estaba
                         roto. No hay formulario de alta de actores en el CRM (los
                         actores se crean solos desde el cotizador, el publicador y
                         la confirmacion de reserva), asi que en vez de un boton
                         muerto se explica de donde salen. -->
                    <span class="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                        Se crean solos desde el cotizador, el publicador y las reservas pagadas.
                    </span>
                </div>
            </div>
            
            <div class="bg-white rounded shadow-sm overflow-hidden border border-gray-200">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                                <th class="p-4 font-semibold">Nombre</th>
                                <th class="p-4 font-semibold">RUT</th>
                                <th class="p-4 font-semibold">Contacto</th>
                                <th class="p-4 font-semibold">Roles</th>
                                <th class="p-4 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${actores.map(a => `
                                <tr class="hover:bg-blue-50 transition cursor-pointer actor-row group ${a.estado === 'archivado' ? 'opacity-60' : ''}" data-id="${a.id}">
                                    <td class="p-4 font-medium text-gray-900">
                                        ${escapeHtml(a.nombre || '-')}
                                        ${a.estado === 'archivado' ? '<span class="ml-2 text-[10px] uppercase tracking-wider font-semibold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Archivado</span>' : ''}
                                    </td>
                                    <td class="p-4 text-sm text-gray-600 font-mono">${escapeHtml(a.rut || '-')}</td>
                                    <td class="p-4 text-sm text-gray-600">
                                        <div class="flex flex-col gap-1">
                                            ${a.email ? `<span class="flex items-center gap-1"><svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>${escapeHtml(a.email)}</span>` : ''}
                                            ${a.telefono ? `<span class="flex items-center gap-1"><svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>${escapeHtml(a.telefono)}</span>` : ''}
                                        </div>
                                    </td>
                                    <td class="p-4">
                                        <div class="flex flex-wrap gap-1">
                                            ${(a.roles || []).map(r => `<span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200">${escapeHtml(r)}</span>`).join('') || '<span class="text-xs text-gray-400">-</span>'}
                                        </div>
                                    </td>
                                    <td class="p-4 text-center whitespace-nowrap">
                                        <button class="text-blue-600 font-medium text-sm hover:text-blue-800 transition px-3 py-1 rounded hover:bg-blue-100 btn-view-actor opacity-0 group-hover:opacity-100 focus-visible:opacity-100" data-id="${a.id}">Ver Perfil</button>
                                        <button class="btn-archivar-actor text-gray-500 font-medium text-sm hover:text-gray-800 transition px-3 py-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                                data-id="${a.id}"
                                                data-nombre="${escapeHtml(a.nombre || 'este actor')}"
                                                data-archivado="${a.estado === 'archivado' ? '1' : '0'}">${a.estado === 'archivado' ? 'Reactivar' : 'Archivar'}</button>
                                    </td>
                                </tr>
                            `).join('') || `<tr><td colspan="5" class="p-8 text-center text-gray-500">${
                                todos.length ? 'Todos los actores están archivados.' : 'No se encontraron actores en el sistema.'
                            }</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

export function init() {
    const handler = (e) => {
        const id = e.currentTarget.dataset.id;
        showModal({
            title: 'Perfil de Actor',
            body: detailRender(id),
            size: 'lg'
        });
        setTimeout(() => detailInit(id), 50);
    };
    
    document.querySelectorAll('.btn-view-actor').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        handler(e);
    }));
    
    document.querySelectorAll('.actor-row').forEach(r => r.addEventListener('click', handler));

    document.querySelectorAll('.btn-archivar-actor').forEach((boton) => {
        boton.addEventListener('click', (e) => {
            e.stopPropagation();
            archivarActor(boton);
        });
    });

    document.getElementById('btn-ver-archivados')?.addEventListener('click', () => {
        verArchivados = !verArchivados;
        const contenido = document.getElementById('content');
        if (!contenido) return;
        contenido.innerHTML = render();
        init();
    });
}

async function archivarActor(boton) {
    const { id, nombre } = boton.dataset;
    const estaArchivado = boton.dataset.archivado === '1';

    if (estaArchivado) {
        if (!confirm(`¿Reactivar a ${nombre}? Vuelve a aparecer en el directorio.`)) return;
    } else if (!confirm(`¿Archivar a ${nombre}?\n\nNo se borra nada: su historial comercial se conserva intacto y sale del listado. Puedes reactivarlo cuando quieras.`)) {
        return;
    }

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = '…';

    try {
        const { data, error } = await getClient().rpc('tpl_crm_archivar_actor_v1', {
            p_actor_id: id,
            p_archivar: !estaArchivado,
            p_motivo: null,
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'La base no confirmó el cambio.');

        toast(estaArchivado ? `${nombre} reactivado.` : `${nombre} archivado.`, 'success');
        await refrescarSnapshot();
    } catch (err) {
        console.error('No se pudo cambiar el estado del actor', err);
        // El error mas probable acá es que la migracion 20260904010000 todavia
        // no se haya corrido en Supabase: PostgREST responde 404 / PGRST202.
        const falta = String(err?.message || '').toLowerCase().includes('tpl_crm_archivar_actor_v1')
            || err?.code === 'PGRST202';
        toast(falta
            ? 'Falta correr la migración 20260904010000 en Supabase para poder archivar actores.'
            : 'No se pudo archivar: ' + (err?.message || err), 'error');
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}
