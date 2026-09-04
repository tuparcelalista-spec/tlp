import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'npm:pdf-lib@1.17.1';

// ---------------------------------------------------------------------------
// Genera y entrega el Informe Premium de tasación.
//
// v1 (2026-09-03, primera reescritura): antes esta función solo simulaba el
// envío y leía columnas que no existen. Se corrigió para generar un PDF real
// de una sola página con los números en texto plano.
//
// v2 (2026-09-03, esta reescritura): revisión con ojo crítico comercial --
// un informe de tasación real (el que entrega un tasador, un corredor o un
// banco) no es una lista de numeros: tiene portada, un rango de valores
// visual (no solo una cifra), ficha técnica en tabla, un diagnóstico de qué
// le falta a la propiedad para venderse bien, y una recomendación concreta de
// estrategia comercial. Esta versión agrega eso:
//   1. Foto de portada real (tpl_propiedad_imagenes), si existe.
//   2. Gráfico de barras comparando precio publicado / Valor TPL / referencia
//      comunal -- en vez de tres líneas de texto sueltas.
//   3. Insignia de clasificación (oportunidad / sobre mercado / alineado),
//      tomada directamente de tpl_tasaciones.clasificacion y es_oportunidad
//      -- el Tasador TPL ya calculó esto, el informe solo lo muestra bien.
//   4. Ficha técnica en tabla de dos columnas.
//   5. Diagnóstico comercial: mismo criterio que usa el Studio
//      (modules/studio/diagnostico.js) -- precio vs tasación, cantidad real
//      de fotos, video, largo de la descripción -- portado aquí porque esta
//      función corre en Deno y no puede importar un módulo del frontend.
//      Ver tarea de consolidación de datos de tasador/propiedad en un único
//      lugar (pendiente, análisis 2026-09-03).
//   6. Recomendación de canal: cuándo conviene video para redes, landing
//      page propia, o publicación en portal inmobiliario externo. Reglas
//      explicadas en `recomendacionesCanal()` más abajo, usando los MISMOS
//      tramos de valor (Premium/Alto/Medio/Base) que ya usa
//      tpl_studio_contexto_v1 (migración 20260902050000), para no inventar
//      un criterio nuevo que compita con el que ya ve el propietario en
//      Studio.
//
// Fuente real de datos: el único caller confirmado en producción es el botón
// "📜 Informe Premium TPL" del editor del CRM, que llama a
// tpl_crm_preparar_informe_tasacion_v1 (202608020010). Esa función EXIGE que
// la propiedad ya tenga una fila en tpl_tasaciones (el Tasador TPL, un motor
// de valorización DISTINTO del que usa el editor del CRM / el catálogo
// público -- ver nota de consolidación pendiente) y arma entrada_snapshot /
// resultado_snapshot con esa forma exacta (ver abajo). Se mantiene lectura
// defensiva con pick()/texto() por si algún caller futuro manda el formato
// anidado antiguo resultado_snapshot.tasador.tasacion.*.
//
// entrada_snapshot: { titulo, codigo, comuna, region, sector, superficie_m2,
//   precio_publicado, rol, agua, electricidad, acceso, topografia, suelo,
//   descripcion, imagenes[], atributos[], diagnostico }
// resultado_snapshot: { recommended, valorRecomendado, valor_tpl_m2,
//   referencia_comunal_m2, precio_publicado_m2, diferencia_pct,
//   clasificacion, es_oportunidad, factores[], entrada, resultado }
// ---------------------------------------------------------------------------

function pick(...valores: unknown[]): number | null {
  for (const v of valores) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function texto(...valores: unknown[]): string {
  for (const v of valores) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function lista(...valores: unknown[]): string[] {
  for (const v of valores) {
    if (Array.isArray(v) && v.length) {
      return v
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>;
            return texto(o.nombre, o.label, o.descripcion, o.titulo);
          }
          return '';
        })
        .filter(Boolean)
        .slice(0, 8);
    }
  }
  return [];
}

const clp = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

// Mismos tramos que tpl_studio_contexto_v1 (migración 20260902050000) y que
// ve el propietario en el Studio -- si esto se recalibra, hay que cambiarlo
// en los dos lugares o el informe y el Studio empiezan a contradecirse.
function nivelMarketing(valor: number | null): 'Premium' | 'Alto' | 'Medio' | 'Base' | null {
  if (!valor) return null;
  if (valor >= 150_000_000) return 'Premium';
  if (valor >= 80_000_000) return 'Alto';
  if (valor >= 35_000_000) return 'Medio';
  return 'Base';
}

// Mismas reglas que modules/studio/diagnostico.js (fuente de fotos real,
// umbral de descripción, tramos de brecha de precio). Portado a mano porque
// Deno no puede importar un módulo ES del frontend por ruta relativa.
function diagnosticoComercial(input: {
  precioPublicado: number | null;
  valorRecomendado: number | null;
  fotos: number;
  tieneVideo: boolean;
  descripcion: string;
}) {
  const hallazgos: { titulo: string; ok: boolean; detalle: string }[] = [];

  if (input.valorRecomendado && input.precioPublicado) {
    const brecha = (input.precioPublicado - input.valorRecomendado) / input.valorRecomendado;
    if (brecha > 0.25) {
      hallazgos.push({
        titulo: `Precio ${Math.round(brecha * 100)}% sobre la tasación TPL`,
        ok: false,
        detalle: 'Publicar tráfico pagado contra este precio trae visitas que no llaman al ver el valor. Ajustar antes de invertir en campaña.',
      });
    } else if (brecha > 0.10) {
      hallazgos.push({
        titulo: `Precio ${Math.round(brecha * 100)}% sobre la tasación TPL`,
        ok: true,
        detalle: 'Margen de negociación razonable; acorta el número de interesados pero no bloquea la venta.',
      });
    } else if (brecha < -0.15) {
      hallazgos.push({ titulo: 'Precio bajo la tasación TPL', ok: true, detalle: 'Posición fuerte para vender rápido; la publicidad rinde bien con este precio.' });
    } else {
      hallazgos.push({ titulo: 'Precio alineado con la tasación TPL', ok: true, detalle: 'El precio publicado está dentro de un rango de mercado razonable.' });
    }
  } else if (!input.precioPublicado) {
    hallazgos.push({ titulo: 'Sin precio publicado', ok: false, detalle: 'Un aviso sin precio recibe muchas menos consultas. Publicar un precio antes de invertir en campañas.' });
  }

  if (input.fotos < 5) {
    hallazgos.push({
      titulo: input.fotos === 0 ? 'Sin fotos' : `Solo ${input.fotos} ${input.fotos === 1 ? 'foto' : 'fotos'}`,
      ok: false,
      detalle: 'En una parcela el entorno es el producto. Bajo cinco fotos, el comprador no se hace una idea real del lugar.',
    });
  } else {
    hallazgos.push({ titulo: `${input.fotos} fotos cargadas`, ok: true, detalle: 'Material fotográfico suficiente para una ficha comercial.' });
  }

  hallazgos.push({
    titulo: input.tieneVideo ? 'Tiene video del terreno' : 'Sin video del terreno',
    ok: input.tieneVideo,
    detalle: input.tieneVideo
      ? 'El recorrido en video ayuda a mostrar pendiente, acceso y entorno.'
      : 'Un recorrido de un minuto muestra lo que las fotos no: pendiente, acceso, silencio del lugar.',
  });

  hallazgos.push({
    titulo: input.descripcion.length >= 200 ? 'Descripción completa' : 'Descripción breve',
    ok: input.descripcion.length >= 200,
    detalle: input.descripcion.length >= 200
      ? 'Suficiente texto para que el buscador y el comprador entiendan qué se vende.'
      : 'Google y el comprador necesitan texto para decidir si vale la pena el viaje.',
  });

  const bloqueantes = hallazgos.filter((h) => !h.ok).length;
  const preparacion = Math.max(0, Math.round(100 - hallazgos.length * 8 - bloqueantes * 14));
  return { hallazgos, preparacion, listaParaCampana: bloqueantes === 0 };
}

// Reglas de recomendación de canal -- esto responde directamente "cuándo una
// parcela necesita video para redes, landing page propia, o portal
// inmobiliario externo":
//   - Video: cuando hay atributos naturales diferenciadores (el terreno ES
//     el producto: bosque, río, vista, vertiente...) Y ya hay material
//     fotográfico mínimo para no invertir en video antes que en fotos.
//   - Landing propia: cuando el nivel de marketing es Alto/Premium -- ahí el
//     ticket justifica tráfico pagado propio en vez de competir en un
//     catálogo genérico. En Medio/Base el retorno de una landing dedicada no
//     alcanza a justificar el costo de mantenerla.
//   - Portal inmobiliario externo: siempre que la ficha ya pasó el
//     diagnóstico (listaParaCampana), porque el volumen del portal externo
//     es lo más eficiente para levantar leads rápido en cualquier tramo;
//     para Alto/Premium se recomienda ADEMÁS de la landing propia, no en
//     lugar de ella.
function recomendacionesCanal(input: {
  nivel: ReturnType<typeof nivelMarketing>;
  atributos: string[];
  fotos: number;
  listaParaCampana: boolean;
}) {
  const tieneDiferenciador = input.atributos.length > 0;
  const nivelAlto = input.nivel === 'Alto' || input.nivel === 'Premium';

  return [
    {
      canal: 'Video para redes sociales',
      recomendado: tieneDiferenciador && input.fotos >= 5,
      razon: !tieneDiferenciador
        ? 'No hay atributos naturales declarados que un video pueda mostrar mejor que una foto. Declarar atributos primero.'
        : input.fotos < 5
        ? 'Conviene completar el mínimo de fotos antes de invertir en video: es más barato y rápido de producir.'
        : 'El terreno tiene atributos que se explican mejor en movimiento (recorrido, pendiente, acceso, entorno).',
    },
    {
      canal: 'Landing page propia',
      recomendado: nivelAlto,
      razon: nivelAlto
        ? `Segmento "${input.nivel}": el ticket de esta propiedad justifica una página dedicada con tráfico pagado propio, en vez de competir dentro del catálogo general.`
        : `Segmento "${input.nivel || 'Base'}": el volumen de venta más eficiente en este tramo es el catálogo y el portal externo, no una landing dedicada.`,
    },
    {
      canal: 'Publicación en portal inmobiliario externo',
      recomendado: input.listaParaCampana,
      razon: input.listaParaCampana
        ? (nivelAlto
          ? 'Además de la landing propia: el portal externo suma volumen de leads que la landing sola no alcanza.'
          : 'Es el canal más eficiente para este tramo: volumen de búsquedas activas sin mantener una página propia.')
        : 'Hay hallazgos bloqueantes en el diagnóstico (ver arriba) -- publicar en un portal ahora es pagar por tráfico que se va al ver la ficha incompleta.',
    },
  ];
}

async function fetchImagen(url: string): Promise<{ bytes: Uint8Array; tipo: 'jpg' | 'png' } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (contentType.includes('png') || /\.png(\?|$)/i.test(url)) return { bytes, tipo: 'png' };
    return { bytes, tipo: 'jpg' };
  } catch {
    return null;
  }
}

const NAVY = rgb(0x1e / 255, 0x3a / 255, 0x5f / 255);
const GOLD = rgb(0xb8 / 255, 0x86 / 255, 0x0b / 255);
const GRAY = rgb(0x44 / 255, 0x44 / 255, 0x44 / 255);
const LIGHT_GRAY = rgb(0.92, 0.93, 0.95);
const DARK = rgb(0.13, 0.13, 0.13);
const GREEN = rgb(0x05 / 255, 0x96 / 255, 0x69 / 255);
const RED = rgb(0xdc / 255, 0x26 / 255, 0x26 / 255);
const LIGHT_BG = rgb(0.95, 0.965, 0.976);
const WHITE = rgb(1, 1, 1);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGEN = 56;
const ANCHO_UTIL = PAGE_W - MARGEN * 2;

interface Cursor {
  pdf: PDFDocument;
  pagina: PDFPage;
  y: number;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  pageNum: number;
}

function nuevaPagina(c: Cursor) {
  c.pagina = c.pdf.addPage([PAGE_W, PAGE_H]);
  c.pageNum += 1;
  c.y = PAGE_H - 50;
  c.pagina.drawText('TU PARCELA LISTA · Informe Premium de Tasación', { x: MARGEN, y: PAGE_H - 30, size: 8, font: c.fontRegular, color: GRAY });
  c.pagina.drawText(String(c.pageNum), { x: PAGE_W - MARGEN, y: 30, size: 8, font: c.fontRegular, color: GRAY });
}

function asegurarEspacio(c: Cursor, minimo: number) {
  if (c.y - minimo < 60) nuevaPagina(c);
}

function linea(c: Cursor, texto2: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; espacio?: number } = {}) {
  const size = opts.size ?? 11;
  c.pagina.drawText(texto2, { x: MARGEN, y: c.y, size, font: opts.font ?? c.fontRegular, color: opts.color ?? DARK });
  c.y -= opts.espacio ?? size + 8;
}

function parrafoAncho(c: Cursor, texto2: string, opts: { size?: number; color?: ReturnType<typeof rgb>; anchoMax?: number } = {}) {
  const size = opts.size ?? 10;
  const anchoMax = opts.anchoMax ?? ANCHO_UTIL;
  const palabras = texto2.split(' ');
  let lineaActual = '';
  for (const palabra of palabras) {
    const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    if (c.fontRegular.widthOfTextAtSize(prueba, size) > anchoMax && lineaActual) {
      linea(c, lineaActual, { size, color: opts.color ?? GRAY, espacio: size + 4 });
      lineaActual = palabra;
    } else {
      lineaActual = prueba;
    }
  }
  if (lineaActual) linea(c, lineaActual, { size, color: opts.color ?? GRAY, espacio: size + 4 });
}

function tituloSeccion(c: Cursor, texto2: string) {
  asegurarEspacio(c, 60);
  c.pagina.drawRectangle({ x: MARGEN, y: c.y - 4, width: 4, height: 16, color: GOLD });
  c.pagina.drawText(texto2, { x: MARGEN + 12, y: c.y, size: 14, font: c.fontBold, color: NAVY });
  c.y -= 26;
}

/** Gráfico de barras horizontal comparando hasta 3 valores. */
function graficoBarras(c: Cursor, filas: { etiqueta: string; valor: number; color: ReturnType<typeof rgb> }[]) {
  if (!filas.length) return;
  asegurarEspacio(c, filas.length * 34 + 10);
  const maxValor = Math.max(...filas.map((f) => f.valor));
  const anchoMax = ANCHO_UTIL - 150;
  for (const fila of filas) {
    const w = maxValor > 0 ? Math.max(6, (fila.valor / maxValor) * anchoMax) : 0;
    c.pagina.drawText(fila.etiqueta, { x: MARGEN, y: c.y, size: 9.5, font: c.fontBold, color: GRAY });
    c.y -= 13;
    c.pagina.drawRectangle({ x: MARGEN, y: c.y - 14, width: anchoMax, height: 16, color: LIGHT_GRAY });
    c.pagina.drawRectangle({ x: MARGEN, y: c.y - 14, width: w, height: 16, color: fila.color });
    c.pagina.drawText(clp(fila.valor), { x: MARGEN + anchoMax + 10, y: c.y - 11, size: 10, font: c.fontBold, color: DARK });
    c.y -= 28;
  }
}

function insignia(c: Cursor, textoInsignia: string, color: ReturnType<typeof rgb>) {
  const size = 10.5;
  const w = c.fontBold.widthOfTextAtSize(textoInsignia, size) + 20;
  c.pagina.drawRectangle({ x: MARGEN, y: c.y - 16, width: w, height: 22, color });
  c.pagina.drawText(textoInsignia, { x: MARGEN + 10, y: c.y - 10, size, font: c.fontBold, color: WHITE });
  c.y -= 34;
}

function filaChecklist(c: Cursor, item: { titulo: string; ok: boolean; detalle: string }) {
  asegurarEspacio(c, 40);
  const colorPunto = item.ok ? GREEN : RED;
  c.pagina.drawRectangle({ x: MARGEN, y: c.y - 9, width: 10, height: 10, color: colorPunto });
  c.pagina.drawText(item.titulo, { x: MARGEN + 18, y: c.y - 9, size: 10.5, font: c.fontBold, color: DARK });
  c.y -= 22;
  // detalle indentado
  const size = 9;
  const anchoMax = ANCHO_UTIL - 18;
  const palabras = item.detalle.split(' ');
  let lineaActual = '';
  const dibujarLineaIndentada = (txt: string) => {
    c.pagina.drawText(txt, { x: MARGEN + 18, y: c.y, size, font: c.fontRegular, color: GRAY });
    c.y -= size + 5;
  };
  for (const palabra of palabras) {
    const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    if (c.fontRegular.widthOfTextAtSize(prueba, size) > anchoMax && lineaActual) {
      dibujarLineaIndentada(lineaActual);
      lineaActual = palabra;
    } else {
      lineaActual = prueba;
    }
  }
  if (lineaActual) dibujarLineaIndentada(lineaActual);
  c.y -= 8;
}

function filaTabla(c: Cursor, etiqueta: string, valor: string, fondo: boolean) {
  const alto = 20;
  if (fondo) c.pagina.drawRectangle({ x: MARGEN, y: c.y - 14, width: ANCHO_UTIL, height: alto, color: LIGHT_BG });
  c.pagina.drawText(etiqueta, { x: MARGEN + 8, y: c.y - 9, size: 9.5, font: c.fontBold, color: GRAY });
  c.pagina.drawText(valor || '—', { x: MARGEN + 190, y: c.y - 9, size: 10, font: c.fontRegular, color: DARK });
  c.y -= alto;
}

function filaCanal(c: Cursor, item: { canal: string; recomendado: boolean; razon: string }) {
  asegurarEspacio(c, 50);
  const color = item.recomendado ? GREEN : GRAY;
  const etiqueta = item.recomendado ? 'RECOMENDADO AHORA' : 'NO ES PRIORIDAD AHORA';
  c.pagina.drawRectangle({ x: MARGEN, y: c.y - 18, width: ANCHO_UTIL, height: 4, color });
  c.y -= 12;
  c.pagina.drawText(item.canal, { x: MARGEN, y: c.y, size: 12, font: c.fontBold, color: NAVY });
  const wEtq = c.fontBold.widthOfTextAtSize(etiqueta, 8) + 14;
  c.pagina.drawRectangle({ x: MARGEN + ANCHO_UTIL - wEtq, y: c.y - 2, width: wEtq, height: 14, color });
  c.pagina.drawText(etiqueta, { x: MARGEN + ANCHO_UTIL - wEtq + 7, y: c.y + 1, size: 8, font: c.fontBold, color: WHITE });
  c.y -= 18;
  parrafoAncho(c, item.razon, { size: 9.5 });
  c.y -= 10;
}

async function armarPdf(orden: {
  codigo: string;
  contacto: Record<string, unknown>;
  entrada: Record<string, unknown>;
  resultado: Record<string, unknown>;
  fotos: { url: string }[];
  tieneVideo: boolean;
}): Promise<Uint8Array> {
  const tasador = (orden.resultado?.tasador as Record<string, unknown>) || {};
  const tasacionAnidada = (tasador.tasacion as Record<string, unknown>) || {};

  const valorRecomendado = pick(
    orden.resultado?.valorRecomendado,
    orden.resultado?.recommended,
    orden.resultado?.valor_tpl_recomendado,
    tasacionAnidada.valor_tpl_total,
    tasacionAnidada.valor_recomendado,
  );
  const valorM2 = pick(orden.resultado?.valor_tpl_m2, tasacionAnidada.valor_tpl_m2);
  const referenciaComunalM2 = pick(orden.resultado?.referencia_comunal_m2, tasacionAnidada.referencia_comunal_m2);
  const precioPublicado = pick(orden.entrada?.precio_publicado, orden.resultado?.precio_publicado);
  const diferenciaPct = pick(orden.resultado?.diferencia_pct);
  const clasificacion = texto(orden.resultado?.clasificacion);
  const esOportunidad = orden.resultado?.es_oportunidad === true;
  const factores = lista(orden.resultado?.factores);

  const titulo = texto(orden.entrada?.titulo, orden.entrada?.codigo, 'Tu propiedad');
  const comuna = texto(orden.entrada?.comuna, orden.entrada?.sector);
  const region = texto(orden.entrada?.region);
  const superficie = pick(orden.entrada?.superficie_m2);
  const nombreCliente = texto(orden.contacto?.nombre, 'Cliente');
  const descripcion = texto(orden.entrada?.descripcion);
  const atributos = lista(orden.entrada?.atributos);
  const referenciaComunalTotal = referenciaComunalM2 && superficie ? Math.round(referenciaComunalM2 * superficie) : null;

  const nivel = nivelMarketing(valorRecomendado);
  const diag = diagnosticoComercial({
    precioPublicado,
    valorRecomendado,
    fotos: orden.fotos.length,
    tieneVideo: orden.tieneVideo,
    descripcion,
  });
  const canales = recomendacionesCanal({ nivel, atributos, fotos: orden.fotos.length, listaParaCampana: diag.listaParaCampana });

  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const c: Cursor = { pdf, pagina: pdf.addPage([PAGE_W, PAGE_H]), y: PAGE_H - 50, fontRegular, fontBold, pageNum: 1 };

  // ===================== PÁGINA 1: PORTADA + RESUMEN EJECUTIVO =====================
  c.pagina.drawText('TU PARCELA LISTA', { x: MARGEN, y: c.y, size: 12, font: fontBold, color: GOLD });
  c.y -= 20;
  linea(c, 'Informe Premium de Tasación', { size: 22, font: fontBold, color: NAVY, espacio: 30 });
  linea(c, `Orden ${orden.codigo}  ·  ${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}`, { size: 10, color: GRAY, espacio: 22 });

  // Foto de portada real, si hay alguna disponible.
  const fotoPortada = orden.fotos[0]?.url ? await fetchImagen(orden.fotos[0].url) : null;
  if (fotoPortada) {
    try {
      const img = fotoPortada.tipo === 'png' ? await pdf.embedPng(fotoPortada.bytes) : await pdf.embedJpg(fotoPortada.bytes);
      const alturaImg = 180;
      const anchoImg = img.height > 0 ? Math.min(ANCHO_UTIL, img.width * (alturaImg / img.height)) : ANCHO_UTIL;
      c.pagina.drawImage(img, { x: MARGEN, y: c.y - alturaImg, width: anchoImg, height: alturaImg });
      c.y -= alturaImg + 14;
    } catch {
      // Imagen no soportada (formato raro) -- se omite sin romper el informe.
    }
  }

  c.pagina.drawLine({ start: { x: MARGEN, y: c.y }, end: { x: MARGEN + ANCHO_UTIL, y: c.y }, thickness: 1, color: NAVY });
  c.y -= 22;

  linea(c, `Propiedad: ${titulo}`, { size: 12, font: fontBold, espacio: 18 });
  const ubicacion = [comuna, region].filter(Boolean).join(', ');
  if (ubicacion) linea(c, `Ubicación: ${ubicacion}`, { size: 11, espacio: 16 });
  if (superficie) linea(c, `Superficie: ${superficie.toLocaleString('es-CL')} m²`, { size: 11, espacio: 16 });
  linea(c, `Para: ${nombreCliente}`, { size: 11, espacio: 20 });

  if (clasificacion || esOportunidad) {
    const textoInsignia = esOportunidad ? `★ OPORTUNIDAD DETECTADA — ${clasificacion || 'bajo mercado'}` : clasificacion.toUpperCase();
    insignia(c, textoInsignia, esOportunidad ? GREEN : (diferenciaPct && diferenciaPct > 25 ? RED : GOLD));
  }

  tituloSeccion(c, 'Comparación de valores');
  const filasGrafico: { etiqueta: string; valor: number; color: ReturnType<typeof rgb> }[] = [];
  if (precioPublicado) filasGrafico.push({ etiqueta: 'PRECIO PUBLICADO', valor: precioPublicado, color: GOLD });
  if (valorRecomendado) filasGrafico.push({ etiqueta: 'VALOR TPL RECOMENDADO', valor: valorRecomendado, color: NAVY });
  if (referenciaComunalTotal) filasGrafico.push({ etiqueta: 'REFERENCIA DE MERCADO COMUNAL (estimada)', valor: referenciaComunalTotal, color: GRAY });
  if (filasGrafico.length) {
    graficoBarras(c, filasGrafico);
  } else {
    parrafoAncho(c, 'Los valores detallados de esta tasación se están procesando y se enviarán a este mismo correo apenas estén disponibles.', { size: 10 });
  }
  if (valorM2) linea(c, `Valor TPL por m²: ${clp(valorM2)}`, { size: 10, color: GRAY, espacio: 16 });
  if (diferenciaPct != null) {
    const signo = diferenciaPct > 0 ? '+' : '';
    linea(c, `Diferencia precio publicado vs. Valor TPL: ${signo}${Math.round(diferenciaPct)}%`, { size: 10, color: GRAY, espacio: 16 });
  }

  if (factores.length) {
    tituloSeccion(c, 'Factores que explican este valor');
    factores.forEach((f) => linea(c, `•  ${f}`, { size: 9.5, color: GRAY, espacio: 15 }));
  }

  // ===================== PÁGINA 2: FICHA TÉCNICA + DIAGNÓSTICO =====================
  nuevaPagina(c);
  tituloSeccion(c, 'Ficha técnica');
  const filasFicha: [string, string][] = [
    ['Rol de avalúo', texto(orden.entrada?.rol)],
    ['Agua', texto(orden.entrada?.agua)],
    ['Electricidad', texto(orden.entrada?.electricidad)],
    ['Acceso', texto(orden.entrada?.acceso)],
    ['Topografía', texto(orden.entrada?.topografia)],
    ['Suelo', texto(orden.entrada?.suelo)],
  ];
  filasFicha.forEach(([etq, val], i) => filaTabla(c, etq, val, i % 2 === 0));
  c.y -= 10;

  if (atributos.length) {
    linea(c, 'Atributos naturales:', { size: 10, font: fontBold, color: NAVY, espacio: 15 });
    parrafoAncho(c, atributos.join('  ·  '), { size: 9.5 });
    c.y -= 6;
  }

  if (descripcion) {
    tituloSeccion(c, 'Descripción');
    parrafoAncho(c, descripcion, { size: 9.5 });
    c.y -= 6;
  }

  tituloSeccion(c, `Diagnóstico comercial — preparación de venta: ${diag.preparacion}/100`);
  parrafoAncho(c, diag.listaParaCampana
    ? 'Esta ficha no tiene hallazgos que bloqueen una campaña de venta.'
    : 'Hay puntos que conviene resolver antes de invertir en publicidad -- ver detalle abajo.', { size: 9.5 });
  c.y -= 6;
  diag.hallazgos.forEach((h) => filaChecklist(c, h));

  // ===================== PÁGINA 3: RECOMENDACIÓN DE CANAL + TPL ASESORES =====================
  nuevaPagina(c);
  tituloSeccion(c, `Recomendación de estrategia comercial${nivel ? ` — segmento ${nivel}` : ''}`);
  parrafoAncho(c, 'Con base en el valor de la propiedad, sus atributos y el estado de la ficha, esto es lo que TPL recomienda invertir primero:', { size: 9.5 });
  c.y -= 8;
  canales.forEach((canal) => filaCanal(c, canal));

  c.y -= 6;
  asegurarEspacio(c, 140);
  c.pagina.drawRectangle({ x: MARGEN, y: c.y - 118, width: ANCHO_UTIL, height: 120, color: LIGHT_BG });
  c.y -= 18;
  c.pagina.drawText('¿Prefieres que un asesor TPL venda por ti?', { x: MARGEN + 14, y: c.y, size: 13, font: fontBold, color: NAVY });
  c.y -= 20;
  const parrafoAsesores = [
    'TPL Asesores puede tomar la venta de tu propiedad de principio a fin: atención de',
    'interesados, visitas, negociación y cierre. Trabajamos por comisión -- 2% del valor de',
    'venta final, solo si vendemos -- actuando como tu corredor partner.',
  ];
  parrafoAsesores.forEach((l) => {
    c.pagina.drawText(l, { x: MARGEN + 14, y: c.y, size: 9.5, font: fontRegular, color: GRAY });
    c.y -= 14;
  });
  c.y -= 6;
  c.pagina.drawText('Escríbenos a tuparcelalista@gmail.com o por WhatsApp al +56 9 8850 8361', { x: MARGEN + 14, y: c.y, size: 10, font: fontBold, color: NAVY });
  c.y -= 40;

  c.pagina.drawText('Tu Parcela Lista · Área de Tasaciones', { x: MARGEN, y: 40, size: 9, font: fontRegular, color: GRAY });

  return pdf.save();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const internalSecret = Deno.env.get('TPL_INTERNAL_FUNCTIONS_SECRET') || '';

    if (req.headers.get('x-tpl-internal-secret') !== internalSecret) {
      return new Response('unauthorized', { status: 401 });
    }

    const { orden_id } = await req.json();
    if (!orden_id) throw new Error('No orden_id provided');

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: orden, error: ordenError } = await supabase
      .from('tpl_ordenes_informe')
      .select('id,codigo,contacto,entrada_snapshot,resultado_snapshot,tasacion_id,propiedad_id')
      .eq('id', orden_id)
      .single();
    if (ordenError || !orden) throw new Error(`Orden no encontrada: ${ordenError?.message || orden_id}`);

    // Fotos reales (tpl_propiedad_imagenes es la fuente de verdad -- NO
    // metadata.imagenes, que es el patrón viejo) y video, si la orden trae
    // propiedad_id. Sin esto el informe premium quedaba sin ninguna foto y
    // sin poder saber si existe un video, aunque ambos ya estén cargados.
    let fotos: { url: string }[] = [];
    let tieneVideo = false;
    if (orden.propiedad_id) {
      const [mediaRes, propRes] = await Promise.all([
        supabase
          .from('tpl_propiedad_imagenes')
          .select('url,storage_path,es_portada,orden')
          .eq('propiedad_id', orden.propiedad_id)
          .eq('tipo', 'foto')
          .order('es_portada', { ascending: false })
          .order('orden', { ascending: true }),
        supabase.from('tpl_propiedades').select('metadata').eq('id', orden.propiedad_id).maybeSingle(),
      ]);
      fotos = (mediaRes.data || [])
        .map((f) => ({ url: f.url || f.storage_path || '' }))
        .filter((f) => f.url);
      const meta = (propRes.data?.metadata as Record<string, unknown>) || {};
      tieneVideo = Boolean(texto(meta.videoUrl));
      if (!fotos.length) {
        const metaImagenes = Array.isArray(meta.imagenes) ? (meta.imagenes as string[]) : [];
        fotos = metaImagenes.filter(Boolean).map((url) => ({ url }));
      }
    }

    const pdfBytes = await armarPdf({
      codigo: orden.codigo,
      contacto: orden.contacto || {},
      entrada: orden.entrada_snapshot || {},
      resultado: orden.resultado_snapshot || {},
      fotos,
      tieneVideo,
    });

    const storagePath = `${orden.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('tpl-informes-tasacion')
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw new Error(`No se pudo guardar el PDF: ${uploadError.message}`);

    const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    await supabase.from('tpl_informes_tasacion').upsert({
      orden_id: orden.id,
      tasacion_id: orden.tasacion_id || null,
      propiedad_id: orden.propiedad_id || null,
      version_plantilla: 'premium_v2',
      storage_bucket: 'tpl-informes-tasacion',
      storage_path: storagePath,
      hash_documento: hashHex,
      paginas: 3,
      estado: 'disponible',
      generado_at: new Date().toISOString(),
    }, { onConflict: 'orden_id' });

    await supabase.from('tpl_ordenes_informe').update({
      estado: 'disponible',
      disponible_at: new Date().toISOString(),
    }).eq('id', orden.id);

    if (resendApiKey) {
      const emailCliente = texto(orden.contacto?.email) || 'contacto@parcelalista.cl';
      const nombreCliente = texto(orden.contacto?.nombre, 'Cliente');
      const resend = new Resend(resendApiKey);
      const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

      await resend.emails.send({
        from: 'Informes TPL <informes@parcelalista.cl>',
        to: [emailCliente],
        bcc: ['tuparcelalista@gmail.com'],
        reply_to: 'tuparcelalista@gmail.com',
        subject: `Tu Informe Premium de Tasación (Orden ${orden.codigo})`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#17324d">
            <h1 style="font-size:20px">Hola ${nombreCliente}, aquí tienes tu Informe Premium</h1>
            <p>Adjuntamos el PDF con el detalle de la tasación, el diagnóstico comercial de tu ficha
            y nuestra recomendación de estrategia de venta.</p>
            <div style="background:#f2f6f9;padding:16px;border-radius:10px;margin:16px 0">
              <strong>¿Prefieres que lo vendamos por ti?</strong>
              <p style="margin:8px 0 0">TPL Asesores puede administrar la venta completa —consultas, visitas,
              negociación y cierre— por una comisión del 2% del valor de venta, solo si concretamos la venta.
              Responde este correo o escríbenos por WhatsApp al +56 9 8850 8361 si te interesa.</p>
            </div>
            <br><small>Tu Parcela Lista · Área de Tasaciones</small>
          </div>
        `,
        attachments: [{ filename: `Informe_TPL_${orden.codigo}.pdf`, content: pdfBase64 }],
      });
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('generar-informe-premium', error);
    return new Response('error', { status: 500 });
  }
});
