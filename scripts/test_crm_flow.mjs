import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function runTest() {
    const testCodigo = 'TEST-CRM-FLOW-' + Date.now();
    console.log('1. Publicando propiedad...');
    const { data: prop, error: err1 } = await supabase.from('tpl_propiedades').insert({
        codigo: testCodigo,
        titulo: 'Parcela de Prueba CRM',
        estado: 'publicada',
        superficie_m2: 5000,
        precio_publicado: 35000000
    }).select('*').single();
    if(err1) throw err1;

    console.log('2. Supabase guarda precio_publicado = ' + prop.precio_publicado);

    const { data: frontendFetch, error: err2 } = await supabase.from('tpl_propiedades')
        .select('id,codigo,estado,precio_publicado')
        .eq('codigo', testCodigo)
        .in('estado', ['publicada', 'activa', 'disponible'])
        .single();
    
    console.log('3 & 4. Frontend recibe precio_publicado = ' + frontendFetch.precio_publicado + ' (se mostrara como .000.000)');

    console.log('5. Cambiando precio a .000.000 simulando CRM...');
    const { data: updatedProp, error: err3 } = await supabase.from('tpl_propiedades')
        .update({ precio_publicado: 37000000 })
        .eq('codigo', testCodigo)
        .select('*')
        .single();
    
    console.log('6 & 7. Supabase guarda precio_publicado = ' + updatedProp.precio_publicado);

    const { data: frontendFetch2 } = await supabase.from('tpl_propiedades')
        .select('id,codigo,estado,precio_publicado')
        .eq('codigo', testCodigo)
        .in('estado', ['publicada', 'activa', 'disponible'])
        .single();
    
    console.log('8 & 9. Frontend recarga y recibe precio_publicado = ' + frontendFetch2.precio_publicado + ' (se mostrara como .000.000)');

    await supabase.from('tpl_propiedades').delete().eq('codigo', testCodigo);
    console.log('Limpieza completada.');
}

runTest().catch(console.error);
