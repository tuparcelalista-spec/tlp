const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const id = '1bbe3e83-f464-48b1-8689-1201b2082cda';
    
    // update precio and precio_publicado
    const { data, error } = await supabase
        .from('tpl_propiedades')
        .update({ 
            precio: 173000000,
            precio_publicado: 173000000 
        })
        .eq('id', id);
        
    if (error) {
        console.error('Error updating:', error);
    } else {
        console.log('Caburgua parcel updated to 173,000,000 successfully.');
    }
})();
