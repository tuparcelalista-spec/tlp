import { state } from '../../core/store.js';
import { clp, esc, marcarEstado } from '../../core/boot.js';
import { diagnosticar } from './diagnostico.js';

// ---------------------------------------------------------------------------
// PLAN IMPULSO  ·  ÚNICO LUGAR DONDE SE DEFINE EL PRECIO Y QUÉ INCLUYE
// ---------------------------------------------------------------------------
const PLAN_IMPULSO = Object.freeze({
  codigo: 'plan_marketing_impulso',
  nombre: 'Plan Impulso TPL',
  precio: 55000,
  incluye: [
    ['Tu página de venta publicada', 'La armamos con tus fotos, tu precio y el sello de tasación TPL, y la dejamos en línea con dirección propia.'],
    ['Anuncio en Google', 'Lo mostramos a quien está buscando parcelas en tu zona y en tu rango de precio, no a cualquiera.'],
    ['Informe de resultados', 'Al cierre te decimos cuánta gente llegó, qué buscaban y qué conviene ajustar. Lo escribe un asesor TPL, no un panel automático.'],
  ],
});

// ---------------------------------------------------------------------------
// PLAN PROFESIONAL · suscripción mensual (self-service, vía tpl_planes_comerciales)
// El precio debe coincidir con precio_mensual_clp del plan 'profesional'
// (migración 20260903080000). Si se cambia el precio en la base de datos,
// cambiar también este número, o el correo de pago no coincidirá con lo que
// el usuario ve aquí.
// ---------------------------------------------------------------------------
const PLAN_PROFESIONAL = Object.freeze({
  codigo: 'profesional',
  nombre: 'Plan Profesional TPL Business',
  precioMensual: 39900,
  incluye: [
    'Landing individual y asesoría con IA',
    'Seguimiento de leads y agenda de visitas',
    'Embudo comercial e informe semanal',
    'Piezas de marketing y asesoría de precio',
  ],
});

// Las estrategias que no se compran: se hacen, y el Studio dice cómo.
const ESTRATEGIAS = Object.freeze([
  {
    clave: 'ia_aviso',
    modo: 'ia',
    titulo: 'Redactar el aviso con IA',
    resumen: 'Escribimos el título y la descripción con los datos que ya declaraste.',
    cuando: (d) => d.hallazgos.some((h) => h.clave === 'descripcion_corta'),
    accion: { texto: 'Redactar ahora', destino: '../publicar-v2/index.html' },
  },
  {
    clave: 'fotos',
    modo: 'manual',
    titulo: 'Sumar fotos y un video',
    resumen: 'El material visual es lo que decide si alguien viaja a ver el terreno.',
    cuando: (d) => d.fotos < 5 || !d.tieneVideo,
    accion: { texto: 'Cómo fotografiar tu parcela', destino: '../../como-comprar.html' },
  },
  {
    clave: 'antecedentes',
    modo: 'manual',
    titulo: 'Completar los antecedentes que faltan',
    resumen: 'Cada dato declarado es un ajuste que la tasación puede aplicar.',
    cuando: (d) => d.hallazgos.some((h) => h.clave === 'antecedentes'),
    accion: { texto: 'Ver qué falta', destino: '#informe' },
  },
  {
    clave: 'landing',
    modo: 'tpl',
    titulo: 'Armar tu página de venta',
    resumen: 'Una página propia para compartir por WhatsApp, sin depender del catálogo.',
    cuando: () => true,
    accion: { texto: 'Abrir el editor', destino: '#landing' },
  },
  {
    clave: 'campana',
    modo: 'tpl',
    titulo: 'Elegir el ritmo de tu campaña',
    resumen: 'Tú decides cuánta prisa tienes y cuánto inviertes por día.',
    cuando: (d) => d.listaParaCampana,
    accion: { texto: 'Ver planes', destino: '#campanas' },
  },
]);

const ETIQUETA_MODO = { ia: 'Con IA de TPL', manual: 'Lo haces tú', tpl: 'Lo hacemos juntos' };

function pasoHtml(numero, titulo, estado, cuerpo) {
  return `
    <li class="paso paso--${estado}">
      <span class="paso__n">${numero}</span>
      <div class="paso__cuerpo">
        <h3>${esc(titulo)}</h3>
        ${cuerpo}
      </div>
    </li>`;
}

export function render() {
  const p = state.propiedad;
  const t = state.tasacion;

  if (!p) {
    return `<div class="vacio"><h2>No encontramos tu propiedad</h2>
      <p>Necesitamos vincular tu cuenta a una propiedad para armar tu plan.</p></div>`;
  }

  const d = diagnosticar(p, t, state.fotosReales);
  state.diagnostico = d;

  const estrategias = ESTRATEGIAS.filter((e) => e.cuando(d));

  // Paso 1 · Diagnóstico
  const diagnosticoHtml = `
    <p class="paso__lead">Esto es lo que vemos hoy en tu ficha. El plan que te proponemos sale de aquí.</p>
    <div class="preparacion">
      <div class="preparacion__barra"><span style="width:${d.preparacion}%"></span></div>
      <span class="preparacion__n">${d.preparacion}% lista para salir al mercado</span>
    </div>
    <ul class="hallazgos">
      ${d.hallazgos.length
        ? d.hallazgos.map((h) => `
          <li class="hallazgo${h.bloquea ? ' hallazgo--bloquea' : ''}">
            <strong>${esc(h.titulo)}</strong>
            <span>${esc(h.detalle)}</span>
            <em>${esc(h.accion)}</em>
          </li>`).join('')
        : '<li class="hallazgo hallazgo--ok"><strong>Tu ficha está completa</strong><span>No vemos nada que frene la venta. Es buen momento para invertir en difusión.</span></li>'}
    </ul>`;

  // Paso 2 · Estrategias
  const estrategiasHtml = `
    <p class="paso__lead">En este orden. Lo gratis primero: no tiene sentido pagar tráfico hacia un aviso a medio terminar.</p>
    <div class="estrategias">
      ${estrategias.map((e) => `
        <article class="estrategia">
          <span class="estrategia__modo estrategia__modo--${e.modo}">${ETIQUETA_MODO[e.modo]}</span>
          <h4>${esc(e.titulo)}</h4>
          <p>${esc(e.resumen)}</p>
          <a class="estrategia__link" href="${esc(e.accion.destino)}">${esc(e.accion.texto)} →</a>
        </article>`).join('')}
    </div>`;

  // Paso 3 · Plan Impulso
  const bloqueado = !d.listaParaCampana;
  const impulsoHtml = `
    <p class="paso__lead">Cuando tu ficha está lista, esto es lo que hacemos por ti.</p>
    <div class="impulso${bloqueado ? ' impulso--bloqueado' : ''}">
      <div class="impulso__cabecera">
        <div>
          <span class="impulso__kicker">Plan Impulso TPL</span>
          <p class="impulso__precio">${clp(PLAN_IMPULSO.precio)}<span> pago único</span></p>
        </div>
        ${bloqueado
          ? `<span class="impulso__sello">Resuelve primero lo marcado arriba</span>`
          : `<button type="button" class="impulso__btn" id="btn-comprar-impulso">Contratar el plan</button>`}
      </div>
      <ul class="impulso__incluye">
        ${PLAN_IMPULSO.incluye.map(([t, d2]) => `<li><strong>${esc(t)}</strong><span>${esc(d2)}</span></li>`).join('')}
      </ul>
      ${bloqueado
        ? `<p class="impulso__aviso">Lo dejamos bloqueado a propósito: con
           ${d.bloqueantes.length === 1 ? 'el punto marcado' : `los ${d.bloqueantes.length} puntos marcados`} arriba sin resolver,
           el presupuesto se gasta en visitas que no llaman. Arréglalos y el plan se activa solo.</p>`
        : `<p class="impulso__aviso">El presupuesto de Google va aparte y lo eliges tú en
           <a href="#campanas">Campañas</a>. Este plan cubre el armado, la publicación y el informe.</p>`}
      <p class="impulso__estado" id="impulso-estado" hidden></p>
    </div>`;

  // Paso 4 · Plan Profesional (suscripción mensual)
  const profesionalHtml = `
    <p class="paso__lead">Si quieres esto de forma continua, mes a mes, no como un impulso puntual.</p>
    <div class="impulso">
      <div class="impulso__cabecera">
        <div>
          <span class="impulso__kicker">${esc(PLAN_PROFESIONAL.nombre)}</span>
          <p class="impulso__precio">${clp(PLAN_PROFESIONAL.precioMensual)}<span> /mes</span></p>
        </div>
        <button type="button" class="impulso__btn" id="btn-comprar-profesional">Suscribirme</button>
      </div>
      <ul class="impulso__incluye">
        ${PLAN_PROFESIONAL.incluye.map((t) => `<li><strong>${esc(t)}</strong></li>`).join('')}
      </ul>
      <p class="impulso__estado" id="profesional-estado" hidden></p>
    </div>`;

  return `
    <header class="vista-head">
      <h1>TPL Studio</h1>
      <p class="vista-sub">Tu plan de venta, armado sobre el análisis de tu parcela.</p>
    </header>

    <ol class="pasos">
      ${pasoHtml(1, 'Qué dice tu parcela hoy', d.bloqueantes.length ? 'alerta' : 'ok', diagnosticoHtml)}
      ${pasoHtml(2, 'Qué conviene hacer, y en qué orden', 'activo', estrategiasHtml)}
      ${pasoHtml(3, 'Cuando quieras que lo hagamos nosotros', bloqueado ? 'espera' : 'activo', impulsoHtml)}
      ${pasoHtml(4, 'O súbete al Plan Profesional', 'activo', profesionalHtml)}
    </ol>`;
}

export function init() {
  const p = state.propiedad;
  if (!p) return;

  const d = state.diagnostico;
  marcarEstado('studio', d?.listaParaCampana ? 'listo para salir' : 'con pendientes', d?.listaParaCampana ? 'ok' : 'pendiente');

  document.getElementById('btn-comprar-impulso')?.addEventListener('click', async (evento) => {
    const boton = evento.currentTarget;
    const estado = document.getElementById('impulso-estado');
    boton.disabled = true;
    boton.textContent = 'Preparando el pago…';
    estado.hidden = true;

    try {
      const correo = state.user?.email || '';
      const nombre = nombreDe(p) || correo.split('@')[0];
      if (!correo) throw new Error('SIN_CORREO');

      // Reutiliza el mismo circuito de pago que ya opera el informe premium:
      // crear-pago-informe → Flow → flow-webhook. Lo único distinto es el tipo
      // y el monto, que el RPC acepta como parámetros.
      const orden = await window.TPLDataService.startReportPayment({
        tipo_informe: PLAN_IMPULSO.codigo,
        monto_clp: PLAN_IMPULSO.precio,
        origen: 'tpl_business_studio',
        contacto: { nombre, email: correo, telefono: telefonoDe(p) },
        entrada: {
          propiedad_id: p.id,
          codigo: p.codigo,
          titulo: p.titulo,
          comuna: p.comuna,
          superficie_m2: p.superficie_m2,
          precio_publicado: p.precio_publicado,
        },
        resultado: {
          valor_tpl_recomendado: state.tasacion?.valorRecomendado || null,
          preparacion_pct: d?.preparacion ?? null,
          hallazgos: (d?.hallazgos || []).map((h) => h.clave),
        },
      });

      estado.className = 'impulso__estado impulso__estado--ok';
      estado.textContent = 'Te llevamos al pago seguro de Flow…';
      estado.hidden = false;
      window.location.href = orden.payment_url;
    } catch (error) {
      console.error('No se pudo iniciar el pago del Plan Impulso', error);
      estado.className = 'impulso__estado';
      estado.textContent = error?.message === 'SIN_CORREO'
        ? 'Necesitamos tu correo para emitir la boleta. Vuelve a entrar y lo tomamos de tu cuenta.'
        : 'No pudimos abrir el pago ahora. Inténtalo en unos minutos o escríbenos y lo activamos manualmente.';
      estado.hidden = false;
      boton.disabled = false;
      boton.textContent = 'Contratar el plan';
    }
  });

  document.getElementById('btn-comprar-profesional')?.addEventListener('click', async (evento) => {
    const boton = evento.currentTarget;
    const estado = document.getElementById('profesional-estado');
    boton.disabled = true;
    boton.textContent = 'Preparando el pago…';
    estado.hidden = true;

    try {
      const orden = await window.TPLDataService.startSubscriptionPayment({ plan_codigo: PLAN_PROFESIONAL.codigo });
      estado.className = 'impulso__estado impulso__estado--ok';
      estado.textContent = 'Te llevamos al pago seguro de Flow…';
      estado.hidden = false;
      window.location.href = orden.payment_url;
    } catch (error) {
      console.error('No se pudo iniciar la suscripción al Plan Profesional', error);
      estado.className = 'impulso__estado';
      estado.textContent = 'No pudimos abrir el pago ahora. Inténtalo en unos minutos o escríbenos y lo activamos manualmente.';
      estado.hidden = false;
      boton.disabled = false;
      boton.textContent = 'Suscribirme';
    }
  });
}

function metaDe(p) {
  let m = p?.metadata;
  if (typeof m === 'string') { try { m = JSON.parse(m); } catch { m = null; } }
  return m || {};
}
const nombreDe = (p) => String(metaDe(p).contacto_nombre || '').trim();
const telefonoDe = (p) => String(metaDe(p).contacto_telefono || '').trim();
