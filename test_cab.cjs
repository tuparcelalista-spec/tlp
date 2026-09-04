const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const landEngineSource = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');
global.window = {};
eval(landEngineSource);
const TPLLandEngine = global.window.TPLLandEngine || global.TPLLandEngine;

async function run() {
    const { data: parcel, error } = await supabase.from('tpl_propiedades').select('*').eq('id', '1bbe3e83-f464-48b1-8689-1201b2082cda').single();
    const vData = TPLLandEngine.calculate(parcel);
    console.log(vData);
}
run();
