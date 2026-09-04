import { state } from '../../core/store.js';
import { clp, esc, marcarEstado } from '../../core/boot.js';

const fecha = (iso) => {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return null; }
};

export function render() {
  const p = state.propiedad;
  const t = state.tasacion;

  if (!p) {
    return `<div class="vacio">
      <h2>No encontramos tu propiedad</h2>
      <p>Entramos con tu cuenta pero no logramos vincularla a una propiedad publicada.
      Escríbenos y lo resolvemos en el momento.</p>
    </div>`;
  }

  if (!t) {
    return `
      <header class="vista-head">
        <h1>Tu informe de valor</h1>
        <p class="vista-sub">${esc(p.titulo || p.codigo)} · ${esc(p.comuna || '')}</p>
      </header>
      <div class="aviso aviso--pendiente">
        <strong>Tu propiedad todavía no tiene una tasación guardada</strong>
        <p>Sin ella no mostramos ninguna cifra: preferimos decírtelo a inventar un número.
        Escríbenos y la generamos.</p>
      </div>`;
  }

  const token = sessionStorage.getItem('tpl_business_token_informe');
  const superficie = Number(p.superficie_m2) || 0;
  const publicado = Number(p.precio_publicado) || 0;
  const brecha = publicado && t.valorRecomendado
    ? Math.round(((publicado - t.valorRecomendado) / t.valorRecomendado) * 100)
    : null;

  return `
    <header class="vista-head">
      <h1>Tu informe de valor</h1>
      <p class="vista-sub">${esc(p.titulo || p.codigo)} · ${esc(p.comuna || '')}${superficie ? ` · ${superficie.toLocaleString('es-CL')} m²` : ''}</p>
    </header>

    <section class="cifra-principal">
      <span class="cifra-principal__label">Valor TPL recomendado</span>
      <p class="cifra-principal__n">${clp(t.valorRecomendado)}</p>
      ${t.m2 ? `<span class="cifra-principal__m2">${clp(t.m2)} por m²</span>` : ''}
    </section>

    <div class="cifras">
      <div class="cifra">
        <span class="cifra__l">Venta rápida</span>
        <strong class="cifra__n">${t.valorApuro ? clp(t.valorApuro) : '—'}</strong>
        <span class="cifra__d">Si necesitas cerrar pronto.</span>
      </div>
      <div class="cifra">
        <span class="cifra__l">Referencia de tu comuna</span>
        <strong class="cifra__n">${t.valorComunal ? clp(t.valorComunal) : '—'}</strong>
        <span class="cifra__d">Lo que pide el mercado por un terreno como el tuyo.</span>
      </div>
      <div class="cifra">
        <span class="cifra__l">Tu precio publicado</span>
        <strong class="cifra__n">${publicado ? clp(publicado) : 'Sin precio'}</strong>
        <span class="cifra__d">${
          brecha === null ? 'Aún no publicas un precio.'
          : brecha > 5 ? `Está ${brecha}% sobre la tasación.`
          : brecha < -5 ? `Está ${Math.abs(brecha)}% bajo la tasación.`
          : 'Está en línea con la tasación.'}</span>
      </div>
    </div>

    <section class="respaldo">
      <h2 class="seccion-titulo">De dónde sale este número</h2>
      <ul class="respaldo__lista">
        ${t.comparables ? `<li><strong>${t.comparables} avisos comparables</strong> reales${t.origenMuestra === 'comuna' ? ' de tu propia comuna' : ' de comunas vecinas del mismo tramo'}.</li>` : ''}
        ${t.segmento ? `<li>Comparada dentro del tramo <strong>${esc(t.segmento)}</strong>, no contra terrenos de otro tamaño.</li>` : ''}
        ${t.valorTecnico ? `<li>Tasación técnica de <strong>${clp(t.valorTecnico)}</strong>, contrastada con el mercado observado.</li>` : ''}
        ${fecha(t.calculadaAt) ? `<li>Calculada el <strong>${fecha(t.calculadaAt)}</strong>.</li>` : ''}
      </ul>
      ${token
        ? `<a class="btn-linea" target="_blank" rel="noopener" href="../informe-valores/index.html?token=${encodeURIComponent(token)}">Abrir el informe completo</a>`
        : `<p class="respaldo__nota">Para ver el informe completo con la evidencia de mercado, abre el enlace que te enviamos por correo.</p>`}
    </section>

    <section class="siguiente">
      <h2 class="seccion-titulo">Tu siguiente decisión</h2>
      <div class="siguiente__opciones">
        <a href="#landing" class="siguiente__card">
          <strong>Arma tu página de venta</strong>
          <span>Con tus fotos y tu precio, lista para compartir por WhatsApp.</span>
        </a>
        <a href="#campanas" class="siguiente__card">
          <strong>Elige una campaña</strong>
          <span>Te sugerimos ${clp(Math.round(t.valorRecomendado * 0.003))} según tu Valor TPL.</span>
        </a>
      </div>
    </section>`;
}

export function init() {
  marcarEstado('informe', state.tasacion ? 'listo' : 'pendiente', state.tasacion ? 'ok' : 'pendiente');
}
