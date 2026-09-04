#!/usr/bin/env node
/**
 * limpiar-crm-legacy.mjs
 *
 * Mueve (NUNCA borra) a `frontend-v2/plataforma/crm-tpl-v1/archive-legacy/` los
 * archivos del CRM que no participan de la aplicación. Mismo patrón que
 * scripts/limpiar-raiz-legacy.mjs y scripts/limpiar-scripts-legacy.mjs:
 *
 *     node scripts/limpiar-crm-legacy.mjs              → simula, no toca nada
 *     node scripts/limpiar-crm-legacy.mjs --aplicar    → mueve de verdad
 *
 * CÓMO SE VERIFICÓ CADA ARCHIVO (2026-09-04)
 *   No basta con el nombre. Para cada candidato se hizo:
 *     1. grep de su nombre de archivo en TODO crm-tpl-v1 (incluido index.html),
 *        contando también las importaciones con query string (`?v=...`), que es
 *        como parcelas/index.js importa premium-report.js — un grep ingenuo lo
 *        habría marcado como muerto por error.
 *     2. lectura del contenido de cualquiera con nombre ambiguo.
 *     3. comprobación de que no lo alcanza el import dinámico del router
 *        (`modules/<vista>/index.js`), que es la única importación que no
 *        aparece como texto literal en el código.
 *
 * QUÉ SE MUEVE Y POR QUÉ
 *
 *   Módulo Simulador completo (5 archivos) — está fuera del menú desde
 *   2026-09-04 porque sus piezas son andamios sin terminar:
 *     · MapView.js .......... nunca inicializa un mapa; muestra "Mapa Cargando…"
 *                             de forma permanente y updateMarkers() sólo hace
 *                             console.log.
 *     · Cotizador.js ........ su propio comentario dice "Dummy calculation logic";
 *                             depende de selectedCasa, que nada en el CRM setea.
 *     · ParcelaFilters.js ... comunas fijas en el HTML (Frutillar, Puerto Varas),
 *                             que no existen en el catálogo.
 *     · ParcelaList.js ...... lee p.nombre y p.precio; crm_parcelas_resumen
 *                             entrega titulo y precio_publicado → "undefined UF".
 *     · simulador/index.js .. sólo instancia los cuatro anteriores.
 *
 *   Componentes nunca importados por ningún archivo:
 *     · components/nav.js ... ADEMÁS está roto: lee group.label y group.links,
 *                             pero core/router.js exporta arrays. Reventaría si
 *                             alguien lo usara. La barra lateral la pinta
 *                             boot.js con su propio renderSidebar().
 *     · components/table.js, empty-state.js, status-badge.js, login.js
 *                             ......... reemplazados por HTML escrito a mano
 *                             dentro de cada módulo (boot.js tiene su propio
 *                             formulario de login).
 *     · core/ai.js .......... invoca la Edge Function 'gemini-tasacion-summary';
 *                             ningún módulo lo llama.
 *     · modules/parcelas/parcel-filters.js
 *                             ......... chips de filtro (incluida una
 *                             "🗑️ Papelera") que ningún módulo renderiza.
 *
 * QUÉ NO SE MUEVE, A PROPÓSITO
 *   · components/studio-dialog.js — hoy nadie lo importa, PERO apunta a
 *     tpl-business-v2/studio-mark-ii/, que sí existe y está en desarrollo
 *     activo. Parece trabajo en curso, no residuo. Se deja.
 *   · modules/tasaciones/premium-report.js — parece huérfano pero NO lo es:
 *     modules/parcelas/index.js lo importa con `?v=20260901-tasador`.
 *   · core/search-parser.js y core/similarity-engine.js — los usa
 *     modules/comparables/index.js.
 *   · components/kanban.js, modal.js, toast.js, search.js — en uso.
 *   · Ningún archivo de modules/<vista>/index.js que esté en el menú.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const CRM = path.join(RAIZ, 'frontend-v2', 'plataforma', 'crm-tpl-v1');
const DESTINO = path.join(CRM, 'archive-legacy');

const APLICAR = process.argv.includes('--aplicar');

const CANDIDATOS = [
  // --- módulo Simulador (fuera del menú desde 2026-09-04) ---
  'modules/simulador/index.js',
  'modules/map/MapView.js',
  'modules/cotizador/Cotizador.js',
  'modules/parcelas/ParcelaFilters.js',
  'modules/parcelas/ParcelaList.js',
  // --- componentes nunca importados ---
  'components/nav.js',
  'components/table.js',
  'components/empty-state.js',
  'components/status-badge.js',
  'components/login.js',
  // --- otros huérfanos ---
  'core/ai.js',
  'modules/parcelas/parcel-filters.js',
];

// Red de seguridad.
//
// Aunque la lista de arriba está verificada a mano, antes de mover NADA se
// vuelve a comprobar en vivo que ningún archivo del CRM haga referencia al
// candidato. Si aparece una referencia nueva (porque alguien empezó a usar el
// archivo después de escribir este script), se protege solo.
//
// Dos detalles que hacen que esto sirva de verdad:
//
//   · Se buscan SÓLO referencias reales, no menciones. Los comentarios se
//     quitan antes de buscar: si no, la línea comentada que dejó el simulador
//     fuera del menú en core/router.js bastaría para "proteger" el archivo,
//     y un comentario de premium-report.js que dice "(Falta ai.js)" protegería
//     core/ai.js. Ninguna de las dos es una importación.
//
//   · Un archivo llamado index.js no se puede buscar por su nombre: "index.js"
//     aparece en casi todos los archivos del proyecto. Los módulos de vista
//     (modules/<vista>/index.js) no se importan por ruta literal sino por el
//     import dinámico del router, así que a esos se los busca por su id de
//     vista entre comillas — que es exactamente como aparecen en el array
//     `groups` de core/router.js.

function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // bloques /* ... */
    .replace(/^\s*\/\/.*$/gm, ' ')        // líneas que son sólo //
    .replace(/\s\/\/.*$/gm, ' ')          // // al final de una línea
    .replace(/<!--[\s\S]*?-->/g, ' ');    // comentarios HTML
}

/** Cómo se busca cada candidato dentro del resto del código. */
function esReferencia(texto, rel) {
  const base = path.basename(rel);

  if (base === 'index.js') {
    // Módulo de vista: lo carga el router por su id, no por su ruta.
    const vista = path.basename(path.dirname(rel));
    return texto.includes(`'${vista}'`) || texto.includes(`"${vista}"`);
  }

  // Importación por ruta: el nombre tiene que venir precedido de una barra o
  // de la comilla que abre el especificador. Así "ai.js" dentro de una frase
  // no cuenta, pero './core/ai.js' sí.
  return texto.includes(`/${base}`)
      || texto.includes(`'${base}`)
      || texto.includes(`"${base}`);
}

function archivosDelCrm(dir = CRM, acc = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name === 'archive-legacy') continue;
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) archivosDelCrm(completo, acc);
    else if (/\.(js|html|css)$/.test(entrada.name)) acc.push(completo);
  }
  return acc;
}

function main() {
  if (!fs.existsSync(CRM)) {
    console.error(`No encuentro el CRM en ${CRM}. Corre este script desde la raíz del proyecto.`);
    process.exit(1);
  }

  const fuentes = archivosDelCrm();
  const contenidos = new Map(fuentes.map((f) => [f, sinComentarios(fs.readFileSync(f, 'utf8'))]));

  const aMover = [];
  const protegidos = [];
  const inexistentes = [];

  for (const rel of CANDIDATOS) {
    const abs = path.join(CRM, rel);
    if (!fs.existsSync(abs)) { inexistentes.push(rel); continue; }

    const referencias = [];
    for (const [archivo, texto] of contenidos) {
      if (archivo === abs) continue;
      // Los archivos del propio módulo Simulador se importan entre ellos: si
      // eso contara como referencia, ninguno se podría archivar nunca. Se
      // ignoran las referencias que vienen de otro candidato de esta lista.
      const relOtro = path.relative(CRM, archivo).split(path.sep).join('/');
      if (CANDIDATOS.includes(relOtro)) continue;
      if (esReferencia(texto, rel)) referencias.push(relOtro);
    }

    if (referencias.length) protegidos.push({ rel, referencias });
    else aMover.push(rel);
  }

  console.log(`\nCRM: ${CRM}`);
  console.log(`Modo: ${APLICAR ? 'APLICAR (mueve archivos)' : 'SIMULACIÓN (no toca nada)'}\n`);

  if (inexistentes.length) {
    console.log(`— No existen (ya movidos o borrados): ${inexistentes.length}`);
    inexistentes.forEach((r) => console.log(`    ${r}`));
    console.log('');
  }

  if (protegidos.length) {
    console.log(`— PROTEGIDOS porque algo los menciona: ${protegidos.length}`);
    protegidos.forEach(({ rel, referencias }) =>
      console.log(`    ${rel}\n      ← ${referencias.join(', ')}`));
    console.log('');
  }

  console.log(`— A mover: ${aMover.length}`);
  aMover.forEach((r) => console.log(`    ${r}`));
  console.log('');

  if (!APLICAR) {
    console.log('Nada se movió. Revisa la lista y, si estás de acuerdo, corre:');
    console.log('    node scripts/limpiar-crm-legacy.mjs --aplicar\n');
    return;
  }

  fs.mkdirSync(DESTINO, { recursive: true });
  let movidos = 0;
  for (const rel of aMover) {
    const origen = path.join(CRM, rel);
    const destino = path.join(DESTINO, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.renameSync(origen, destino);   // renameSync: mueve, no copia ni borra
    movidos++;
  }

  console.log(`Listo: ${movidos} archivo(s) movidos a ${path.relative(RAIZ, DESTINO)}/`);
  console.log('No se borró nada. Si algo falla, los archivos siguen ahí y se pueden devolver.\n');
}

main();
