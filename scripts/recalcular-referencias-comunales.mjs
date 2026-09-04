// Recalcula desde cero las referencias comunales de TPL a partir del catastro
// de mercado (avisos reales capturados de portales).
//
// POR QUE EXISTE
//   Las medianas de tpl_tasador_referencias venian de tres tablas distintas
//   escritas a mano en momentos distintos, y no coincidian entre si ni con los
//   avisos que el propio catastro tenia guardados. Para Pucon convivian 13.011,
//   10.300 y 10.300 CLP/m2 segun que archivo mirara cada pantalla.
//
// QUE CAMBIO EL 2026-09-02
//   Antes se publicaba UNA mediana por comuna, mezclando parcelas de 5.000 m2
//   con campos de 6 hectareas. El precio por m2 no es comparable entre esos dos
//   mercados, asi que la mediana no representaba a ninguno de los dos. En
//   Nacimiento sus 5 avisos utiles (dos parcelas y tres campos) daban una
//   mediana comunal de 3.774 CLP/m2, cuando las parcelas del tramo TPL estaban
//   en 6.102 y los campos en 2.978. Una parcela de 5.000 m2 quedaba tasada
//   contra campos de 4 hectareas.
//
//   Ahora se publica UNA MEDIANA POR (COMUNA, SEGMENTO DE SUPERFICIE). Una
//   parcela se compara con parcelas y un campo con campos.
//
// COMO LIMPIA
//   1. Solo avisos con precio y superficie utiles, y superficie dentro del
//      rango rural que TPL cubre (3.000 a 200.000 m2). Bajo 3.000 m2 son sitios
//      urbanos, que en el catastro aparecen entre 20.000 y 80.000 CLP/m2: otro
//      mercado. Sobre 20 hectareas ya es predio agricola.
//   2. Descarta valores absurdos por precio unitario (< 300 y > 200.000 CLP/m2):
//      son errores de captura, no mercado.
//   3. Descarta atipicos por rango intercuartilico (regla de Tukey, 1.5x IQR)
//      DENTRO de cada segmento, no sobre la comuna entera.
//   4. Exige al menos 4 avisos propios del segmento para publicar una comuna
//      con muestra propia.
//
// CUANDO LA COMUNA NO TIENE MUESTRA PROPIA
//   Se arma una referencia territorial con los avisos DEL MISMO SEGMENTO a
//   menos de 35 km (parcelas) o 60 km (campos) del centroide de la comuna, con
//   mediana ponderada por distancia: un aviso a 5 km pesa cuatro veces mas que
//   uno a 35 km. Se marca con origen 'territorial' y confianza rebajada, y se
//   deja registrado en metadata que comunas aportaron. Si ni asi hay muestra,
//   la comuna queda SIN referencia y el motor tasa solo con el valor tecnico,
//   declarandolo. Nunca se inventa una mediana.
//
// USO
//   node scripts/recalcular-referencias-comunales.mjs             (solo informa)
//   node scripts/recalcular-referencias-comunales.mjs --aplicar   (escribe en Supabase)
//   node scripts/recalcular-referencias-comunales.mjs --json=x.json
//       deja en un archivo las filas que insertaria, con el mismo formato que
//       lee el motor. Sirve para probar una tasacion completa contra las
//       referencias nuevas SIN tocar produccion.

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
const SALIDA_JSON = (process.argv.find((a) => a.startsWith('--json=')) || '').slice(7);

// Segmentos de superficie. Los limites son los mismos que usa el motor para
// elegir con que muestra comparar una propiedad (valuation-engine.js).
// El radio del respaldo territorial depende del tramo: la parcela de agrado es
// un mercado local (a 40 km ya es otro paisaje y otro comprador), mientras que
// el precio por m2 de un predio agricola grande es casi uniforme dentro del
// valle. Con 35 km para todos, Pemuco se quedaba sin referencia de campo
// teniendo 22 campos comparables a 50 km.
const SEGMENTOS = [
  { nombre: 'parcela', desde: 3000, hasta: 12000, etiqueta: 'Parcela 3.000-12.000 m2', radioKm: 35 },
  { nombre: 'campo_chico', desde: 12000, hasta: 50000, etiqueta: 'Campo 1,2-5 ha', radioKm: 60 },
  { nombre: 'campo', desde: 50000, hasta: 200000, etiqueta: 'Campo 5-20 ha', radioKm: 60 },
];
const SUP_MIN = SEGMENTOS[0].desde;
const SUP_MAX = SEGMENTOS.at(-1).hasta;
const M2_MIN = 300;
const M2_MAX = 200000;
const MINIMO_PROPIOS = 4;
const MINIMO_TERRITORIAL = 5;

const normalizar = (v) => String(v || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim().replace(/\s+/g, ' ');

const segmentoDe = (m2) => SEGMENTOS.find((s) => m2 >= s.desde && m2 < s.hasta)?.nombre || null;

function percentil(ordenados, p) {
  if (!ordenados.length) return 0;
  const pos = (ordenados.length - 1) * p;
  const bajo = Math.floor(pos);
  const alto = Math.ceil(pos);
  if (bajo === alto) return ordenados[bajo];
  return ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (pos - bajo);
}

/** Percentil ponderado: cada aviso trae su propio peso (cercania). */
function percentilPonderado(items, p) {
  const orden = [...items].sort((a, b) => a.valor - b.valor);
  const total = orden.reduce((s, x) => s + x.peso, 0);
  if (!total) return 0;
  let acumulado = 0;
  for (const x of orden) {
    acumulado += x.peso;
    if (acumulado >= p * total) return x.valor;
  }
  return orden.at(-1).valor;
}

/** Regla de Tukey: fuera todo lo que caiga a mas de 1,5 IQR de los cuartiles. */
function sinAtipicos(avisos) {
  if (avisos.length < 4) return { limpios: avisos, descartados: [] };
  const orden = [...avisos].map((a) => a.m2).sort((a, b) => a - b);
  const q1 = percentil(orden, 0.25);
  const q3 = percentil(orden, 0.75);
  const iqr = q3 - q1;
  const min = q1 - 1.5 * iqr;
  const max = q3 + 1.5 * iqr;
  return {
    limpios: avisos.filter((a) => a.m2 >= min && a.m2 <= max),
    descartados: avisos.filter((a) => a.m2 < min || a.m2 > max),
    corteMin: Math.round(min),
    corteMax: Math.round(max),
  };
}

function haversineKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');

async function api(ruta, opciones = {}) {
  const r = await fetch(URL_BASE + ruta, { headers: H, ...opciones });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${ruta} :: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

async function traerCatastro() {
  const filas = [];
  const paso = 1000;
  for (let desde = 0; ; desde += paso) {
    const r = await fetch(
      `${URL_BASE}/rest/v1/tpl_catastro_mercado?select=comuna,region,precio_clp,superficie_m2,titulo,tipo_propiedad,lat,lng`,
      { headers: { ...H, Range: `${desde}-${desde + paso - 1}` } }
    );
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < paso) break;
  }
  return filas;
}

const crudos = await traerCatastro();
console.log(`Catastro: ${crudos.length} avisos capturados.\n`);

// La region es obligatoria en tpl_tasador_referencias, pero muchos avisos del
// catastro la traen vacia. Se resuelve contra el atlas geoint, que es la fuente
// oficial de comunas del proyecto.
const perfiles = await api('/rest/v1/tpl_geoint_perfiles?select=comuna,comuna_normalizada,region&activo=is.true');
const regionPorComuna = new Map();
const nombrePorComuna = new Map();
for (const p of perfiles || []) {
  if (!p.comuna_normalizada) continue;
  if (p.region && !regionPorComuna.has(p.comuna_normalizada)) regionPorComuna.set(p.comuna_normalizada, p.region);
  if (p.comuna && !nombrePorComuna.has(p.comuna_normalizada)) nombrePorComuna.set(p.comuna_normalizada, p.comuna);
}

// ---------------------------------------------------------------------------
// 1. Depuracion de avisos
// ---------------------------------------------------------------------------
const avisos = [];
const basura = [];

for (const a of crudos) {
  const clave = normalizar(a.comuna);
  const precio = Number(a.precio_clp);
  const superficie = Number(a.superficie_m2);

  if (!clave) { basura.push({ a, motivo: 'sin comuna' }); continue; }
  if (!(precio > 0)) { basura.push({ a, motivo: 'sin precio' }); continue; }
  if (!(superficie > 0)) { basura.push({ a, motivo: 'sin superficie' }); continue; }

  const m2 = precio / superficie;

  // Superficie imposible para un aviso de parcela: casi siempre es un error de
  // captura del portal (un separador de miles leido como digito). En Nacimiento
  // habia un aviso de 5.300.000 m2 -530 hectareas- por $20.000.000.
  if (superficie > SUP_MAX * 5) { basura.push({ a, m2, motivo: `superficie imposible (${superficie.toLocaleString('es-CL')} m2)` }); continue; }
  if (m2 < M2_MIN || m2 > M2_MAX) { basura.push({ a, m2, motivo: `precio unitario fuera de rango (${clp(m2)}/m2)` }); continue; }

  // Fuera del rango rural que cubre TPL: no es basura, simplemente es otro
  // mercado (sitio urbano abajo, predio agricola grande arriba).
  if (superficie < SUP_MIN || superficie >= SUP_MAX) continue;

  avisos.push({
    clave,
    comuna: a.comuna,
    region: a.region || null,
    m2,
    superficie,
    segmento: segmentoDe(superficie),
    lat: Number(a.lat),
    lng: Number(a.lng),
    titulo: a.titulo || '',
  });
}

console.log(`Avisos utiles en el rango rural TPL (${SUP_MIN.toLocaleString('es-CL')} a ${SUP_MAX.toLocaleString('es-CL')} m2): ${avisos.length}`);
if (basura.length) {
  console.log(`Avisos descartados por datos inservibles: ${basura.length}`);
  for (const b of basura.slice(0, 12)) {
    console.log(`   ${String(b.a.comuna || '-').padEnd(16)} ${b.motivo} :: ${String(b.a.titulo || '').slice(0, 46)}`);
  }
  if (basura.length > 12) console.log(`   ... y ${basura.length - 12} mas`);
}

// Centroide de cada comuna a partir de sus propios avisos geolocalizados.
const centroide = new Map();
for (const clave of new Set(avisos.map((a) => a.clave))) {
  const pts = avisos.filter((a) => a.clave === clave && Number.isFinite(a.lat) && Number.isFinite(a.lng));
  if (!pts.length) continue;
  centroide.set(clave, {
    lat: percentil(pts.map((p) => p.lat).sort((x, y) => x - y), 0.5),
    lng: percentil(pts.map((p) => p.lng).sort((x, y) => x - y), 0.5),
  });
}

// ---------------------------------------------------------------------------
// 2. Una referencia por (comuna, segmento)
// ---------------------------------------------------------------------------
const resultado = [];
const sinMuestra = [];

const clavesComuna = [...new Set(avisos.map((a) => a.clave))].sort();

for (const clave of clavesComuna) {
  const propios = avisos.filter((a) => a.clave === clave);
  const comuna = nombrePorComuna.get(clave) || propios[0].comuna;
  const region = regionPorComuna.get(clave) || propios.find((a) => a.region)?.region || null;

  for (const seg of SEGMENTOS) {
    const delSegmento = propios.filter((a) => a.segmento === seg.nombre);
    const { limpios, descartados } = sinAtipicos(delSegmento);

    let muestra = null;

    if (limpios.length >= MINIMO_PROPIOS) {
      // Nivel 1: la comuna se explica con sus propios avisos.
      muestra = {
        origen: 'comuna',
        items: limpios.map((a) => ({ valor: a.m2, peso: 1, superficie: a.superficie, comuna: a.comuna })),
        atipicos: descartados.length,
        aporta: { [comuna]: limpios.length },
        radioKm: null,
      };
    } else {
      // Nivel 2: se pide prestada muestra del mismo segmento a la vuelta.
      const centro = centroide.get(clave);
      if (centro) {
        const cerca = avisos
          .filter((a) => a.segmento === seg.nombre && Number.isFinite(a.lat) && Number.isFinite(a.lng))
          .map((a) => ({ ...a, distancia: haversineKm(centro, { lat: a.lat, lng: a.lng }) }))
          .filter((a) => a.distancia <= seg.radioKm);

        const limpiosCerca = sinAtipicos(cerca);
        if (limpiosCerca.limpios.length >= MINIMO_TERRITORIAL) {
          const aporta = {};
          for (const a of limpiosCerca.limpios) aporta[a.comuna] = (aporta[a.comuna] || 0) + 1;
          muestra = {
            origen: 'territorial',
            items: limpiosCerca.limpios.map((a) => ({
              valor: a.m2,
              // Un aviso a 5 km pesa cuatro veces mas que uno a 35 km.
              peso: 1 / (1 + a.distancia / 10),
              superficie: a.superficie,
              comuna: a.comuna,
            })),
            atipicos: limpiosCerca.descartados.length,
            aporta,
            propios: delSegmento.length,
            radioKm: seg.radioKm,
          };
        }
      }
    }

    if (!muestra) {
      if (delSegmento.length) {
        sinMuestra.push({ comuna, segmento: seg.nombre, propios: delSegmento.length });
      }
      continue;
    }

    if (!region) {
      // Sin region no se puede publicar la referencia (la columna es
      // obligatoria). Suele indicar una comuna mal escrita en el catastro,
      // p.ej. "Loss Angeles".
      sinMuestra.push({ comuna, segmento: seg.nombre, propios: delSegmento.length, motivo: 'comuna no reconocida en el atlas' });
      continue;
    }

    const superficies = muestra.items.map((i) => i.superficie).sort((a, b) => a - b);
    const n = muestra.items.length;
    const propia = muestra.origen === 'comuna';

    resultado.push({
      comuna_key: clave,
      comuna,
      region,
      segmento: seg.nombre,
      etiqueta: seg.etiqueta,
      origen: muestra.origen,
      mediana_m2: Math.round(percentilPonderado(muestra.items, 0.5)),
      p25_m2: Math.round(percentilPonderado(muestra.items, 0.25)),
      p75_m2: Math.round(percentilPonderado(muestra.items, 0.75)),
      superficie_mediana_m2: Math.round(percentil(superficies, 0.5)),
      cantidad: n,
      propios: propia ? n : (muestra.propios || 0),
      atipicos: muestra.atipicos,
      aporta: muestra.aporta,
      radio_km: muestra.radioKm,
      // Una referencia prestada nunca puede declararse tan firme como una propia.
      confianza: propia
        ? (n >= 20 ? 'alta' : n >= 10 ? 'media-alta' : n >= 6 ? 'media' : 'media-baja')
        : (n >= 20 ? 'media' : 'media-baja'),
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Informe
// ---------------------------------------------------------------------------
const propias = resultado.filter((r) => r.origen === 'comuna');
console.log(`\nReferencias publicables: ${resultado.length} filas sobre ${new Set(resultado.map((r) => r.comuna_key)).size} comunas`);
console.log(`   con muestra propia (>= ${MINIMO_PROPIOS} avisos del segmento): ${propias.length}`);
console.log(`   territoriales (muestra prestada de comunas vecinas del mismo tramo): ${resultado.length - propias.length}
`);

console.log('COMUNA           SEGMENTO       ORIGEN         n  propios   mediana/m2       p25       p75   supMed');
for (const r of resultado.sort((a, b) => a.comuna.localeCompare(b.comuna) || a.segmento.localeCompare(b.segmento))) {
  console.log(
    r.comuna.slice(0, 15).padEnd(16),
    r.segmento.padEnd(14),
    r.origen.padEnd(12),
    String(r.cantidad).padStart(3),
    String(r.propios).padStart(8),
    clp(r.mediana_m2).padStart(13),
    clp(r.p25_m2).padStart(9),
    clp(r.p75_m2).padStart(9),
    String(r.superficie_mediana_m2).padStart(8)
  );
}

if (sinMuestra.length) {
  console.log('\nSin referencia (el motor tasara solo con el valor tecnico y lo declarara):');
  for (const s of sinMuestra) {
    console.log(`   ${s.comuna.padEnd(16)} ${s.segmento.padEnd(14)} ${s.propios} aviso(s) propio(s)${s.motivo ? ' - ' + s.motivo : ''}`);
  }
}

// ---------------------------------------------------------------------------
// 4. Filas a publicar
// ---------------------------------------------------------------------------
const uf = await api('/rest/v1/rpc/tpl_obtener_uf_v1', { method: 'POST', body: '{}' });
const ufClp = Number(uf?.valor_clp || 0);
const hoy = new Date().toISOString().slice(0, 10);

// Orden de insercion: campo, campo_chico y al final parcela. Importa por la
// ventana entre publicar estas filas y desplegar el motor nuevo. El motor
// anterior indexa las referencias por comuna SOLA, asi que con tres filas por
// comuna se queda con la ultima que lee; dejando 'parcela' al final se queda
// con la del tramo que tiene casi todas las propiedades TPL, en vez de tasar
// una parcela de 5.000 m2 contra la mediana de campos de 5 hectareas.
const PRIORIDAD_INSERCION = { campo: 0, campo_chico: 1, parcela: 2 };
const filas = resultado
  .slice()
  .sort((a, b) => PRIORIDAD_INSERCION[a.segmento] - PRIORIDAD_INSERCION[b.segmento])
  .map((r) => ({
  region: r.region,
  comuna: r.comuna,
  comuna_key: r.comuna_key,
  segmento: r.segmento,
  mediana_m2: r.mediana_m2,
  p25_m2: r.p25_m2,
  p75_m2: r.p75_m2,
  mediana_uf_m2: ufClp > 0 ? r.mediana_m2 / ufClp : null,
  uf_base_clp: ufClp || null,
  cantidad_comparables: r.cantidad,
  confianza: r.confianza,
  fuentes: ['Catastro de mercado TPL'],
  fecha_observacion: hoy,
  activo: true,
  metadata: {
    metodo: r.origen === 'comuna'
      ? 'mediana del segmento en la comuna, con descarte de atipicos por 1.5 IQR'
      : `mediana ponderada por distancia del mismo segmento a <= ${r.radio_km} km, con descarte de atipicos por 1.5 IQR`,
    origen: r.origen,
    etiqueta_segmento: r.etiqueta,
    superficie_mediana_m2: r.superficie_mediana_m2,
    avisos_propios_del_segmento: r.propios,
    descartados_atipicos: r.atipicos,
    radio_km: r.radio_km,
    comunas_que_aportan: r.aporta,
    generado_por: 'scripts/recalcular-referencias-comunales.mjs',
  },
}));

if (SALIDA_JSON) {
  fs.writeFileSync(path.resolve(SALIDA_JSON), JSON.stringify(filas, null, 2), 'utf8');
  console.log(`\nEscritas ${filas.length} filas en ${SALIDA_JSON} (no se toco Supabase).`);
}

if (!APLICAR) {
  console.log('\n--- Simulacion. Ejecuta con --aplicar para escribir en Supabase. ---');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 5. Escritura
// ---------------------------------------------------------------------------
// Se desactivan TODAS las referencias vigentes y se publican las nuevas. Volver
// a cero es explicito, para que no quede ninguna mediana vieja sobreviviendo en
// una comuna o un segmento que ahora no tiene muestra suficiente.
console.log('\nDesactivando referencias vigentes...');
await api('/rest/v1/tpl_tasador_referencias?activo=is.true', {
  method: 'PATCH',
  body: JSON.stringify({ activo: false }),
});

console.log(`Insertando ${filas.length} referencias limpias...`);
for (let i = 0; i < filas.length; i += 50) {
  await api('/rest/v1/tpl_tasador_referencias', {
    method: 'POST',
    body: JSON.stringify(filas.slice(i, i + 50)),
  });
}
console.log('Listo. Todas las pantallas que leen tpl_tasador_referencias ya usan estos valores.');
console.log('Ahora corre: node scripts/recalcular-tasaciones.mjs --aplicar');
