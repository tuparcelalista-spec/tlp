// ═══════════════════════════════════════════════════════════════════════════════
// Simulación V2.3.1 Recalibrado – Nuevas bandas + Sin factor Ñipas + Distancias progresivas
// ═══════════════════════════════════════════════════════════════════════════════
// Compara: Valor Publicado vs Motor Recalibrado V2.3.1
// Incluye datos CONIT (tiempos estimados a ciudad principal y cabecera comunal)
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { TPLLandEngine } from '../supabase/functions/_shared/tpl-land-engine.js';
import { TPLLandEngineV231 } from '../supabase/functions/_shared/tpl-land-engine-v231.js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('ERROR: No se encontró SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const text = (v) => String(v ?? '').trim();
const fmt = (v) => `$${Math.round(v).toLocaleString('es-CL')}`;
const fmtN = (v) => Math.round(v).toLocaleString('es-CL');
const roundPrice = (v) => Math.round(Number(v || 0) / 10000) * 10000;

console.log(`\n═══════════════════════════════════════════════════`);
console.log(`  SIMULACIÓN V2.3.1 RECALIBRADO`);
console.log(`  Motor: ${TPLLandEngine.ENGINE_VERSION}`);
console.log(`  Factor Calibración: ${TPLLandEngine.CALIBRATION_FACTOR} (debe ser 1)`);
console.log(`═══════════════════════════════════════════════════\n`);

async function runSimulation() {
  // 1. Obtener propiedades
  const { data: propiedades, error: propError } = await supabase
    .from('tpl_propiedades')
    .select('*')
    .order('created_at', { ascending: true });

  if (propError) {
    console.error('Error al obtener propiedades:', propError);
    process.exit(1);
  }

  console.log(`Propiedades encontradas: ${propiedades.length}\n`);

  // 2. Obtener referencias comunales
  const { data: referenciasRaw } = await supabase
    .from('tpl_referencias_comunales')
    .select('*');

  const referenciasMap = {};
  for (const r of referenciasRaw || []) {
    referenciasMap[text(r.comuna).toLowerCase()] = r;
  }

  const rows = [];
  const diffsPct = [];
  const absDiffsPct = [];

  for (const p of propiedades) {
    try {
      const meta = p.metadata || {};
      const s = meta.tasador_entrada || {};
      const area = n(p.superficie_m2);

      let majorDistance = 0, communeDistance = 0, tourismLevel = text(s.tourism);
      let nearestCity = null, distanceMeta = null;
      let hubNombre = '', hubTipo = '', comunaNombre = '';

      // Resolver CONIT
      if (p.lat != null && p.lng != null) {
        const { data: geoint } = await supabase.rpc('tpl_geoint_resolver_propiedad_v1', {
          p_propiedad_id: p.id, p_forzar: false
        });
        if (geoint?.ok) {
          distanceMeta = geoint;
          majorDistance = n(geoint.hub_efectivo?.distance_km);
          communeDistance = n(geoint.centro_comunal?.distance_km);
          tourismLevel = text(geoint.destino_turistico?.nivel || tourismLevel);
          nearestCity = geoint.hub_efectivo
            ? { name: geoint.hub_efectivo.nombre, category: geoint.hub_efectivo.tipo }
            : null;
          hubNombre = geoint.hub_efectivo?.nombre || '';
          hubTipo = geoint.hub_efectivo?.tipo || '';
          comunaNombre = geoint.centro_comunal?.nombre || p.comuna;
        }
      }

      if (!majorDistance) {
        majorDistance = n(s.major_city_distance ?? s.distanceKm);
        communeDistance = communeDistance || n(s.commune_distance);
      }

      if (!area || !majorDistance) continue;

      const input = {
        area, asking: n(p.precio_publicado),
        region: text(p.region), comuna: text(p.comuna),
        location: [p.sector, p.comuna].filter(Boolean).join(', '),
        distanceKm: majorDistance, majorCityDistanceKm: majorDistance,
        communeDistanceKm: communeDistance || null, nearestCity,
        routeDistanceKm: n(s.route_distance ?? p.distancia_ruta_principal_km),
        electricityPoleDistanceM: n(s.electricity_pole_distance),
        access: text(s.access || p.acceso),
        topography: text(s.topography || p.topografia),
        soil: text(s.soil || p.suelo),
        exposure: text(s.exposure || p.exposicion),
        view: text(s.view || p.vista_principal),
        tourism: tourismLevel,
        fireRisk: text(s.fire_risk || s.fireRisk || distanceMeta?.riesgos?.incendio?.nivel),
        floodRisk: text(s.flood_risk || s.floodRisk || distanceMeta?.riesgos?.inundacion?.nivel),
        water: text(s.water || p.agua),
        electricity: text(s.electricity || p.electricidad),
        fencing: text(s.fencing || p.cierre_perimetral),
        gate: text(s.gate || p.porton),
        condominium: text(s.condominium ?? (p.condominio ? 'si' : 'no')),
        vegetation: text(s.vegetation || p.vegetacion),
        nature: Array.isArray(s.nature) ? s.nature : (Array.isArray(p.atributos_naturales) ? p.atributos_naturales : []),
        rol: text(p.rol_situacion)
      };

      // Tiempos estimados CONIT
      const tiempoCiudad = Math.round(majorDistance * 1.2); // min estimados
      const tiempoComuna = Math.round(communeDistance * 1.5);

      const conit = {
        economic_hub_time_mins: tiempoCiudad,
        commune_center_time_mins: tiempoComuna,
        hub_hierarchy: hubTipo || nearestCity?.category || 'Provincial',
        services_time_mins: Math.round(communeDistance * 1.8)
      };

      const market = referenciasMap[text(p.comuna).toLowerCase()] || {};

      // Ejecutar motor recalibrado V2.3.1
      const result = TPLLandEngineV231.calculate(input, { conit, market });
      if (result.error) {
        console.warn(`  ⚠ ${p.id.slice(0,8)} (${p.comuna}): ${result.error}`);
        continue;
      }

      const valorFinal = result.valorFinal;
      const pub = n(p.precio_publicado);
      if (!pub) continue;

      const diffAbs = valorFinal - pub;
      const diffPct = (diffAbs / pub) * 100;

      diffsPct.push(diffPct);
      absDiffsPct.push(Math.abs(diffPct));

      rows.push({
        id: p.id,
        comuna: p.comuna,
        area,
        pub,
        valorFinal,
        diffAbs,
        diffPct,
        pubM2: Math.round(pub / area),
        valM2: Math.round(valorFinal / area),
        hubNombre,
        hubDistKm: majorDistance,
        tiempoCiudad,
        comunaNombre: comunaNombre || p.comuna,
        comunaDistKm: communeDistance,
        tiempoComuna,
        turismo: result.zonaTuristica || tourismLevel || 'sin_categoria',
        indiceComercial: result.indiceComercial || 0,
        territorialMultiplier: result.territorialBlend?.multiplier || 0,
        adjustmentFactor: result.adjustmentFactor || 0
      });

    } catch (err) {
      console.error(`Error procesando ${p.id}:`, err.message);
    }
  }

  if (!rows.length) {
    console.error('No se procesaron propiedades.');
    process.exit(1);
  }

  // ═══ Estadísticas ═══
  const stats = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length;
    return { mean, median, stdDev: Math.sqrt(variance) };
  };

  const st = stats(diffsPct);
  const mape = absDiffsPct.reduce((s, x) => s + x, 0) / absDiffsPct.length;
  const mae = rows.reduce((s, r) => s + Math.abs(r.diffAbs), 0) / rows.length;

  // Por comuna
  const comMap = {};
  for (const r of rows) {
    if (!comMap[r.comuna]) comMap[r.comuna] = [];
    comMap[r.comuna].push(r);
  }

  const comStats = [];
  for (const [c, items] of Object.entries(comMap)) {
    const avgPub = Math.round(items.reduce((s, x) => s + x.pub, 0) / items.length);
    const avgVal = Math.round(items.reduce((s, x) => s + x.valorFinal, 0) / items.length);
    const avgDiff = items.reduce((s, x) => s + x.diffPct, 0) / items.length;
    const avgPubM2 = Math.round(items.reduce((s, x) => s + x.pubM2, 0) / items.length);
    const avgValM2 = Math.round(items.reduce((s, x) => s + x.valM2, 0) / items.length);
    comStats.push({ comuna: c, count: items.length, avgPub, avgVal, avgDiff, avgPubM2, avgValM2 });
  }

  // ═══ Generar MD ═══
  let md = `# Simulación Tasador TPL V2.3.1 Recalibrado\n\n`;
  md += `> Motor: \`${TPLLandEngine.ENGINE_VERSION}\`\n`;
  md += `> Factor de calibración: \`${TPLLandEngine.CALIBRATION_FACTOR}\` (neutro)\n`;
  md += `> Fecha: ${new Date().toISOString().slice(0,10)}\n\n`;

  md += `## Resumen Ejecutivo\n\n`;
  md += `| Métrica | Valor |\n|---|---|\n`;
  md += `| Propiedades simuladas | ${rows.length} |\n`;
  md += `| Error Porcentual Medio (MPE) | ${st.mean.toFixed(1)}% |\n`;
  md += `| Error Abs. Porcentual Medio (MAPE) | ${mape.toFixed(1)}% |\n`;
  md += `| Mediana de Diferencia | ${st.median.toFixed(1)}% |\n`;
  md += `| Desviación Estándar | ${st.stdDev.toFixed(1)}% |\n`;
  md += `| Error Absoluto Medio ($) | ${fmt(mae)} |\n\n`;

  md += `## Tabla Comparativa Completa\n\n`;
  md += `| ID | Comuna | Sup. | Publicado | Tasador V2.3.1 | Dif (%) | $/m² Pub | $/m² Tas | Ciudad | Dist (km) | Tiempo | Cab. Comunal | Dist (km) | Tiempo | Turismo |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    md += `| \`${r.id.slice(0,8)}…\` | ${r.comuna} | ${fmtN(r.area)} m² | ${fmt(r.pub)} | ${fmt(r.valorFinal)} | ${r.diffPct.toFixed(1)}% | ${fmt(r.pubM2)} | ${fmt(r.valM2)} | ${r.hubNombre || '—'} | ${r.hubDistKm.toFixed(1)} | ${r.tiempoCiudad} min | ${r.comunaNombre} | ${r.comunaDistKm.toFixed(1)} | ${r.tiempoComuna} min | ${r.turismo} |\n`;
  }

  md += `\n## Resumen por Comuna\n\n`;
  md += `| Comuna | Parcelas | Prom. Publicado | Prom. Tasador | Dif (%) | $/m² Pub | $/m² Tas |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const c of comStats.sort((a, b) => a.avgDiff - b.avgDiff)) {
    md += `| **${c.comuna}** | ${c.count} | ${fmt(c.avgPub)} | ${fmt(c.avgVal)} | ${c.avgDiff.toFixed(1)}% | ${fmt(c.avgPubM2)} | ${fmt(c.avgValM2)} |\n`;
  }

  // Guardar
  fs.writeFileSync('TPL-TASADOR-V231-SIMULACION-33.md', md);

  // CSV
  const csvH = 'ID,Comuna,Superficie,Publicado,Tasador V231,Diferencia $,Diferencia %,M2 Pub,M2 Tas,Ciudad Principal,Dist Ciudad km,Tiempo Ciudad min,Cabecera Comunal,Dist Comuna km,Tiempo Comuna min,Turismo,Indice Comercial\n';
  const csv = csvH + rows.map(r =>
    `${r.id},${r.comuna},${r.area},${r.pub},${r.valorFinal},${r.diffAbs},${r.diffPct.toFixed(2)},${r.pubM2},${r.valM2},${r.hubNombre},${r.hubDistKm.toFixed(1)},${r.tiempoCiudad},${r.comunaNombre},${r.comunaDistKm.toFixed(1)},${r.tiempoComuna},${r.turismo},${r.indiceComercial}`
  ).join('\n');
  fs.writeFileSync('TPL-TASADOR-V231-COMPARACION.csv', csv);

  // Consola
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  RESULTADOS SIMULACIÓN V2.3.1 RECALIBRADO');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Propiedades: ${rows.length}`);
  console.log(`  MPE:  ${st.mean.toFixed(1)}%`);
  console.log(`  MAPE: ${mape.toFixed(1)}%`);
  console.log(`  Mediana: ${st.median.toFixed(1)}%`);
  console.log(`  σ: ${st.stdDev.toFixed(1)}%`);
  console.log(`  MAE: ${fmt(mae)}`);
  console.log('');
  console.log('  Por Comuna:');
  for (const c of comStats.sort((a, b) => a.avgDiff - b.avgDiff)) {
    console.log(`    ${c.comuna.padEnd(14)} ${c.count} parcelas  ${c.avgDiff.toFixed(1).padStart(7)}%  Pub: ${fmt(c.avgPub).padStart(15)}  Tas: ${fmt(c.avgVal).padStart(15)}`);
  }
  console.log('═══════════════════════════════════════════════════');
  console.log('Archivos: TPL-TASADOR-V231-SIMULACION-33.md, TPL-TASADOR-V231-COMPARACION.csv\n');
}

runSimulation();
