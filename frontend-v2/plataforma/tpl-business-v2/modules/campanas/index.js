import { state } from '../../core/store.js';
import { clp, esc, marcarEstado } from '../../core/boot.js';

// ---------------------------------------------------------------------------
// PLANES DE CAMPAÑA EN GOOGLE  ·  ÚNICO LUGAR DONDE SE DEFINEN LAS CIFRAS
// ---------------------------------------------------------------------------
// Los tres montos son PRESUPUESTO DIARIO en pesos, que es como Google Ads pide
// el presupuesto. El plan sugerido no es un monto fijo: es el 0,3% del Valor
// TPL de esta propiedad, así que se calcula por ficha y solo aparece cuando hay
// tasación guardada. Sin tasación no se muestra: no se sugiere un gasto
// calculado sobre una cifra que no existe.
const PLANES = Object.freeze([
  {
    clave: 'sin_apuro',
    nombre: 'Sin apuro',
    diario: 15200,
    resumen: 'Presencia sostenida mientras esperas al comprador correcto.',
    para: 'No tienes plazo. Prefieres el precio antes que la rapidez.',
  },
  {
    clave: 'medio',
    nombre: 'Con algo de prisa',
    diario: 28000,
    resumen: 'Más avisos por día, sin llegar al ritmo de una venta forzada.',
    para: 'Te gustaría vender este semestre, pero puedes esperar.',
  },
  {
    clave: 'apurado',
    nombre: 'Apurado',
    diario: 35000,
    resumen: 'La mayor cantidad de vistas diarias que compramos para una parcela.',
    para: 'Necesitas vender pronto y el plazo manda.',
  },
]);

const PORCENTAJE_SUGERIDO = 0.003; // 0,3% del Valor TPL

const dias = (total, diario) => (diario > 0 ? Math.max(1, Math.round(total / diario)) : 0);

function tarjeta(plan, sugerido) {
  const duracion = sugerido ? dias(sugerido.total, plan.diario) : null;
  const elegido = state.campana?.plan === plan.clave;
  return `
    <article class="plan${elegido ? ' plan--elegido' : ''}" data-plan="${plan.clave}">
      <header class="plan__head">
        <h3>${esc(plan.nombre)}</h3>
        <p class="plan__monto">${clp(plan.diario)}<span>/día</span></p>
      </header>
      <p class="plan__resumen">${esc(plan.resumen)}</p>
      <p class="plan__para"><span>Para ti si:</span> ${esc(plan.para)}</p>
      ${duracion
        ? `<p class="plan__duracion">Con tu presupuesto sugerido alcanza para <strong>${duracion} ${duracion === 1 ? 'día' : 'días'}</strong> de campaña.</p>`
        : ''}
      <button type="button" class="plan__btn" data-elegir="${plan.clave}">
        ${elegido ? 'Plan elegido' : 'Elegir este plan'}
      </button>
    </article>`;
}

export function render() {
  const t = state.tasacion;

  if (!t) {
    return `
      <header class="vista-head">
        <h1>Campañas en Google</h1>
        <p class="vista-sub">Ponemos tu propiedad delante de quien la está buscando.</p>
      </header>
      <div class="aviso aviso--pendiente">
        <strong>Todavía no podemos sugerirte un presupuesto</strong>
        <p>El plan recomendado se calcula sobre el Valor TPL de tu propiedad, y esa tasación
        aún no está guardada. Escríbenos y la generamos; después vuelves aquí.</p>
      </div>`;
  }

  const total = Math.round(t.valorRecomendado * PORCENTAJE_SUGERIDO);
  const sugerido = { total, diario: PLANES[2].diario, duracion: dias(total, PLANES[2].diario) };

  return `
    <header class="vista-head">
      <h1>Campañas en Google</h1>
      <p class="vista-sub">Ponemos tu propiedad delante de quien la está buscando. Tú eliges cuánta prisa tienes.</p>
    </header>

    <section class="sugerido">
      <span class="sugerido__estrella" aria-hidden="true">★</span>
      <div>
        <span class="sugerido__kicker">Sugerido para venta rápida</span>
        <p class="sugerido__monto">${clp(total)}</p>
        <p class="sugerido__detalle">
          Es el <strong>0,3% de tu Valor TPL</strong> (${clp(t.valorRecomendado)}). Invertido al ritmo
          del plan apurado, son <strong>${sugerido.duracion} ${sugerido.duracion === 1 ? 'día' : 'días'}</strong>
          de campaña continua.
        </p>
      </div>
      <button type="button" class="sugerido__btn" data-elegir="sugerido">Quiero el plan sugerido</button>
    </section>

    <h2 class="seccion-titulo">O elige el ritmo tú</h2>
    <div class="planes">${PLANES.map((p) => tarjeta(p, sugerido)).join('')}</div>

    <p class="nota-legal">
      El presupuesto se paga directamente a Google. TPL arma, publica y mide la campaña con las
      fotos y el precio de tu página de venta. Puedes pausarla cuando quieras.
    </p>

    <div class="eleccion" id="eleccion" hidden></div>`;
}

export function init() {
  const t = state.tasacion;
  if (!t) { marcarEstado('campanas', 'sin tasación', 'pendiente'); return; }

  const total = Math.round(t.valorRecomendado * PORCENTAJE_SUGERIDO);
  const contenedor = document.getElementById('app-content');

  contenedor.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-elegir]');
    if (!boton) return;

    const clave = boton.dataset.elegir;
    const plan = clave === 'sugerido' ? PLANES[2] : PLANES.find((p) => p.clave === clave);
    if (!plan) return;

    const presupuesto = clave === 'sugerido' ? total : null;
    state.campana = { plan: plan.clave, diario: plan.diario, presupuesto, sugerido: clave === 'sugerido' };

    document.querySelectorAll('.plan').forEach((p) => p.classList.toggle('plan--elegido', p.dataset.plan === plan.clave));
    document.querySelectorAll('.plan__btn').forEach((b) => {
      b.textContent = b.dataset.elegir === plan.clave ? 'Plan elegido' : 'Elegir este plan';
    });

    const caja = document.getElementById('eleccion');
    const duracion = presupuesto ? dias(presupuesto, plan.diario) : null;
    caja.hidden = false;
    caja.innerHTML = `
      <h3>Elegiste: ${esc(plan.nombre)}</h3>
      <p>${clp(plan.diario)} por día${duracion ? `, durante ${duracion} ${duracion === 1 ? 'día' : 'días'} (${clp(presupuesto)} en total)` : ''}.</p>
      <p class="eleccion__paso">Un asesor te contacta para confirmar el pago y publicar la campaña. Nada se cobra hasta entonces.</p>
      <a class="eleccion__btn" target="_blank" rel="noopener"
         href="https://wa.me/56988508361?text=${encodeURIComponent(
           `Hola, quiero activar la campaña "${plan.nombre}" (${clp(plan.diario)} por día` +
           `${duracion ? `, ${duracion} días, ${clp(presupuesto)} en total` : ''}) para mi propiedad ` +
           `${state.propiedad?.titulo || state.propiedad?.codigo || ''}.`
         )}">Hablar con un asesor</a>`;
    caja.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    marcarEstado('campanas', 'plan elegido', 'ok');
  });

  marcarEstado('campanas', state.campana ? 'plan elegido' : 'sin activar', state.campana ? 'ok' : '');
}
