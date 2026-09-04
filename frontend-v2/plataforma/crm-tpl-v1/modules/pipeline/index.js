/**
 * Pipeline comercial (tablero Kanban de oportunidades).
 *
 * QUÉ ESTABA ROTO
 *   Este módulo y components/kanban.js se escribieron contra APIs distintas y
 *   nunca funcionó ni una vez:
 *
 *     - Llamaba a renderKanban(stages, items) con dos argumentos posicionales,
 *       pero el componente recibe UN objeto: renderKanban({ columns, cards }).
 *       Al desestructurar, `columns` quedaba undefined y la vista reventaba con
 *       "Cannot read properties of undefined (reading 'forEach')".
 *     - Los nombres de campo tampoco coincidían: mandaba `stage` donde el
 *       componente lee `columnId`, y `content`, que el componente no pinta.
 *     - initKanban(container, onDragDrop) pasaba dos argumentos a una función
 *       que recibe uno, así que el contenedor se usaba como callback de drop:
 *       arrastrar una tarjeta habría fallado igual.
 *
 *   Ahora se usa la API real del componente. Los estados llevan etiqueta en
 *   español y color, porque el tablero se lee de un vistazo.
 */

import { arr } from '../../core/state.js';
import { formatCLP } from '../../core/utils.js';
import { renderKanban, initKanban } from '../../components/kanban.js';
import { getClient } from '../../core/supabase.js';
import { toast } from '../../components/toast.js';
import { refrescarSnapshot } from '../../core/refresh.js';

// El orden es el del embudo: de contacto nuevo a cierre.
const COLUMNAS = [
    { id: 'nueva', label: 'Nuevas', color: '#0b6ea8' },
    { id: 'contactada', label: 'Contactadas', color: '#1a8fc4' },
    { id: 'calificada', label: 'Calificadas', color: '#3eb8a0' },
    { id: 'agendada', label: 'Visita agendada', color: '#16a34a' },
    { id: 'negociacion', label: 'En negociación', color: '#d97706' },
    { id: 'reservada', label: 'Reservadas', color: '#2563eb' },
    { id: 'vendida', label: 'Vendidas', color: '#15803d' },
    { id: 'perdida', label: 'Perdidas', color: '#dc2626' },
    { id: 'cancelada', label: 'Canceladas', color: '#8d96a3' },
];

export function render() {
    return `
        <div class="pipeline-module">
            <div class="pipeline-module__head">
                <div>
                    <h2>Pipeline de ventas</h2>
                    <p id="pipelineResumen">Cargando oportunidades…</p>
                </div>
                <span class="pipeline-module__ayuda">Arrastra una tarjeta para cambiarla de estado · pasa el mouse sobre una tarjeta y usa la × para descartarla</span>
            </div>
            <div id="kanban-container" class="pipeline-module__board"></div>
        </div>
    `;
}

/** Persiste el cambio de estado al soltar una tarjeta en otra columna. */
async function moverOportunidad(oportunidadId, estadoOrigen, estadoDestino) {
    try {
        const { error } = await getClient().rpc('tpl_crm_actualizar_estado_oportunidad_v1', {
            p_oportunidad_id: oportunidadId,
            p_estado: estadoDestino,
            p_comentario: `Movida desde "${estadoOrigen}" en el tablero`,
        });
        if (error) throw error;

        const destino = COLUMNAS.find((c) => c.id === estadoDestino);
        toast(`Oportunidad movida a ${destino ? destino.label : estadoDestino}`, 'success');
    } catch (err) {
        console.error('No se pudo actualizar el estado de la oportunidad', err);
        // El componente ya movió la tarjeta en pantalla; si el guardado falla hay
        // que decirlo, porque si no el tablero muestra algo que no está guardado.
        toast('No se pudo guardar el cambio. Recarga la vista para ver el estado real.', 'error');
    }
}

export function init() {
    const oportunidades = arr('oportunidades');
    const contenedor = document.getElementById('kanban-container');
    if (!contenedor) return;

    const resumen = document.getElementById('pipelineResumen');
    if (resumen) {
        resumen.textContent = oportunidades.length
            ? `${oportunidades.length} ${oportunidades.length === 1 ? 'oportunidad activa' : 'oportunidades activas'}`
            : 'Todavía no hay oportunidades registradas. Las que entren por el sitio aparecerán aquí.';
    }

    const cards = oportunidades.map((o) => {
        // Un estado desconocido no puede hacer desaparecer la tarjeta: cae en
        // "Nuevas" para que alguien la vea y la clasifique.
        const conocido = COLUMNAS.some((c) => c.id === o.estado);
        const columnId = conocido ? o.estado : 'nueva';

        // tpl_crm_actualizar_estado_oportunidad_v1 acepta dos estados que este
        // tablero no tiene como columna: 'aceptada' y 'rechazada'. Antes esas
        // tarjetas aparecían en "Nuevas" sin ninguna señal, o sea el tablero
        // mentía sobre en qué punto del embudo estaban. Ahora se muestran igual
        // en "Nuevas" (para que alguien las reclasifique) pero diciendo cuál es
        // su estado real.
        const meta = conocido
            ? (o.codigo || '')
            : [o.codigo, `estado real: ${o.estado || 'sin estado'}`].filter(Boolean).join(' · ');

        return {
            id: o.id,
            columnId,
            title: o.propiedad_titulo || o.codigo || 'Oportunidad',
            subtitle: o.actor_nombre || 'Sin cliente asignado',
            meta,
            badge: Number(o.presupuesto) > 0 ? formatCLP(o.presupuesto) : '',
            dismissable: true,
        };
    });

    contenedor.innerHTML = renderKanban({ columns: COLUMNAS, cards });
    initKanban(moverOportunidad);
    conectarDescartes(contenedor);
}

/**
 * Descartar o eliminar una oportunidad.
 *
 * Antes el tablero solo permitia mover tarjetas de columna: una consulta basura,
 * un duplicado o una prueba se quedaba ahi para siempre inflando el embudo, sin
 * ninguna forma de sacarla.
 *
 * Se intenta primero el borrado definitivo. Si la oportunidad tiene historial
 * asociado (visitas, comunicaciones, un proyecto), Postgres responde con una
 * violacion de clave foranea; en ese caso se ofrece marcarla como "cancelada",
 * que es el equivalente de papelera que ya existe en el propio embudo. Es el
 * mismo patron que usa el borrado de parcelas.
 */
async function descartarOportunidad(oportunidadId, tarjeta) {
    if (!confirm('¿Eliminar esta oportunidad del pipeline?\n\nSi tiene historial asociado te ofreceremos marcarla como cancelada en vez de borrarla.')) return;

    const client = getClient();
    const quitarDePantalla = () => {
        const columna = tarjeta.closest('.kanban__column');
        const cuenta = columna?.querySelector('.kanban__column-count');
        if (cuenta) cuenta.textContent = Math.max(0, parseInt(cuenta.textContent, 10) - 1);
        tarjeta.remove();
    };

    try {
        // .select('id') es imprescindible: sin representacion, Supabase responde
        // 200 / error:null aunque RLS haya bloqueado el borrado y no se haya
        // tocado ninguna fila, y el descarte se anunciaria como exito.
        const { data: borradas, error } = await client
            .from('tpl_oportunidades')
            .delete()
            .eq('id', oportunidadId)
            .select('id');

        if (error && error.code === '23503') {
            const cancelar = confirm('No se puede borrar definitivamente porque tiene historial asociado (visitas, correos o un proyecto).\n\n¿Quieres marcarla como CANCELADA en su lugar?');
            if (!cancelar) return;
            const { error: errRpc } = await client.rpc('tpl_crm_actualizar_estado_oportunidad_v1', {
                p_oportunidad_id: oportunidadId,
                p_estado: 'cancelada',
                p_comentario: 'Descartada desde el tablero del pipeline',
            });
            if (errRpc) throw errRpc;
            toast('Oportunidad marcada como cancelada.', 'success');
            await refrescarSnapshot();
            return;
        }

        if (error) throw error;
        if (!borradas?.length) {
            throw new Error('La base no confirmó el borrado (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.');
        }

        quitarDePantalla();
        toast('Oportunidad eliminada.', 'success');
    } catch (err) {
        console.error('No se pudo descartar la oportunidad', err);
        toast('No se pudo eliminar: ' + (err?.message || err), 'error');
    }
}

function conectarDescartes(contenedor) {
    // Delegacion: las tarjetas se mueven de columna al arrastrarlas, asi que un
    // listener por boton se perderia; el contenedor no cambia.
    contenedor.addEventListener('click', (e) => {
        const boton = e.target.closest('.kanban__card-dismiss');
        if (!boton) return;
        e.stopPropagation();
        const tarjeta = boton.closest('.kanban__card');
        if (!tarjeta) return;
        descartarOportunidad(boton.dataset.dismissId, tarjeta);
    });
}

// Se mantiene el nombre anterior por si algo externo lo importaba.
export const onDragDrop = moverOportunidad;
