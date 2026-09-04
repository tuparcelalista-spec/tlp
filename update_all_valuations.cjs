const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. Load the Land Engine ---
const landEngineSource = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');
global.window = {};
eval(landEngineSource);
const TPLLandEngine = global.window.TPLLandEngine || global.TPLLandEngine;

async function run() {
    console.log('Fetching all properties from tpl_propiedades...');
    const { data: properties, error: fetchErr } = await supabase
        .from('tpl_propiedades')
        .select('*');

    if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        return;
    }

    const report = [];
    let updatedCount = 0;

    for (const parcel of properties) {
        let oldVal = parcel.metadata?.tasacion_resultado_resumen?.valor_tpl_tasador || 0;
        let newValue = 0;
        
        try {
            // Re-run the engine
            const vData = TPLLandEngine.calculate(parcel);
            if (vData && vData.valorRecomendado) {
                newValue = vData.valorRecomendado;
            } else {
                newValue = oldVal;
            }
        } catch(e) {
            newValue = oldVal;
        }

        report.push({
            id: parcel.id,
            comuna: parcel.comuna,
            titulo: parcel.titulo,
            precio_publicado: parcel.precio_publicado || parcel.precio,
            old_valor_tpl: oldVal,
            new_valor_tpl: newValue
        });

        if (newValue > 0 && newValue !== oldVal) {
            // Update metadata JSONB safely
            const newMetadata = parcel.metadata || {};
            newMetadata.tasacion_resultado_resumen = newMetadata.tasacion_resultado_resumen || {};
            newMetadata.tasacion_resultado_resumen.valor_tpl_tasador = newValue;
            newMetadata.tasacion_resultado_resumen.valor_recomendado = newValue;
            newMetadata.valor_tpl_tasador = newValue; // top level legacy
            newMetadata.valor_tpl_total = newValue; // top level legacy

            const { error: updErr } = await supabase
                .from('tpl_propiedades')
                .update({ metadata: newMetadata })
                .eq('id', parcel.id);
            
            if (updErr) {
                console.error(`Update error for ${parcel.id}:`, updErr);
            } else {
                updatedCount++;
            }
        }
    }

    // Save report
    const reportPath = 'reporte_tasaciones_actualizadas.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`Finished updating ${updatedCount} properties.`);
    console.log(`Report saved to ${reportPath}`);
}

run();
