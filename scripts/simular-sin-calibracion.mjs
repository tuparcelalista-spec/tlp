// ═══════════════════════════════════════════════════════════════════════════════
// Simulación Sin Calibración Global Ñipas
// ═══════════════════════════════════════════════════════════════════════════════
// Este script NO modifica el motor oficial.
// Recalcula las 33 propiedades reversando el CALIBRATION_FACTOR para obtener
// el valor que tendría cada parcela sin el multiplicador global de Ñipas.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { TPLLandEngine as EngineV23 } from '../supabase/functions/_shared/tpl-land-engine.js';
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

// Obtener el CALIBRATION_FACTOR actual del motor para poder revertirlo
const CALIBRATION_FACTOR = EngineV23.CALIBRATION_FACTOR;
console.log(`\n═══════════════════════════════════════════════════`);
console.log(`  FACTOR DE CALIBRACIÓN ÑIPAS ACTUAL: ${CALIBRATION_FACTOR}`);
console.log(`  (Cada valor final es multiplicado por ${CALIBRATION_FACTOR.toFixed(8)})`);
console.log(`  Para revertir: dividimos valorFinal / ${CALIBRATION_FACTOR.toFixed(8)}`);
console.log(`═══════════════════════════════════════════════════\n`);

async function runSimulation() {
  console.log('=== SIMULACIÓN SIN CALIBRACIÓN GLOBAL ===');
  console.log('Motor V2.3 original vs Motor V2.3 sin factor Ñipas vs Valor Publicado\n');

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

  const rows = [];
  const diffActualPct = [];    // diff tasador actual vs publicado
  const diffSinCalibPct = [];  // diff sin calibración vs publicado
  const absDiffActualPct = [];
  const absDiffSinCalibPct = [];

  for (const p of propiedades) {
    try {
      const meta = p.metadata || {};
      const s = meta.tasador_entrada || {};
      const area = n(p.superficie_m2);

      let majorDistance = 0, communeDistance = 0, tourismLevel = text(s.tourism);
      let nearestCity = null, distanceMeta = null;

      // Resolver contexto territorial vía CONIT/geoint
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

      // ─── Motor V2.3.1 (con calibración) ───
      const conit = {
        economic_hub_time_mins: Math.round(majorDistance * 1.2),
        commune_center_time_mins: Math.round(communeDistance * 1.5),
        hub_hierarchy: nearestCity?.category || 'Provincial',
        services_time_mins: Math.round(communeDistance * 1.8)
      };
      const r231 = TPLLandEngineV231.calculate(input, { conit, market: {} });
      if (r231.error) continue;

      const valorActual = r231.valorFinal; // Con calibración Ñipas + wrapper V2.3.1

      // ─── Valor SIN calibración global ───
      // El motor aplica: valorFinal = valorPreCalib * CALIBRATION_FACTOR
      // Para revertir: valorSinCalib = valorFinal / CALIBRATION_FACTOR
      // Pero el wrapper V2.3.1 puede añadir ajuste comercial encima.
      // Necesitamos obtener el valor técnico base y recalcular sin factor.
      //
      // Flujo actual del motor:
      //   surfaceBase * territorialMultiplier * adjustmentFactor = technicalPotential
      //   technicalPotential * seasonalFactor = valorPreCalib
      //   valorPreCalib * CALIBRATION_FACTOR = valorFinal (V2.3)
      //   V2.3.1 wrapper puede aplicar ±10% adicional
      //
      // Para simular sin calibración:
      //   valorSinCalib = valorPreCalib (= technicalPotential * seasonalFactor)
      //
      // El motor ya expone: valorTplTasadorBase (= technicalPotential)
      // Entonces: valorSinCalib = valorTplTasadorBase * seasonalFactor

      const valorTecnicoBase = r231.valorTplTasadorBase; // technicalPotential, sin seasonal ni calibración
      const seasonalFactor = 0.83; // RULES.seasonalAdjustmentFactor
      const valorSinCalib = roundPrice(valorTecnicoBase * seasonalFactor);

      // Aplicar el mismo ajuste comercial del wrapper V2.3.1 si lo hubo
      const ajusteComercialPct = r231.ajusteComercialAplicado || 0; // en porcentaje
      const valorSinCalibFinal = roundPrice(valorSinCalib * (1 + ajusteComercialPct / 100));

      const pub = n(p.precio_publicado);
      if (!pub) continue;

      // Diferencias contra valor publicado
      const diffActual = valorActual - pub;
      const diffActualP = (diffActual / pub) * 100;
      const diffSinCalib = valorSinCalibFinal - pub;
      const diffSinCalibP = (diffSinCalib / pub) * 100;

      diffActualPct.push(diffActualP);
      diffSinCalibPct.push(diffSinCalibP);
      absDiffActualPct.push(Math.abs(diffActualP));
      absDiffSinCalibPct.push(Math.abs(diffSinCalibP));

      rows.push({
        id: p.id,
        comuna: p.comuna,
        area,
        pub,
        valorActual,
        valorSinCalib: valorSinCalibFinal,
        diffActualAbs: diffActual,
        diffActualPct: diffActualP,
        diffSinCalibAbs: diffSinCalib,
        diffSinCalibPct: diffSinCalibP,
        pubM2: Math.round(pub / area),
        valActualM2: Math.round(valorActual / area),
        valSinCalibM2: Math.round(valorSinCalibFinal / area),
        turismo: r231.zonaTuristica || 'sin_categoria',
        indiceComercial: r231.indiceComercial,
        territorialMultiplier: r231.territorialBlend?.multiplier || 0,
        adjustmentFactor: r231.adjustmentFactor || 0
      });

    } catch (err) {
      console.error(`Error procesando ${p.id}:`, err.message);
    }
  }

  if (!rows.length) {
    console.error('No se procesaron propiedades.');
    process.exit(1);
  }

  // ═══ Estadísticas Globales ═══

  const stats = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length;
    const stdDev = Math.sqrt(variance);
    return { mean, median, stdDev };
  };

  const statsActual = stats(diffActualPct);
  const statsSinCalib = stats(diffSinCalibPct);
  const mapeActual = absDiffActualPct.reduce((s, x) => s + x, 0) / absDiffActualPct.length;
  const mapeSinCalib = absDiffSinCalibPct.reduce((s, x) => s + x, 0) / absDiffSinCalibPct.length;
  const maeActual = rows.reduce((s, r) => s + Math.abs(r.diffActualAbs), 0) / rows.length;
  const maeSinCalib = rows.reduce((s, r) => s + Math.abs(r.diffSinCalibAbs), 0) / rows.length;

  // ═══ Por Comuna ═══

  const comMap = {};
  for (const r of rows) {
    if (!comMap[r.comuna]) comMap[r.comuna] = [];
    comMap[r.comuna].push(r);
  }

  const comStats = [];
  for (const [c, items] of Object.entries(comMap)) {
    const avgPub = Math.round(items.reduce((s, x) => s + x.pub, 0) / items.length);
    const avgActual = Math.round(items.reduce((s, x) => s + x.valorActual, 0) / items.length);
    const avgSinCalib = Math.round(items.reduce((s, x) => s + x.valorSinCalib, 0) / items.length);
    const avgDiffActual = items.reduce((s, x) => s + x.diffActualPct, 0) / items.length;
    const avgDiffSinCalib = items.reduce((s, x) => s + x.diffSinCalibPct, 0) / items.length;
    const avgPubM2 = Math.round(items.reduce((s, x) => s + x.pubM2, 0) / items.length);
    const avgValM2 = Math.round(items.reduce((s, x) => s + x.valSinCalibM2, 0) / items.length);

    comStats.push({
      comuna: c, count: items.length,
      avgPub, avgActual, avgSinCalib,
      avgDiffActual, avgDiffSinCalib,
      avgPubM2, avgValM2,
      mejora: Math.abs(avgDiffSinCalib) < Math.abs(avgDiffActual) ? '✅ Mejora' : '❌ Empeora'
    });
  }

  // ═══ Generar Reporte MD ═══

  let md = `# Simulación Sin Calibración Global (Ñipas)\n\n`;
  md += `> **IMPORTANTE**: Este reporte es una simulación. No se ha modificado el motor oficial.\n\n`;
  md += `## Factor de Calibración Actual\n`;
  md += `- **CALIBRATION_FACTOR**: \`${CALIBRATION_FACTOR.toFixed(8)}\`\n`;
  md += `- **Efecto**: Multiplica todos los valores finales por ~${(CALIBRATION_FACTOR * 100).toFixed(1)}% (reduce el valor un ~${((1 - CALIBRATION_FACTOR) * 100).toFixed(1)}%)\n`;
  md += `- **Origen**: Ancla de Ñipas (parcela 5.000 m² a 2,48 km = $25.000.000 CLP)\n\n`;

  md += `## Resumen Comparativo Global\n\n`;
  md += `| Métrica | Con Calibración Ñipas | Sin Calibración | ¿Mejora? |\n`;
  md += `|---|---|---|---|\n`;
  md += `| **Error Porcentual Medio (MPE)** | ${statsActual.mean.toFixed(1)}% | ${statsSinCalib.mean.toFixed(1)}% | ${Math.abs(statsSinCalib.mean) < Math.abs(statsActual.mean) ? '✅' : '❌'} |\n`;
  md += `| **Error Absoluto Porcentual Medio (MAPE)** | ${mapeActual.toFixed(1)}% | ${mapeSinCalib.toFixed(1)}% | ${mapeSinCalib < mapeActual ? '✅' : '❌'} |\n`;
  md += `| **Mediana de Diferencia** | ${statsActual.median.toFixed(1)}% | ${statsSinCalib.median.toFixed(1)}% | ${Math.abs(statsSinCalib.median) < Math.abs(statsActual.median) ? '✅' : '❌'} |\n`;
  md += `| **Desviación Estándar** | ${statsActual.stdDev.toFixed(1)}% | ${statsSinCalib.stdDev.toFixed(1)}% | ${statsSinCalib.stdDev < statsActual.stdDev ? '✅' : '❌'} |\n`;
  md += `| **Error Absoluto Medio ($)** | ${fmt(maeActual)} | ${fmt(maeSinCalib)} | ${maeSinCalib < maeActual ? '✅' : '❌'} |\n\n`;

  // Veredicto
  const metricsImproved = [
    Math.abs(statsSinCalib.mean) < Math.abs(statsActual.mean),
    mapeSinCalib < mapeActual,
    Math.abs(statsSinCalib.median) < Math.abs(statsActual.median),
    statsSinCalib.stdDev < statsActual.stdDev,
    maeSinCalib < maeActual
  ].filter(Boolean).length;

  md += `### Veredicto\n`;
  if (metricsImproved >= 3) {
    md += `> [!TIP]\n> **${metricsImproved}/5 métricas mejoran** al eliminar la calibración global. Se recomienda proceder con la eliminación.\n\n`;
  } else if (metricsImproved >= 2) {
    md += `> [!NOTE]\n> **${metricsImproved}/5 métricas mejoran**. El resultado es mixto. Se recomienda analizar por comuna antes de decidir.\n\n`;
  } else {
    md += `> [!WARNING]\n> **${metricsImproved}/5 métricas mejoran**. La eliminación del factor global no mejora el modelo en su estado actual.\n\n`;
  }

  // ═══ Tabla detallada por propiedad ═══

  md += `## Tabla Comparativa Completa (33 Propiedades)\n\n`;
  md += `| ID | Comuna | Superficie | Valor Publicado | Tasador Actual | Sin Calibración | Dif Actual (%) | Dif Sin Calib (%) | $/m² Publicado | $/m² Sin Calib |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    const mejorActual = Math.abs(r.diffActualPct) < Math.abs(r.diffSinCalibPct);
    md += `| \`${r.id.slice(0, 8)}…\` | ${r.comuna} | ${fmtN(r.area)} m² | ${fmt(r.pub)} | ${fmt(r.valorActual)} | ${fmt(r.valorSinCalib)} | ${r.diffActualPct.toFixed(1)}% | ${r.diffSinCalibPct.toFixed(1)}% ${mejorActual ? '' : '✅'} | ${fmt(r.pubM2)} | ${fmt(r.valSinCalibM2)} |\n`;
  }

  // ═══ Resumen por Comuna ═══

  md += `\n## Resumen por Comuna\n\n`;
  md += `| Comuna | Parcelas | Prom. Publicado | Prom. Actual | Prom. Sin Calib | Dif Actual (%) | Dif Sin Calib (%) | $/m² Pub | $/m² Sin Calib | ¿Mejora? |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const c of comStats.sort((a, b) => a.avgDiffSinCalib - b.avgDiffSinCalib)) {
    md += `| **${c.comuna}** | ${c.count} | ${fmt(c.avgPub)} | ${fmt(c.avgActual)} | ${fmt(c.avgSinCalib)} | ${c.avgDiffActual.toFixed(1)}% | ${c.avgDiffSinCalib.toFixed(1)}% | ${fmt(c.avgPubM2)} | ${fmt(c.avgValM2)} | ${c.mejora} |\n`;
  }

  // ═══ Análisis de Comunas Clave ═══

  md += `\n## Análisis de Comunas Clave\n\n`;
  const targetCommunas = ['Pucón', 'Quillón', 'Yumbel', 'Florida'];
  for (const tc of targetCommunas) {
    const items = rows.filter(r => r.comuna === tc);
    if (!items.length) continue;
    const cs = comStats.find(c => c.comuna === tc);
    md += `### ${tc} (${items.length} parcelas)\n`;
    md += `- Promedio publicado: ${fmt(cs.avgPub)}\n`;
    md += `- Promedio tasador actual: ${fmt(cs.avgActual)} (${cs.avgDiffActual.toFixed(1)}%)\n`;
    md += `- Promedio sin calibración: ${fmt(cs.avgSinCalib)} (${cs.avgDiffSinCalib.toFixed(1)}%)\n`;
    md += `- $/m² publicado: ${fmt(cs.avgPubM2)} | $/m² sin calibración: ${fmt(cs.avgValM2)}\n`;
    md += `- Resultado: ${cs.mejora}\n\n`;
  }

  // ═══ Criterios de Aprobación ═══

  md += `## Evaluación de Criterios de Aprobación\n\n`;
  md += `| Criterio | Resultado |\n`;
  md += `|---|---|\n`;

  const errorPromMejora = Math.abs(statsSinCalib.mean) < Math.abs(statsActual.mean);
  md += `| Error promedio disminuye | ${errorPromMejora ? '✅ SÍ' : '❌ NO'} (${statsActual.mean.toFixed(1)}% → ${statsSinCalib.mean.toFixed(1)}%) |\n`;

  const comunasMejoran = comStats.filter(c => Math.abs(c.avgDiffSinCalib) < Math.abs(c.avgDiffActual)).length;
  const comunasTotal = comStats.length;
  md += `| Diferencias por comuna se reducen | ${comunasMejoran > comunasTotal / 2 ? '✅ SÍ' : '❌ NO'} (${comunasMejoran}/${comunasTotal} comunas mejoran) |\n`;

  const keyComunas = targetCommunas.map(tc => {
    const cs = comStats.find(c => c.comuna === tc);
    return cs ? { comuna: tc, mejora: cs.mejora.includes('✅') } : null;
  }).filter(Boolean);
  const keyMejoran = keyComunas.filter(k => k.mejora).length;
  md += `| Pucón, Quillón, Yumbel, Florida coherentes | ${keyMejoran >= 3 ? '✅ SÍ' : '❌ NO'} (${keyComunas.map(k => `${k.comuna}: ${k.mejora ? '✅' : '❌'}`).join(', ')}) |\n`;

  const esEstable = statsSinCalib.stdDev < statsActual.stdDev * 2;
  md += `| Modelo estable | ${esEstable ? '✅ SÍ' : '❌ NO'} (σ: ${statsActual.stdDev.toFixed(1)}% → ${statsSinCalib.stdDev.toFixed(1)}%) |\n`;

  md += `\n### Decisión Recomendada\n\n`;
  const allCriteriaPass = errorPromMejora && (comunasMejoran > comunasTotal / 2) && (keyMejoran >= 3) && esEstable;
  if (allCriteriaPass) {
    md += `> [!TIP]\n> **TODOS los criterios se cumplen.** Se recomienda proceder con la eliminación del factor global de Ñipas.\n`;
  } else {
    md += `> [!IMPORTANT]\n> **No todos los criterios se cumplen.** Se recomienda revisar los resultados antes de proceder.\n`;
    md += `> Criterios cumplidos: ${[errorPromMejora, comunasMejoran > comunasTotal / 2, keyMejoran >= 3, esEstable].filter(Boolean).length}/4\n`;
  }

  // Guardar archivos
  fs.writeFileSync('SIMULACION-SIN-CALIBRACION.md', md);

  // CSV
  const csvHeaders = 'ID,Comuna,Superficie,Valor Publicado,Valor Tasador Actual,Valor Sin Calibracion,Dif Actual ($),Dif Actual (%),Dif Sin Calib ($),Dif Sin Calib (%),M2 Publicado,M2 Actual,M2 Sin Calib,Turismo,Indice Comercial\n';
  const csvContent = csvHeaders + rows.map(r =>
    `${r.id},${r.comuna},${r.area},${r.pub},${r.valorActual},${r.valorSinCalib},${r.diffActualAbs},${r.diffActualPct.toFixed(2)},${r.diffSinCalibAbs},${r.diffSinCalibPct.toFixed(2)},${r.pubM2},${r.valActualM2},${r.valSinCalibM2},${r.turismo},${r.indiceComercial}`
  ).join('\n');
  fs.writeFileSync('SIMULACION-SIN-CALIBRACION.csv', csvContent);

  // Resumen en consola
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  RESULTADOS DE LA SIMULACIÓN');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Propiedades simuladas: ${rows.length}`);
  console.log(`  `);
  console.log(`  CON CALIBRACIÓN ÑIPAS:`);
  console.log(`    MPE:  ${statsActual.mean.toFixed(1)}%`);
  console.log(`    MAPE: ${mapeActual.toFixed(1)}%`);
  console.log(`    Mediana: ${statsActual.median.toFixed(1)}%`);
  console.log(`    σ: ${statsActual.stdDev.toFixed(1)}%`);
  console.log(`  `);
  console.log(`  SIN CALIBRACIÓN GLOBAL:`);
  console.log(`    MPE:  ${statsSinCalib.mean.toFixed(1)}%`);
  console.log(`    MAPE: ${mapeSinCalib.toFixed(1)}%`);
  console.log(`    Mediana: ${statsSinCalib.median.toFixed(1)}%`);
  console.log(`    σ: ${statsSinCalib.stdDev.toFixed(1)}%`);
  console.log(`  `);
  console.log(`  Comunas que mejoran: ${comunasMejoran}/${comunasTotal}`);
  console.log(`  Criterios cumplidos: ${[errorPromMejora, comunasMejoran > comunasTotal / 2, keyMejoran >= 3, esEstable].filter(Boolean).length}/4`);
  console.log(`═══════════════════════════════════════════════════`);
  console.log(`\nArchivos generados:`);
  console.log(`  - SIMULACION-SIN-CALIBRACION.md`);
  console.log(`  - SIMULACION-SIN-CALIBRACION.csv`);
  console.log('');
}

runSimulation();
