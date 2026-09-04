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

async function runDescomposicion() {
  console.log('Iniciando descomposición de valor para 20 propiedades...');
  
  // Reutilizar la muestra
  const reqComunas = ['Ñipas', 'Quillón', 'Yumbel', 'Florida', 'Nacimiento', 'Negrete', 'Pucón'];
  const { data: props, error } = await admin.from('tpl_propiedades').select('*').order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching props:', error);
    return;
  }
  
  const muestra = [];
  const foundComunas = new Set();
  
  for (const c of reqComunas) {
    const p = props.find(x => x.comuna === c);
    if (p) { muestra.push(p); foundComunas.add(c); }
  }
  for (const p of props) {
    if (muestra.length >= 20) break;
    if (!muestra.find(x => x.id === p.id)) muestra.push(p);
  }

  const results = [];
  const sensitivity = {
    territorial: { abs: 0, count: 0 },
    route_distance: { abs: 0, count: 0 },
    access_gate: { abs: 0, count: 0 },
    water: { abs: 0, count: 0 },
    electricity: { abs: 0, count: 0 },
    topography: { abs: 0, count: 0 },
    tourism: { abs: 0, count: 0 },
    nature: { abs: 0, count: 0 },
    seasonal: { abs: 0, count: 0 },
    nipas_calibration: { abs: 0, count: 0 }
  };

  for (const p of muestra) {
    const meta = p.metadata || {};
    const s = meta.tasador_entrada || {};
    const area = n(p.superficie_m2);
    
    let majorDistance = 0, communeDistance = 0, tourismLevel = text(s.tourism), nearestCity = null, distanceMeta = null;

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
    if (!majorDistance) { majorDistance = n(s.major_city_distance ?? s.distanceKm); communeDistance = communeDistance || n(s.commune_distance); }

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

    const res = TPLLandEngine.calculate(input);
    if (!res || res.error) {
      console.log(`Skipped ${p.id} due to engine error`);
      continue;
    }

    const adjs = res.adjustments || [];
    const getAdj = (keys) => {
      let pct = 0, amount = 0;
      for (const a of adjs) {
        if (keys.includes(a.key)) { pct += a.pct; amount += a.amount; }
      }
      return { pct, amount };
    };

    const base = res.base;
    const territorialMulti = res.territorialBlend.multiplier;
    const territorialImpact = (territorialMulti - 1) * base;
    const routeAdj = getAdj(['route']);
    const accessAdj = getAdj(['gate', 'condominium', 'fence']);
    const waterAdj = getAdj(['water']);
    const elecAdj = getAdj(['electricity']);
    const topoAdj = getAdj(['topography']);
    const tourismAdj = getAdj(['tourism']);
    const natureAdj = getAdj(['river', 'stream', 'spring', 'lake', 'thermal']);
    
    // Seasonal factor (aprox 0.83 -> -17%)
    const technicalBase = res.valorTplTasadorBase;
    const seasonalImpact = (0.83 - 1) * technicalBase;
    
    // Calibration factor
    const calibrationFactor = res.calibration.factor;
    const calibPre = technicalBase * 0.83;
    const nipasImpact = (calibrationFactor - 1) * calibPre;

    // Track for sensitivity
    const track = (key, amt) => { if (amt !== 0) { sensitivity[key].abs += Math.abs(amt); sensitivity[key].count++; } };
    track('territorial', territorialImpact);
    track('route_distance', routeAdj.amount);
    track('access_gate', accessAdj.amount);
    track('water', waterAdj.amount);
    track('electricity', elecAdj.amount);
    track('topography', topoAdj.amount);
    track('tourism', tourismAdj.amount);
    track('nature', natureAdj.amount);
    track('seasonal', seasonalImpact);
    track('nipas_calibration', nipasImpact);

    results.push({
      id: p.id, comuna: p.comuna, area, base, territorialImpact, routeAdj, accessAdj, waterAdj, elecAdj, topoAdj,
      tourismAdj, natureAdj, seasonalImpact, nipasImpact, final: res.valorFinal
    });
    
    await delay(100);
  }

  // --- WRITE TPL-TASADOR-V2-DESCOMPOSICION.md ---
  let mdDesc = `# TPL Tasador V2 - Descomposición de Valor (20 Propiedades)\n\n`;
  for (const r of results) {
    mdDesc += `### Propiedad: ${r.id.split('-')[0]}... (${r.comuna} - ${r.area} m2)\n`;
    mdDesc += `- **Valor Base (Superficie)**: $${r.base.toLocaleString('es-CL')}\n`;
    mdDesc += `- **Ajuste Territorial (Polos)**: $${r.territorialImpact.toLocaleString('es-CL')} (${((r.territorialImpact/r.base)*100).toFixed(1)}%)\n`;
    mdDesc += `- **Ajuste Distancia Ruta**: $${r.routeAdj.amount.toLocaleString('es-CL')} (${(r.routeAdj.pct*100).toFixed(1)}%)\n`;
    mdDesc += `- **Ajuste Acceso/Cierres**: $${r.accessAdj.amount.toLocaleString('es-CL')} (${(r.accessAdj.pct*100).toFixed(1)}%)\n`;
    mdDesc += `- **Ajuste Agua**: $${r.waterAdj.amount.toLocaleString('es-CL')} (${(r.waterAdj.pct*100).toFixed(1)}%)\n`;
    mdDesc += `- **Ajuste Electricidad**: $${r.elecAdj.amount.toLocaleString('es-CL')} (${(r.elecAdj.pct*100).toFixed(1)}%)\n`;
    mdDesc += `- **Ajuste Topografía**: $${r.topoAdj.amount.toLocaleString('es-CL')} (${(r.topoAdj.pct*100).toFixed(1)}%)\n`;
    mdDesc += `- **Ajuste Turismo**: $${r.tourismAdj.amount.toLocaleString('es-CL')} (${(r.tourismAdj.pct*100).toFixed(1)}%)\n`;
    mdDesc += `- **Ajuste Naturaleza**: $${r.natureAdj.amount.toLocaleString('es-CL')} (${(r.natureAdj.pct*100).toFixed(1)}%)\n`;
    mdDesc += `- **Factor Estacional (-17%)**: $${r.seasonalImpact.toLocaleString('es-CL')}\n`;
    mdDesc += `- **Calibración Ñipas**: $${r.nipasImpact.toLocaleString('es-CL')}\n`;
    mdDesc += `- **Valor Final**: **$${r.final.toLocaleString('es-CL')}**\n\n`;
  }
  fs.writeFileSync('TPL-TASADOR-V2-DESCOMPOSICION.md', mdDesc);

  // --- WRITE TPL-TASADOR-V2-SENSIBILIDAD.md ---
  let mdSens = `# TPL Tasador V2 - Ranking de Sensibilidad de Factores\n\n`;
  mdSens += `Este reporte identifica qué parámetros tienen mayor peso absoluto en la variación de las propiedades y explican la tendencia del -22% de la muestra general.\n\n`;
  
  const ranking = Object.keys(sensitivity).map(k => ({
    key: k,
    avgAbsImpact: sensitivity[k].count > 0 ? sensitivity[k].abs / sensitivity[k].count : 0,
    occurrences: sensitivity[k].count
  })).sort((a,b) => b.avgAbsImpact - a.avgAbsImpact);

  mdSens += `| Ranking | Componente / Ajuste | Impacto Absoluto Promedio | Ocurrencias en Muestra |\n`;
  mdSens += `|---|---|---|---|\n`;
  let rank = 1;
  for (const r of ranking) {
    mdSens += `| ${rank++} | ${r.key} | $${Math.round(r.avgAbsImpact).toLocaleString('es-CL')} | ${r.occurrences}/20 |\n`;
  }
  
  mdSens += `\n## Conclusión de Sensibilidad\n`;
  const highest = ranking[0];
  const second = ranking[1];
  mdSens += `El factor con mayor sensibilidad que explica el ajuste agresivo del motor es **${highest.key}** con un impacto absoluto promedio de $${Math.round(highest.avgAbsImpact).toLocaleString('es-CL')} CLP, seguido por **${second.key}**. `;
  mdSens += `Esto indica que para corregir el -22% sin desestabilizar el modelo, se debe revisar la ponderación de **${highest.key}**.\n`;
  fs.writeFileSync('TPL-TASADOR-V2-SENSIBILIDAD.md', mdSens);

  // --- WRITE TPL-TASADOR-V2-CALIBRACION-ÑIPAS.md ---
  let mdCal = `# TPL Tasador V2 - Calibración Ñipas (Anchor)\n\n`;
  mdCal += `El modelo utiliza un ancla de valor sobre la comuna de Ñipas. Todo el valor técnico se multiplica por el factor de calibración para llevarlo a precios reales de mercado.\n\n`;
  
  const nipasProp = results.find(x => x.comuna === 'Ñipas');
  if (nipasProp) {
    mdCal += `## Muestra Ancla (Ñipas)\n`;
    mdCal += `- ID: ${nipasProp.id}\n`;
    mdCal += `- Factor de calibración aplicado: ${(1 + (nipasProp.nipasImpact / (nipasProp.final - nipasProp.nipasImpact))).toFixed(4)}x\n`;
    mdCal += `- Ajuste absoluto Ñipas: $${nipasProp.nipasImpact.toLocaleString('es-CL')}\n`;
    mdCal += `- El valor final para Ñipas en la simulación resultó en **$${nipasProp.final.toLocaleString('es-CL')}**\n\n`;
  }
  
  mdCal += `### Análisis del Ancla\n`;
  mdCal += `Al multiplicar el valor ajustado por este factor constante, el modelo fuerza una escala relativa. Si Ñipas tiene un valor real de mercado muy inferior a lo que el motor técnico estima, el factor de calibración será menor a 1, arrastrando a todas las demás propiedades a la baja (que es lo que produce gran parte del -22%).\n`;
  
  fs.writeFileSync('TPL-TASADOR-V2-CALIBRACION-ÑIPAS.md', mdCal);

  console.log('Descomposición y análisis generados.');
}

runDescomposicion();
