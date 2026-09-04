const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let js = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');
js = js.replace('function calculate(p) {', 'function calculate(p) {\n    const cName = normalize(p.comuna);\n    console.log("cName=", cName, "in dict?", !!MARKET_REFERENCES[cName]);\n');

global.window = {};
eval(js);
const TPLLandEngine = global.window.TPLLandEngine || global.TPLLandEngine;

async function run() {
    const { data: parcel } = await supabase.from('tpl_propiedades').select('*').eq('id', '1bbe3e83-f464-48b1-8689-1201b2082cda').single();
    const vData = TPLLandEngine.calculate(parcel);
    console.log("FINAL REC: ", vData.valorRecomendado);
}
run();
