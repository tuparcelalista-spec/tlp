// =============================================================================
// INFORME PREMIUM DE VALOR - TU PARCELA LISTA
// =============================================================================
// Documento que se entrega al propietario. Su trabajo es doble: explicar de
// donde sale el valor de su propiedad con evidencia verificable, y mostrarle
// que hacer con esa informacion (que servicios de TPL cierran la brecha entre
// lo que pide y lo que el mercado paga).
//
// Regla de la casa: en este informe no se imprime ni un solo numero que no
// venga del motor unico de tasacion o de una consulta real a la base. Si un
// dato falta, la seccion lo dice; no se rellena con un supuesto.
// =============================================================================

import { TPLValuationAdapter } from '../../js/core/valuation-adapter.js?v=20260902-comparables';

const $ = (id) => document.getElementById(id);

const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
const clpCorto = (n) => {
  const v = Math.round(Number(n) || 0);
  if (v >= 1000000) return '$' + (v / 1000000).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + 'M';
  if (v >= 1000) return '$' + Math.round(v / 1000) + 'K';
  return '$' + v;
};
const pct = (n) => (n > 0 ? '+' : '') + Math.round(n) + '%';
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  // El propietario llega con el token de su enlace; el asesor con ?id= y sesion
  // de staff. Antes solo existia la segunda via, asi que el dueno completaba su
  // ficha y al pedir su informe chocaba con "Acceso restringido".
  const token = params.get('token');
  if (!id && !token) return falla('Falta el identificador de la propiedad en la direccion.');

  try {
    const client = await window.TPLDataService.getClient();
    let prop = null;

    let tasacionGuardada = null;

    if (token) {
      const datos = await window.TPLDataService.getOwnerProperty(token);
      if (!datos?.ok || !datos.propiedad) {
        return falla('Tu enlace venció o no es válido. Pídenos uno nuevo y te lo enviamos al instante.');
      }
      prop = datos.propiedad;
      // La tasacion viene ya calculada por el servidor con las distancias del
      // atlas. Recalcularla aqui, como anonimo, daria un valor de piso.
      tasacionGuardada = datos.tasacion?.resultado || null;
      if (!tasacionGuardada) {
        return falla('Tu propiedad todavía no tiene una tasación calculada. Escríbenos y la generamos.');
      }
      document.body.classList.add('vista-propietario');
    } else {
      // Con ?id= el informe es interno: trae estrategia comercial de TPL.
      const { data: sessionData } = await client.auth.getSession();
      const { data: isStaff } = sessionData?.session ? await client.rpc('tpl_es_staff') : { data: false };
      if (!sessionData?.session || !isStaff) {
        return falla(
          'Este informe solo esta disponible para asesores autenticados de Tu Parcela Lista.',
          '<a href="../crm-tpl-v1/index.html">Iniciar sesion en el CRM</a>'
        );
      }
      const { data, error } = await client.from('tpl_propiedades').select('*').eq('id', id).single();
      if (error || !data) throw new Error('No encontramos esta propiedad en la base de datos.');
      prop = data;
    }

    const v = tasacionGuardada
      ? await TPLValuationAdapter.runValuationFromStored(prop, tasacionGuardada)
      : await TPLValuationAdapter.runValuation(prop, window.TPLLandEngine);

    $('loading-overlay').style.display = 'none';
    $('main-content').style.display = 'block';

    portada(prop, v);
    resumenEjecutivo(prop, v);
    evidenciaDeMercado(prop, v);
    comoSeConstruyeElValor(prop, v);
    fichaTecnica(prop, v);
    estrategiaComercial(prop, v);
    planDeServicios(prop, v);
    metodologia(v);
    if (token) invitacionDeVenta(prop, v, token);
  } catch (e) {
    console.error('Error procesando informe:', e);
    falla(e.message || 'No pudimos generar el informe.');
  }
});

// --------------------------------------------------------------------------
// INVITACION A VENDER  ·  cierre del informe del propietario
// --------------------------------------------------------------------------
// El informe termina diciendole a la persona cuanto vale su propiedad. Ese es
// el momento de ofrecerle venderla con TPL, no antes: la oferta se apoya en la
// cifra que acaba de leer.
//
// El correo NO es libre. El enlace del informe se reenvia por WhatsApp, y si
// cualquier correo sirviera, quien recibiera el reenvio se quedaria con la
// cuenta de una propiedad ajena. Solo se acepta el correo que TPL ya tiene
// registrado para esta propiedad.
function invitacionDeVenta(prop, v, token) {
  const seccion = $('invitacion-venta');
  if (!seccion) return;

  const meta = (typeof prop.metadata === 'string' ? JSON.parse(prop.metadata || '{}') : prop.metadata) || {};
  const valor = Number(v?.valores?.recomendado || v?.valorFinal || 0);
  const comuna = prop.comuna || 'tu zona';

  $('invitacion-bajada').innerHTML = valor
    ? `Tu propiedad en ${esc(comuna)} está valorizada en <strong>${clp(valor)}</strong>. Crea tu cuenta y llévala al mercado con las herramientas que usamos nosotros.`
    : `Crea tu cuenta y lleva tu propiedad en ${esc(comuna)} al mercado con las herramientas que usamos nosotros.`;

  seccion.hidden = false;

  const form = $('form-registro');
  const aviso = $('registro-aviso');
  const boton = $('reg-submit');

  const decir = (texto, ok = false) => {
    aviso.textContent = texto;
    aviso.classList.toggle('invitacion__aviso--ok', ok);
    aviso.hidden = false;
  };
  const marcar = (id, malo) => $(id)?.setAttribute('aria-invalid', malo ? 'true' : 'false');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    aviso.hidden = true;
    ['reg-email', 'reg-pass', 'reg-pass2'].forEach((id) => marcar(id, false));

    const correo = $('reg-email').value.trim().toLowerCase();
    const clave = $('reg-pass').value;
    const clave2 = $('reg-pass2').value;

    const registrado = String(meta.contacto_email || meta.propietario_contacto?.email || '').trim().toLowerCase();

    if (!correo) { marcar('reg-email', true); return decir('Escribe tu correo electrónico.'); }
    if (registrado && correo !== registrado) {
      marcar('reg-email', true);
      return decir('Ese correo no es el que tenemos registrado para esta propiedad. Escríbenos y lo actualizamos.');
    }
    if (clave.length < 8) { marcar('reg-pass', true); return decir('La contraseña necesita al menos 8 caracteres.'); }
    if (clave !== clave2) {
      marcar('reg-pass', true); marcar('reg-pass2', true);
      return decir('Las dos contraseñas no son iguales. Vuelve a escribirlas.');
    }

    boton.disabled = true;
    const textoOriginal = boton.textContent;
    boton.textContent = 'Creando tu cuenta...';

    try {
      const cliente = await window.TPLDataService.getClient();
      const { error } = await cliente.auth.signUp({
        email: correo,
        password: clave,
        options: { data: { rol: 'propietario', propiedad_id: prop.id, token_informe: token } },
      });
      // Un correo ya registrado no es un error de la persona: probablemente ya
      // tiene cuenta y lo que necesita es entrar, no crear otra.
      if (error) {
        const yaExiste = /already registered|already been registered|user already/i.test(error.message || '');
        if (yaExiste) {
          decir('Ya tienes una cuenta con este correo. Te llevamos a la entrada de TPL Business.', true);
          setTimeout(() => { window.location.href = `../tpl-business-v2/index.html#acceso?correo=${encodeURIComponent(correo)}`; }, 1600);
          return;
        }
        throw error;
      }

      decir('Cuenta creada. Entrando a TPL Business...', true);
      window.sessionStorage.setItem('tpl_business_propiedad', prop.id);
      window.sessionStorage.setItem('tpl_business_token_informe', token);
      setTimeout(() => { window.location.href = '../tpl-business-v2/index.html#informe'; }, 1200);
    } catch (error) {
      console.error('No se pudo crear la cuenta', error);
      decir('No pudimos crear la cuenta ahora. Inténtalo de nuevo en unos minutos o escríbenos.');
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });
}

function falla(mensaje, extra = '') {
  const o = $('loading-overlay');
  if (!o) return;
  o.style.display = 'flex';
  o.innerHTML = `<div class="estado-error"><h3>No pudimos abrir el informe</h3><p>${esc(mensaje)}</p>${extra}</div>`;
}

// --------------------------------------------------------------------------
// PORTADA
// --------------------------------------------------------------------------
function portada(prop, v) {
  $('doc-date').textContent = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  $('doc-id').textContent = String(prop.codigo || prop.id).substring(0, 12).toUpperCase();
  $('prop-title').textContent = prop.titulo || 'Activo inmobiliario TPL';
  $('prop-subtitle').textContent = [prop.sector, prop.comuna, prop.region].filter(Boolean).join(', ');

  portadaFotos(prop);  // asincrona a proposito: la portada se completa sola

  $('portada-chips').innerHTML = [
    prop.superficie_m2 ? `${Number(prop.superficie_m2).toLocaleString('es-CL')} m²` : null,
    v.territorio.hubNombre || null,
    v.mercado.referenciaComunal ? `Referencia ${esc(prop.comuna)}` : null,
  ].filter(Boolean).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
}

/**
 * Portada fotografica. El informe mostraba una miniatura de 200 px aunque la
 * ficha tuviera siete fotografias: para un documento que se le entrega al
 * propietario, la foto de su parcela es lo primero que mira.
 *
 * La cantidad de fotos no es decorativa: alimenta la recomendacion de
 * fotografia profesional de la seccion VI.
 */
async function portadaFotos(prop) {
  // El catalogo guarda rutas relativas a frontend-v2 ("image/..."), pero esta
  // pagina cuelga dos niveles mas abajo: sin el prefijo la foto no cargaba.
  const resolver = (ruta) => {
    const r = String(ruta || '').trim();
    if (!r || /^(https?:)?\/\//.test(r) || r.startsWith('..')) return r;
    return '../../' + r.replace(/^\/+/, '');
  };

  // El resumen por token NO trae metadata, asi que la portada del propietario
  // salia sin ninguna foto aunque la ficha tuviera siete. Las imagenes viven
  // ademas en tpl_propiedad_imagenes, que si es legible por anonimos.
  const fuentes = [prop.metadata?.imagen, ...(prop.metadata?.imagenes || [])];
  if (!fuentes.filter(Boolean).length && prop.id) {
    try {
      const client = await window.TPLDataService.getClient();
      const { data } = await client
        .from('tpl_propiedad_imagenes')
        .select('url,storage_path,orden,es_portada')
        .eq('propiedad_id', prop.id)
        .order('es_portada', { ascending: false })
        .order('orden', { ascending: true });
      for (const img of data || []) fuentes.push(img.url || img.storage_path);
    } catch (e) {
      console.warn('No se pudieron cargar las fotografías de la propiedad', e);
    }
  }
  const fotos = [...new Set(fuentes.map(resolver).filter(Boolean))];

  const figura = $('hero-figura');
  const sinFoto = () => {
    figura.classList.add('hero-vacio');
    figura.querySelector('img')?.remove();
  };

  if (!fotos.length) {
    sinFoto();
    $('doc-fotos').innerHTML = '<strong class="alerta">Sin fotografías</strong>';
    return;
  }

  const principal = $('hero-img');
  principal.addEventListener('error', sinFoto, { once: true });
  principal.src = fotos[0];
  principal.alt = `Fotografía de la propiedad en ${prop.comuna || 'la comuna'}`;

  // Resto de fotos como tira; al pulsarlas pasan a la portada.
  const resto = fotos.slice(1);
  $('galeria').innerHTML = resto.map((src, i) => `
    <button type="button" class="miniatura" data-src="${esc(src)}" aria-label="Ver fotografía ${i + 2}">
      <img src="${esc(src)}" alt="" loading="lazy">
    </button>`).join('');

  $('galeria').addEventListener('click', (e) => {
    const btn = e.target.closest('.miniatura');
    if (btn) principal.src = btn.dataset.src;
  });

  $('doc-fotos').innerHTML = fotos.length === 1
    ? '<strong class="alerta">1 sola fotografía</strong>'
    : `<strong>${fotos.length} fotografías</strong> en la ficha`;
}

// --------------------------------------------------------------------------
// I. RESUMEN EJECUTIVO
// --------------------------------------------------------------------------
function resumenEjecutivo(prop, v) {
  const valor = v.valorFinal;
  const pedido = Number(prop.precio_publicado) || 0;
  const brecha = pedido > 0 && valor > 0 ? ((pedido - valor) / valor) * 100 : null;

  $('sum-value').textContent = clp(valor);
  $('sum-value-m2').textContent = clp(v.valores.m2) + ' por m²';

  const conf = v.confianzaDetalle;
  $('sum-confidence').textContent = conf.pct + '%';
  $('sum-confidence').className = 'val ' + (conf.pct >= 80 ? 'ok' : conf.pct >= 60 ? 'medio' : 'alerta');
  $('sum-confidence-note').textContent = conf.nivel;
  $('confianza-razones').innerHTML = conf.razones.map((r) => `<li>${esc(r)}</li>`).join('');

  // Rango de negociacion: del cierre rapido al techo tecnico.
  $('sum-rango').textContent = `${clpCorto(v.valores.ventaApuro)} – ${clpCorto(v.valores.mercadoPotencial)}`;
  $('sum-rango-note').textContent = 'Venta ágil a mercado potencial';

  const b = $('sum-brecha');
  if (brecha === null) {
    b.textContent = 'Sin precio';
    b.className = 'val';
    $('sum-brecha-note').textContent = 'La propiedad no tiene precio publicado';
  } else {
    b.textContent = pct(brecha);
    b.className = 'val ' + (Math.abs(brecha) <= 10 ? 'ok' : Math.abs(brecha) <= 25 ? 'medio' : 'alerta');
    $('sum-brecha-note').textContent = `Su precio: ${clp(pedido)}`;
  }

  $('reading-executive').innerHTML = diagnosticoEjecutivo(prop, v, pedido, brecha);

  // La advertencia sobre la "referencia de venta inmediata rural" habla de un
  // campo que este informe no muestra: al propietario no le dice nada.
  const advertencias = v.cautions.filter((c) => !/venta inmediata rural/i.test(c));
  if (advertencias.length) {
    $('bloque-advertencias').style.display = 'block';
    $('lista-advertencias').innerHTML = advertencias.map((c) => `<li>${esc(c)}</li>`).join('');
  }
}

function diagnosticoEjecutivo(prop, v, pedido, brecha) {
  const partes = [];
  const sup = Number(prop.superficie_m2) || 0;
  // Se compara contra los avisos de superficie parecida cuando existen.
  const obs = v.mercado.similares?.medianaM2 || v.mercado.medianaM2;
  const nObs = v.mercado.similares?.cantidad || v.mercado.cantidad;
  const tipoObs = v.mercado.similares ? 'de superficie parecida' : 'de la zona';

  partes.push(
    `Su propiedad de ${sup.toLocaleString('es-CL')} m² en ${esc(prop.comuna || 'la comuna')} tiene un valor TPL de ` +
    `<strong>${clp(v.valorFinal)}</strong>, equivalente a ${clp(v.valores.m2)} por metro cuadrado.`
  );

  if (obs > 0) {
    const dif = ((v.valores.m2 - obs) / obs) * 100;
    partes.push(
      dif >= 8
        ? `Ese valor está un ${Math.round(dif)}% por sobre la mediana de ${clp(obs)}/m² que hoy piden los ${nObs} avisos comparables ${tipoObs}. La diferencia la sostienen los atributos de la propiedad, no la ubicación: hay que poder mostrarlos para defenderla.`
        : dif <= -8
          ? `Ese valor está un ${Math.abs(Math.round(dif))}% por debajo de la mediana de ${clp(obs)}/m² de los ${nObs} avisos comparables ${tipoObs}, así que hay recorrido de precio si la propiedad se presenta bien.`
          : `Ese valor está en línea con la mediana de ${clp(obs)}/m² que piden los ${nObs} avisos comparables ${tipoObs}.`
    );
  }

  if (brecha === null) {
    partes.push('Todavía no hay un precio de salida definido. Fijarlo dentro del rango de negociación es la primera decisión comercial.');
  } else if (brecha > 25) {
    partes.push(`Su precio de ${clp(pedido)} está un ${Math.round(brecha)}% sobre el valor TPL. Es una decisión legítima, pero reduce mucho el número de compradores posibles: a ese nivel la venta deja de depender de la exposición y pasa a depender de encontrar al comprador específico.`);
  } else if (brecha > 10) {
    partes.push(`Su precio de ${clp(pedido)} está un ${Math.round(brecha)}% sobre el valor TPL. Es sostenible, pero exige más tiempo de exposición y material que justifique la diferencia.`);
  } else if (brecha < -10) {
    partes.push(`Su precio de ${clp(pedido)} está un ${Math.abs(Math.round(brecha))}% bajo el valor TPL. La propiedad entra al mercado con ventaja y lo que necesita es visibilidad, no argumentación.`);
  } else {
    partes.push(`Su precio de ${clp(pedido)} está alineado con el valor TPL, que es el rango donde se concentran las consultas reales.`);
  }

  return partes.map((p) => `<p>${p}</p>`).join('');
}

// --------------------------------------------------------------------------
// II. EVIDENCIA DE MERCADO
// --------------------------------------------------------------------------
function evidenciaDeMercado(prop, v) {
  const m = v.mercado;
  const ref = m.referenciaComunal;

  if (!m.cantidad && !ref) {
    $('mercado-cuerpo').innerHTML =
      '<p class="nota-vacia">No tenemos avisos comparables ni una referencia comunal validada para esta zona. ' +
      'El valor de este informe se apoya solo en los atributos de la propiedad y en su ubicación territorial.</p>';
    return;
  }

  const donde = m.criterio === 'radio' ? `a menos de ${m.radioKm} km` : `en ${esc(m.comuna)}`;

  // La mediana de superficie parecida manda sobre la general: es la unica que
  // sirve para poner precio a esta propiedad en concreto.
  const sim = m.similares;
  const tarjetas = [
    sim
      ? { lbl: 'Mediana de superficie similar', val: clp(sim.medianaM2) + '/m²', sub: `${sim.cantidad} avisos entre ${sim.rangoM2[0].toLocaleString('es-CL')} y ${sim.rangoM2[1].toLocaleString('es-CL')} m²` }
      : (m.medianaM2 ? { lbl: 'Mediana pedida en la zona', val: clp(m.medianaM2) + '/m²', sub: `Rango ${clp(m.p25M2)} – ${clp(m.p75M2)}` } : null),
    m.cantidad ? { lbl: 'Avisos comparables', val: String(m.cantidad), sub: `Publicados ${donde}` } : null,
    ref
      ? {
          lbl: 'Referencia comunal TPL',
          val: clp(ref.medianM2Ajustado || ref.medianM2) + '/m²',
          sub: Number(ref.areaFactor) < 0.85
            ? `Muestra ${ref.sampleSize} · ajustada por superficie`
            : `Muestra ${ref.sampleSize} · confianza ${esc(ref.confidence)}`,
        }
      : null,
    { lbl: 'Su propiedad', val: clp(v.valores.m2) + '/m²', sub: 'Valor TPL por metro cuadrado', destaca: true },
  ].filter(Boolean);

  $('mercado-tarjetas').innerHTML = tarjetas.map((t) => `
    <div class="dato-card${t.destaca ? ' destaca' : ''}">
      <span class="lbl">${esc(t.lbl)}</span>
      <span class="val">${esc(t.val)}</span>
      <span class="sub">${esc(t.sub)}</span>
    </div>`).join('');

  if (ref?.sources?.length) {
    $('mercado-fuentes').innerHTML =
      `<strong>Fuentes:</strong> ${esc(ref.sources.join(' · '))}. ` +
      `Observación de ${esc(ref.observedAt || 'fecha no registrada')}.` +
      (m.ufClp ? ` UF utilizada: ${clp(m.ufClp)} (${esc(m.ufFecha || '')}).` : '');
  }

  // Posicionamiento: donde cae esta propiedad dentro de los avisos reales.
  if (m.items?.length) {
    const filas = m.items.slice(0, 8).map((c) => ({
      etiqueta: String(c.titulo).replace(/\s*\|\s*Portalinmobiliario\.com/i, '').substring(0, 46),
      m2: c.precioM2,
      dist: c.distanciaKm,
      total: c.precio,
      sup: c.superficie,
      esNuestra: false,
    }));
    filas.push({ etiqueta: 'ESTA PROPIEDAD', m2: v.valores.m2, dist: 0, total: v.valorFinal, sup: Number(prop.superficie_m2) || 0, esNuestra: true });
    filas.sort((a, b) => a.m2 - b.m2);

    const max = Math.max(...filas.map((f) => f.m2));
    $('comparables-container').innerHTML = `
      <table class="tabla-comparables">
        <thead><tr><th>Aviso</th><th>Superficie</th><th>Precio pedido</th><th>$/m²</th><th class="col-barra">Posición</th></tr></thead>
        <tbody>
          ${filas.map((f) => `
            <tr class="${f.esNuestra ? 'fila-nuestra' : ''}">
              <td>${esc(f.etiqueta)}${f.dist > 0 ? `<small> · ${f.dist.toFixed(1)} km</small>` : ''}</td>
              <td>${f.sup ? Number(f.sup).toLocaleString('es-CL') + ' m²' : '—'}</td>
              <td>${clp(f.total)}</td>
              <td><strong>${clp(f.m2)}</strong></td>
              <td class="col-barra"><span class="barra" style="width:${Math.max(4, (f.m2 / max) * 100)}%"></span></td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="pie-tabla">Los avisos son precios <em>pedidos</em>, no cierres. El valor TPL estima el precio de transacción probable, que suele estar por debajo de lo publicado.</p>`;
  }
}

// --------------------------------------------------------------------------
// III. COMO SE CONSTRUYE EL VALOR
// --------------------------------------------------------------------------
function comoSeConstruyeElValor(prop, v) {
  const t = v.territorio;

  $('territorio-cuerpo').innerHTML = `
    <div class="territorio-grid">
      <div class="terr-item"><span>Centro comunal</span><strong>${t.comunaKm != null ? t.comunaKm.toFixed(1) + ' km' : 'Sin dato'}</strong><small>${esc(t.tramoComuna || '')}</small></div>
      <div class="terr-item"><span>${esc(t.hubNombre || 'Polo de referencia')}</span><strong>${t.hubKm != null ? t.hubKm.toFixed(1) + ' km' : 'Sin dato'}</strong><small>${esc(t.tramoHub || '')}</small></div>
      <div class="terr-item"><span>Nivel turístico</span><strong>${esc(nivelTurismoTexto(t.nivelTurismoBase))}</strong><small>${t.turismoReemplazaHub ? 'El destino turístico actúa como polo propio' : 'Sin efecto turístico declarado'}</small></div>
      <div class="terr-item"><span>Multiplicador territorial</span><strong>${t.multiplicador ?? '—'}×</strong><small>Sobre la base de superficie</small></div>
    </div>
    <p class="fuente-dato">${esc(t.fuenteEtiqueta)}${t.version ? ' · ' + esc(t.version) : ''}.</p>`;

  // Cascada: de la base de superficie al valor final, ajuste por ajuste.
  const base = v.baseTerritorial;
  const filas = [
    `<div class="wf-row wf-base"><span>Base de superficie (tramos TPL)</span><span>${clp(v.baseSuperficie)}</span></div>`,
    `<div class="wf-row wf-base"><span>× Multiplicador territorial ${t.multiplicador ?? ''}</span><span>${clp(base)}</span></div>`,
  ];

  const ajustes = v.adjustments.filter((a) => a.value !== 0);
  if (ajustes.length) {
    for (const a of ajustes) {
      filas.push(`
        <div class="wf-row wf-adj">
          <span><em>${esc(a.name)}</em>${a.detail ? `<small>${esc(a.detail)}</small>` : ''}</span>
          <span class="${a.value >= 0 ? 'positivo' : 'negativo'}">${a.value >= 0 ? '+' : ''}${clp(a.value)}</span>
        </div>`);
    }
  } else {
    filas.push('<div class="wf-row wf-adj"><span><em>Sin ajustes aplicables</em><small>No hay atributos declarados que suban ni bajen el valor</small></span><span>—</span></div>');
  }

  filas.push(`<div class="wf-row wf-total"><span>Valor TPL de la propiedad</span><span>${clp(v.valorFinal)}</span></div>`);
  $('waterfall').innerHTML = filas.join('');

  $('nota-cascada').textContent =
    'Los ajustes se agrupan con topes por familia (legal, infraestructura, atributos naturales, preparación, terreno) ' +
    'para que atributos relacionados no se sumen dos veces. Por eso la suma de las líneas no coincide exactamente con la diferencia entre la base y el total.';
}

/** Servicios reales alrededor del punto, medidos sobre OpenStreetMap. */
function entorno(v) {
  const bloque = $('entorno-bloque');
  const e = v.entorno;
  if (!e) { bloque.style.display = 'none'; return; }

  const grupos = [
    ['Salud', e.healthServices], ['Comercio', e.commerce], ['Educación', e.education],
    ['Seguridad', e.security], ['Servicios', e.generalServices], ['Gastronomía', e.gastronomy],
    ['Atractivos', e.attractions],
  ].filter(([, g]) => g?.nearest);

  if (!grupos.length) { bloque.style.display = 'none'; return; }

  bloque.style.display = 'block';
  $('entorno-grid').innerHTML = grupos.map(([nombre, g]) => {
    const pie = [
      g.nearest.name || null,
      g.within10 > 0 ? `${g.within10} a menos de 10 km` : 'el más cercano de la zona',
    ].filter(Boolean).join(' · ');
    return `
    <div class="terr-item">
      <span>${esc(nombre)}</span>
      <strong>${g.nearest.distanceKm.toFixed(1)} km</strong>
      <small>${esc(pie)}</small>
    </div>`;
  }).join('');
  $('entorno-fuente').textContent =
    `Medido sobre OpenStreetMap en un radio de ${e.radiusKm} km alrededor del punto de la propiedad.`;
}

function nivelTurismoTexto(nivel) {
  const mapa = {
    internacional: 'Destino internacional',
    nacional: 'Destino nacional',
    regional: 'Destino regional',
    local: 'Interés local',
    sin_influencia: 'Sin influencia turística',
    sin_clasificar: 'Sin clasificar',
  };
  return mapa[String(nivel || '').toLowerCase()] || 'Sin clasificar';
}

// --------------------------------------------------------------------------
// IV. FICHA TECNICA + INDICES
// --------------------------------------------------------------------------
function fichaTecnica(prop, v) {
  // Se muestran los valores que el motor leyo (ya traducidos desde el catalogo
  // antiguo), no la fila cruda: asi la ficha coincide con la cascada de al lado
  // en vez de decir "Agua: si" junto a un ajuste de agua aplicado.
  const e = v.entrada || {};
  const atributos = [
    ['Superficie', prop.superficie_m2 ? Number(prop.superficie_m2).toLocaleString('es-CL') + ' m²' : null],
    ['Situación del rol', e.rol],
    ['Agua', e.water],
    ['Electricidad', e.electricity],
    ['Acceso', e.access],
    ['Topografía', e.topography],
    ['Suelo', prop.suelo],
    ['Vegetación', e.vegetation],
    ['Vista principal', e.view],
    ['Cierre perimetral', e.fencing],
    ['Portón', e.gate],
    ['Condominio', e.condominium === 'si' ? 'Sí' : 'No'],
    ['Distancia a ruta principal', e.routeDistanceKm ? e.routeDistanceKm + ' km' : null],
    ['Atributos naturales', (e.nature || []).join(', ')],
  ];

  const declarados = atributos.filter(([, val]) => val && String(val).trim() && String(val).toLowerCase() !== 'no especificado');
  const faltantes = atributos.filter(([, val]) => !val || !String(val).trim() || String(val).toLowerCase() === 'no especificado');

  // El catalogo guarda "pradera", "cordillera", "acceso controlado" en
  // minuscula; en una ficha impresa se ve como un descuido.
  const capital = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

  $('tech-attributes-container').innerHTML = declarados.map(([k, val]) => `
    <div class="tech-item"><span>${esc(k)}</span><strong>${esc(capital(val))}</strong></div>`).join('');

  // Los datos que faltan no son un detalle: cada uno es un ajuste que el motor
  // no pudo aplicar, o sea valor que la propiedad quizas tiene y no se le
  // reconoce. Decirlo convierte al informe en una lista de tareas.
  const bloque = $('faltantes-bloque');
  if (faltantes.length) {
    bloque.style.display = 'block';
    $('faltantes-lista').innerHTML = faltantes.map(([k]) => `<li>${esc(k)}</li>`).join('');
    $('faltantes-nota').textContent =
      `Hay ${faltantes.length} ${faltantes.length === 1 ? 'antecedente sin declarar' : 'antecedentes sin declarar'}. ` +
      'Cada uno es un ajuste que el modelo no pudo aplicar: completarlos puede subir el valor calculado sin cambiar nada en el terreno.';
  } else {
    bloque.style.display = 'none';
  }

  entorno(v);

  const idx = [
    { nombre: 'Índice de propiedad', dato: v.indices.propiedad },
    { nombre: 'Índice territorial', dato: v.indices.territorial },
  ].filter((x) => x.dato?.score !== undefined);

  if (idx.length) {
    $('indices-bloque').innerHTML = idx.map(({ nombre, dato }) => `
      <div class="indice">
        <div class="indice-head"><span>${esc(nombre)}</span><strong>${dato.score}/100 · ${esc(dato.label)}</strong></div>
        <div class="indice-barra"><span style="width:${dato.score}%"></span></div>
        <ul class="indice-detalle">
          ${(dato.components || []).slice().sort((a, b) => a.ratio - b.ratio).slice(0, 4)
            .map((c) => `<li><span>${esc(c.label)}</span><span>${Math.round(c.ratio * 100)}%<small>${esc(c.detail || '')}</small></span></li>`).join('')}
        </ul>
      </div>`).join('');
  } else {
    $('indices-bloque').innerHTML = '<p class="nota-vacia">No hay índices calculados para esta propiedad.</p>';
  }
}

// --------------------------------------------------------------------------
// V. ESTRATEGIA COMERCIAL
// --------------------------------------------------------------------------
function estrategiaComercial(prop, v) {
  const valor = v.valorFinal;
  const pedido = Number(prop.precio_publicado) || 0;
  const brecha = pedido > 0 && valor > 0 ? ((pedido - valor) / valor) * 100 : null;

  const escenarios = [
    { nombre: 'Cierre rápido', precio: v.valores.ventaApuro, liquidez: 'Alta', plazo: '30 – 60 días', desc: 'Precio bajo el valor TPL para vender en el corto plazo.' },
    { nombre: 'Valor TPL', precio: valor, liquidez: 'Alta', plazo: '60 – 120 días', desc: 'El rango donde se concentran las consultas reales.' },
    { nombre: 'Mercado potencial', precio: v.valores.mercadoPotencial, liquidez: 'Media', plazo: '120 – 240 días', desc: 'Techo técnico: exige material que justifique cada peso de diferencia.' },
  ];

  let activo = 1;
  if (brecha !== null) {
    if (brecha <= -8) activo = 0;
    else if (brecha >= 12) activo = 2;
  }

  $('scenario-tbody').innerHTML = escenarios.map((e, i) => `
    <tr class="${i === activo ? 'activo' : ''}">
      <td><strong>${esc(e.nombre)}</strong>${i === activo ? '<span class="tag-posicion">Su posición</span>' : ''}</td>
      <td>${clp(e.precio)}</td>
      <td>${esc(e.liquidez)}</td>
      <td>${esc(e.plazo)}</td>
      <td class="col-desc">${esc(e.desc)}</td>
    </tr>`).join('');

  if (brecha !== null && brecha > 12) {
    const exceso = pedido - v.valores.mercadoPotencial;
    $('nota-escenarios').innerHTML = exceso > 0
      ? `Su precio de ${clp(pedido)} está ${clp(exceso)} por sobre el techo técnico del modelo. Sostenerlo es posible, pero requiere que el comprador vea algo que el modelo no puede medir: por eso el material de presentación deja de ser opcional.`
      : `Su precio de ${clp(pedido)} cae dentro del escenario de mercado potencial. Es alcanzable con la presentación adecuada.`;
  } else {
    $('nota-escenarios').textContent = 'Los tres escenarios usan el mismo cálculo técnico; lo que cambia es cuánto tiempo y cuánta preparación exige cada uno.';
  }
}

// --------------------------------------------------------------------------
// VI. PLAN DE SERVICIOS
// --------------------------------------------------------------------------
function planDeServicios(prop, v) {
  const valor = v.valorFinal;
  const pedido = Number(prop.precio_publicado) || 0;
  const brecha = pedido > 0 && valor > 0 ? ((pedido - valor) / valor) * 100 : 0;

  // Cada servicio se justifica con algo que este informe demostro, no con una
  // lista generica de marketing.
  const servicios = [];

  const sinFoto = !prop.metadata?.imagen && !(prop.metadata?.imagenes || []).length;
  if (sinFoto) {
    servicios.push({
      nombre: 'Fotografía profesional',
      motivo: 'La propiedad no tiene ninguna fotografía cargada. Sin imágenes, un aviso no se abre.',
      prioridad: 'critica',
    });
  }

  const faltanAtributos = [
    ['agua', prop.agua], ['electricidad', prop.electricidad], ['acceso', prop.acceso],
    ['rol', prop.rol_situacion], ['topografía', prop.topografia],
  ].filter(([, val]) => !val || String(val).toLowerCase() === 'no especificado').map(([k]) => k);

  if (faltanAtributos.length) {
    servicios.push({
      nombre: 'Levantamiento técnico en terreno',
      motivo: `Faltan antecedentes de ${faltanAtributos.join(', ')}. Son ajustes que el modelo no pudo aplicar: declararlos puede subir el valor sin obra.`,
      prioridad: 'alta',
    });
  }

  if (v.territorio.fuente !== 'geoint') {
    servicios.push({
      nombre: 'Georreferenciación de la propiedad',
      motivo: 'Sin coordenadas confirmadas, la tasación usa el tramo de distancia más desfavorable. Es el dato más barato de corregir y el que más mueve el valor.',
      prioridad: 'critica',
    });
  }

  if (brecha > 12) {
    servicios.push({
      nombre: 'Video con dron y página dedicada',
      motivo: `Su precio está ${Math.round(brecha)}% sobre el valor TPL. A esa distancia el comprador necesita ver la propiedad antes de considerarla.`,
      prioridad: 'alta',
    });
    servicios.push({
      nombre: 'Difusión segmentada',
      motivo: 'El público que paga sobre el valor de mercado es reducido: hay que ir a buscarlo, no esperar que llegue por el portal.',
      prioridad: 'media',
    });
  } else {
    servicios.push({
      nombre: 'Publicación en portales masivos',
      motivo: 'Su precio está dentro del rango de mayor liquidez. Lo que falta es volumen de visitas, no argumentación.',
      prioridad: 'alta',
    });
  }

  const cierreDebil = String(prop.cierre_perimetral || '').toLowerCase().includes('sin') || String(prop.cierre_perimetral || '').toLowerCase() === 'no';
  if (cierreDebil) {
    servicios.push({
      nombre: 'Cierre perimetral',
      motivo: 'La falta de cierre descuenta un 15% en el modelo. Es una de las pocas partidas donde la obra se paga sola en el valor.',
      prioridad: 'media',
    });
  }

  // Escalon de marketing segun el valor del activo. Una parcela de $200 millones
  // no se vende con las mismas piezas que una de $20: el costo de producir un
  // video o una landing se justifica sobre cierto ticket, no antes.
  const escalon = valor >= 150000000
    ? { nombre: 'Premium', desde: 150 }
    : valor >= 80000000
      ? { nombre: 'Alto', desde: 80 }
      : valor >= 35000000
        ? { nombre: 'Medio', desde: 35 }
        : { nombre: 'Base', desde: 0 };

  const piezas = [
    { nombre: 'Ficha en Tu Parcela Lista', minimo: 0, desc: 'Publicación con ficha técnica completa y contacto directo.' },
    { nombre: 'Portales inmobiliarios', minimo: 0, desc: 'Distribución en los portales donde busca el comprador de parcelas.' },
    { nombre: 'Fotografía profesional', minimo: 35, desc: 'Sesión en terreno con luz adecuada. Es lo que decide si abren el aviso.' },
    { nombre: 'Campaña segmentada en redes', minimo: 35, desc: 'Pauta dirigida al perfil que compra en esta zona y este rango.' },
    { nombre: 'Video con dron', minimo: 80, desc: 'Muestra la superficie real, el entorno y los accesos. Imprescindible sobre 8 hectáreas o con atributos naturales.' },
    { nombre: 'Landing dedicada de la propiedad', minimo: 80, desc: 'Página propia con toda la información, para enviar por WhatsApp sin intermediarios.' },
    { nombre: 'Recorrido virtual y plano del loteo', minimo: 150, desc: 'Para compradores que evalúan a distancia antes de viajar.' },
    { nombre: 'Difusión a red de inversionistas', minimo: 150, desc: 'Presentación directa a compradores calificados de la red TPL.' },
  ].map((p) => ({ ...p, incluida: escalon.desde >= p.minimo }));

  $('marketing-escalon').innerHTML = `
    <div class="escalon-cabecera">
      <div>
        <span class="lbl">Nivel de marketing que corresponde</span>
        <strong>${esc(escalon.nombre)}</strong>
      </div>
      <span class="escalon-nota">Definido por el valor TPL de ${clp(valor)}</span>
    </div>
    <div class="piezas">
      ${piezas.map((p) => `
        <div class="pieza ${p.incluida ? 'incluida' : 'superior'}">
          <span class="marca">${p.incluida ? '✓' : '·'}</span>
          <div>
            <strong>${esc(p.nombre)}</strong>
            <p>${esc(p.desc)}</p>
            ${p.incluida ? '' : `<small>Desde ${p.minimo} millones de valor TPL</small>`}
          </div>
        </div>`).join('')}
    </div>`;

  const orden = { critica: 0, alta: 1, media: 2 };
  servicios.sort((a, b) => orden[a.prioridad] - orden[b.prioridad]);

  $('servicios-lista').innerHTML = servicios.map((s) => `
    <div class="servicio prioridad-${s.prioridad}">
      <div class="servicio-head">
        <strong>${esc(s.nombre)}</strong>
        <span class="badge">${s.prioridad === 'critica' ? 'Crítico' : s.prioridad === 'alta' ? 'Prioritario' : 'Recomendado'}</span>
      </div>
      <p>${esc(s.motivo)}</p>
    </div>`).join('');

  // Presupuesto de difusion como porcentaje del valor, no una cifra al aire.
  // Sin precio publicado no corresponde el tramo barato (que asume estar bajo
  // mercado): se usa el tramo central y se dice por que.
  const sinPrecio = pedido <= 0;
  const tramo = sinPrecio ? [0.005, 0.006] : brecha > 20 ? [0.007, 0.009] : brecha > 0 ? [0.005, 0.006] : [0.002, 0.003];
  $('presupuesto').innerHTML = `
    <span class="lbl">Pauta de difusión sugerida</span>
    <span class="val">${clp(valor * tramo[0])} – ${clp(valor * tramo[1])}</span>
    <span class="sub">${(tramo[0] * 100).toFixed(1)}% a ${(tramo[1] * 100).toFixed(1)}% del valor TPL. ${
      sinPrecio
        ? 'Estimado sobre el valor TPL porque todavía no hay precio de salida definido.'
        : 'Ajustado al nivel de exposición que exige su precio.'
    }</span>`;

  $('reading-conclusion').innerHTML =
    `<p>El valor TPL de esta propiedad es <strong>${clp(valor)}</strong>, calculado con ` +
    `${v.confianzaDetalle.pct}% de confianza sobre ${v.mercado.cantidad || 'cero'} ${v.mercado.cantidad === 1 ? 'aviso comparable' : 'avisos comparables'} ` +
    `y las distancias territoriales de ${esc(prop.comuna || 'la comuna')}.</p>` +
    `<p>${servicios.length ? `Identificamos ${servicios.length} ${servicios.length === 1 ? 'acción' : 'acciones'} concretas sobre esta propiedad, ordenadas por impacto. ` : ''}` +
    'Las primeras no son gasto de marketing: son datos que faltan y que el propio modelo castiga.</p>';
}

// --------------------------------------------------------------------------
// VII. METODOLOGIA
// --------------------------------------------------------------------------
function metodologia(v) {
  $('motor-version').textContent = v.motor.version || 'no informada';
  $('motor-fecha').textContent = new Date(v.motor.calculadoAt).toLocaleString('es-CL');
  $('motor-fuentes').innerHTML = [
    `Distancias: ${esc(v.territorio.fuenteEtiqueta)}`,
    `Referencias comunales: ${v.mercado.fuenteReferencias === 'supabase' ? 'catálogo TPL en Supabase, actualizado' : 'tabla incorporada al motor'}`,
    v.mercado.ufClp ? `UF: ${clp(v.mercado.ufClp)} al ${esc(v.mercado.ufFecha || '')}` : null,
    `Comparables: ${v.mercado.cantidad} avisos del catastro de mercado TPL`,
  ].filter(Boolean).map((t) => `<li>${t}</li>`).join('');
}
