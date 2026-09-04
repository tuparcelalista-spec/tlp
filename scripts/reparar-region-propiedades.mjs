// Repara la columna `region` de tpl_propiedades.
//
// EL PROBLEMA
//   32 de las 33 propiedades tienen region = "Desconocida", un marcador de
//   posicion que quedo de una carga antigua. La unica que trae region real es la
//   de Pucon ("La Araucanía"), y otra dice "Región del Biobío" mientras el resto
//   del sistema escribe "Biobío": tres formas distintas para el mismo dato.
//
//   Consecuencia visible: la cinta de comunas del home agrupa por region, y como
//   "Desconocida" es un texto no vacio ganaba sobre cualquier respaldo, asi que
//   casi todas las comunas aparecian bajo un grupo llamado "Desconocida". Lo
//   mismo afecta a cualquier filtro, informe o export que muestre la region.
//
// DE DONDE SALE EL DATO CORRECTO
//   De `tpl_geoint_perfiles`, que es el atlas oficial de comunas del proyecto
//   (la misma fuente que ya usa el recalculo de referencias comunales). No se
//   inventa ninguna region: si el atlas no reconoce la comuna, la fila se deja
//   como esta y se reporta.
//
// SEGURIDAD
//   Guarda el valor anterior en metadata.reparacion_region para poder revertir.
//   No toca ninguna fila cuya region ya coincida con el atlas.
//
// USO
//   node scripts/reparar-region-propiedades.mjs            (simula)
//   node scripts/reparar-region-propiedades.mjs --aplicar  (escribe)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = 'https://hwyscirbycojwndyzozn.supabase.co';
const env = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8');
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
if (!KEY) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env.local');
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const APLICAR = process.argv.includes('--aplicar');

async function api(ruta, opciones = {}) {
  const r = await fetch(URL_BASE + ruta, { headers: H, ...opciones });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${ruta} :: ${txt.slice(0, 250)}`);
  return txt ? JSON.parse(txt) : null;
}

const normalizar = (v) => String(v || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim().replace(/\s+/g, ' ');

// Valores que significan "no hay dato", aunque sean texto no vacio.
const SIN_DATO = /^(desconocida|desconocido|sin region|sin regi[oó]n|n\/a|null|-)$/i;

// El atlas escribe "Biobío"; algunas fichas traen "Región del Biobío".
const canonizar = (v) => String(v || '').trim().replace(/^regi[oó]n\s+(de\s+la\s+|del\s+|de\s+)?/i, '').trim();

// 1. Atlas oficial de comunas
const perfiles = await api('/rest/v1/tpl_geoint_perfiles?select=comuna,comuna_normalizada,localidad_normalizada,region&activo=is.true');
const regionPorComuna = new Map();
for (const p of perfiles || []) {
  if (!p.region) continue;
  // Se indexa por comuna y tambien por localidad: las fichas escriben "Ñipas",
  // que es una localidad de Ranquil, en el campo comuna.
  for (const clave of [p.comuna_normalizada, p.localidad_normalizada]) {
    if (clave && !regionPorComuna.has(clave)) regionPorComuna.set(clave, canonizar(p.region));
  }
}
console.log(`Atlas geoint: ${regionPorComuna.size} claves de comuna/localidad con region.\n`);

// 2. Propiedades
const props = await api('/rest/v1/tpl_propiedades?select=id,codigo,titulo,comuna,region,metadata');
console.log(`Propiedades: ${props.length}\n`);

const cambios = [];
const sinResolver = [];
const yaCorrectas = [];

for (const prop of props) {
  const clave = normalizar(prop.comuna);
  const correcta = regionPorComuna.get(clave) || null;
  const actual = String(prop.region || '').trim();

  if (!correcta) {
    sinResolver.push(prop);
    continue;
  }
  // Se reescribe si esta vacia, si es un marcador de posicion, o si difiere del
  // atlas aunque sea solo en la forma. La comparacion es LITERAL a proposito:
  // si se compara canonizado, la ficha que dice "Región del Biobío" pasa el
  // filtro y queda escrita distinto de las otras 31 que dicen "Biobío", que es
  // justo la inconsistencia que este script viene a eliminar.
  if (actual === correcta) {
    yaCorrectas.push(prop);
    continue;
  }
  cambios.push({ prop, antes: actual || '(vacía)', ahora: correcta });
}

console.log('COMUNA            ANTES                    AHORA');
for (const c of cambios) {
  console.log(
    String(c.prop.comuna || '').slice(0, 16).padEnd(18),
    String(c.antes).slice(0, 22).padEnd(24),
    c.ahora
  );
}
console.log(`\nA corregir: ${cambios.length} | ya correctas: ${yaCorrectas.length} | comuna no reconocida por el atlas: ${sinResolver.length}`);
for (const p of sinResolver) console.log(`   sin resolver: ${p.comuna} - ${String(p.titulo || '').slice(0, 45)}`);

if (!cambios.length) {
  console.log('\nNada que hacer.');
  process.exit(0);
}

if (!APLICAR) {
  console.log('\n--- Simulacion. Ejecuta con --aplicar para escribir en Supabase. ---');
  process.exit(0);
}

console.log('\nGuardando...');
let ok = 0;
for (const { prop, antes, ahora } of cambios) {
  const metadata = {
    ...(prop.metadata || {}),
    reparacion_region: { antes, aplicado_at: new Date().toISOString(), fuente: 'tpl_geoint_perfiles' },
  };
  await api(`/rest/v1/tpl_propiedades?id=eq.${prop.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ region: ahora, metadata }),
  });
  ok++;
}
console.log(`Listo: ${ok} propiedades con su region real.`);
