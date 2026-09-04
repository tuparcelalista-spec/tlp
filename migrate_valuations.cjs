const https = require('https');
const fs = require('fs');

// Cargar el motor blindado
eval(fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8'));

const URL = 'hwyscirbycojwndyzozn.supabase.co';
const HEADERS = {
  'apikey': 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k',
  'Authorization': 'Bearer sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k',
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = { hostname: URL, path, method, headers: HEADERS };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data ? JSON.parse(data) : {}));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runMigration() {
  console.log('Iniciando purga de datos antiguos y actualización de tasaciones...');
  
  // 1. Obtener todas las propiedades
  const props = await request('GET', '/rest/v1/tpl_propiedades?select=id,titulo,comuna,superficie_m2,rol_situacion,agua,topografia,metadata');
  console.log(`Se encontraron ${props.length} propiedades para auditar.`);

  let updated = 0;
  for (let p of props) {
    let meta = p.metadata || {};
    
    // Extraer distancias 
    const dist = meta.tasador_entrada?.commune_distance || 0;
    const hub = meta.tasador_entrada?.major_city_distance || 0;

    const calcData = {
      comuna: p.comuna,
      superficie_m2: p.superficie_m2 || 5000,
      communeDistanceKm: dist,
      distanceKm: hub,
      rol: p.rol_situacion,
      agua: p.agua,
      topografia: p.topografia,
      naturaleza: '',
      descripcion: p.titulo
    };

    // Calcular con el motor de LEY
    const v = TPLLandEngine.calculate(calcData);
    const finalValue = v.valorRecomendado || 0;

    if (finalValue > 0) {
      // Purgar informaciones antiguas y estructurar el nuevo resumen
      meta.tasacion_resultado_resumen = {
        valor_recomendado: finalValue,
        valor_tpl_tasador: finalValue,
        base_comunal: v.valorComunalBase,
        fecha_calculo: new Date().toISOString(),
        motor_version: 'LEY_ACTUAL_80_20'
      };

      // Limpiar campos legacy que causaban ruido
      delete meta.valor_tpl_total;
      delete meta.valor_tpl_tasador;
      delete meta.ultima_tasacion_id;

      // 2. Guardar en la base de datos
      await request('PATCH', `/rest/v1/tpl_propiedades?id=eq.${p.id}`, { metadata: meta });
      updated++;
      if (updated % 10 === 0) console.log(`Progreso: ${updated} propiedades re-tasadas...`);
    }
  }

  console.log(`¡Éxito! ${updated} propiedades actualizadas. Datos antiguos purgados.`);
}

runMigration().catch(console.error);
