// supabase.js
const SUPABASE_URL = 'https://hwyscirbycojwndyzozn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';

let supabaseClient = null;

export function getClient() {
    if (supabaseClient) return supabaseClient;
    
    if (!window.supabase || !window.supabase.createClient) {
        throw new Error('Supabase SDK no está cargado');
    }
    
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            storageKey: 'sb-hwyscirbycojwndyzozn-auth-token',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
    
    return supabaseClient;
}

export async function getSession() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
}

export async function signIn(email, password) {
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const client = getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
}

// ---------------------------------------------------------------------------
// Referencias comunales de mercado
//
// El motor unico ya no trae medianas escritas a mano: su unica fuente es
// tpl_tasador_referencias. El editor del CRM recalcula la tasacion al guardar,
// asi que si estas referencias no estan cargadas guardaria un valor 100%
// tecnico y pisaria la cifra correcta de la ficha.
//
// El CRM no carga tpl-data-service.js (tiene su propio cliente), por eso la
// carga vive aqui y no alla.
// ---------------------------------------------------------------------------

let cargaReferencias = null;

export function cargarReferenciasComunales(motor = window.TPLLandEngine) {
    if (cargaReferencias) return cargaReferencias;
    cargaReferencias = (async () => {
        if (!motor?.setMarketReferences) return { cantidad: 0, fuente: 'sin_motor' };
        try {
            const client = getClient();
            const [refs, uf] = await Promise.all([
                client
                    .from('tpl_tasador_referencias')
                    .select('region,comuna,comuna_key,segmento,mediana_m2,p25_m2,p75_m2,mediana_uf_m2,uf_base_clp,cantidad_comparables,confianza,fuentes,fecha_observacion,metadata')
                    .eq('activo', true),
                client.rpc('tpl_obtener_uf_v1'),
            ]);
            if (refs.error) throw refs.error;
            const ufClp = Number(uf?.data?.valor_clp || 0);
            motor.setMarketReferences(refs.data || [], { ufClp });
            return { cantidad: (refs.data || []).length, ufClp, fuente: 'supabase' };
        } catch (error) {
            console.warn('[CRM] Sin referencias comunales; las tasaciones que se recalculen aqui saldran solo tecnicas.', error);
            return { cantidad: 0, fuente: 'sin_referencia' };
        }
    })();
    window.TPLReferenciasComunales = cargaReferencias;
    return cargaReferencias;
}

// ---------------------------------------------------------------------------
// Acceso a datos del catalogo
//
// Aqui vivian fetchParcelas(), fetchCasas() y fetchFundaciones(). Las dos
// ultimas consultaban las tablas `casas` y `fundaciones`, que NO EXISTEN en la
// base: cualquier llamada fallaba con 404. fetchParcelas leia la tabla legada
// `parcelas` (32 filas) en vez de `tpl_propiedades` (33), asi que devolvia el
// catalogo antiguo, sin las tasaciones recalculadas.
//
// Se deja solo la lectura correcta, apuntada a la vista que ya usa la grilla
// del CRM, para que todas las pantallas muestren el mismo valor.
// ---------------------------------------------------------------------------

export async function fetchParcelas(filters = {}) {
    const client = getClient();
    let query = client
        .from('crm_parcelas_resumen')
        .select('*')
        .order('publicada_at', { ascending: false })
        .limit(300);

    if (filters.commune && filters.commune !== 'all') {
        query = query.eq('comuna', filters.commune);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}
