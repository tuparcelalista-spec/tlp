// Recalcula la tasacion de TODAS las propiedades con el motor unico y guarda el
// resultado en tpl_propiedades.metadata + tpl_tasaciones.
//
// POR QUE EXISTE
//   La grilla del CRM lee valores GUARDADOS en metadata; parcela.html y el
//   informe premium CALCULAN en vivo. Como los guardados los habia escrito un
//   motor anterior, la misma parcela mostraba $104.088.000 en el CRM y otra
//   cifra en el informe. Este script deja los guardados al dia con el motor
//   unico, para que las tres pantallas digan lo mismo.
//
//   Ademas replica exactamente la resolucion territorial del adaptador
//   (frontend-v2/js/core/valuation-adapter.js): distancias del atlas geoint y,
//   cuando el turismo reemplaza al hub, el destino medido a la cabecera comunal.
//
// VOLVER A CERO
//   Antes de guardar, el script BORRA de metadata toda clave de tasacion que
//   dejo algun motor anterior (tasador_entrada, valor_tpl_total,
//   tasacion_resultado_resumen, las banderas de recalculo pendiente...). Si no
//   se limpian, una pantalla puede seguir leyendo un numero que ningun motor
//   vigente produce, que es justo el problema que se vino arrastrando.
//
// USO
//   node scripts/recalcular-tasaciones.mjs            (simula, no escribe)
//   node scripts/recalcular-tasaciones.mjs --aplicar  (escribe en Supabase)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = 'https://hwyscirbycojwndyzozn.supabase.co';

const env = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8');
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const APLICAR = process.argv.includes('--aplicar');

// Claves de tasacion escritas por motores que ya no existen. Se eliminan de
// metadata en cada recalculo para que no quede ningun valor huerfano.
const CLAVES_LEGADAS = [
  'tasador_entrada',
  'valor_tpl_total',
  'valor_tpl_promedio_comunal',
  'tasacion_resultado_resumen',
  'tasacion_recalculo_pendiente',
  'tasacion_recalculo_motivo',
  'tasacion_recalculo_solicitado_at',
  'reparacion_20260902',
];

globalThis.window = globalThis;
// eslint-disable-next-line no-eval
eval(fs.readFileSync(path.join(raiz, 'frontend-v2/js/core/valuation-engine.js'), 'utf8'));
const motor = globalThis.TPLLandEngine;

async function api(ruta, opciones = {}) {
  const r = await fetch(URL_BASE + ruta, { headers: H, ...opciones });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${ruta} :: ${txt.slice(0, 250)}`);
  return txt ? JSON.parse(txt) : null;
}

const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
const texto = (v) => String(v ?? '').trim();

// Mismo vocabulario que el adaptador.
const NIVEL_TURISMO = {
  internacional: 'nacional', nacional: 'nacional',
  regional: 'regional', local: 'regional', local_regional: 'regional',
  sin_influencia: '', sin_clasificar: '',
};
const SI = /^(si|sí|true|1)$/i;
const NO = /^(no|false|0)$/i;
const heredado = (valor, siTexto, noTexto) => {
  const v = texto(valor);
  if (SI.test(v)) return siTexto;
  if (NO.test(v)) return noTexto;
  return v;
};

// 1. Referencias comunales vigentes en el motor
const uf = await api('/rest/v1/rpc/tpl_obtener_uf_v1', { method: 'POST', body: '{}' });
const ufClp = Number(uf?.valor_clp || 0);
const refs = await api('/rest/v1/tpl_tasador_referencias?select=*&activo=is.true');
motor.setMarketReferences(
  (refs || []).map((row) => ({ ...row, mediana_m2_actual: Number(row.mediana_m2), p25_m2_actual: Number(row.p25_m2), p75_m2_actual: Number(row.p75_m2), uf_clp_actual: ufClp })),
  { ufClp }
);
console.log(`Referencias comunales cargadas: ${refs.length} (UF ${clp(ufClp)})`);

// 2. Contextos territoriales
const contextos = await api('/rest/v1/tpl_geoint_propiedad_contexto?select=propiedad_id,distancia_centro_comunal_km,distancia_hub_efectivo_km,hub_efectivo_nombre,nivel_turismo,turismo_reemplaza_hub');
const porPropiedad = new Map((contextos || []).map((c) => [c.propiedad_id, c]));
console.log(`Contextos geoint disponibles: ${porPropiedad.size}`);

// 3. Propiedades
const props = await api('/rest/v1/tpl_propiedades?select=*&estado=in.(publicada,activa,disponible,revision)');
console.log(`Propiedades a recalcular: ${props.length}\n`);

function territorio(prop) {
  const g = porPropiedad.get(prop.id);
  if (g?.distancia_hub_efectivo_km != null) {
    const comunaKm = Number(g.distancia_centro_comunal_km) || null;
    let hubKm = Number(g.distancia_hub_efectivo_km);
    let corregido = false;
    if (g.turismo_reemplaza_hub && comunaKm && comunaKm < hubKm) { hubKm = comunaKm; corregido = true; }
    return { comunaKm, hubKm, corregido, turismo: g.nivel_turismo || 'sin_clasificar', fuente: 'geoint' };
  }
  const guardado = prop.metadata?.tasacion_entrada_actual || prop.metadata?.tasador_entrada || {};
  let comunaKm = Number(guardado.communeDistanceKm) || null;
  let hubKm = Number(guardado.majorCityDistanceKm ?? guardado.distanceKm) || null;
  if (!hubKm && prop.distancia_ruta_principal_km) {
    comunaKm = comunaKm || Number(prop.distancia_ruta_principal_km) + 5;
    hubKm = comunaKm + 5;
  }
  if (hubKm && comunaKm && hubKm > 50 && comunaKm <= 25) hubKm = comunaKm;
  return { comunaKm, hubKm, corregido: false, turismo: prop.metadata?.nivel_turismo || 'sin_clasificar', fuente: hubKm ? 'ficha' : 'sin_dato' };
}

function entrada(prop, t) {
  const guardado = prop.metadata?.tasacion_entrada_actual || prop.metadata?.tasador_entrada || {};
  const casa = prop.casa_datos || {};
  const nat = [];
  const vistos = new Set();
  for (const b of [...(prop.atributos_naturales || []), ...(guardado.nature || [])]) {
    const v = texto(b); const k = v.toLowerCase();
    if (v && !vistos.has(k)) { vistos.add(k); nat.push(v); }
  }
  return {
    area: Number(prop.superficie_m2) || 0,
    comuna: prop.comuna || '', region: prop.region || '',
    majorCityDistanceKm: t.hubKm ?? 999,
    communeDistanceKm: t.comunaKm,
    tourism: NIVEL_TURISMO[texto(t.turismo).toLowerCase()] ?? '',
    rol: heredado(prop.rol_situacion || guardado.rol, 'Rol propio', 'Sin rol'),
    water: heredado(prop.agua || guardado.water, 'Con agua', 'Sin factibilidad'),
    electricity: heredado(prop.electricidad || guardado.electricity, 'Conectada', 'Sin electricidad'),
    topography: texto(prop.topografia || guardado.topography),
    access: texto(prop.acceso || guardado.access),
    fencing: heredado(prop.cierre_perimetral || guardado.fencing, 'Cerrado completo', 'Sin cierre'),
    gate: heredado(prop.porton || guardado.gate, 'Con portón', 'Sin portón'),
    condominium: prop.condominio ? 'si' : 'no',
    vegetation: texto(prop.vegetacion), view: texto(prop.vista_principal),
    routeDistanceKm: Number(prop.distancia_ruta_principal_km) || 0,
    nature: nat,
    superficie_construida: Number(casa.superficieConstruida || casa.superficie_construida) || 0,
    materialidad: casa.materialidad || '',
    antiguedad_anios: Number(casa.antiguedadAnios || casa.antiguedad_anios) || 0,
    asking: Number(prop.precio_publicado) || 0,
  };
}

const cambios = [];
const sinCalcular = [];

for (const prop of props) {
  const t = territorio(prop);
  const inp = entrada(prop, t);
  if (!inp.area) { sinCalcular.push({ prop, motivo: 'sin superficie' }); continue; }
  const r = motor.calculate(inp);
  if (r.error) { sinCalcular.push({ prop, motivo: r.error }); continue; }

  const antes = Number(prop.metadata?.valor_tpl_recomendado) || 0;
  cambios.push({ prop, r, t, inp, antes, ahora: r.valorFinal });
}

console.log('COMUNA            SUP            ANTES          AHORA      DIF   MERCADO            $/m2');
for (const c of cambios.sort((a, b) => Math.abs(b.ahora - b.antes) - Math.abs(a.ahora - a.antes))) {
  const dif = c.antes > 0 ? Math.round(((c.ahora - c.antes) / c.antes) * 100) : null;
  const m = c.r.marketReference;
  console.log(
    String(c.prop.comuna || '').slice(0, 15).padEnd(17),
    String(c.r.area).padStart(7),
    clp(c.antes).padStart(15),
    clp(c.ahora).padStart(15),
    (dif === null ? ' (nuevo)' : (dif > 0 ? '+' : '') + dif + '%').padStart(8),
    '  ' + (m ? `${m.segmentName}/${m.origin} n=${m.sampleSize}` : 'SIN REFERENCIA').padEnd(28),
    String(c.r.area ? Math.round(c.ahora / c.r.area) : 0).padStart(6)
  );
}

const sinMercado = cambios.filter((c) => !c.r.marketReference);
if (sinMercado.length) {
  console.log(`\n${sinMercado.length} propiedad(es) sin referencia de mercado para su tramo: se tasan 100% con valor tecnico.`);
}
if (sinCalcular.length) {
  console.log('\nSin tasacion:');
  for (const s of sinCalcular) console.log(`  ${s.prop.codigo || s.prop.id} - ${s.motivo}`);
}

if (!APLICAR) {
  console.log('\n--- Simulacion. Ejecuta con --aplicar para guardar. ---');
  process.exit(0);
}

console.log('\nGuardando...');
let ok = 0;
for (const c of cambios) {
  const { prop, r, t, inp } = c;
  const limpio = { ...(prop.metadata || {}) };
  for (const clave of CLAVES_LEGADAS) delete limpio[clave];

  const metadata = {
    ...limpio,
    // Cifra titular: mitad valor tecnico, mitad mercado comunal del tramo.
    valor_tpl_recomendado: r.valorFinal,
    valor_tpl_tasador: r.valorFinal,
    valor_tpl_tasador_ajustado: r.valorFinal,
    // Los dos componentes por separado, para que el CRM y el informe puedan
    // explicar de donde sale el titular en vez de mostrar un numero pelado.
    valor_tpl_tecnico: r.valorTplTasadorAjustado,
    valor_tpl_tecnico_potencial: r.technicalPotential,
    valor_comunal: r.valor_comunal,
    valor_promedio_comunal: r.valor_comunal,
    valor_venta_apuro: r.valor_venta_apuro,
    valor_tpl_m2: r.area ? Math.round(r.valorFinal / r.area) : null,
    referencia_comunal_m2: r.marketReference?.medianM2Ajustado || null,
    referencia_comunal_segmento: r.marketReference?.segmentName || null,
    referencia_comunal_origen: r.marketReference?.origin || null,
    referencia_comunal_muestra: r.marketReference?.sampleSize || 0,
    tasacion_composicion: r.composicionValor,
    tasacion_advertencias: r.cautions || [],
    tasacion_entrada_actual: inp,
    tasacion_territorio: t,
    tasacion_version_motor: r.engineVersion,
    tasacion_calculada_at: new Date().toISOString(),
  };
  await api(`/rest/v1/tpl_propiedades?id=eq.${prop.id}`, { method: 'PATCH', body: JSON.stringify({ metadata }) });

  await api('/rest/v1/tpl_tasaciones', {
    method: 'POST',
    body: JSON.stringify({
      propiedad_id: prop.id, tipo: 'precisa',
      superficie_m2: r.area,
      precio_publicado: Number(prop.precio_publicado) || 0,
      precio_publicado_m2: prop.precio_publicado && r.area ? Math.round(prop.precio_publicado / r.area) : null,
      valor_tpl_total: r.valorFinal,
      valor_tpl_m2: r.area ? Math.round(r.valorFinal / r.area) : null,
      referencia_comunal_m2: r.marketReference?.medianM2 || null,
      clasificacion: r.priceAnalysis?.classification || null,
      es_oportunidad: Boolean(r.priceAnalysis?.opportunity),
      factores: r.adjustments || [],
      entrada: inp, resultado: r,
      version_motor: r.engineVersion,
    }),
  });
  ok++;
}
console.log(`Listo: ${ok} propiedades recalculadas con ${motor.ENGINE_VERSION}.`);
