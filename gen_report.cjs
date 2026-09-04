const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data, error } = await supabase
        .from('tpl_propiedades')
        .select('titulo, comuna, precio_publicado, metadata')
        .order('comuna', { ascending: true });
        
    let md = '# Estado Actual de Todas las Parcelas (Tasaciones TPL)\n\n';
    md += '| Comuna | Propiedad | Precio Publicado | Tasación TPL |\n';
    md += '|---|---|---|---|\n';
    
    const formatClp = (val) => val ? '$' + Math.round(val).toLocaleString('es-CL') : 'N/A';
    
    data.forEach(p => {
        const valTpl = p.metadata?.tasacion_resultado_resumen?.valor_tpl_tasador || p.metadata?.valor_tpl_tasador;
        md += `| ${p.comuna || 'Sin Comuna'} | ${p.titulo} | ${formatClp(p.precio_publicado)} | ${formatClp(valTpl)} |\n`;
    });
    
    fs.writeFileSync('C:/Users/yo/.gemini/antigravity/brain/fb6b13b7-084c-4447-a45b-9c2a2e81035e/reporte_parcelas.md', md);
    console.log('Artifact generated.');
})();
