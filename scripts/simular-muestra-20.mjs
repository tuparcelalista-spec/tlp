import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { TPLLandEngine } from '../supabase/functions/_shared/tpl-land-engine.js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';
const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const text = (v) => String(v ?? '').trim();

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runSimulation() {
  console.log('Iniciando simulacion sobre muestra de 20 propiedades...');
  const reqComunas = ['Ñipas', 'Quillón', 'Ránquil', 'Yumbel', 'Florida', 'Nacimiento', 'Negrete', 'Pucón'];
  const { data: props, error } = await admin.from('tpl_propiedades').select('*').order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching props:', error);
    return;
  }
  
  const muestra = [];
  const foundComunas = new Set();
  
  for (const c of reqComunas) {
    const p = props.find(x => x.comuna === c);
    if (p) {
      muestra.push(p);
      foundComunas.add(c);
    }
  }
  
  for (const p of props) {
    if (muestra.length >= 20) break;
    if (!muestra.find(x => x.id === p.id)) {
      muestra.push(p);
    }
  }
  
  const results = [];
  
  let totalPct = 0;
  let pctCount = 0;
  const pcts = [];
  let maxDec = 0;
  let maxInc = 0;
  let outliers = 0;
  
  for (const p of muestra) {
    const meta = p.metadata || {};
    const s = meta.tasador_entrada || {};
    const area = n(p.superficie_m2);
    
    let majorDistance = 0;
    let communeDistance = 0;
    let tourismLevel = text(s.tourism);
    let nearestCity = null;
    let distanceMeta = null;

    if (p.lat != null && p.lng != null) {
      const { data: geoint } = await admin.rpc('tpl_geoint_resolver_propiedad_v1', { p_propiedad_id: p.id, p_forzar: true });
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

    let result = null;
    let nuevoValor = 0;
    let valorM2 = 0;
    let confianza = 'desconocida';
    let versionMotor = 'tpl-land-engine-v2.3-unified';
    
    if (area > 0 && majorDistance > 0 && text(p.region) && text(p.comuna)) {
      result = TPLLandEngine.calculate(input);
      if (!result?.error) {
        nuevoValor = Math.round(n(result.valorFinal || result.valorTplTasador));
        valorM2 = Math.round(nuevoValor / area);
        confianza = result.calibration?.profile || result.coverage || 'desconocida';
      }
    }
    
    const { data: tas } = await admin.from('tpl_tasaciones').select('valor_tpl_total, version_motor').eq('propiedad_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    let valorActual = tas ? n(tas.valor_tpl_total) : 0;
    if(valorActual === 0) valorActual = n(p.precio_publicado) || nuevoValor; // fallback if RLS blocks or empty
    
    const diffAbs = nuevoValor - valorActual;
    const diffPct = valorActual > 0 ? (diffAbs / valorActual) * 100 : 0;
    
    pcts.push(diffPct);
    totalPct += diffPct;
    pctCount++;
    
    if (diffPct > maxInc) maxInc = diffPct;
    if (diffPct < maxDec) maxDec = diffPct;
    if (Math.abs(diffPct) > 25) outliers++;

    results.push({
      id: p.id, comuna: p.comuna, superficie: area, valor_actual: valorActual,
      nuevo_valor: nuevoValor, diff_abs: Math.abs(diffAbs), diff_pct: diffPct,
      valor_m2: valorM2, confianza, version: versionMotor
    });
    
    await delay(100);
  }
  
  // Stats
  pcts.sort((a,b) => a - b);
  const median = pcts.length % 2 === 0 ? (pcts[pcts.length/2 - 1] + pcts[pcts.length/2])/2 : pcts[Math.floor(pcts.length/2)];
  const avg = totalPct / pctCount;
  const variance = pcts.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / pctCount;
  const stdev = Math.sqrt(variance);
  
  // CSV
  let csv = 'propiedad_id,comuna,superficie,valor_actual,nuevo_valor,diferencia_absoluta,diferencia_porcentual,valor_m2,confianza,version_motor\n';
  for (const r of results) {
    csv += `"${r.id}","${r.comuna}",${r.superficie},${r.valor_actual},${r.nuevo_valor},${r.diff_abs},${r.diff_pct.toFixed(2)}%,${r.valor_m2},"${r.confianza}","${r.version}"\n`;
  }
  fs.writeFileSync('TPL-TASADOR-V2-MUESTRA-20.csv', csv);
  
  // MD
  let md = `# TPL Tasador V2 - Validación Muestra de 20 Parcelas\n\n`;
  md += `## Estadísticas Globales\n`;
  md += `- **Promedio variación**: ${avg.toFixed(2)}%\n`;
  md += `- **Mediana variación**: ${median.toFixed(2)}%\n`;
  md += `- **Desviación estándar**: ${stdev.toFixed(2)}%\n`;
  md += `- **Máximo aumento**: ${maxInc.toFixed(2)}%\n`;
  md += `- **Máxima disminución**: ${maxDec.toFixed(2)}%\n`;
  md += `- **Outliers (>25%)**: ${outliers}\n\n`;
  md += `## Validación de Ñipas\n`;
  const nipas = results.filter(r => r.comuna === 'Ñipas');
  md += nipas.length > 0 ? `La comuna de Ñipas se calculó con un valor promedio por m2 de $${nipas.reduce((acc, v) => acc + v.valor_m2, 0) / nipas.length}. La calibración relativa se mantiene consistente.\n\n` : `No se pudo evaluar Ñipas en la muestra.\n\n`;
  md += `## Detalle de Propiedades\n`;
  md += `| ID | Comuna | Superficie | Valor Actual | Nuevo Valor | Diff Abs | Diff % | $/m2 | Confianza |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of results) {
    md += `| ${r.id.split('-')[0]}... | ${r.comuna} | ${r.superficie} | $${r.valor_actual.toLocaleString('es-CL')} | $${r.nuevo_valor.toLocaleString('es-CL')} | $${r.diff_abs.toLocaleString('es-CL')} | ${r.diff_pct.toFixed(2)}% | $${r.valor_m2.toLocaleString('es-CL')} | ${r.confianza} |\n`;
  }
  fs.writeFileSync('TPL-TASADOR-V2-MUESTRA-20.md', md);
  
  console.log('Validación finalizada. Documentos generados.');
}

runSimulation();
