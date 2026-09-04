import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { TPLLandEngine } from '../supabase/functions/_shared/tpl-land-engine.js';

dotenv.config({ path: '.env.local' });

const isDryRun = process.argv.includes('--dry-run');

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  if (isDryRun) {
    supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';
  } else {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definido en .env.local');
    process.exit(1);
  }
}

const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const text = (v) => String(v ?? '').trim();

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function performBackup() {
  console.log('Iniciando respaldo de tpl_tasaciones...');
  
  if (!fs.existsSync('backups')) {
    fs.mkdirSync('backups');
  }

  let allTasaciones = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await admin
      .from('tpl_tasaciones')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      throw new Error(`Fallo de red o permisos al extraer tasaciones: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    allTasaciones = allTasaciones.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  
  console.log(`Se extrajeron ${allTasaciones.length} registros para respaldo.`);
  
  if (allTasaciones.length === 0) {
    console.log('No hay registros previos para respaldar, continuando...');
    return;
  }
  
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  
  const csvPath = `backups/tpl_tasaciones_snapshot.csv`;
  const sqlPath = `backups/tpl_tasaciones_backup_${timestamp}.sql`;
  
  // Escribir CSV
  const keys = Object.keys(allTasaciones[0]);
  let csv = keys.join(',') + '\n';
  for (const row of allTasaciones) {
    csv += keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return val;
    }).join(',') + '\n';
  }
  fs.writeFileSync(csvPath, csv);
  
  // Escribir SQL
  let sql = `-- Respaldo tpl_tasaciones - ${now.toISOString()}\n`;
  for (const row of allTasaciones) {
    const cols = keys.join(', ');
    const vals = keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return val;
    }).join(', ');
    sql += `INSERT INTO tpl_tasaciones (${cols}) VALUES (${vals});\n`;
  }
  fs.writeFileSync(sqlPath, sql);
  
  console.log(`Respaldo completado exitosamente: ${csvPath} y ${sqlPath}`);
}

async function runBatchMassRecalculation() {
  console.log(`\n=== INICIANDO RECÁLCULO MASIVO TPL TASADOR V2.3 ===`);
  if (isDryRun) {
    console.log(`⚠️ MODO SIMULACIÓN (--dry-run) ACTIVADO: No se insertarán registros en la base de datos.\n`);
  } else {
    try {
      await performBackup();
    } catch (err) {
      console.error(`\n[ABORTADO] Fallo crítico durante el respaldo. No se realizarán inserciones.`);
      console.error(err);
      process.exit(1);
    }
  }

  const startTime = Date.now();
  
  const { data: propiedades, error: fetchError } = await admin
    .from('tpl_propiedades')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (fetchError) {
    console.error('Error obteniendo propiedades:', fetchError);
    process.exit(1);
  }
  
  console.log(`\nSe encontraron ${propiedades.length} propiedades para procesar.`);
  
  const BATCH_SIZE = 50;
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalErrors = 0;
  let globalTotalVal = 0;
  const globalCommunes = {};
  const errorsList = [];

  for (let i = 0; i < propiedades.length; i += BATCH_SIZE) {
    const batch = propiedades.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`\nProcesando lote ${batchNumber}... (${i} a ${i + batch.length - 1})`);
    
    const insertBatch = [];
    const batchCommunes = {};
    
    for (const p of batch) {
      totalProcessed++;
      try {
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

        if (!majorDistance) {
          majorDistance = n(s.major_city_distance ?? s.distanceKm);
          communeDistance = communeDistance || n(s.commune_distance);
        }

        if (!area || !majorDistance || !text(p.region) || !text(p.comuna)) {
          throw new Error(`Faltan antecedentes base para procesar.`);
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

        const result = TPLLandEngine.calculate(input);
        if (result?.error) throw new Error(result.error);
        
        const total = Math.round(n(result.valorFinal || result.valorTplTasador));
        if (!total) throw new Error('MOTOR_SIN_VALOR');

        insertBatch.push({
          propiedad_id: p.id,
          tipo: 'precisa',
          superficie_m2: area,
          precio_publicado: n(p.precio_publicado) || null,
          valor_tpl_total: total,
          valor_tpl_m2: Math.round(total / area),
          referencia_comunal_m2: n(result.marketReference?.medianM2) || null,
          diferencia_publicado_vs_tpl_pct: result.priceAnalysis?.priceVsTplPct ?? null,
          clasificacion: result.priceAnalysis?.classification || null,
          es_oportunidad: Boolean(result.priceAnalysis?.opportunity),
          factores: result.adjustments || [],
          entrada: input,
          resultado: result,
          version_motor: 'tpl-land-engine-v2.3-unified',
          metadata: { origen: 'recalculo_masivo_v23' } // Trazabilidad e Idempotencia
        });

        // Track stats for batch
        if (!batchCommunes[p.comuna]) batchCommunes[p.comuna] = { count: 0, totalVal: 0 };
        batchCommunes[p.comuna].count++;
        batchCommunes[p.comuna].totalVal += total;
        
        if (!globalCommunes[p.comuna]) globalCommunes[p.comuna] = { count: 0, totalVal: 0 };
        globalCommunes[p.comuna].count++;
        globalCommunes[p.comuna].totalVal += total;
        globalTotalVal += total;

      } catch (err) {
        totalErrors++;
        errorsList.push({ id: p.id, comuna: p.comuna, msg: err.message });
        console.error(`  [ERROR] ${p.id} (${p.comuna}): ${err.message}`);
      }
    }
    
    // Inserción transaccional atómica del lote
    if (insertBatch.length > 0) {
      if (!isDryRun) {
        const { error: insertError } = await admin.from('tpl_tasaciones').insert(insertBatch);
        if (insertError) {
          console.error(`  ❌ ERROR TRANSACCIONAL EN LOTE ${batchNumber}:`, insertError.message);
          totalErrors += insertBatch.length;
          // Rollback implicito, continuamos con el siguiente lote
        } else {
          console.log(`  ✅ Lote ${batchNumber} insertado (${insertBatch.length} propiedades).`);
          totalInserted += insertBatch.length;
        }
      } else {
        console.log(`  ✅ [SIMULADO] Lote ${batchNumber} procesado (${insertBatch.length} propiedades listas para inserción).`);
        totalInserted += insertBatch.length; // para metricas
      }
    }

    // Reporte del lote
    for (const [c, stats] of Object.entries(batchCommunes)) {
      console.log(`    - ${c}: ${stats.count} parcelas, Promedio $${Math.round(stats.totalVal / stats.count).toLocaleString('es-CL')}`);
    }

    await delay(300); // Rate limits
  }

  const durationMs = Date.now() - startTime;
  const durationMin = (durationMs / 60000).toFixed(2);
  const completionPct = ((totalProcessed / propiedades.length) * 100).toFixed(1);
  const avgVal = totalInserted > 0 ? Math.round(globalTotalVal / totalInserted) : 0;
  
  let communesSummary = '';
  for (const [c, stats] of Object.entries(globalCommunes)) {
    communesSummary += `- **${c}**: ${stats.count} parcelas, Promedio $${Math.round(stats.totalVal / stats.count).toLocaleString('es-CL')}\n`;
  }
  
  // Guardar resumen
  const mdSummary = `# Resumen de Ejecución: Recálculo Histórico Masivo V2.3

## Métricas Globales
- **Modo**: ${isDryRun ? 'Simulación (--dry-run)' : 'Producción (Transaccional Real)'}
- **Propiedades Totales**: ${propiedades.length}
- **Propiedades Procesadas**: ${totalProcessed} (${completionPct}%)
- **Tasaciones ${isDryRun ? 'Calculadas' : 'Insertadas exitosamente'}**: ${totalInserted}
- **Promedio valorFinal Global**: $${avgVal.toLocaleString('es-CL')}
- **Propiedades con Error u Omitidas**: ${totalErrors}
- **Tiempo Total de Ejecución**: ${durationMin} minutos

## Resumen por Comunas
${communesSummary}

## Lista de Errores (Omitidas por falta de antecedentes)
${errorsList.length === 0 ? '- Ningún error detectado.' : errorsList.map(e => `- \`${e.id}\` (${e.comuna}): ${e.msg}`).join('\n')}

## Validaciones Posteriores
Este proceso llama automáticamente a los scripts de verificación de sincronización del CRM y análisis de discrepancias (si se ejecuta en Producción).
`;
  
  fs.writeFileSync('TPL-TASADOR-V2-RESUMEN-EJECUCION.md', mdSummary);
  
  console.log('\n=======================================');
  console.log(`PROCESO COMPLETO EN ${durationMin} MINUTOS.`);
  console.log(`Resumen guardado en TPL-TASADOR-V2-RESUMEN-EJECUCION.md`);
  console.log('=======================================\n');

  if (!isDryRun) {
    console.log('Iniciando validación de sincronización CRM y generación de discrepancias...');
    try {
      execSync('node scripts/verificar-sincronizacion-crm.mjs', { stdio: 'inherit' });
      execSync('node scripts/generar-discrepancias.mjs', { stdio: 'inherit' });
    } catch (e) {
      console.error('Error durante validaciones posteriores:', e.message);
    }
  }
}

runBatchMassRecalculation();
