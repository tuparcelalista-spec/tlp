/**
 * Refresco del snapshot sin recargar la página.
 *
 * QUÉ PASABA
 *   Cada acción que guardaba algo en el CRM terminaba en
 *   `window.location.reload()`: guardar una parcela, aprobar una publicación,
 *   avanzar una etapa, eliminar una casa. Funcionaba, pero cada recarga vuelve
 *   a correr el boot completo — cargar el SDK de Supabase, validar la sesión,
 *   verificar permisos de staff, y después tpl_crm_snapshot_v1 +
 *   tpl_crm_command_center_v1 + las referencias comunales del tasador. Son
 *   varios segundos de pantalla en blanco por cada clic de guardado, y es la
 *   razón principal de que el CRM se sienta lento.
 *
 * QUÉ HACE AHORA
 *   Vuelve a pedir SOLO el snapshot y repinta la vista actual. Si algo falla
 *   —la sesión expiró, se cayó la red— cae de vuelta a la recarga completa,
 *   que es el comportamiento que había antes: nunca deja al usuario mirando
 *   datos viejos sin avisar.
 */

import { getClient } from './supabase.js';
import state from './state.js';
import { navigate } from './router.js';

/**
 * @param {object}  opciones
 * @param {boolean} opciones.repintar  Volver a renderizar la vista actual.
 * @param {boolean} opciones.invalidar Pedirle al módulo que tire su caché
 *                                     propia (parcelas y catastro guardan sus
 *                                     filas en una variable de módulo).
 */
export async function refrescarSnapshot({ repintar = true, invalidar = true } = {}) {
    try {
        const client = getClient();
        const { data, error } = await client.rpc('tpl_crm_snapshot_v1');
        if (error) throw error;

        state.snapshot = data || {};

        if (repintar && state.currentView) {
            await navigate(state.currentView, { invalidar });
        }
        return true;
    } catch (err) {
        console.warn('[CRM] No se pudo refrescar el snapshot; se recarga la página.', err);
        window.location.reload();
        return false;
    }
}

export default refrescarSnapshot;
