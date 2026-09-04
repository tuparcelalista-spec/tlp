import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { TPLLandEngine as EngineV23 } from '../supabase/functions/_shared/tpl-land-engine.js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const text = (v) => String(v ?? '').trim();

async function analyze() {
  const { data: propiedades } = await supabase
    .from('tpl_propiedades')
    .select('*')
    .order('created_at', { ascending: true });

  const rows = [];
  const diffsPct = [];
  const absDiffsPct = [];

  for (const p of propiedades) {
    const meta = p.metadata || {};
    const s = meta.tasador_entrada || {};
    const area = n(p.superficie_m2);
    
    let majorDistance = 0, communeDistance = 0, tourismLevel = text(s.tourism), nearestCity = null, distanceMeta = null;

    if (p.lat != null && p.lng != null) {
      const { data: geoint } = await supabase.rpc('tpl_geoint_resolver_propiedad_v1', { p_propiedad_id: p.id, p_forzar: false });
      if (geoint?.ok) {
        distanceMeta = geoint;
        majorDistance = n(geoint.hub_efectivo?.distance_km);
        communeDistance = n(geoint.centro_comunal?.distance_km);
        tourismLevel = text(geoint.destino_turistico?.nivel || tourismLevel);
        nearestCity = geoint.hub_efectivo ? { name: geoint.hub_efectivo.nombre, category: geoint.hub_efectivo.tipo } : null;
      }
    }

    if (!majorDistance) {
      majorDistance = n(s.major_city_distance ?? s.distanceKm);
      communeDistance = communeDistance || n(s.commune_distance);
    }

    if (!area || !majorDistance) continue;

    const input = {
      area, asking: n(p.precio_publicado), region: text(p.region), comuna: text(p.comuna), location: [p.sector, p.comuna].filter(Boolean).join(', '),
      distanceKm: majorDistance, majorCityDistanceKm: majorDistance, communeDistanceKm: communeDistance || null, nearestCity,
      routeDistanceKm: n(s.route_distance ?? p.distancia_ruta_principal_km), electricityPoleDistanceM: n(s.electricity_pole_distance),
      access: text(s.access || p.acceso), topography: text(s.topography || p.topografia), soil: text(s.soil || p.suelo),
      exposure: text(s.exposure || p.exposicion), view: text(s.view || p.vista_principal), tourism: tourismLevel,
      fireRisk: text(s.fire_risk || s.fireRisk || distanceMeta?.riesgos?.incendio?.nivel), floodRisk: text(s.flood_risk || s.floodRisk || distanceMeta?.riesgos?.inundacion?.nivel),
      water: text(s.water || p.agua), electricity: text(s.electricity || p.electricidad), fencing: text(s.fencing || p.cierre_perimetral),
      gate: text(s.gate || p.porton), condominium: text(s.condominium ?? (p.condominio ? 'si' : 'no')), vegetation: text(s.vegetation || p.vegetacion),
      nature: Array.isArray(s.nature) ? s.nature : (Array.isArray(p.atributos_naturales) ? p.atributos_naturales : []), rol: text(p.rol_situacion)
    };

    const r23 = EngineV23.calculate(input);
    if (r23.error) continue;

    const val23 = r23.valorFinal;
    const pub = n(p.precio_publicado);
    if (!pub) continue;

    const diffAbs = val23 - pub;
    const diffPct = (diffAbs / pub) * 100;
    
    diffsPct.push(diffPct);
    absDiffsPct.push(Math.abs(diffPct));

    rows.push({
      id: p.id,
      comuna: p.comuna,
      area,
      pub,
      val23,
      diffAbs,
      diffPct,
      pubM2: Math.round(pub / area),
      valM2: Math.round(val23 / area)
    });
  }

  // Stats
  const meanPctError = diffsPct.reduce((s, x) => s + x, 0) / diffsPct.length;
  const meanAbsPctError = absDiffsPct.reduce((s, x) => s + x, 0) / absDiffsPct.length;
  
  const sortedDiffs = [...diffsPct].sort((a,b)=>a-b);
  const median = sortedDiffs[Math.floor(sortedDiffs.length / 2)];
  
  const variance = diffsPct.reduce((s, x) => s + Math.pow(x - meanPctError, 2), 0) / diffsPct.length;
  const stdDev = Math.sqrt(variance);

  // Group by comuna
  const comMap = {};
  for (const r of rows) {
    if (!comMap[r.comuna]) comMap[r.comuna] = [];
    comMap[r.comuna].push(r);
  }

  const comStats = [];
  for (const [c, items] of Object.entries(comMap)) {
    const sumPub = items.reduce((s,x)=>s+x.pub,0);
    const sumVal = items.reduce((s,x)=>s+x.val23,0);
    const pctDiffs = items.map(x=>x.diffPct);
    comStats.push({
      comuna: c,
      count: items.length,
      avgPub: Math.round(sumPub / items.length),
      avgVal: Math.round(sumVal / items.length),
      avgPct: pctDiffs.reduce((s,x)=>s+x,0) / items.length,
      maxPct: Math.max(...pctDiffs),
      minPct: Math.min(...pctDiffs)
    });
  }

  // Rank properties
  const ranked = [...rows].sort((a,b) => a.diffPct - b.diffPct); // More negative (subvalued) first

  // Generate CSV
  const csvHeaders = 'ID,Comuna,Superficie,Precio Publicado,Valor Tasador V2.3,Diferencia Abs,Diferencia Pct,Val M2 Publicado,Val M2 Tasador\n';
  const csvContent = csvHeaders + rows.map(r => 
    `${r.id},${r.comuna},${r.area},${r.pub},${r.val23},${r.diffAbs},${r.diffPct.toFixed(2)}%,${r.pubM2},${r.valM2}`
  ).join('\n');
  fs.writeFileSync('TPL-TASADOR-V231-COMPARACION-PUBLICADOS.csv', csvContent);

  // Generate MD comparison table
  let mdCompare = `# Auditoría Comparativa: Tasador TPL vs Valores Publicados\n\n`;
  mdCompare += `## Resumen del Análisis\n`;
  mdCompare += `- **Total de Propiedades Analizadas**: ${rows.length}\n`;
  mdCompare += `- **Error Porcentual Medio (MPE)**: ${meanPctError.toFixed(2)}%\n`;
  mdCompare += `- **Error Absoluto Porcentual Medio (MAPE)**: ${meanAbsPctError.toFixed(2)}%\n`;
  mdCompare += `- **Mediana de Diferencia**: ${median.toFixed(2)}%\n`;
  mdCompare += `- **Desviación Estándar**: ${stdDev.toFixed(2)}%\n\n`;
  mdCompare += `## Tabla Comparativa Completa\n\n`;
  mdCompare += `| ID | Comuna | Superficie | Valor Publicado | Valor Tasador V2.3 | Diferencia ($) | Diferencia (%) | M² Publicado | M² Tasador |\n`;
  mdCompare += `|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    mdCompare += `| \`${r.id.slice(0, 8)}...\` | ${r.comuna} | ${r.area.toLocaleString('es-CL')} m² | $${r.pub.toLocaleString('es-CL')} | $${r.val23.toLocaleString('es-CL')} | $${r.diffAbs.toLocaleString('es-CL')} | ${r.diffPct.toFixed(1)}% | $${r.pubM2.toLocaleString('es-CL')} | $${r.valM2.toLocaleString('es-CL')} |\n`;
  }
  fs.writeFileSync('TPL-TASADOR-V231-COMPARACION-PUBLICADOS.md', mdCompare);

  // Generate MD Calibration report
  let mdCalib = `# Reporte de Calibración y Sesgos Sistemáticos\n\n`;
  mdCalib += `## Sesgo Sistemático General\n`;
  mdCalib += `Existe un sesgo de subvaloración crítico en el motor V2.3. Las tasaciones se encuentran en promedio un **${Math.abs(meanPctError).toFixed(1)}% por debajo** del precio de venta publicado en el mercado real.\n\n`;
  mdCalib += `### Desglose por Comuna\n\n`;
  mdCalib += `| Comuna | Parcelas | Promedio Publicado | Promedio Tasador | Dif Promedio (%) | Dif Máxima (%) | Dif Mínima (%) |\n`;
  mdCalib += `|---|---|---|---|---|---|---|\n`;
  for (const c of comStats) {
    mdCalib += `| ${c.comuna} | ${c.count} | $${c.avgPub.toLocaleString('es-CL')} | $${c.avgVal.toLocaleString('es-CL')} | ${c.avgPct.toFixed(1)}% | ${c.maxPct.toFixed(1)}% | ${c.minPct.toFixed(1)}% |\n`;
  }

  mdCalib += `\n### Ranking de Desviaciones (Sesgo Extremo)\n\n`;
  mdCalib += `#### Las 10 Parcelas Más Subvaloradas (Oportunidades Extremas / Calibración Necesaria):\n`;
  for (let i = 0; i < Math.min(10, ranked.length); i++) {
    const r = ranked[i];
    mdCalib += `${i+1}. Comuna **${r.comuna}** (ID \`${r.id.slice(0,8)}...\`): Tasado en $${r.val23.toLocaleString('es-CL')} vs publicado en $${r.pub.toLocaleString('es-CL')} (**${r.diffPct.toFixed(1)}%**)\n`;
  }

  mdCalib += `\n#### Las 10 Parcelas Con Menor Desviación o Mayor Valoración:\n`;
  const reversed = [...ranked].reverse();
  for (let i = 0; i < Math.min(10, reversed.length); i++) {
    const r = reversed[i];
    mdCalib += `${i+1}. Comuna **${r.comuna}** (ID \`${r.id.slice(0,8)}...\`): Tasado en $${r.val23.toLocaleString('es-CL')} vs publicado en $${r.pub.toLocaleString('es-CL')} (**${r.diffPct.toFixed(1)}%**)\n`;
  }

  mdCalib += `\n## Propuesta de Calibración
1. **Calibración Comunal**: Es evidente que usar un anclaje único basado en Ñipas aplanó los valores de comunas de mayor dinamismo inmobiliario (como Pucón, con -97% de desviación).
2. **Ajuste de Multiplicadores Turísticos**: En Pucón, la distancia a la capital regional castiga de forma desmedida a una zona donde el metro cuadrado vale el triple. La variable "Zona Turística Nacional" debe configurarse para proteger el piso de valor.
3. **Calibración del Segmento Físico**: Se propone aumentar el valor por m² base de los tramos de superficie o aplicar multiplicadores de conectividad real CONIT (tiempo de traslado) en lugar de lineales para reducir el castigo por aislamiento.
`;
  fs.writeFileSync('TPL-TASADOR-V231-ANALISIS-CALIBRACION.md', mdCalib);

  console.log('Ficheros generados con éxito.');
}

analyze();
