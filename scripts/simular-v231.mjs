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

async function runSimulation() {
  console.log('=== INICIANDO SIMULACIÓN COMPARATIVA V2.3 vs V2.3.1 ===');
  
  // 1. Obtener todas las propiedades
  const { data: propiedades, error: propError } = await supabase
    .from('tpl_propiedades')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (propError) {
    console.error('Error al obtener propiedades:', propError);
    process.exit(1);
  }
  
  console.log(`Se encontraron ${propiedades.length} propiedades.`);

  // 2. Obtener todas las referencias comunales
  const { data: referenciasRaw, error: refError } = await supabase
    .from('tpl_referencias_comunales')
    .select('*');

  if (refError) {
    console.warn('Advertencia: No se pudieron leer referencias comunales de la DB. Usando fallback vacío.', refError.message);
  }

  const referenciasMap = {};
  for (const r of referenciasRaw || []) {
    referenciasMap[text(r.comuna).toLowerCase()] = r;
  }

  const outputRows = [];
  let totalDiffPct = 0;
  let simulatedCount = 0;

  for (const p of propiedades) {
    try {
      const meta = p.metadata || {};
      const s = meta.tasador_entrada || {};
      const area = n(p.superficie_m2);
      
      let majorDistance = 0, communeDistance = 0, tourismLevel = text(s.tourism), nearestCity = null, distanceMeta = null;

      // Intentar resolver contexto territorial
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

      if (!area || !majorDistance) continue; // Saltar propiedades incompletas

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

      // Mockear datos CONIT temporales basados en geodistancia
      const conit = {
        economic_hub_time_mins: Math.round(majorDistance * 1.2),
        commune_center_time_mins: Math.round(communeDistance * 1.5),
        hub_hierarchy: nearestCity?.category || 'Provincial',
        services_time_mins: Math.round(communeDistance * 1.8)
      };

      const market = referenciasMap[text(p.comuna).toLowerCase()] || {};

      // Ejecutar motores
      const r23 = EngineV23.calculate(input);
      const r231 = TPLLandEngineV231.calculate(input, { conit, market });

      if (r23.error || r231.error) continue;

      const val23 = r23.valorFinal;
      const val231 = r231.valorFinal;
      const diffAbs = val231 - val23;
      const diffPct = val23 > 0 ? (diffAbs / val23) * 100 : 0;

      totalDiffPct += Math.abs(diffPct);
      simulatedCount++;

      outputRows.push({
        id: p.id,
        comuna: p.comuna,
        area,
        val23,
        val231,
        diffAbs,
        diffPct: Number(diffPct.toFixed(1)),
        referenciaComunalM2: market.mediana_m2 || 0,
        referenciaComunalTotal: (market.mediana_m2 || 0) * area,
        comparablesCount: market.cantidad_comparables || 0,
        indiceComercial: r231.indiceComercial,
        confianza: r231.nivelConfianza,
        turismo: tourismLevel || 'sin_categoria'
      });

    } catch (err) {
      console.error(`Error procesando propiedad ${p.id}:`, err.message);
    }
  }

  // 3. Generar CSV Comparación
  const csvHeaders = 'ID,Comuna,Superficie (m²),Valor V2.3,Valor V2.3.1,Diferencia Abs,Diferencia Pct,Ref Comunal M2,Ref Comunal Total,Comparables,Indice Comercial,Confianza,Turismo\n';
  const csvContent = csvHeaders + outputRows.map(r => 
    `${r.id},${r.comuna},${r.area},${r.val23},${r.val231},${r.diffAbs},${r.diffPct}%,${r.referenciaComunalM2},${r.referenciaComunalTotal},${r.comparablesCount},${r.indiceComercial},${r.confianza},${r.turismo}`
  ).join('\n');
  fs.writeFileSync('TPL-TASADOR-V231-COMPARACION.csv', csvContent);

  // 4. Generar Reporte MD
  const avgDiff = simulatedCount > 0 ? (totalDiffPct / simulatedCount).toFixed(1) : 0;
  let mdSummary = `# Simulación Comparativa Tasador TPL V2.3 vs V2.3.1\n\n`;
  mdSummary += `## Resumen Ejecutivo\n`;
  mdSummary += `- **Total Propiedades Simuladas**: ${simulatedCount}\n`;
  mdSummary += `- **Desviación Absoluta Promedio**: ${avgDiff}%\n`;
  mdSummary += `- **Criterio de Aprobación (Promedio < ±10%)**: ${avgDiff <= 10 ? '✅ CUMPLIDO' : '❌ NO CUMPLIDO'}\n\n`;
  mdSummary += `## Detalle de Variación\n\n`;
  mdSummary += `| ID | Comuna | Superficie | Valor V2.3 | Valor V2.3.1 | Dif (%) | Ref Comunal | Comparables | Índice Comercial | Confianza | Turismo |\n`;
  mdSummary += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of outputRows) {
    mdSummary += `| \`${r.id.slice(0, 8)}...\` | ${r.comuna} | ${r.area.toLocaleString('es-CL')} m² | $${r.val23.toLocaleString('es-CL')} | $${r.val231.toLocaleString('es-CL')} | ${r.diffPct}% | $${r.referenciaComunalTotal.toLocaleString('es-CL')} | ${r.comparablesCount} | ${r.indiceComercial} | ${r.confianza} | ${r.turismo} |\n`;
  }
  
  fs.writeFileSync('TPL-TASADOR-V231-SIMULACION-33.md', mdSummary);

  console.log('\n=======================================');
  console.log(`SIMULACIÓN FINALIZADA EXPENDIENDO ${simulatedCount} PROPIEDADES.`);
  console.log(`Desviación promedio: ${avgDiff}%`);
  console.log(`Archivos generados: TPL-TASADOR-V231-COMPARACION.csv y TPL-TASADOR-V231-SIMULACION-33.md`);
  console.log('=======================================\n');
}

runSimulation();
