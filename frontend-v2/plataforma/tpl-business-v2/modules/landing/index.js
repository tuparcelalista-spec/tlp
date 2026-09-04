import { state } from '../../core/store.js';
import { clp, esc, marcarEstado } from '../../core/boot.js';
import { getClient } from '../../core/supabase.js';

const CLAVE_BORRADOR = 'tpl_business_landing_borrador';

function fotosDe(propiedad) {
  let meta = propiedad?.metadata;
  if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = null; } }
  const lista = Array.isArray(meta?.imagenes) ? meta.imagenes.filter(Boolean) : [];
  return lista.map((ruta) => (/^https?:/i.test(ruta) ? ruta : `../../${String(ruta).replace(/^\.?\//, '')}`));
}

function borradorInicial() {
  const p = state.propiedad || {};
  const t = state.tasacion;
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null');
    if (guardado && guardado.propiedadId === p.id) return guardado;
  } catch { /* borrador ilegible: se arma uno nuevo */ }

  return {
    propiedadId: p.id,
    titular: p.titulo || `Parcela en ${p.comuna || 'el sur'}`,
    gancho: p.comuna ? `Un terreno propio en ${p.comuna}, listo para empezar.` : 'Un terreno propio, listo para empezar.',
    precio: Number(p.precio_publicado) || (t ? t.valorRecomendado : 0),
    mostrarTasacion: Boolean(t),
    whatsapp: '',
    acento: 'verde',
  };
}

const ACENTOS = {
  verde:  { nombre: 'Bosque',   color: '#15803d' },
  agua:   { nombre: 'Agua',     color: '#0369a1' },
  tierra: { nombre: 'Tierra',   color: '#9a3412' },
  noche:  { nombre: 'Noche',    color: '#1e293b' },
};

export function render() {
  const p = state.propiedad;
  if (!p) {
    return `<div class="vacio"><h2>No encontramos tu propiedad</h2>
      <p>Necesitamos vincular tu cuenta a una propiedad antes de armar la página.</p></div>`;
  }

  const b = borradorInicial();
  const superficie = Number(p.superficie_m2) || 0;

  return `
    <header class="vista-head">
      <h1>Tu página de venta</h1>
      <p class="vista-sub">Ajusta lo de la izquierda y mira cómo queda a la derecha. Se guarda sola.</p>
    </header>

    <div class="editor">
      <form class="editor__campos" id="form-landing">
        <label for="l-titular">Titular</label>
        <input id="l-titular" name="titular" maxlength="90" value="${esc(b.titular)}">

        <label for="l-gancho">Frase de entrada</label>
        <textarea id="l-gancho" name="gancho" rows="2" maxlength="160">${esc(b.gancho)}</textarea>

        <label for="l-precio">Precio que quieres mostrar</label>
        <input id="l-precio" name="precio" type="number" min="0" step="100000" value="${b.precio || ''}">
        ${state.tasacion ? `<small class="editor__ayuda">Tu Valor TPL es ${clp(state.tasacion.valorRecomendado)}. Venta rápida: ${clp(state.tasacion.valorApuro)}.</small>` : ''}

        <label for="l-whatsapp">WhatsApp de contacto</label>
        <input id="l-whatsapp" name="whatsapp" inputmode="tel" placeholder="+56 9 1234 5678" value="${esc(b.whatsapp)}">

        <label for="l-acento">Color</label>
        <select id="l-acento" name="acento">
          ${Object.entries(ACENTOS).map(([k, v]) => `<option value="${k}"${b.acento === k ? ' selected' : ''}>${v.nombre}</option>`).join('')}
        </select>

        <label class="editor__check">
          <input type="checkbox" id="l-tasacion" name="mostrarTasacion"${b.mostrarTasacion ? ' checked' : ''}>
          <span>Mostrar el sello «Tasada por TPL» con el valor</span>
        </label>

        <p class="editor__guardado" id="l-guardado">Guardado</p>
      </form>

      <div class="editor__preview">
        <div class="preview__barra">
          <span class="preview__punto"></span><span class="preview__punto"></span><span class="preview__punto"></span>
          <span class="preview__url">tuparcelalista.cl/${esc(p.codigo || 'tu-parcela')}</span>
        </div>
        <div class="preview__lienzo" id="preview" data-superficie="${superficie}"></div>
      </div>
    </div>

    <div class="landing-acciones">
      <button type="button" class="btn-linea" id="btn-publicar-landing">Pedir publicación de mi página</button>
      <p class="landing-acciones__nota">La revisamos y la dejamos en línea, normalmente el mismo día.</p>
    </div>`;
}

export function init() {
  const p = state.propiedad;
  if (!p) return;

  const form = document.getElementById('form-landing');
  const preview = document.getElementById('preview');
  const guardado = document.getElementById('l-guardado');
  const fotos = fotosDe(p);
  let temporizador = null;
  let usuarioEditando = false;

  // El borrador ahora vive en el servidor (tabla tpl_landing_borradores), no
  // solo en localStorage: antes, cambiar de computador o de navegador hacía
  // desaparecer todo lo ajustado. localStorage sigue usándose como caché
  // rápida para el primer pintado; si el servidor trae algo distinto y el
  // usuario todavía no escribió nada en esta carga, se reemplaza.
  (async () => {
    try {
      const client = await getClient();
      const { data, error } = await client.from('tpl_landing_borradores').select('borrador').eq('propiedad_id', p.id).maybeSingle();
      if (error || !data?.borrador || usuarioEditando) return;
      const b = data.borrador;
      if (b.titular != null) form.titular.value = b.titular;
      if (b.gancho != null) form.gancho.value = b.gancho;
      if (b.precio != null) form.precio.value = b.precio;
      if (b.whatsapp != null) form.whatsapp.value = b.whatsapp;
      if (b.acento != null) form.acento.value = b.acento;
      if (b.mostrarTasacion != null) form.mostrarTasacion.checked = Boolean(b.mostrarTasacion);
      pintar();
    } catch (err) {
      console.warn('No se pudo cargar el borrador de landing desde el servidor.', err);
    }
  })();

  async function guardarEnServidor(b) {
    try {
      const client = await getClient();
      await client.from('tpl_landing_borradores').upsert({
        propiedad_id: p.id,
        actor_id: state.user?.actor_id || null,
        borrador: b,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'propiedad_id' });
    } catch (err) {
      console.warn('No se pudo guardar el borrador de landing en el servidor.', err);
    }
  }

  const leer = () => ({
    propiedadId: p.id,
    titular: form.titular.value.trim(),
    gancho: form.gancho.value.trim(),
    precio: Number(form.precio.value) || 0,
    whatsapp: form.whatsapp.value.trim(),
    acento: form.acento.value,
    mostrarTasacion: form.mostrarTasacion.checked,
  });

  function pintar() {
    const b = leer();
    const color = (ACENTOS[b.acento] || ACENTOS.verde).color;
    const superficie = Number(preview.dataset.superficie) || 0;
    const t = state.tasacion;

    preview.style.setProperty('--acento', color);
    preview.innerHTML = `
      <div class="pv">
        <div class="pv__hero"${fotos[0] ? ` style="background-image:url('${esc(fotos[0])}')"` : ''}>
          ${b.mostrarTasacion && t ? `<span class="pv__sello">Tasada por TPL · ${clp(t.valorRecomendado)}</span>` : ''}
          <div class="pv__hero-txt">
            <h2>${esc(b.titular) || 'Tu titular aquí'}</h2>
            <p>${esc(b.gancho)}</p>
          </div>
        </div>
        <div class="pv__datos">
          <span><strong>${superficie ? superficie.toLocaleString('es-CL') + ' m²' : '—'}</strong>Superficie</span>
          <span><strong>${esc(p.comuna || '—')}</strong>Comuna</span>
          <span><strong>${b.precio ? clp(b.precio) : 'Consultar'}</strong>Precio</span>
        </div>
        ${fotos.length > 1 ? `<div class="pv__fotos">${fotos.slice(1, 5).map((f) => `<img src="${esc(f)}" alt="" loading="lazy">`).join('')}</div>` : ''}
        <p class="pv__desc">${esc((p.descripcion || '').slice(0, 220))}${(p.descripcion || '').length > 220 ? '…' : ''}</p>
        <a class="pv__cta" ${b.whatsapp ? '' : 'aria-disabled="true"'}>${b.whatsapp ? 'Hablar por WhatsApp' : 'Falta tu WhatsApp'}</a>
      </div>`;
  }

  function guardar() {
    const b = leer();
    try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(b)); } catch { /* sin espacio: el preview sigue funcionando */ }
    state.landing = b;
    guardarEnServidor(b);
    guardado.textContent = 'Guardado';
    guardado.classList.remove('is-editando');
    marcarEstado('landing', 'borrador listo', 'ok');
  }

  form.addEventListener('input', () => {
    usuarioEditando = true;
    pintar();
    guardado.textContent = 'Guardando…';
    guardado.classList.add('is-editando');
    clearTimeout(temporizador);
    temporizador = setTimeout(guardar, 600);
  });

  document.getElementById('btn-publicar-landing')?.addEventListener('click', () => {
    const b = leer();
    const mensaje = `Hola, quiero publicar mi página de venta en TPL.\n` +
      `Propiedad: ${p.titulo || p.codigo}\n` +
      `Titular: ${b.titular}\n` +
      `Precio a mostrar: ${b.precio ? clp(b.precio) : 'consultar'}`;
    window.open(`https://wa.me/56988508361?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener');
  });

  pintar();
  marcarEstado('landing', state.landing ? 'borrador listo' : 'sin crear', state.landing ? 'ok' : '');
}
