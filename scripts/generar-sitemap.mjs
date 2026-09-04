// Regenera frontend-v2/sitemap.xml con las paginas publicas reales del sitio
// mas una entrada por cada parcela publicada en Supabase.
//
// POR QUE EXISTE
//   El sitemap.xml que habia en el repo solo tenia 3 URLs (home, la ficha
//   parcela.html sin id, y el cotizador). Faltaban el resto de paginas
//   publicas del sitio (campo-chileno, como-comprar, comenzar-proyecto,
//   politica de privacidad, terminos, la landing de publicar, la red de
//   partners) y, sobre todo, faltaba una entrada por cada parcela.html?id=
//   real: sin eso los buscadores nunca se enteran de que existen fichas
//   individuales para indexar.
//
// QUE NO HACE
//   No inventa URLs: las paginas estaticas estan listadas a mano abajo
//   (hay que agregar una linea si se crea una pagina publica nueva), y las
//   fichas de parcela salen de tpl_propiedades con estado='publicada' en
//   Supabase, igual que el resto de scripts de sincronizacion de este
//   proyecto.
//
// USO
//   node scripts/generar-sitemap.mjs             (simula, muestra el resumen)
//   node scripts/generar-sitemap.mjs --aplicar   (escribe frontend-v2/sitemap.xml)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEMAP = path.join(raiz, 'frontend-v2', 'sitemap.xml');
const URL_BASE = 'https://hwyscirbycojwndyzozn.supabase.co';
const SITIO = 'https://www.parcelalista.cl';
const APLICAR = process.argv.includes('--aplicar');

const env = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8');
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

// Paginas estaticas publicas (no las de plataforma/, esas ya estan bloqueadas
// en robots.txt). Si se agrega una pagina publica nueva, sumarla aqui.
const PAGINAS_ESTATICAS = [
  { loc: '/', prioridad: '1.0' },
  { loc: '/parcela.html', prioridad: '0.5' },
  { loc: '/cotizador.html', prioridad: '0.8' },
  { loc: '/campo-chileno.html', prioridad: '0.6' },
  { loc: '/como-comprar.html', prioridad: '0.6' },
  { loc: '/comenzar-proyecto.html', prioridad: '0.7' },
  { loc: '/plataforma/publicar-v2/index.html', prioridad: '0.7' },
  { loc: '/red-partner-v2/index.html', prioridad: '0.5' },
  { loc: '/politica-privacidad.html', prioridad: '0.3' },
  { loc: '/terminos.html', prioridad: '0.3' },
];

const respuesta = await fetch(
  URL_BASE + '/rest/v1/tpl_propiedades?select=codigo,updated_at&estado=eq.publicada&order=codigo.asc',
  { headers: H }
);
if (!respuesta.ok) {
  console.error('Supabase respondio', respuesta.status, await respuesta.text());
  process.exit(1);
}
const propiedades = await respuesta.json();
const conCodigo = propiedades.filter((p) => p.codigo);

const hoy = new Date().toISOString().slice(0, 10);

const filas = [
  ...PAGINAS_ESTATICAS.map((p) => ({
    loc: SITIO + p.loc,
    prioridad: p.prioridad,
    lastmod: hoy,
  })),
  ...conCodigo.map((p) => ({
    loc: `${SITIO}/parcela.html?id=${encodeURIComponent(p.codigo)}`,
    prioridad: '0.9',
    lastmod: (p.updated_at || hoy).slice(0, 10),
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${filas.map((f) => `  <url><loc>${f.loc}</loc><lastmod>${f.lastmod}</lastmod><priority>${f.prioridad}</priority></url>`).join('\n')}
</urlset>
`;

const original = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, 'utf8') : '';

console.log(`Paginas estaticas: ${PAGINAS_ESTATICAS.length}`);
console.log(`Parcelas publicadas con codigo: ${conCodigo.length} (de ${propiedades.length} publicadas totales)`);
console.log(`Total de URLs en el sitemap nuevo: ${filas.length}`);

if (xml === original) {
  console.log('\nEl sitemap ya esta al dia. Nada que hacer.');
  process.exit(0);
}

if (!APLICAR) {
  console.log('\nSimulacion. Vuelve a correrlo con --aplicar para escribir frontend-v2/sitemap.xml.');
  process.exit(0);
}

fs.writeFileSync(SITEMAP, xml, 'utf8');
console.log(`\nEscrito ${path.relative(raiz, SITEMAP)} con ${filas.length} URLs.`);
console.log('Recuerda volver a correr este script cada vez que se publiquen o den de baja parcelas (o agendarlo).');
