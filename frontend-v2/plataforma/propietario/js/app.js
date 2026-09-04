// =============================================================================
// MI PROPIEDAD TPL - PORTAL DEL PROPIETARIO
// =============================================================================
// El dueño llega con el enlace que le genera el CRM y aquí puede: ver qué datos
// le faltan, completarlos, obtener su tasación con el motor único de TPL y
// descargar su informe de valor.
//
// QUÉ ESTABA ROTO Y POR QUÉ SE REESCRIBIÓ
//   La versión anterior entraba con ?id= y guardaba con un UPDATE directo sobre
//   tpl_propiedades. Esa tabla NO permite escritura anónima, así que el PATCH
//   devolvía 200 con cero filas afectadas: el dueño llenaba todo el formulario
//   y no se guardaba nada. Ahora se usa el canal que sí existe para esto,
//   tpl_propietario_actualizar_por_token_v1, que es security definer, valida el
//   token, escribe la ficha, sincroniza tpl_activo_terreno y tpl_activo_scores,
//   sube version_actual y deja traza en tpl_actualizaciones_propietario. Por eso
//   el cambio se ve de inmediato en el CRM, en la ficha pública y en el informe.
// =============================================================================

const state = {
  token: null,
  propiedad: null,
  tasacion: null,
  expiraEl: null,
  whatsapp: '56988508361',
};

// Los campos que mueven la tasación. 'peso' es cuánto aporta al perfil.
const CAMPOS = [
  { id: 'form-topografia', clave: 'topografia', etiqueta: 'Topografía', peso: 12 },
  { id: 'form-agua', clave: 'agua', etiqueta: 'Agua', peso: 14 },
  { id: 'form-luz', clave: 'electricidad', etiqueta: 'Electricidad', peso: 14 },
  { id: 'form-rol', clave: 'rol_situacion', etiqueta: 'Situación del rol', peso: 14 },
  { id: 'form-acceso', clave: 'acceso', etiqueta: 'Acceso', peso: 12 },
  { id: 'form-cierre', clave: 'cierre_perimetral', etiqueta: 'Cierre perimetral', peso: 10 },
  { id: 'form-porton', clave: 'porton', etiqueta: 'Portón', peso: 8 },
  { id: 'form-precio', clave: 'precio_publicado', etiqueta: 'Precio que pides', peso: 16 },
];

const cambiarFaseBase = typeof window.mostrarFase === 'function'
  ? window.mostrarFase
  : function (idFase) {
      document.querySelectorAll('.fase-container').forEach((el) => el.classList.remove('fase-active'));
      document.getElementById(idFase)?.classList.add('fase-active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

// Evita guardados repetidos si la persona pulsa dos veces el boton.
let guardando = false;

const money = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
const vacio = (v) => v === null || v === undefined || String(v).trim() === '' || String(v).trim().toLowerCase() === 'no especificado';

// El catalogo antiguo guarda "si"/"no" en agua, luz, rol y cierre. Mostrarselo
// asi al dueno no le dice nada; se traduce al lenguaje del formulario, que es el
// mismo que lee el motor de tasacion.
const LEGIBLE = {
  'form-agua': { si: 'Agua disponible', no: 'Sin factibilidad' },
  'form-luz': { si: 'Empalme instalado', no: 'Sin factibilidad cercana' },
  'form-rol': { si: 'Rol Propio', no: 'Sin rol propio' },
  'form-cierre': { si: 'Cerrado completo', no: 'Sin cierre' },
  'form-porton': { si: 'Con portón', no: 'Sin portón' },
};
function legible(campo, valor) {
  const v = String(valor ?? '').trim();
  const mapa = LEGIBLE[campo.id];
  if (mapa) {
    if (/^(si|sí|true|1)$/i.test(v)) return mapa.si;
    if (/^(no|false|0)$/i.test(v)) return mapa.no;
  }
  // El catalogo tambien guarda descripciones sueltas que significan lo mismo
  // que una opcion del formulario: "acceso controlado" es tener porton.
  if (campo.id === 'form-porton' && /control|automat|electric/i.test(v)) return 'Con portón';
  if (campo.id === 'form-cierre' && /completo|cerrado total/i.test(v)) return 'Cerrado completo';
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  state.token = params.get('token');

  if (!state.token) {
    // El enlace antiguo traía ?id=. Sin token no hay forma de autorizar la
    // edición, así que se dice claramente en vez de simular que guarda.
    return error(
      'Este enlace no es válido',
      params.get('id')
        ? 'El enlace que estás usando es de una versión anterior y ya no permite editar tu ficha. Pídenos uno nuevo y te lo enviamos al instante.'
        : 'Falta el código de acceso. Abre el enlace tal como te lo enviamos, sin cortarlo.'
    );
  }

  iniciar();
});

function error(titulo, detalle) {
  const cont = document.getElementById('fase-loading') || document.body;
  cambiarFaseBase('fase-loading');
  cont.innerHTML = `
    <div class="capture-box" style="text-align:left;max-width:620px;margin:3rem auto;">
      <h2 style="margin-top:0;">${titulo}</h2>
      <p style="color:#555;">${detalle}</p>
      <button class="btn-primary large" style="width:100%;margin-top:1.5rem;" id="btn-error-wa">Escríbenos por WhatsApp</button>
    </div>`;
  const b = document.getElementById('btn-error-wa');
  if (b) b.addEventListener('click', () => abrirWhatsApp('Hola, necesito un enlace nuevo para actualizar los datos de mi parcela.'));
}

function abrirWhatsApp(texto) {
  window.open(`https://wa.me/${state.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
}

async function iniciar() {
  cambiarFaseBase('fase-loading');
  try {
    const datos = await window.TPLDataService.getOwnerProperty(state.token);
    if (!datos?.ok || !datos.propiedad) {
      return error('Tu enlace venció', 'Los enlaces duran un tiempo limitado por seguridad. Te generamos uno nuevo en el momento.');
    }
    state.propiedad = datos.propiedad;
    state.tasacion = datos.tasacion || null;
    state.expiraEl = datos.expires_at || null;

    pintarPanel();
    cambiarFaseBase('fase-dashboard');
  } catch (e) {
    console.error('No se pudo abrir el portal del propietario', e);
    error('No pudimos abrir tu ficha', 'Puede ser un problema momentáneo de conexión. Intenta de nuevo en un minuto.');
  }
}

/** Qué está declarado y qué falta. Es el corazón del portal. */
function estadoCampos() {
  const p = state.propiedad || {};
  const completos = [];
  const faltantes = [];
  for (const campo of CAMPOS) {
    const valor = campo.clave === 'precio_publicado'
      ? (Number(p.precio_publicado) > 0 ? money(p.precio_publicado) : '')
      : p[campo.clave];
    (vacio(valor) ? faltantes : completos).push({ ...campo, valor: legible(campo, valor) });
  }
  const total = CAMPOS.reduce((s, c) => s + c.peso, 0);
  const logrado = completos.reduce((s, c) => s + c.peso, 0);
  return { completos, faltantes, pct: Math.round((logrado / total) * 100) };
}

function pintarPanel() {
  const p = state.propiedad;
  const { completos, faltantes, pct } = estadoCampos();

  const nombre = document.getElementById('dash-hero-name');
  if (nombre) {
    const contacto = p.propietario_contacto || {};
    nombre.textContent = contacto.nombre ? String(contacto.nombre).split(' ')[0] : 'Propietario';
  }

  const titulo = document.getElementById('dash-titulo');
  if (titulo) titulo.textContent = p.titulo || 'Tu propiedad';
  const ubic = document.getElementById('dash-comuna');
  if (ubic) ubic.textContent = p.comuna || '';

  // Barra de completitud
  const barra = document.querySelector('.progress-bar');
  if (barra) barra.style.width = `${pct}%`;
  document.querySelectorAll('.score-text').forEach((el) => {
    el.textContent = faltantes.length
      ? `Tu ficha está al ${pct}%. ${faltantes.length === 1 ? 'Te falta 1 dato' : `Te faltan ${faltantes.length} datos`}.`
      : `Tu ficha está completa (${pct}%).`;
  });

  const salud = document.getElementById('dash-health');
  if (salud) salud.textContent = `${pct}%`;

  // Lo declarado y lo que falta, uno al lado del otro. Lo que falta va en rojo
  // porque cada uno es un ajuste que el tasador no puede aplicar.
  const lista = document.getElementById('dash-campos');
  if (lista) {
    lista.innerHTML = [
      ...completos.map((c) => `
        <div class="campo campo-ok">
          <span class="campo-icono">✓</span>
          <div><strong>${c.etiqueta}</strong><small>${escapar(c.valor)}</small></div>
        </div>`),
      ...faltantes.map((c) => `
        <div class="campo campo-falta">
          <span class="campo-icono">!</span>
          <div><strong>${c.etiqueta}</strong><small>Sin declarar</small></div>
        </div>`),
    ].join('');
  }

  const aviso = document.getElementById('dash-faltantes-aviso');
  if (aviso) {
    aviso.style.display = faltantes.length ? 'block' : 'none';
    aviso.innerHTML = faltantes.length
      ? `<strong>${faltantes.length === 1 ? 'Te falta 1 antecedente' : `Te faltan ${faltantes.length} antecedentes`}:</strong> ${faltantes.map((f) => escapar(f.etiqueta)).join(', ')}.
         Cada uno es un ajuste que el tasador no puede aplicar hoy. Completarlos puede subir tu valor sin que toques nada en el terreno.`
      : '';
  }

  // Si ya hay tasación guardada, se muestra de entrada.
  const yaCalculado = valoresDesdeTasacion();
  if (yaCalculado) pintarValores(yaCalculado);
}

function escapar(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Rellena el formulario con lo que ya está declarado. */
function poblarFormulario() {
  const p = state.propiedad || {};
  for (const campo of CAMPOS) {
    const el = document.getElementById(campo.id);
    if (!el) continue;
    const valor = p[campo.clave];

    if (campo.clave === 'precio_publicado') {
      if (Number(valor) > 0) el.value = Number(valor);
    } else if (el.tagName === 'SELECT') {
      // El valor guardado puede venir del catalogo antiguo ("si"/"no") o del
      // formulario ("Pozo profundo"). Se traduce primero y despues se busca la
      // opcion que calce, en cualquiera de los dos sentidos: un "si" en agua no
      // coincidia con ninguna opcion y el campo quedaba vacio aunque el dato
      // existiera, haciendo creer al dueno que no lo habia declarado.
      const texto = legible(campo, valor).toLowerCase();
      const opcion = Array.from(el.options).find((o) => {
        if (!o.value) return false;
        const v = o.value.toLowerCase();
        return texto === v || texto.includes(v) || v.includes(texto);
      });
      if (opcion) el.value = opcion.value;
    } else if (!vacio(valor)) {
      el.value = valor;
    }

    // Marca en rojo lo que sigue vacío, para que se vea qué falta al llenar.
    const grupo = el.closest('.form-group');
    if (grupo) grupo.classList.toggle('falta', vacio(el.value));
    el.addEventListener('change', () => {
      if (grupo) grupo.classList.toggle('falta', vacio(el.value));
    });
  }
}

async function guardarYTasar() {
  // OJO: aqui NO se puede llamar a window.mostrarFase('fase-loading'), porque
  // el envoltorio intercepta esa fase para guardar y la funcion se llamaria a si
  // misma sin fin. Ese bucle llego a disparar cientos de guardados seguidos
  // contra la base antes de detectarse.
  if (guardando) return;
  guardando = true;
  cambiarFaseBase('fase-loading');
  const cont = document.getElementById('fase-loading');
  if (cont) cont.innerHTML = '<div style="text-align:center;padding:4rem 1rem;"><div class="spinner-tpl"></div><p style="margin-top:1.5rem;color:#555;">Guardando y calculando el valor de tu propiedad…</p></div>';

  const payload = {};
  for (const campo of CAMPOS) {
    const el = document.getElementById(campo.id);
    if (!el || vacio(el.value)) continue;
    payload[campo.clave] = campo.clave === 'precio_publicado'
      ? String(Math.round(Number(String(el.value).replace(/[^\d]/g, '')) || 0))
      : el.value;
  }

  const mejoras = Array.from(document.querySelectorAll('#form-mejoras input[type="checkbox"]:checked')).map((c) => c.value);
  const negociacion = document.getElementById('form-negociacion')?.value || null;
  payload.contacto = { ...(state.propiedad.propietario_contacto || {}), negociacion, mejoras_negociables: mejoras };

  let guardado = false;
  let motivoFallo = '';
  try {
    const r = await window.TPLDataService.updateOwnerProperty(state.token, payload);
    guardado = Boolean(r?.ok);
    if (!guardado) motivoFallo = r?.error || 'La base no confirmó el guardado.';
  } catch (e) {
    motivoFallo = e?.message || String(e);
    console.error('No se pudo guardar la ficha del propietario', e, 'payload:', payload);
  }

  // Se recarga desde la base: así lo que se muestra es lo que quedó guardado,
  // no lo que se escribió en el formulario. Y la tasación viene recalculada
  // por el servidor con las distancias reales del atlas.
  try {
    const datos = await window.TPLDataService.getOwnerProperty(state.token);
    if (datos?.propiedad) state.propiedad = datos.propiedad;
    if (datos?.tasacion) state.tasacion = datos.tasacion;
  } catch { /* se sigue con lo que hay en memoria */ }

  guardando = false;
  mostrarResultado(guardado, valoresDesdeTasacion(), motivoFallo);
}

/**
 * Valores a mostrarle al propietario.
 *
 * La fuente principal es la tasación que ya calculó el servidor y que viene en
 * el resumen por token: es la MISMA cifra que ve el CRM y el informe premium.
 *
 * No se recalcula en el navegador porque esta página es anónima y no puede leer
 * tpl_geoint_propiedad_contexto: sin las distancias del atlas, el motor cae al
 * tramo más desfavorable y devolvía $12.070.000 donde el valor real es
 * $136.390.000. Mostrarle eso al dueño sería peor que no mostrarle nada.
 */
function valoresDesdeTasacion() {
  const t = state.tasacion;
  if (!t) return null;
  const r = t.resultado || {};
  const total = Number(t.valor_tpl_oficial ?? t.valor_tpl_total ?? r.valorFinal) || 0;
  if (!total) return null;
  const area = Number(state.propiedad?.superficie_m2) || Number(r.area) || 0;
  return {
    valorFinal: total,
    valores: {
      ventaApuro: Number(r.valor_venta_apuro ?? r.valorPorApuro) || 0,
      mercadoPotencial: Number(r.technicalPotential) || 0,
      m2: Number(t.valor_tpl_m2) || (area ? Math.round(total / area) : 0),
    },
    clasificacion: t.clasificacion || r.priceAnalysis?.classification || '',
    version: t.version_motor || r.engineVersion || '',
    calculadaAt: t.created_at || null,
  };
}

function pintarValores(v) {
  const rec = document.getElementById('dash-valor-tpl');
  const apuro = document.getElementById('dash-valor-apuro');
  if (rec) rec.textContent = money(v.valorFinal);
  if (apuro) apuro.textContent = money(v.valores.ventaApuro);
}

function mostrarResultado(guardado, v, motivoFallo = '') {
  const cont = document.getElementById('fase-loading');
  if (!cont) return;
  const { faltantes, pct } = estadoCampos();

  const aviso = guardado
    ? '<p style="color:#166534;background:#ecfdf5;border:1px solid #a7f3d0;padding:12px 14px;border-radius:8px;margin:0 0 1.5rem;">Guardamos tus datos. El cambio ya está visible para tu asesor y en la ficha de tu propiedad.</p>'
    : `<p style="color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:12px 14px;border-radius:8px;margin:0 0 1.5rem;">
         No pudimos guardar los cambios. Puede que tu enlace haya vencido. Cuéntanos por WhatsApp y lo resolvemos.
         ${motivoFallo ? `<br><small style="opacity:.8;">Detalle técnico: ${escapar(motivoFallo)}</small>` : ''}
       </p>`;

  const bloqueValor = v
    ? `<div class="valores-grid">
         <div class="valor-card destacado">
           <span class="lbl">Valor TPL recomendado</span>
           <strong>${money(v.valorFinal)}</strong>
           <small>${money(v.valores.m2)} por m²${v.clasificacion ? ' · ' + escapar(v.clasificacion) : ''}</small>
         </div>
         <div class="valor-card">
           <span class="lbl">Valor de venta ágil</span>
           <strong>${money(v.valores.ventaApuro)}</strong>
           <small>Si necesitas vender rápido</small>
         </div>
       </div>
       <p style="font-size:.9rem;color:#666;margin:0 0 1.5rem;">
         Es una estimación con los antecedentes que declaraste, la ubicación de tu propiedad y los avisos
         reales de tu zona. No reemplaza una visita a terreno.
       </p>`
    : `<p style="margin:0 0 1.5rem;color:#666;">
         Con los datos disponibles todavía no podemos estimar un valor confiable. Un asesor puede revisarla contigo.
       </p>`;

  const bloqueFaltantes = faltantes.length
    ? `<div class="aviso-faltan">
         <strong>${faltantes.length === 1 ? 'Te falta 1 antecedente' : `Te faltan ${faltantes.length} antecedentes`} para una tasación más precisa</strong>
         <ul>${faltantes.map((f) => `<li>${escapar(f.etiqueta)}</li>`).join('')}</ul>
       </div>`
    : '<p style="color:#166534;font-weight:600;margin-bottom:1.5rem;">Tu ficha está completa. Esta es la tasación más precisa que podemos entregarte.</p>';

  // El informe premium se habilita cuando la ficha tiene sustento suficiente.
  // Ofrecerlo con la ficha a medias seria vender un documento vacio.
  const puedeInforme = Boolean(v) && pct >= 70;
  const bloqueInforme = puedeInforme
    ? `<a class="btn-primary large" style="width:100%;display:block;text-align:center;text-decoration:none;box-sizing:border-box;"
          href="../informe-valores/index.html?token=${encodeURIComponent(state.token)}">
         Descargar mi informe de valor
       </a>`
    : `<button class="btn-primary large" style="width:100%;opacity:.5;cursor:not-allowed;" disabled>
         Descargar mi informe de valor
       </button>
       <p style="font-size:.85rem;color:#888;margin-top:.5rem;text-align:center;">
         Disponible cuando tu ficha llegue al 70%. Vas en ${pct}%.
       </p>`;

  cont.innerHTML = `
    <div class="capture-box" style="text-align:left;max-width:720px;margin:2rem auto;">
      <h2 style="margin-top:0;">Listo</h2>
      ${aviso}
      ${bloqueValor}
      ${bloqueFaltantes}
      ${bloqueInforme}
      <div style="margin-top:1rem;display:flex;gap:1rem;flex-wrap:wrap;justify-content:space-between;">
        <button style="background:none;border:none;color:#111;font-weight:600;cursor:pointer;padding:0;"
                onclick="mostrarFase('fase-actualizacion')">← Completar más datos</button>
        <button style="background:none;border:none;color:#111;font-weight:600;cursor:pointer;padding:0;"
                id="btn-resultado-whatsapp">Hablar con un asesor</button>
      </div>
    </div>`;

  document.getElementById('btn-resultado-whatsapp')?.addEventListener('click', () => {
    abrirWhatsApp(`Hola, actualicé los datos de mi parcela ${state.propiedad?.codigo || ''} en el portal TPL y quiero conversar el valor.`);
  });

  if (v) pintarValores(v);
}

// El HTML llama a mostrarFase() desde los onclick. Se envuelve la version de la
// pagina para poblar el formulario al entrar y para guardar al salir hacia la
// tasacion.
//
// OJO con el orden: este archivo se carga DESPUES del bloque inline que declara
// mostrarFase(). Y no puede haber aqui una declaracion `function mostrarFase`,
// porque una declaracion de nivel superior tambien escribe en window y el
// envoltorio terminaba llamandose a si mismo ("Maximum call stack size
// exceeded"). Por eso la referencia original se guarda en una constante.
window.mostrarFase = function (idFase) {
  if (idFase === 'fase-actualizacion') {
    cambiarFaseBase(idFase);
    poblarFormulario();
    return;
  }
  if (idFase === 'fase-loading' && state.token && state.propiedad) {
    guardarYTasar();
    return;
  }
  cambiarFaseBase(idFase);
};
