const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('tpl_propiedades').select('*').eq('id', '1bbe3e83-f464-48b1-8689-1201b2082cda').single();
    console.log(data);
}
run();
