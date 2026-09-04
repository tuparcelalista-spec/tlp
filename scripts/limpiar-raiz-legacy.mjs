#!/usr/bin/env node
/**
 * limpiar-raiz-legacy.mjs
 *
 * QUE HACE: mueve (nunca borra) del root del proyecto los ~115 scripts y
 * archivos de texto sueltos que ya cumplieron su función -- parches puntuales
 * (fix_*.cjs, patch_*.cjs, inject_*.cjs, update_*.cjs, gen_*.cjs, test_*.cjs,
 * check*.cjs, debug_*.cjs, restore_*.cjs, revert_*.cjs, repair_*.cjs,
 * migrate_*.cjs) y volcados de texto/HTML de una sola vez (bookmarklets,
 * "estructura.txt", manifiestos de etapas viejas, páginas de prueba con 0
 * bytes, etc.) -- a una carpeta nueva ARCHIVE_DIR (por defecto
 * archive-raiz-legacy/), preservando el nombre de archivo. NO borra nada:
 * usa fs.renameSync, así que el historial de cada archivo se conserva y todo
 * sigue existiendo, solo que fuera de la raíz.
 *
 * POR QUÉ EXISTE: el root del proyecto sirve TODO su contenido públicamente
 * (Vercel no tiene outputDirectory/build configurado en vercel.json, y el
 * index.html + robots.txt de la raíz son el splash real que redirige a
 * frontend-v2/), así que estos ~115 scripts de una sola vez quedan
 * técnicamente descargables por cualquiera (ver robots.txt: ya bloquea
 * /test*.html de la indexación, señal de que esto ya se sabía). Sacarlos de
 * la raíz reduce esa exposición y hace legible el listado de archivos reales
 * del proyecto (package.json, vercel.json, .env.local, index.html,
 * robots.txt, TPL_Business_Analisis_Comercial.docx -- y las carpetas
 * frontend-v2/, supabase/, scripts/, docs/, documentacion/, backups/,
 * "Claude outputs/", scratch/, chrome-extension-catastro/, api/, que NO se
 * tocan).
 *
 * CÓMO SE ARMÓ LA LISTA: se verificó primero que package.json (único punto
 * de entrada real de npm en la raíz) solo declara "dev": "npx serve ." --
 * ningún fix_ / patch_ / etc. está referenciado ahí. Se leyó el contenido de
 * varios (fix.cjs, patch.cjs, check.cjs) para confirmar que son scripts
 * standalone (sin module.exports, sin requerirse entre sí) que ya corrieron
 * una vez sobre archivos puntuales de frontend-v2/ y terminaron. Ninguno de
 * estos nombres aparece en frontend-v2/**, supabase/** ni scripts/** como
 * import/require.
 *
 * USO:
 *   node limpiar-raiz-legacy.mjs            -> dry-run: solo lista qué se
 *                                               movería y a dónde, sin tocar nada.
 *   node limpiar-raiz-legacy.mjs --aplicar  -> mueve de verdad.
 *
 * Correr desde la raíz del proyecto (donde está este mismo archivo si lo
 * dejas en scripts/, usa rutas relativas a process.cwd()).
 */
import fs from 'fs';
import path from 'path';

const APLICAR = process.argv.includes('--aplicar');
const RAIZ = process.cwd();
const ARCHIVE_DIR = path.join(RAIZ, 'archive-raiz-legacy');

// --- Lista de archivos a mover, agrupada solo para que sea legible ---
const ARCHIVOS = [
  // Parches/fixes puntuales de encoding, layout, motor de tasación, etc.
  'fix_adapter.cjs', 'fix_adapter2.cjs', 'fix_adapter3.cjs', 'fix_app.cjs',
  'fix_brace.cjs', 'fix_catastro_payload.cjs', 'fix_comuna.cjs', 'fix_dep.cjs',
  'fix_dist.cjs', 'fix_div.cjs', 'fix_dossier.cjs', 'fix_duplicates.cjs',
  'fix_editor_casa.cjs', 'fix_editor_mat.cjs', 'fix_editor.cjs',
  'fix_engine_casa.cjs', 'fix_engine_dorms.cjs', 'fix_engine.cjs',
  'fix_final.cjs', 'fix_final2.cjs', 'fix_formatOutput.cjs',
  'fix_houses_header.cjs', 'fix_houses_layout.cjs', 'fix_hub_dist.cjs',
  'fix_import.cjs', 'fix_import2.cjs', 'fix_index.cjs', 'fix_js.cjs',
  'fix_layout.cjs', 'fix_mobile.cjs', 'fix_parcela.cjs', 'fix_paths.cjs',
  'fix_payload_editor.cjs', 'fix_payload.cjs', 'fix_propietario.cjs',
  'fix_remaining.cjs', 'fix_rio.cjs', 'fix_safe.cjs', 'fix_tourist_hub.cjs',
  'fix_unescape.cjs', 'fix.cjs', 'check_coords.cjs', 'check_dom.cjs',
  'check.cjs', 'debug_caburgua.cjs',

  // Parches (variante "patch_"/"patch-")
  'patch_comuna.cjs', 'patch_delete.cjs', 'patch_mi_parcela_html.cjs',
  'patch_mi_parcela_js.cjs', 'patch-bm.cjs', 'patch-catastro.cjs',
  'patch-engine.cjs', 'patch.cjs', 'patch.py', 'patch2.cjs', 'patch3.cjs',

  // Inyecciones de HTML/JS puntuales (widgets, dashboards, secciones que ya
  // quedaron incorporadas al código real)
  'inject_actor_detail.cjs', 'inject_chart.cjs', 'inject_crm_extras.cjs',
  'inject_disclaimer.cjs', 'inject_expert.cjs', 'inject_houses_crm.cjs',
  'inject_houses_html.cjs', 'inject_houses_js.cjs', 'inject_html.cjs',
  'inject_informe.cjs', 'inject_nearest.cjs', 'inject_nextbtn.cjs',
  'inject_publicador_engine.cjs', 'inject_publicador_html.cjs',
  'inject_wizard.cjs', 'inject-crm.cjs',

  // Actualizaciones puntuales ya aplicadas
  'update_adapter.cjs', 'update_all_valuations.cjs', 'update_cab_price.cjs',
  'update_communes.cjs', 'update_cotizar_btn.cjs', 'update_dossier.cjs',
  'update_dossier2.cjs', 'update_engine_logic.cjs', 'update_engine.cjs',
  'update_keywords.cjs', 'update_links.cjs', 'update_parcelas_js.cjs',

  // Generadores de reportes/bases de un análisis puntual (comparables, etc.)
  'gen_final_bases.cjs', 'gen_final_median.cjs', 'gen_outlier_bases.cjs',
  'gen_proposal_filtered.cjs', 'gen_proposal.cjs', 'gen_report_fix.cjs',
  'gen_report.cjs',

  // Migraciones/recuperaciones puntuales de datos (ya corridas)
  'migrate_catastro_casas.cjs', 'migrate_valuations.cjs', 'restore_css.cjs',
  'restore_engine.cjs', 'revert_override.cjs', 'repair_app.cjs',

  // Herramientas de scraping/análisis de un uso (catastro, dossier, etc.)
  'geocode_catastro.cjs', 'export_spatial.cjs', 'extract_tpl_values.cjs',
  'connect_wizard.cjs', 'dual_dossier.cjs', 'force_delete.cjs',
  'premium_gallery.cjs', 'premium_mobile_layout.cjs',

  // Pruebas puntuales sueltas
  'test_cab.cjs', 'test_cab2.cjs', 'test3.cjs',

  // Páginas de prueba/dev muertas (confirmadas en auditoría anterior; robots.txt
  // ya bloquea /test*.html de la indexación)
  'test_corsproxy.html', 'test_scrape.html', 'test-browser.html',
  'banner-campo-chileno-referencia.html',

  // Volcados de texto/datos de una sola vez, notas de etapas viejas del
  // proyecto (MANIFIESTO-ARCHIVOS.txt referencia rutas "crm-v2"/"tpl-business"
  // que ya no existen -- quedó de una etapa anterior al CRM/negocio actuales)
  'bookmarklet_minified.txt', 'bookmarklet_v5.txt', 'catastro_completo.md',
  'DEPENDENCIAS-DESDE-PROYECTO-ANTIGUO.txt', 'estructura.txt', 'filelist.txt',
  'MANIFIESTO-ARCHIVOS.txt', 'reporte_tasaciones_actualizadas.json',
  'RUTAS-DE-PRUEBA.txt', 'temp_footer.txt', 'temp_header.txt',
  'temp_ribbon.txt', 'valores_tpl.txt', 'VERIFICAR-INDEX-CORRECTO.txt',
  'schema.json', // 0 bytes, sin uso
];

// --- Lo que NUNCA se toca, aunque alguien agregue mal un nombre arriba ---
const PROTEGIDOS = new Set([
  '.env.local', '.gitignore', 'index.html', 'robots.txt', 'package.json',
  'package-lock.json', 'vercel.json', 'TPL_Business_Analisis_Comercial.docx',
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
  const origen = path.join(RAIZ, nombre);
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
    console.log(`moveria: ${nombre}  ->  archive-raiz-legacy/${nombre}`);
  }
  movidos++;
}

console.log(`\nResumen: ${movidos} ${APLICAR ? 'movidos' : 'a mover'}, ${saltados} saltados, ${protegidos} protegidos (no tocados).`);
if (!APLICAR) {
  console.log('Nada se movió todavía. Revisa la lista de arriba y corre de nuevo con --aplicar.');
}
