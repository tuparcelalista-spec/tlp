const fs = require('fs');
let js = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');
js = js.replace('const base = MARKET_REFERENCES[cName] ? MARKET_REFERENCES[cName].medianM2 : 5000;', 'const base = MARKET_REFERENCES[cName] ? MARKET_REFERENCES[cName].medianM2 : 5000; console.log("Base calculated:", base, "for", cName);');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

global.window = {}; eval(js);
(async () => {
    const { data } = await supabase.from('tpl_propiedades').select('*').eq('id', '1bbe3e83-f464-48b1-8689-1201b2082cda').single();
    global.window.TPLLandEngine.calculate(data);
})();
