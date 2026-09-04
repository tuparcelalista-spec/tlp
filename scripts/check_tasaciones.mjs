import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const URL = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(URL, KEY, { auth: { persistSession: false } });

async function check() {
  const { data, error } = await client
    .from('tpl_tasaciones')
    .select('id, version_motor, valor_tpl_total, valor_tpl_m2, resultado, created_at')
    .eq('propiedad_id', '6a749e24-b2a2-490b-896f-5347f8657fcb')
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log(JSON.stringify(data, null, 2), error);
}

check();
