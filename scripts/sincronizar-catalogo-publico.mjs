// Deja las cifras de tasacion de frontend-v2/parcelas.js iguales a las que
// tiene guardadas Supabase en tpl_propiedades.metadata.
//
// POR QUE EXISTE
//   parcelas.js es el catalogo local que la ficha publica usa como respaldo
//   cuando Supabase no responde, y ademas aporta los campos que la base aun no
//   tiene (galerias, textos de detalle). Sus claves valor_* las escribio un
//   motor anterior y quedaron congeladas: las 32 fichas mostraban un valor que
//   ningun motor vigente produce. La parcela de Caburgua guardaba $104.088.000
//   cuando la tasacion real es $98.500.000.
//
//   Desde que la ficha publica LEE la tasacion guardada en vez de recalcularla
//   (ver valoracionGuardada() en frontend-v2/js/parcela.js), estas cifras dejan
//   de ser decorativas: son las que se muestran si Supabase no contesta. Un
//   catalogo desactualizado ya no es un dato muerto, es un precio equivocado en
//   pantalla.
//
// QUE NO HACE
//   No calcula nada. Copia lo que ya decidio el motor unico. Si una propiedad
//   no tiene tasacion guardada, se informa y se deja intacta: no se inventa.
//
// USO
//   node scripts/sincronizar-catalogo-publico.mjs            (simula, no escribe)
//   node scripts/sincronizar-catalogo-publico.mjs --aplicar  (escribe el archivo)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGO = path.join(raiz, 'frontend-v2', 'parcelas.js');
const URL_BASE = 'https://hwyscirbycojwndyzozn.supabase.co';

const env = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8');
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const APLICAR = process.argv.includes('--aplicar');

// Claves del catalogo y de que clave de metadata sale cada una.
const CLAVES = [
  ['valor_tpl_tasador', 'valor_tpl_tasador'],
  ['valor_tpl_tasador_ajustado', 'valor_tpl_tasador_ajustado'],
  ['valor_comunal', 'valor_comunal'],
  ['valor_tpl_recomendado', 'valor_tpl_recomendado'],
  ['valor_venta_apuro', 'valor_venta_apuro']
];

const clp = (n) => (n == null ? '—' : '$' + Number(n).toLocaleString('es-CL'));

// El archivo es exactamente `window.parcelas = <JSON>;` con sangria de 2. Se
// parsea y se vuelve a serializar igual, asi que el diff solo muestra numeros.
const original = fs.readFileSync(CATALOGO, 'utf8');
const cuerpo = original.replace(/^window\.parcelas\s*=\s*/, '').replace(/;\s*$/, '');
let catalogo;
try {
  catalogo = JSON.parse(cuerpo);
} catch (e) {
  console.error('parcelas.js dejo de ser JSON plano; este script ya no puede reescribirlo sin romper formato.');
  console.error(e.message);
  process.exit(1);
}

const respuesta = await fetch(
  URL_BASE + '/rest/v1/tpl_propiedades?select=codigo,titulo,estado,metadata',
  { headers: H }
);
if (!respuesta.ok) {
  console.error('Supabase respondio', respuesta.status, await respuesta.text());
  process.exit(1);
}
const propiedades = await respuesta.json();
const porCodigo = new Map(propiedades.map((p) => [String(p.codigo || '').toLowerCase(), p]));

const cambios = [];
const sinPar = [];
const sinTasacion = [];

for (const ficha of catalogo) {
  const remoto = porCodigo.get(String(ficha.id || '').toLowerCase());
  if (!remoto) {
    sinPar.push(ficha.id);
    continue;
  }
  const meta = remoto.metadata || {};
  if (!Number(meta.valor_tpl_recomendado)) {
    sinTasacion.push(ficha.id);
    continue;
  }

  for (const [claveCatalogo, claveMeta] of CLAVES) {
    const nuevo = Number(meta[claveMeta]);
    if (!Number.isFinite(nuevo) || nuevo <= 0) continue;
    const viejo = Number(ficha[claveCatalogo]);
    if (viejo === nuevo) continue;
    cambios.push({ id: ficha.id, clave: claveCatalogo, viejo, nuevo });
    ficha[claveCatalogo] = nuevo;
  }

  // El CRM decide la bandera de oportunidad al tasar; el catalogo la repetia.
  if (typeof meta.oportunidad_tpl === 'boolean' && ficha.oportunidad_tpl !== meta.oportunidad_tpl) {
    cambios.push({ id: ficha.id, clave: 'oportunidad_tpl', viejo: ficha.oportunidad_tpl, nuevo: meta.oportunidad_tpl });
    ficha.oportunidad_tpl = meta.oportunidad_tpl;
  }
}

console.log(`Catalogo: ${catalogo.length} fichas | Supabase: ${propiedades.length} propiedades\n`);

if (cambios.length) {
  const anchoId = Math.max(...cambios.map((c) => c.id.length));
  const anchoClave = Math.max(...cambios.map((c) => c.clave.length));
  for (const c of cambios) {
    const antes = typeof c.viejo === 'boolean' ? String(c.viejo) : clp(c.viejo);
    const despues = typeof c.nuevo === 'boolean' ? String(c.nuevo) : clp(c.nuevo);
    console.log(`${c.id.padEnd(anchoId)}  ${c.clave.padEnd(anchoClave)}  ${antes.padStart(14)} -> ${despues.padStart(14)}`);
  }
  console.log(`\n${cambios.length} valores a corregir en ${new Set(cambios.map((c) => c.id)).size} fichas.`);
} else {
  console.log('El catalogo ya coincide con Supabase. Nada que hacer.');
}

if (sinPar.length) console.log(`\nSin par en Supabase (se dejan intactas): ${sinPar.join(', ')}`);
if (sinTasacion.length) console.log(`\nSin tasacion guardada (se dejan intactas): ${sinTasacion.join(', ')}`);

if (!cambios.length) process.exit(0);

if (!APLICAR) {
  console.log('\nSimulacion. Vuelve a correrlo con --aplicar para escribir el archivo.');
  process.exit(0);
}

// El respaldo va a backups/, no junto al catalogo: frontend-v2/ se despliega
// entero y un parcelas.backup-*.js ahi queda publicado en produccion.
const carpetaRespaldos = path.join(raiz, 'backups');
fs.mkdirSync(carpetaRespaldos, { recursive: true });
const respaldo = path.join(carpetaRespaldos, `parcelas.${new Date().toISOString().slice(0, 10)}.js`);
fs.writeFileSync(respaldo, original, 'utf8');
fs.writeFileSync(CATALOGO, 'window.parcelas = ' + JSON.stringify(catalogo, null, 2) + ';', 'utf8');
console.log(`\nEscrito ${path.relative(raiz, CATALOGO)}`);
console.log(`Respaldo en ${path.relative(raiz, respaldo)}`);
console.log('\nRecuerda subir la version en frontend-v2/parcela.html (?v=) o el navegador servira el catalogo cacheado.');
