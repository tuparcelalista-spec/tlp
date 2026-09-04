const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://hwyscirbycojwndyzozn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log('Fetching Parcelas con Casa from Catastro Mercado...');
    const { data: catastro, error: errFetch } = await client
        .from('tpl_catastro_mercado')
        .select('*')
        .ilike('tipo_propiedad', '%casa%')
        .is('parcela_id', null);

    if (errFetch) {
        console.error('Error fetching catastro:', errFetch);
        return;
    }

    if (!catastro || catastro.length === 0) {
        console.log('No new Parcelas con casa found to migrate.');
        return;
    }

    console.log(`Found ${catastro.length} records. Migrating to tpl_propiedades...`);

    for (const c of catastro) {
        // Map to tpl_propiedades schema
        const meta = c.metadata || {};
        const pMetadata = {
            origen: 'catastro_mercado',
            url_original: c.url,
            fuente: c.fuente,
            antiguedad_anuncio: c.antiguedad,
            contacto_nombre: c.contacto_nombre,
            contacto_telefono: c.contacto_telefono,
            contacto_email: c.contacto_email,
            dormitorios: meta.dormitorios || null,
            banos: meta.banos || null,
            materialidad: meta.material || '',
            estado_construccion: meta.estado || '',
            superficie_construida: meta.superficie_construida || null,
            atributos_texto: c.atributos || '',
            texto_original: c.texto_original || ''
        };

        const newProp = {
            titulo: c.titulo,
            tipo: 'parcela',
            estado: 'catastro', // or something indicating it's scraped data
            descripcion: c.descripcion || `Propiedad capturada desde ${c.fuente}`,
            superficie_m2: c.superficie_m2,
            precio_publicado: c.precio_clp || (c.precio_uf ? c.precio_uf * 38000 : 0),
            moneda: 'CLP',
            comuna: c.comuna,
            region: c.region,
            sector: c.localidad,
            lat: c.lat,
            lng: c.lng,
            clase_activo: 'inmobiliario',
            metadata: pMetadata
        };

        // Insert into tpl_propiedades
        const { data: inserted, error: errIns } = await client
            .from('tpl_propiedades')
            .insert([newProp])
            .select('id')
            .single();

        if (errIns) {
            console.error('Error inserting prop:', c.id, errIns);
            continue;
        }

        // Link back
        const { error: errUpdate } = await client
            .from('tpl_catastro_mercado')
            .update({ parcela_id: inserted.id })
            .eq('id', c.id);

        if (errUpdate) {
            console.error('Error linking back catastro:', c.id, errUpdate);
        } else {
            console.log(`Migrated ID ${c.id} -> ${inserted.id}`);
        }
    }
    
    console.log('Migration completed.');
}
run();
