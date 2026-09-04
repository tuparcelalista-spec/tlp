// Deja tpl_propiedades.precio_publicado igual al "precio" que muestra
// frontend-v2/parcelas.js, para que el 1% de la reserva (tpl_crear_orden_reserva_v1,
// ver supabase/migrations/20260903020000_tpl_reserva_parcela_pago_v1.sql) se
// calcule siempre sobre el precio que el comprador ve en el sitio.
//
// POR QUE EXISTE
//   parcelas.js es el catalogo que edita marketing (precio de venta real).
//   tpl_propiedades.precio_publicado es la copia que usa el pago de la
//   reserva para calcular el monto en el servidor. Si alguien cambia un
//   precio en parcelas.js y nadie corre este script antes de desplegar, la
//   reserva se sigue cobrando sobre el precio viejo: la parcela se ve a un
//   valor en el sitio y se cobra el 1% de otro.
//
//   Es la contraparte de sincronizar-catalogo-publico.mjs (que copia
//   valoraciones DESDE Supabase HACIA parcelas.js). Este script copia en el
//   sentido inverso y solo toca precio_publicado + los datos descriptivos
//   (titulo, comuna, superficie, lat, lng): nunca toca estado_publicacion,
//   reservada_hasta ni reservada_orden_id, para no pisar una reserva en curso.
//
// QUE NO HACE
//   No inventa precios ni borra propiedades. Una parcela que ya no está en
//   parcelas.js se informa y se deja intacta en Supabase (puede seguir
//   vendida/reservada aunque ya no se publicite).
//
// USO
//   node scripts/sincronizar-precio-reserva.mjs            (simula, no escribe)
//   node scripts/sincronizar-precio-reserva.mjs --aplicar  (escribe en Supabase)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGO = path.join(raiz, 'frontend-v2', 'parcelas.js');
const URL_BASE = 'https://hwyscirbycojwndyzozn.supabase.co';

const env = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8');
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
if (!KEY) {
  console.error('No se encontró SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const APLICAR = process.argv.includes('--aplicar');

const clp = (n) => (n == null ? '—' : '$' + Number(n).toLocaleString('es-CL'));

function parsearPrecio(valor) {
  if (typeof valor === 'number') return Math.round(valor);
  const digitos = String(valor ?? '').replace(/[^0-9]/g, '');
  return digitos ? Number(digitos) : 0;
}

// Igual que en sincronizar-catalogo-publico.mjs: el archivo es exactamente
// `window.parcelas = <JSON>;`.
const original = fs.readFileSync(CATALOGO, 'utf8');
const cuerpo = original.replace(/^window\.parcelas\s*=\s*/, '').replace(/;\s*$/, '');
let catalogo;
try {
  catalogo = JSON.parse(cuerpo);
} catch (e) {
  console.error('parcelas.js dejó de ser JSON plano; revisa el archivo a mano.');
  console.error(e.message);
  process.exit(1);
}

const respuesta = await fetch(
  URL_BASE + '/rest/v1/tpl_propiedades?select=id,codigo,titulo,comuna,precio_publicado,superficie_m2,lat,lng,estado_publicacion',
  { headers: H }
);
if (!respuesta.ok) {
  console.error('Supabase respondió', respuesta.status, await respuesta.text());
  process.exit(1);
}
const propiedades = await respuesta.json();
const porCodigo = new Map(propiedades.map((p) => [String(p.codigo || '').toLowerCase(), p]));

const actualizaciones = [];
const inserciones = [];
const sinCambios = [];

for (const ficha of catalogo) {
  const codigo = String(ficha.id || '').toLowerCase();
  if (!codigo) continue;
  const precioNuevo = parsearPrecio(ficha.precio);
  if (!precioNuevo) {
    console.warn(`Aviso: ${ficha.id} no tiene un precio parseable ("${ficha.precio}"), se omite.`);
    continue;
  }
  const fila = {
    codigo: ficha.id,
    titulo: ficha.nombre || null,
    comuna: ficha.comuna || null,
    precio_publicado: precioNuevo,
    superficie_m2: ficha.tamano ?? null,
    lat: ficha.lat ?? null,
    lng: ficha.lng ?? null,
  };

  const remoto = porCodigo.get(codigo);
  if (!remoto) {
    inserciones.push({ ...fila, tipo: 'parcela', estado_publicacion: 'publicada' });
    continue;
  }

  const cambios = [];
  if (Number(remoto.precio_publicado) !== precioNuevo) {
    cambios.push(`precio_publicado ${clp(remoto.precio_publicado)} -> ${clp(precioNuevo)}`);
  }
  if ((remoto.titulo || '') !== (fila.titulo || '')) cambios.push('titulo');
  if ((remoto.comuna || '') !== (fila.comuna || '')) cambios.push('comuna');
  if (Number(remoto.superficie_m2) !== Number(fila.superficie_m2)) cambios.push('superficie_m2');

  if (cambios.length) {
    actualizaciones.push({ ficha: ficha.id, cambios, fila });
  } else {
    sinCambios.push(ficha.id);
  }
}

// Propiedades que están en Supabase pero ya no aparecen en el catálogo
// público: solo se informan, nunca se tocan (pueden seguir reservadas/vendidas).
const codigosCatalogo = new Set(catalogo.map((f) => String(f.id || '').toLowerCase()));
const huerfanas = propiedades.filter(
  (p) => p.codigo && !codigosCatalogo.has(String(p.codigo).toLowerCase())
);

console.log(`Catálogo: ${catalogo.length} fichas | Supabase (tpl_propiedades): ${propiedades.length} filas\n`);

if (actualizaciones.length) {
  console.log(`Actualizaciones (${actualizaciones.length}):`);
  for (const a of actualizaciones) console.log(`  ${a.ficha}: ${a.cambios.join(', ')}`);
}
if (inserciones.length) {
  console.log(`\nNuevas en Supabase (${inserciones.length}): ${inserciones.map((i) => i.codigo).join(', ')}`);
}
if (!actualizaciones.length && !inserciones.length) {
  console.log('tpl_propiedades ya coincide con parcelas.js. Nada que hacer.');
}
if (huerfanas.length) {
  console.log(`\nEn Supabase pero ya no están en el catálogo (se dejan intactas): ${huerfanas.map((p) => p.codigo).join(', ')}`);
}

const totalCambios = actualizaciones.length + inserciones.length;
if (!totalCambios) process.exit(0);

if (!APLICAR) {
  console.log('\nSimulación. Vuelve a correrlo con --aplicar para escribir en Supabase.');
  process.exit(0);
}

const filas = [
  ...actualizaciones.map((a) => a.fila),
  ...inserciones,
];

const escritura = await fetch(URL_BASE + '/rest/v1/tpl_propiedades?on_conflict=codigo', {
  method: 'POST',
  headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify(filas),
});

if (!escritura.ok) {
  console.error('\nError al escribir en Supabase:', escritura.status, await escritura.text());
  process.exit(1);
}

console.log(`\nListo: ${totalCambios} filas sincronizadas en tpl_propiedades.`);
