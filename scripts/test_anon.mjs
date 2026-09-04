import { createClient } from '@supabase/supabase-js';

const URL = 'https://hwyscirbycojwndyzozn.supabase.co';
const KEY = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';

const client = createClient(URL, KEY);

async function test() {
  const { data, error } = await client
    .from('tpl_propiedades')
    .select('id,sector,comuna,superficie_m2')
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Props:', data);
  }
}

test();
