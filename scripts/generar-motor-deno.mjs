// Genera supabase/functions/_shared/tpl-land-engine.js desde el motor unico
// del frontend (frontend-v2/js/core/valuation-engine.js).
//
// POR QUE EXISTE
//   Las edge functions corren en Deno y necesitan un modulo ESM; el navegador
//   necesita un <script> clasico. Antes se mantenian dos archivos "identicos"
//   a mano y habian derivado: el servidor usaba multiplicador 3.0 para 0-10 km
//   y el navegador 9, con tramos de superficie distintos. La misma parcela
//   valia dos cosas distintas segun quien la calculara.
//
// USO
//   node scripts/generar-motor-deno.mjs            genera
//   node scripts/generar-motor-deno.mjs --verificar falla si esta desactualizado

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origen = path.join(raiz, 'frontend-v2/js/core/valuation-engine.js');
const destino = path.join(raiz, 'supabase/functions/_shared/tpl-land-engine.js');

const cabecera = `// =============================================================================
// ARCHIVO GENERADO - NO EDITAR A MANO
// =============================================================================
// Copia para Deno del motor unico del proyecto. La fuente es
// frontend-v2/js/core/valuation-engine.js.
//
// Para cambiar una regla de tasacion: edita ese archivo y ejecuta
//   node scripts/generar-motor-deno.mjs
// =============================================================================

`;

const pie = `

// El IIFE de arriba registra el motor en globalThis; aqui solo se reexpone como
// modulo ESM para que las edge functions puedan importarlo.
export const TPLLandEngine = globalThis.TPLLandEngine;
export default TPLLandEngine;
`;

const generado = cabecera + fs.readFileSync(origen, 'utf8').trimEnd() + pie;

if (process.argv.includes('--verificar')) {
  const actual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : '';
  if (actual !== generado) {
    console.error('DESINCRONIZADO: la copia de Deno no coincide con el motor unico.');
    console.error('Ejecuta: node scripts/generar-motor-deno.mjs');
    process.exit(1);
  }
  console.log('OK: la copia de Deno esta al dia con el motor unico.');
} else {
  fs.writeFileSync(destino, generado, 'utf8');
  console.log('Generado ' + path.relative(raiz, destino));
}
