import { getSession } from './auth.js';
import { getClient } from './supabase.js';
import { state, actualizar } from './store.js';
import { router } from './router.js';

export const clp = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(n) || 0);
export const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Lee la tasacion canonica guardada. La misma fuente que la ficha publica. */
export function tasacionDe(propiedad) {
  let meta = propiedad?.metadata;
  if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = null; } }
  const g = meta || {};
  const num = (...claves) => {
    for (const c of claves) {
      const v = Number(g[c]);
      if (Number.isFinite(v) && v > 0) return v;
    }
    return 0;
  };
  const recomendado = num('valor_tpl_recomendado', 'valor_tpl_tasador_ajustado', 'valor_tpl_tasador');
  if (!recomendado) return null;
  return {
    valorRecomendado: recomendado,
    valorComunal: num('valor_comunal', 'valor_promedio_comunal'),
    valorTecnico: num('valor_tpl_tecnico'),
    valorApuro: num('valor_venta_apuro'),
    m2: num('valor_tpl_m2'),
    comparables: Number(g.referencia_comunal_muestra) || 0,
    origenMuestra: g.referencia_comunal_origen || '',
    segmento: g.referencia_comunal_segmento || '',
    calculadaAt: g.tasacion_calculada_at || null,
    metadata: g,
  };
}

/** Marca en la barra lateral qué vista está abierta. */
function marcarNavegacion() {
  const vista = (location.hash.slice(1) || 'informe').split('?')[0];
  document.querySelectorAll('#app-sidebar-nav .nav-item').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.vista === vista);
  });
}

/** Pinta el encabezado de la barra lateral con la propiedad del propietario. */
export function pintarSidebar() {
  const caja = document.getElementById('propiedad-activa');
  if (!caja || !state.propiedad) return;
  caja.hidden = false;
  document.getElementById('propiedad-activa-nombre').textContent =
    state.propiedad.titulo || state.propiedad.codigo || 'Tu propiedad';
  const valor = document.getElementById('propiedad-activa-valor');
  valor.textContent = state.tasacion ? `Valor TPL ${clp(state.tasacion.valorRecomendado)}` : 'Tasación pendiente';
}

export function marcarEstado(vista, texto, tono = '') {
  const el = document.querySelector(`[data-estado="${vista}"]`);
  if (!el) return;
  el.textContent = texto;
  el.className = `nav-item__estado${tono ? ' nav-item__estado--' + tono : ''}`;
}

async function cargarPropiedad() {
  const client = await getClient();
  // El id llega desde el informe premium al crear la cuenta. Si no está, se
  // busca la propiedad por el correo con que la persona entró.
  let id = sessionStorage.getItem('tpl_business_propiedad');

  let query = client.from('tpl_propiedades')
    .select('id,codigo,titulo,descripcion,region,comuna,sector,superficie_m2,precio_publicado,estado,agua,electricidad,acceso,topografia,rol_situacion,atributos_naturales,metadata,updated_at');

  const { data, error } = id
    ? await query.eq('id', id).limit(1)
    : await query.eq('metadata->>contacto_email', String(state.user?.email || '').toLowerCase()).limit(1);

  if (error) throw error;
  const propiedad = (data || [])[0] || null;
  if (propiedad) sessionStorage.setItem('tpl_business_propiedad', propiedad.id);
  return propiedad;
}

/**
 * Cuenta real de fotos en tpl_propiedad_imagenes (la tabla real de fotos,
 * ver subir-foto-propietario). El diagnóstico del Studio antes solo contaba
 * metadata.imagenes (patrón viejo, un arreglo de URLs de texto): una
 * propiedad con fotos subidas por el nuevo gestor de fotos del CRM o del
 * portal del propietario aparecía como "sin fotos" aunque sí las tuviera.
 */
async function contarFotosReales(propiedadId) {
  if (!propiedadId) return null;
  try {
    const client = await getClient();
    const { count, error } = await client
      .from('tpl_propiedad_imagenes')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId);
    if (error) throw error;
    return typeof count === 'number' ? count : null;
  } catch (error) {
    console.warn('No se pudo contar las fotos reales de la propiedad.', error);
    return null;
  }
}

async function boot() {
  window.addEventListener('hashchange', marcarNavegacion);

  document.getElementById('btn-salir')?.addEventListener('click', async () => {
    const client = await getClient();
    await client.auth.signOut();
    sessionStorage.removeItem('tpl_business_propiedad');
    location.hash = '#acceso';
    location.reload();
  });

  const session = await getSession();
  if (!session) {
    if (!location.hash || location.hash === '#informe') location.hash = '#acceso';
    router.init();
    marcarNavegacion();
    return;
  }

  actualizar({ user: session.user });

  try {
    const propiedad = await cargarPropiedad();
    const fotosReales = await contarFotosReales(propiedad?.id);
    actualizar({ propiedad, propiedadId: propiedad?.id || null, tasacion: tasacionDe(propiedad), fotosReales });
    pintarSidebar();
  } catch (error) {
    console.warn('No se pudo cargar la propiedad del propietario', error);
  }

  // El informe es lo primero que ve: es lo que vino a buscar.
  if (!location.hash || location.hash === '#acceso') location.hash = '#informe';
  router.init();
  marcarNavegacion();
}

boot();
