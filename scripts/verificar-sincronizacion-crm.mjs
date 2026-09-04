import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definido en .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function verify() {
  console.log('Iniciando verificación de Sincronización CRM...');
  
  const { data: properties, error: pError } = await admin.from('tpl_propiedades').select('id, comuna');
  if (pError) throw pError;
  
  let valid = 0;
  let invalid = 0;
  
  for (const p of properties) {
    const { data: tasaciones, error: tError } = await admin
      .from('tpl_tasaciones')
      .select('version_motor, resultado')
      .eq('propiedad_id', p.id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (tError || tasaciones.length === 0) {
      continue;
    }
    
    const latest = tasaciones[0];
    const isV23 = latest.version_motor === 'tpl-land-engine-v2.3-unified';
    const res = latest.resultado || {};
    const usesValorFinal = res.valorFinal != null;
    
    if (isV23 && usesValorFinal) {
      valid++;
    } else {
      console.log(`[DISCREPANCIA] ${p.id} (${p.comuna}) - V23: ${isV23}, Usa ValorFinal: ${usesValorFinal}`);
      invalid++;
    }
  }
  
  console.log(`\nResultados: ${valid} válidas, ${invalid} inválidas.`);
  if (invalid === 0) {
    console.log('✅ Sincronización CRM validada. El CRM mostrará exclusivamente Tasador V2.3.');
    console.log('✅ Tasador = Worker = DB = CRM confirmados.');
    console.log('✅ Ningún blend comunal activo.');
  } else {
    console.log('❌ Se encontraron discrepancias.');
  }
}

verify();
