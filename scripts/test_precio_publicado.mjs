import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase configuration missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const testCodigo = 'TEST-PROP-' + Date.now();
  const testPrecio = 35000000;

  const { data: inserted, error: insertError } = await supabase
    .from('tpl_propiedades')
    .insert({
      codigo: testCodigo,
      titulo: 'Propiedad de prueba',
      comuna: 'TestComuna',
      sector: 'TestSector',
      superficie_m2: 5000,
      precio_publicado: testPrecio
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Insert error:', insertError);
    return;
  }
  console.log('Inserted property:', inserted.codigo, inserted.precio_publicado);

  const { data: fetched, error: fetchError } = await supabase
    .from('tpl_propiedades')
    .select('id, codigo, precio_publicado')
    .eq('codigo', testCodigo)
    .single();

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }
  console.log('Fetched property:', fetched);
  console.log('Precio publicado matches:', fetched.precio_publicado === testPrecio);

  const { error: deleteError } = await supabase
    .from('tpl_propiedades')
    .delete()
    .eq('codigo', testCodigo);
  if (deleteError) console.error('Cleanup error:', deleteError);
  else console.log('Test property removed');
}

main();
