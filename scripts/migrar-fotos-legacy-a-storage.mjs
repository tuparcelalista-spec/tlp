// Sube a Supabase Storage las fotos de propiedad que hoy siguen viviendo
// solo en frontend-v2/image/, y repunta tpl_propiedad_imagenes a esa URL.
//
// EL PROBLEMA
//   De 190 filas en tpl_propiedad_imagenes, 184 son rutas relativas legacy
//   (ej. "image/nacimiento/nac_el_roble/el_roble (5).webp"). apps/publico las
//   sirve hoy vía un rewrite same-origin (/legacy-image/:path* en
//   next.config.mjs) que reenvía a www.parcelalista.cl/image/:path* — es
//   decir, el sitio nuevo depende de que frontend-v2 siga desplegado para
//   mostrar el 96,8% de las fotos del catálogo. Mientras eso no cambie, no
//   hay migración real, solo una cañería hacia el sitio antiguo.
//   Ver docs/TPL-REPORTE-MAESTRO-ESTADO-MIGRACION.md y los comentarios de
//   apps/publico/lib/images/resolvePropertyImageUrl.ts (Fases A-E) — este
//   script implementa exactamente la Fase A+B+C ahí descritas.
//
// QUE HACE
//   1) Lee TODAS las filas de tpl_propiedad_imagenes (service role).
//   2) Para cada fila con ruta legacy, ubica el archivo real en
//      frontend-v2/image/... y lo sube (bytes reales, sin recomprimir ni
//      convertir) al bucket "tpl-propiedades-propietario" ya existente y
//      público, bajo la clave "legacy/<propiedad_id>/<orden>-<nombre>".
//   3) Verifica con una petición HTTP real a la URL pública resultante
//      (200 + content-length > 0) antes de tocar la base de datos.
//   4) Solo si (3) fue exitoso, actualiza esa fila: storage_path + url
//      nuevos, y guarda la url legacy anterior en
//      metadata.migracion_20260912_legacy_a_storage para poder revertir.
//   5) Si el mismo archivo fuente ya se subió en esta misma corrida (18
//      URLs se repiten entre fichas — plantillas compartidas), reutiliza el
//      objeto ya subido en vez de subirlo dos veces.
//
// QUE NO HACE
//   - No borra ni modifica NADA dentro de frontend-v2/image/.
//   - No quita el rewrite /legacy-image en next.config.mjs (sigue de
//     respaldo hasta que el 100% de las filas apunten a Storage).
//   - No toca filas cuyo url ya sea una URL absoluta (Storage o externa) ni
//     filas sin url.
//   - Si el archivo local no existe, o la subida/verificación falla, esa
//     fila NO se toca: sigue funcionando por el rewrite legacy, igual que
//     hoy. Nunca deja una propiedad sin foto a mitad de camino.
//
// USO
//   node scripts/migrar-fotos-legacy-a-storage.mjs                  (simula, no escribe ni sube nada)
//   node scripts/migrar-fotos-legacy-a-storage.mjs --limite 5        (simula solo, informe acotado a 5 filas)
//   node scripts/migrar-fotos-legacy-a-storage.mjs --aplicar --limite 5   (sube y escribe SOLO 5 filas, para validar antes del resto)
//   node scripts/migrar-fotos-legacy-a-storage.mjs --aplicar         (corrida completa)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = 'https://hwyscirbycojwndyzozn.supabase.co';
const BUCKET = 'tpl-propiedades-propietario';
const CARPETA_IMAGENES = path.join(raiz, 'frontend-v2', 'image');

const env = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8');
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
if (!KEY) {
  console.error('No se encontró SUPABASE_SERVICE_ROLE_KEY en .env.local — no se puede continuar.');
  process.exit(1);
}
const H_JSON = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const H_LECTURA = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const APLICAR = process.argv.includes('--aplicar');
const iLimite = process.argv.indexOf('--limite');
const LIMITE = iLimite !== -1 ? Number(process.argv[iLimite + 1]) : Infinity;

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function esUrlAbsoluta(valor) {
  return /^https?:\/\//i.test(valor);
}

/** Misma limpieza exacta que resolvePropertyImageUrl.ts, para no divergir del resolver real. */
function limpiarRutaLegacy(valor) {
  return valor.replace(/^\/+/, '').replace(/^image\//i, '');
}

function sanitizarNombre(nombreArchivo) {
  const ext = path.extname(nombreArchivo).toLowerCase();
  const base = path.basename(nombreArchivo, path.extname(nombreArchivo));
  const limpio = base
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'foto';
  return { nombre: `${limpio}${ext}`, ext };
}

async function api(ruta, opciones = {}) {
  const r = await fetch(URL_BASE + ruta, { headers: H_LECTURA, ...opciones });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${ruta} :: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

// --- 1) Auditoría real de la tabla (siempre se ejecuta, incluso en simulación) ---
const filas = await api(
  '/rest/v1/tpl_propiedad_imagenes?select=id,propiedad_id,storage_path,url,tipo,orden,es_portada,alt,metadata&order=propiedad_id.asc,orden.asc',
);

const yaStorage = [];
const legacy = [];
const otras = [];
for (const f of filas) {
  const valor = (f.url ?? '').trim();
  if (!valor) { otras.push(f); continue; }
  if (esUrlAbsoluta(valor)) { yaStorage.push(f); continue; }
  legacy.push(f);
}

console.log(`Filas totales en tpl_propiedad_imagenes: ${filas.length}`);
console.log(`Ya con URL absoluta (Storage u otra, sin tocar): ${yaStorage.length}`);
console.log(`Legacy (candidatas a migrar): ${legacy.length}`);
console.log(`Sin url (sin tocar): ${otras.length}`);
if (yaStorage.length) {
  console.log('\nMuestra de storage_path ya en uso (para contrastar la convención elegida abajo):');
  for (const f of yaStorage.slice(0, 5)) console.log(`  propiedad_id=${f.propiedad_id}  storage_path=${f.storage_path}`);
}

const objetivo = legacy.slice(0, LIMITE);
console.log(`\nFilas a procesar en esta corrida: ${objetivo.length}${Number.isFinite(LIMITE) ? ` (limitado con --limite ${LIMITE})` : ''}\n`);

// --- 2) Resolver archivo local + planear destino, SIN tocar red de escritura todavía ---
const plan = [];
for (const f of objetivo) {
  let rutaLimpia = limpiarRutaLegacy(f.url.trim());
  let archivoLocal = path.join(CARPETA_IMAGENES, rutaLimpia);
  let nombreOriginal = path.basename(rutaLimpia);
  let { nombre: nombreSanitizado, ext } = sanitizarNombre(nombreOriginal);
  if (ext === '.gif') {
    const webpCandidate = archivoLocal.replace(/\.gif$/i, '.webp');
    if (fs.existsSync(webpCandidate)) {
      archivoLocal = webpCandidate;
      ext = '.webp';
      nombreSanitizado = nombreSanitizado.replace(/\.gif$/i, '.webp');
    }
  }
  const existe = fs.existsSync(archivoLocal) && fs.statSync(archivoLocal).isFile();
  const contentType = CONTENT_TYPES[ext];
  const storagePath = `legacy/${f.propiedad_id}/${f.orden ?? 0}-${nombreSanitizado}`;
  plan.push({ fila: f, rutaLimpia, archivoLocal, existe, storagePath, contentType });
}

const sinArchivo = plan.filter((p) => !p.existe);
const sinContentType = plan.filter((p) => p.existe && !p.contentType);
const listas = plan.filter((p) => p.existe && p.contentType);

console.log('CODIGO_FILA  PROPIEDAD_ID                          ARCHIVO LOCAL                                          -> STORAGE_PATH');
for (const p of plan.slice(0, 25)) {
  const estado = !p.existe ? '[FALTA ARCHIVO]' : !p.contentType ? '[EXT DESCONOCIDA]' : '';
  console.log(`${String(p.fila.id).slice(0, 8)}  ${p.fila.propiedad_id}  ${p.rutaLimpia.slice(0, 55).padEnd(55)} -> ${p.storagePath} ${estado}`);
}
if (plan.length > 25) console.log(`... y ${plan.length - 25} filas más (informe completo queda en el log JSON).`);

console.log(`\nCon archivo local encontrado y tipo reconocido: ${listas.length}`);
if (sinArchivo.length) console.log(`SIN archivo local (no se tocan, quedan en fallback legacy): ${sinArchivo.length} -> ${sinArchivo.map((p) => p.rutaLimpia).join(', ')}`);
if (sinContentType.length) console.log(`Extensión no reconocida (no se tocan): ${sinContentType.length} -> ${sinContentType.map((p) => p.rutaLimpia).join(', ')}`);

if (!APLICAR) {
  console.log('\n--- Simulación. Nada se subió ni se escribió. Ejecuta con --aplicar para migrar de verdad. ---');
  process.exit(0);
}

// --- 3) Subida real + verificación + update, solo para las filas listas ---
const cacheSubidas = new Map(); // rutaLimpia -> { storagePath, urlPublica }
const resultados = [];

for (const p of listas) {
  const fila = p.fila;
  console.log(`[START] Fila ${fila.id} (${p.rutaLimpia}) -> ${p.storagePath}`);
  try {
    let destino = cacheSubidas.get(p.rutaLimpia);
    if (!destino) {
      console.log(`  Leyendo archivo local (${fs.statSync(p.archivoLocal).size} bytes)...`);
      const bytes = fs.readFileSync(p.archivoLocal);
      console.log(`  Enviando POST a ${URL_BASE}/storage/v1/object/${BUCKET}/${p.storagePath}...`);
      const subida = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${p.storagePath}`, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: 'Bearer ' + KEY,
          'Content-Type': p.contentType,
          'Content-Length': String(bytes.length),
          'x-upsert': 'true',
        },
        body: bytes,
        duplex: 'half',
        signal: AbortSignal.timeout(15000),
      });
      console.log(`  Respuesta subida: HTTP ${subida.status}`);
      if (!subida.ok) throw new Error(`subida ${subida.status}: ${(await subida.text()).slice(0, 200)}`);

      const urlPublica = `${URL_BASE}/storage/v1/object/public/${BUCKET}/${p.storagePath}`;
      console.log(`  Verificando URL pública: ${urlPublica}...`);
      const verificacion = await fetch(urlPublica, { method: 'GET', signal: AbortSignal.timeout(10000) });
      const largo = Number(verificacion.headers.get('content-length') || 0);
      console.log(`  Verificación: HTTP ${verificacion.status}, tamaño ${largo}`);
      if (!verificacion.ok || largo <= 0) {
        throw new Error(`verificación falló: HTTP ${verificacion.status}, content-length ${largo}`);
      }
      destino = { storagePath: p.storagePath, urlPublica };
      cacheSubidas.set(p.rutaLimpia, destino);
    } else {
      console.log(`  Reutilizando destino ya subido en esta corrida.`);
    }

    console.log(`  Actualizando fila ${fila.id} en tpl_propiedad_imagenes...`);
    await api(`/rest/v1/tpl_propiedad_imagenes?id=eq.${fila.id}`, {
      method: 'PATCH',
      headers: { ...H_JSON, Prefer: 'return=minimal' },
      body: JSON.stringify({
        storage_path: destino.storagePath,
        url: destino.urlPublica,
        metadata: {
          ...(fila.metadata || {}),
          migracion_20260912_legacy_a_storage: {
            url_legacy_anterior: fila.url,
            storage_path_anterior: fila.storage_path ?? null,
            fecha: new Date().toISOString(),
          },
        },
      }),
    });

    resultados.push({ id: fila.id, propiedad_id: fila.propiedad_id, ok: true, url_anterior: fila.url, url_nueva: destino.urlPublica });
    console.log(`OK   ${fila.id}  ${p.rutaLimpia.slice(0, 60)}`);
  } catch (error) {
    resultados.push({ id: fila.id, propiedad_id: fila.propiedad_id, ok: false, url_anterior: fila.url, error: error.message });
    console.log(`FAIL ${fila.id}  ${p.rutaLimpia.slice(0, 60)}  -> ${error.message}`);
  }
}

const exitosas = resultados.filter((r) => r.ok);
const fallidas = resultados.filter((r) => !r.ok);
console.log(`\nMigradas a Storage: ${exitosas.length}`);
console.log(`Fallidas (quedan en fallback legacy, sin cambios): ${fallidas.length}`);

const carpetaRespaldos = path.join(raiz, 'backups');
fs.mkdirSync(carpetaRespaldos, { recursive: true });
const logPath = path.join(carpetaRespaldos, `migracion-imagenes-storage.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(logPath, JSON.stringify({ resultados, sinArchivo: sinArchivo.map((p) => p.rutaLimpia), sinContentType: sinContentType.map((p) => p.rutaLimpia) }, null, 2));
console.log(`\nLog completo (para revertir si hace falta): ${path.relative(raiz, logPath)}`);
console.log('El rewrite /legacy-image de next.config.mjs sigue activo — no se toca en este script.');
