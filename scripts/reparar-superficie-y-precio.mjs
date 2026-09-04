// Repara superficie_m2 y precio_publicado en tpl_propiedades.
//
// EL PROBLEMA
//   17 de 33 propiedades tienen superficie_m2 = 5000 fijo, mientras la
//   superficie real vive en metadata.tamano: santa_ana_campo y pemuco_campo son
//   de 100.000 m2 (10 hectareas) y estaban guardadas como 5.000 m2. Ademas
//   precio_publicado esta en 0 en todas, con el precio real en metadata.precio
//   como texto ("$120.000.000").
//
//   Consecuencia: el tasador valorizaba 10 hectareas como media hectarea, y
//   ninguna pantalla podia comparar el precio pedido con el valor TPL porque el
//   precio era cero. No es un problema del motor: son los datos de entrada.
//
// SEGURIDAD
//   Antes de escribir guarda los valores anteriores en
//   metadata.reparacion_20260902 para poder revertir. No toca ninguna fila
//   donde los datos ya son coherentes.
//
// USO
//   node scripts/reparar-superficie-y-precio.mjs            (simula)
//   node scripts/reparar-superficie-y-precio.mjs --aplicar  (escribe)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = 'https://hwyscirbycojwndyzozn.supabase.co';
const env = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8');
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const APLICAR = process.argv.includes('--aplicar');

async function api(ruta, opciones = {}) {
  const r = await fetch(URL_BASE + ruta, { headers: H, ...opciones });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${ruta} :: ${txt.slice(0, 250)}`);
  return txt ? JSON.parse(txt) : null;
}

const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');

/** "$120.000.000" o "120000000" -> 120000000 */
function aNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const limpio = String(v ?? '').replace(/[^\d]/g, '');
  return limpio ? Number(limpio) : 0;
}

const props = await api('/rest/v1/tpl_propiedades?select=id,codigo,comuna,superficie_m2,precio_publicado,metadata&estado=in.(publicada,activa,disponible,revision)');

const arreglos = [];
for (const p of props) {
  const meta = p.metadata || {};
  const supActual = Number(p.superficie_m2) || 0;
  const supMeta = Number(meta.tamano) || 0;
  const precioActual = Number(p.precio_publicado) || 0;
  const precioMeta = aNumero(meta.precio);

  const cambios = {};

  // Solo se corrige si metadata trae una superficie util y distinta. Nunca se
  // pisa una superficie ya coherente.
  if (supMeta >= 100 && supMeta !== supActual) cambios.superficie_m2 = supMeta;

  // El precio solo se rellena si hoy esta en cero: si alguien ya lo edito a
  // mano en el CRM, ese valor manda.
  if (precioActual === 0 && precioMeta > 0) cambios.precio_publicado = precioMeta;

  if (Object.keys(cambios).length) {
    arreglos.push({ p, cambios, supActual, precioActual });
  }
}

console.log(`Propiedades revisadas: ${props.length}`);
console.log(`Propiedades a corregir: ${arreglos.length}\n`);
console.log('CODIGO             SUPERFICIE                       PRECIO PUBLICADO');
for (const a of arreglos) {
  const sup = a.cambios.superficie_m2
    ? `${a.supActual.toLocaleString('es-CL')} -> ${a.cambios.superficie_m2.toLocaleString('es-CL')} m²`
    : `${a.supActual.toLocaleString('es-CL')} m² (sin cambio)`;
  const pre = a.cambios.precio_publicado
    ? `${clp(a.precioActual)} -> ${clp(a.cambios.precio_publicado)}`
    : `${clp(a.precioActual)} (sin cambio)`;
  console.log(String(a.p.codigo).slice(0, 18).padEnd(19), sup.padEnd(32), pre);
}

if (!APLICAR) {
  console.log('\n--- Simulacion. Ejecuta con --aplicar para escribir. ---');
  process.exit(0);
}

console.log('\nAplicando...');
for (const a of arreglos) {
  const metadata = {
    ...(a.p.metadata || {}),
    reparacion_20260902: {
      superficie_m2_anterior: a.supActual,
      precio_publicado_anterior: a.precioActual,
      motivo: 'superficie_m2 estaba fija en 5000 y precio_publicado en 0; se tomaron de metadata.tamano y metadata.precio',
      fecha: new Date().toISOString(),
    },
  };
  await api(`/rest/v1/tpl_propiedades?id=eq.${a.p.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...a.cambios, metadata }),
  });
}
console.log(`Listo: ${arreglos.length} propiedades corregidas.`);
console.log('Ahora corresponde ejecutar: node scripts/recalcular-tasaciones.mjs --aplicar');
