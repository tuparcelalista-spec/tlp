#!/usr/bin/env node
/**
 * limpiar-scripts-legacy.mjs
 *
 * QUE HACE: mueve (nunca borra, usa fs.renameSync) 135 archivos sueltos de
 * scripts/ -- parches puntuales ya corridos, bookmarklets, y diagnosticos de
 * una sola vez -- a scripts/archive-legacy/, dejando en scripts/ SOLO los
 * archivos que están vivos hoy.
 *
 * COMO SE ARMÓ ESTA LISTA (a diferencia de limpiar-raiz-legacy.mjs, aquí SÍ
 * se verificó con más cuidado porque scripts/ mezcla utilidades reales con
 * parches puntuales, cosa que la raíz del proyecto no hacía):
 *
 *   1) Se grepeó TODO scripts/ buscando require('./...')/import ... from
 *      './...' entre archivos. Solo aparecieron 3 casos:
 *        - simular-v24.mjs importa ./tpl-land-engine-v24-sim.js (real,
 *          los dos se dejan intactos).
 *        - test-tasador-script.mjs importa ./api/tasador.js (una ruta que
 *          NO existe dentro de scripts/ -- ya estaba roto antes de este
 *          script, no depende de nada real).
 *        - test-import.mjs importa una ruta de frontend-v2/ (sonda de
 *          prueba puntual, nada depende de él).
 *   2) Se grepeó execSync/spawn/child_process para pescar orquestadores que
 *      invocan otro script como subproceso. Se encontró que
 *      recalcular-todas-las-propiedades.mjs llama por execSync a
 *      "node scripts/verificar-sincronizacion-crm.mjs" y a
 *      "node scripts/generar-discrepancias.mjs" -- ese trío completo, más
 *      el resto de la familia de calibración del tasador v23/v24/v231 con
 *      la que comparte lógica y con la que está documentado en
 *      documentacion/TPL-TASADOR-V2-... y TPL-TASADOR-V231-... (descomposicion.mjs,
 *      evaluar-cobertura-v24.mjs, comparar-publicados.mjs, get-muestra.mjs,
 *      simular-*.mjs), se dejó FUERA de esta limpieza por completo -- por
 *      las dudas, aunque hoy no se esté corriendo, nada de esa familia se
 *      mueve.
 *   3) Se leyó el contenido completo (no solo el nombre) de los archivos
 *      con nombre ambiguo/genérico antes de decidir: security-audit.mjs
 *      resultó ser una herramienta real y reutilizable (escanea todo el
 *      repo buscando eval/innerHTML/claves de service-role expuestas) --
 *      se dejó FUERA. audit.cjs, fetch_supabase.cjs, count.cjs, inspect.cjs
 *      y check_tasaciones.mjs resultaron ser diagnósticos de una sola vez
 *      (uno escribe a una carpeta de OTRA herramienta en C:\Users\...,
 *      otro tiene una UUID de una propiedad específica harcodeada) -- esos
 *      SÍ se archivan.
 *   4) Se confirmó que scripts/package.json declara "main":
 *      "tpl-land-engine-v24-sim.js" -- otra razón para no tocar ese archivo.
 *   5) Los 6 scripts de sincronización/recálculo ya documentados como
 *      vigentes (sincronizar-catalogo-publico.mjs,
 *      sincronizar-precio-reserva.mjs, recalcular-tasaciones.mjs,
 *      recalcular-referencias-comunales.mjs, reparar-superficie-y-precio.mjs,
 *      verificar-sincronizacion-crm.mjs) + 2 con fecha de modificación muy
 *      reciente que huelen a herramientas activas
 *      (reparar-region-propiedades.mjs, generar-motor-deno.mjs) tampoco se
 *      tocan.
 *
 * USO:
 *   node limpiar-scripts-legacy.mjs            -> dry-run, solo lista.
 *   node limpiar-scripts-legacy.mjs --aplicar  -> mueve de verdad.
 *
 * Correr desde la raíz del proyecto (o desde dentro de scripts/, ver DIR
 * más abajo -- se autodetecta por dónde está este archivo).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const APLICAR = process.argv.includes('--aplicar');
// scripts/ es el directorio donde vive ESTE archivo (funciona tanto si lo
// corres como `node limpiar-scripts-legacy.mjs` desde adentro de scripts/
// como `node scripts/limpiar-scripts-legacy.mjs` desde la raíz).
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE_DIR = path.join(DIR, 'archive-legacy');

const ARCHIVOS = [
  // Bookmarklets del catastro (herramienta de scraping manual, ya
  // reemplazada por chrome-extension-catastro/) y sus muchas iteraciones
  'final_bookmarklet.cjs', 'fix_bookmarklet_coords.cjs',
  'fix_bookmarklet_regex.cjs', 'fix_bookmarklet_sup.cjs',
  'fix_bookmarklet.cjs', 'master_bookmarklet_2.cjs', 'master_bookmarklet_3.cjs',
  'master_bookmarklet_4.cjs', 'master_bookmarklet_5.cjs', 'master_bookmarklet.cjs',
  'minify_bookmarklet.cjs', 'minify_v5.cjs', 'remove_comments_bookmarklet.cjs',
  'update_bookmarklet.cjs',

  // Parches puntuales de encoding/texto (mojibake, tildes, comillas) ya
  // aplicados sobre archivos de frontend-v2/
  'fix_accents.cjs', 'fix_double.cjs', 'fix_encoding.cjs', 'fix_encoding.ps1',
  'fix_final_2.cjs', 'fix_final.cjs', 'fix_literal.cjs', 'fix_mojibake2.cjs',
  'fix_qmarks.cjs', 'fix_remaining.cjs', 'fix_remaining2.cjs', 'fix_ufffd.cjs',
  'undo_qmarks.cjs', 'undo_qmarks2.cjs',

  // Parches puntuales de HTML/CSS/JS de páginas concretas (ya incorporados
  // al código real)
  'add_minimal_css.cjs', 'add_video_field.cjs', 'clean_parcela_2.cjs',
  'clean_parcela_3.cjs', 'clean_parcela_vars.cjs', 'clean_parcela.cjs',
  'clean_vars.cjs', 'fix_comparables.cjs', 'fix_coords.cjs', 'fix_crm_sync.cjs',
  'fix_editor.cjs', 'fix_editor2.cjs', 'fix_filters.cjs', 'fix_html.cjs',
  'fix_index_catastro.cjs', 'fix_index_catastro2.cjs', 'fix_index_catastro3.cjs',
  'fix_index_js.cjs', 'fix_informe.cjs', 'fix_params_2.cjs', 'fix_params.cjs',
  'fix_parcela_params.cjs', 'fix_regions.cjs', 'fix_tasador_html.cjs',
  'fix_url_input.cjs', 'fix_video_html.cjs', 'inject_premium_dashboard.cjs',
  'modify_informe.cjs', 'modify.mjs', 'patch_800m.cjs', 'patch_comunas.cjs',
  'patch_css.cjs', 'patch_desc.cjs', 'patch_editor_tasador.cjs',
  'patch_keywords_2.cjs', 'patch_keywords.cjs', 'patch_modal.cjs',
  'patch_pinto.cjs', 'patch_portalterreno.cjs', 'patch_price_surface_2.cjs',
  'patch_price_surface.cjs', 'patch_sector.cjs', 'patch_sup_regex.cjs',
  'patch_targetorigins.cjs', 'patch_ubi.cjs', 'patch_ubicacion.cjs',
  'patch_valuation.cjs', 'patch_yapo.cjs', 'patch_yapo2.cjs', 'patch.cjs',
  'rebuild_informe.cjs', 'update_ai_attributes.cjs', 'update_ai_crm.cjs',
  'update_publicar_buttons.cjs', 'update_publicar_js.cjs', 'update_seo.mjs',
  'write-v3-files.cjs', 'add_communes_land.cjs', 'add_communes.cjs',
  'build_artifact.cjs', 'build_report.cjs', 'calc_values.cjs',
  'delete_errant_catastro.cjs', 'delete_errant_coords.cjs',
  'merge_postular.cjs', 'split_postular.cjs', 'update_postular_js.cjs',

  // Diagnósticos/consultas de una sola vez (UUID o ruta harcodeada a una
  // propiedad, archivo o carpeta específica -- ver comentario de cabecera)
  'audit.cjs', 'check_coords.cjs', 'check_last.cjs', 'check_tasaciones.mjs',
  'count.cjs', 'fetch_supabase.cjs', 'inspect.cjs',

  // Pruebas puntuales sueltas (bugs ya cerrados, cada una prueba UN caso)
  'test_800m_bug.cjs', 'test_anon.mjs', 'test_catastro_render.cjs',
  'test_crm_flow.mjs', 'test_ha_bug.cjs', 'test_ha_bug2.cjs',
  'test_ha_bug3.cjs', 'test_ha_bug4.cjs', 'test_ha_bug5.cjs',
  'test_headers.cjs', 'test_numbers.cjs', 'test_pinto_bug.cjs',
  'test_portalterreno.cjs', 'test_precio_publicado.mjs', 'test_regex_parts.cjs',
  'test_regex.cjs', 'test_resend.mjs', 'test_sector.cjs', 'test_ubicacion.cjs',
  'test_user_ad.cjs', 'test_vm.cjs', 'test_vm2.cjs', 'test_wb.cjs',
  'test-import.mjs', 'test-import2.mjs', 'test-puppeteer.cjs',
  'test-tasador-script.mjs', 'test.cjs',

  // Backups/referencia SQL antiguos, sin nada que los invoque
  'backup-tpl-market.ps1', 'backup-tpl-market.sh', 'crm_parcelas_resumen.sql',
  'supabase_vista_comparables.sql', 'TPL-RECALCULO-ENCOLAR-V23.sql',
];

// --- Lo que NUNCA se toca: scripts vigentes + la familia de calibración
// del tasador (interconectada por execSync/import, ver cabecera) ---
const PROTEGIDOS = new Set([
  'package.json', 'package-lock.json',
  // Sincronización/recálculo vigentes (documentados en el proyecto)
  'sincronizar-catalogo-publico.mjs', 'sincronizar-precio-reserva.mjs',
  'recalcular-tasaciones.mjs', 'recalcular-referencias-comunales.mjs',
  'reparar-superficie-y-precio.mjs', 'verificar-sincronizacion-crm.mjs',
  'reparar-region-propiedades.mjs', 'generar-motor-deno.mjs',
  'security-audit.mjs',
  // Familia de calibración del tasador v23/v24/v231 (interconectada)
  'recalcular-todas-las-propiedades.mjs', 'generar-discrepancias.mjs',
  'descomposicion.mjs', 'evaluar-cobertura-v24.mjs', 'comparar-publicados.mjs',
  'get-muestra.mjs', 'simular-muestra-20.mjs', 'simular-sin-calibracion.mjs',
  'simular-v231-recalibrado.mjs', 'simular-v231.mjs', 'simular-v24.mjs',
  'tpl-land-engine-v24-sim.js',
  // Este mismo script y su hermano de la raíz, por si alguien los deja acá
  'limpiar-scripts-legacy.mjs', 'limpiar-raiz-legacy.mjs',
]);

console.log(APLICAR
  ? `Moviendo ${ARCHIVOS.length} archivos a ${ARCHIVE_DIR}...\n`
  : `DRY-RUN (nada se mueve todavía). Usa --aplicar para ejecutar.\n`);

if (APLICAR && !fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

let movidos = 0, saltados = 0, protegidos = 0;

for (const nombre of ARCHIVOS) {
  if (PROTEGIDOS.has(nombre)) {
    console.log(`⛔ PROTEGIDO, no se toca: ${nombre}`);
    protegidos++;
    continue;
  }
  const origen = path.join(DIR, nombre);
  const destino = path.join(ARCHIVE_DIR, nombre);

  if (!fs.existsSync(origen)) {
    console.log(`(ya no existe, se salta) ${nombre}`);
    saltados++;
    continue;
  }
  if (fs.existsSync(destino)) {
    console.log(`⚠️  ya hay un archivo con ese nombre en el destino, se salta: ${nombre}`);
    saltados++;
    continue;
  }

  if (APLICAR) {
    fs.renameSync(origen, destino);
    console.log(`✔ movido: ${nombre}`);
  } else {
    console.log(`moveria: ${nombre}  ->  scripts/archive-legacy/${nombre}`);
  }
  movidos++;
}

console.log(`\nResumen: ${movidos} ${APLICAR ? 'movidos' : 'a mover'}, ${saltados} saltados, ${protegidos} protegidos (no tocados).`);
if (!APLICAR) {
  console.log('Nada se movió todavía. Revisa la lista de arriba y corre de nuevo con --aplicar.');
}
