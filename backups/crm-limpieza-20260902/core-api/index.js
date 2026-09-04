/**
 * TPL Data Abstraction SDK
 * 
 * This layer abstracts all Supabase/Database interactions. 
 * The rest of the CRM and Public Site should ONLY call methods from this SDK, 
 * not Supabase directly. This ensures that if the DB schema or RPC signatures change,
 * only this file needs to be updated.
 */

import { getClient } from '../supabase.js';

export const TPLApi = {
    // ----------------------------------------------------
    // CATÁLOGO: Parcelas
    // ----------------------------------------------------
    async getParcelas(filters = {}) {
        const client = getClient();
        
        // Example of abstracting an RPC call instead of direct table access
        // const { data, error } = await client.rpc('tpl_crm_get_parcelas', { filters });
        
        // For now, mapping to existing logic to prevent breaking changes:
        let query = client.from('parcelas').select('*');
        
        if (filters.commune && filters.commune !== 'all') {
            query = query.eq('comuna', filters.commune);
        }
        if (filters.economic) {
            query = query.order('precio_publicado', { ascending: true });
        }
        
        const { data, error } = await query;
        if (error) {
            console.error('[TPL SDK] Error fetching parcelas:', error);
            throw new Error('No pudimos cargar las parcelas. Por favor, intenta de nuevo.');
        }
        return data;
    },

    async getParcelaById(id) {
        const client = getClient();
        const { data, error } = await client.from('parcelas').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    // ----------------------------------------------------
    // CATÁLOGO: Casas y Anexos
    // ----------------------------------------------------
    async getCasas() {
        const client = getClient();
        const { data, error } = await client.from('casas').select('*');
        if (error) throw error;
        return data;
    },

    async getFundaciones() {
        const client = getClient();
        const { data, error } = await client.from('fundaciones').select('*');
        if (error) throw error;
        return data;
    },

    // ----------------------------------------------------
    // COMMAND CENTER (Operaciones)
    // ----------------------------------------------------
    async getDashboardSnapshot() {
        const client = getClient();
        // In the future, this maps to the RPC mentioned in the blueprint:
        // return await client.rpc('tpl_crm_command_center_v1');
        const { data, error } = await client.rpc('tpl_crm_snapshot_v1');
        if (error) throw error;
        return data;
    },

    // ----------------------------------------------------
    // ACTIONS (Mutations)
    // ----------------------------------------------------
    // ----------------------------------------------------
    // CATASTRO Y COMPARABLES (Market Intelligence)
    // ----------------------------------------------------
    async getComparables(filters = {}) {
        const client = getClient();
        
        // Asume que hemos cargado el catastro en una tabla/vista 'tpl_catastro_comparables'
        // Si la tabla no existe aún, esto requerirá ejecutar el script SQL correspondiente en Supabase.
        let query = client.from('tpl_propiedades').select('*'); // Using existing table as fallback
        
        if (filters.comuna) {
            query = query.eq('comuna', filters.comuna);
        }
        
        const { data, error } = await query.limit(50);
        
        if (error) {
            console.error('[TPL SDK] Error fetching comparables:', error);
            // Fallback gracefully for UI demonstration if table fails
            return [];
        }
        return data;
    }
};

export default TPLApi;
