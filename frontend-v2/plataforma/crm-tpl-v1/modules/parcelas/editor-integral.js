import { showModal, closeModal } from '../../components/modal.js';
import { toast as showToast } from '../../components/toast.js';
import { getClient } from '../../core/supabase.js';
import { refrescarSnapshot } from '../../core/refresh.js';

let eiMap = null;
let eiMarker = null;

// Lectura tolerante de un campo del formulario.
//
// Todo el armado del payload usaba document.getElementById('x').value directo.
// Cuando alguien saco unos campos del HTML sin tocar el guardado, el editor
// dejo de poder guardar NADA: la primera lectura de un id inexistente lanzaba
// "Cannot read properties of null" y abortaba la funcion completa. Con esto,
// un campo que falte deja su valor vacio en vez de tumbar el guardado entero.
function valorCampo(id, porDefecto = '') {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[editor] falta el campo #${id} en el formulario; se guarda vacio.`);
    return porDefecto;
  }
  return el.value;
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderEditorHTML(record) {
  let materialidad_casa = '';
  let sup_casa = '';
  let dorm_casa = '';
  let banos_casa = '';
  let casa_regularizada = '';
  let casa_antiguedad = '';
  let extras_piscina = '';
  let extras_piscina_mat = '';
  let extras_piscina_m2 = '';
  let extras_quincho = '';
  let extras_cabaña = '';
  let extras_riego = '';

  
  if (record.metadata) {
    let meta = record.metadata;
    if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
    }
    materialidad_casa = meta.materialidad || '';
    sup_casa = meta.superficie_construida || '';
    dorm_casa = meta.dormitorios || '';
    banos_casa = meta.banos || '';
    casa_regularizada = meta.regularizada || '';
    casa_antiguedad = meta.antiguedad_anios || '';
    extras_piscina = meta.piscina || '';
    extras_piscina_mat = meta.piscina_mat || 'fibra';
    extras_piscina_m2 = meta.piscina_m2 || '';
    extras_quincho = meta.quincho || '';
    extras_cabaña = meta.cabana || '';
    extras_riego = meta.riego || '';

  }

  return `
    <style>
      .ei-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        color: #1e293b;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .ei-tabs {
        display: flex;
        gap: 1.5rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 1.5rem;
        overflow-x: auto;
      }
      .ei-tab-btn {
        background: none;
        border: none;
        padding: 0.75rem 0.25rem;
        font-weight: 600;
        font-size: 0.95rem;
        color: #64748b;
        cursor: pointer;
        position: relative;
        transition: color 0.2s;
        white-space: nowrap;
      }
      .ei-tab-btn:hover { color: #0f172a; }
      .ei-tab-btn.active { color: #0f172a; }
      .ei-tab-btn.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 3px;
        background: #3b82f6;
        border-radius: 3px 3px 0 0;
      }
      .ei-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.25rem;
      }
      .ei-form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .ei-form-group.full-width { grid-column: 1 / -1; }
      .ei-form-group label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      .ei-form-group input, .ei-form-group select, .ei-form-group textarea {
        padding: 0.65rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.95rem;
        color: #0f172a;
        background: #fff;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .ei-form-group input:focus, .ei-form-group select:focus, .ei-form-group textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }
      .ei-form-group textarea { min-height: 80px; resize: vertical; }
      .ei-panel { display: none; animation: fadeIn 0.3s ease-in-out; }
      .ei-panel.active { display: block; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      .ei-footer {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .ei-tasacion-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
      }
      .ei-tasacion-item { display: flex; flex-direction: column; gap: 0.25rem; }
      .ei-tasacion-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
      .ei-tasacion-value { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
      .ei-btn {
        padding: 0.6rem 1.25rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      .ei-btn-primary { background: #3b82f6; color: white; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2); }
      .ei-btn-primary:hover { background: #2563eb; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transform: translateY(-1px); }
      .ei-btn-secondary { background: white; color: #475569; border: 1px solid #cbd5e1; }
      .ei-btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }
      .ei-fotos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 0.75rem;
        min-height: 60px;
      }
      .ei-fotos-vacio { grid-column: 1 / -1; color: #94a3b8; font-size: 0.9rem; margin: 0; }
      .ei-fotos-item {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        border: 2px solid transparent;
        aspect-ratio: 1;
        background: #f1f5f9;
      }
      .ei-fotos-item.es-portada { border-color: #3b82f6; }
      .ei-fotos-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .ei-fotos-item .ei-fotos-actions {
        position: absolute; inset: 0;
        display: flex; align-items: flex-start; justify-content: space-between;
        padding: 0.3rem;
        opacity: 0;
        background: linear-gradient(rgba(0,0,0,.35), transparent 40%, transparent 60%, rgba(0,0,0,.35));
        transition: opacity 0.15s;
      }
      .ei-fotos-item:hover .ei-fotos-actions, .ei-fotos-item:focus-within .ei-fotos-actions { opacity: 1; }
      .ei-fotos-btn {
        border: none; border-radius: 5px; cursor: pointer;
        font-size: 0.85rem; line-height: 1; padding: 0.3rem 0.45rem;
        background: rgba(255,255,255,.92); color: #0f172a;
      }
      .ei-fotos-btn.activo { background: #3b82f6; color: #fff; }
      .ei-fotos-btn:disabled { opacity: 0.5; cursor: wait; }
      .ei-fotos-portada-tag {
        position: absolute; bottom: 0.3rem; left: 0.3rem;
        background: #3b82f6; color: #fff; font-size: 0.68rem; font-weight: 700;
        padding: 0.15rem 0.4rem; border-radius: 4px;
      }
      .ei-fotos-contador { font-size: 0.75rem; color: #94a3b8; text-transform: none; letter-spacing: 0; font-weight: 500; }
      .ei-fotos-nota { margin: 0; font-size: 0.78rem; color: #94a3b8; }
    </style>
    
    <div class="ei-wrapper">
      <div class="ei-tabs">
        <button type="button" class="ei-tab-btn tab-btn active" data-tab="ei-tab-comercial">Comercial</button>
        <button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-tecnico">Técnico</button>
        <button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-natural">Natural & Topografía</button>
        <button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-ubicacion">Ubicación</button>
        <button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-owner">Propietario</button>
        <!-- El panel #ei-tab-casa existia desde siempre, pero nadie habia puesto
             su boton: los campos de vivienda eran inalcanzables desde la interfaz
             aunque el guardado si los leia (y por eso reventaba). -->
        <button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-casa">Casa y extras</button>
        <button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-analytics" style="color: #6366f1;">🕵️ Asesor Espía</button>
      </div>

      <form id="editorIntegralForm">
        <input type="hidden" id="ei-id" value="${escapeHTML(record.id)}">
        <input type="hidden" id="ei-codigo" value="${escapeHTML(record.codigo)}">
        
        <div id="ei-tab-comercial" class="ei-panel tab-panel active">
          <div class="ei-form-grid">
            <div class="ei-form-group full-width">
              <label>Título Público</label>
              <input type="text" id="ei-titulo" value="${escapeHTML(record.titulo || record.nombre)}" placeholder="Ej: Parcela 5000m2 con bosque">
            </div>
            <div class="ei-form-group">
              <label>Estado de Publicación</label>
              <select id="ei-estado">
                <option value="borrador" ${record.estado === 'borrador' ? 'selected' : ''}>Borrador (Oculta al público)</option>
                <option value="publicada" ${record.estado === 'publicada' ? 'selected' : ''}>Publicada (Activa)</option>
                <option value="archivada" ${record.estado === 'archivada' ? 'selected' : ''}>Archivada (Pausada)</option>
                <option value="eliminada" ${record.estado === 'eliminada' ? 'selected' : ''}>🗑️ Eliminar (Mover a Papelera)</option>
              </select>
            </div>
            <div class="ei-form-group">
              <label>Tipo de Propiedad</label>
              <input type="text" id="ei-tipo" value="${escapeHTML(record.tipo || 'parcela')}">
            </div>
            <div class="ei-form-group">
              <label>Precio Publicado (CLP)</label>
              <input type="number" id="ei-precio" value="${record.precio_publicado || record.precio_base || ''}">
            </div>
            <div class="ei-form-group">
              <label>Superficie Terreno (m²)</label>
              <input type="number" id="ei-superficie" value="${record.superficie_m2 || ''}">
              </div>
              <div class="ei-form-group full-width">
                <label>URL Video YouTube (Opcional)</label>
                <input type="text" id="ei-video-url" value="${escapeHTML((typeof record.metadata==='string'?JSON.parse(record.metadata):record.metadata)?.videoUrl || record.video || '')}" placeholder="https://www.youtube.com/watch?v=...">
              </div>
            <div class="ei-form-group full-width">
              <label>Descripción Destacada</label>
              <textarea id="ei-descripcion" placeholder="Describe los mejores atributos de la propiedad...">${escapeHTML(record.descripcion)}</textarea>
            </div>
            <div class="ei-form-group full-width">
              <label>Fotos guardadas <span id="ei-fotos-contador" class="ei-fotos-contador"></span></label>
              <div id="ei-fotos-grid" class="ei-fotos-grid">
                <p class="ei-fotos-vacio">Cargando fotos…</p>
              </div>
              <input type="file" id="ei-fotos-input" accept="image/jpeg,image/png,image/webp" multiple hidden>
              <button type="button" id="ei-fotos-subir-btn" class="ei-btn ei-btn-secondary" style="align-self:flex-start;">📤 Subir fotos</button>
              <p class="ei-fotos-nota">JPG, PNG o WEBP, hasta 8MB cada una. ★ marca la portada (la que se ve en la grilla del CRM); 🗑 elimina la foto.</p>
            </div>
            <div class="ei-form-group full-width">
              <label>Imágenes por URL (opcional / avanzado)</label>
              <textarea id="ei-imagenes" placeholder="https://...">${escapeHTML(Array.isArray((typeof record.metadata==='string'?JSON.parse(record.metadata):record.metadata)?.imagenes) ? (typeof record.metadata==='string'?JSON.parse(record.metadata):record.metadata).imagenes.join('\n') : (Array.isArray(record.imagenes) ? record.imagenes.join('\n') : ''))}</textarea>
            </div>
          </div>
        </div>

        <div id="ei-tab-tecnico" class="ei-panel tab-panel">
          <div class="ei-form-grid">
            <div class="ei-form-group">
              <label>Rol de Avalúo / Situación</label>
              <input type="text" id="ei-rol" value="${escapeHTML(record.rol_situacion)}" placeholder="Ej: 1234-56">
            </div>
            <div class="ei-form-group">
              <label>Electricidad</label>
              <select id="ei-luz">
                <option value="">Seleccionar...</option>
                <option value="empalme_listo" ${record.electricidad === 'empalme_listo' ? 'selected' : ''}>Empalme Listo</option>
                <option value="factibilidad" ${record.electricidad === 'factibilidad' ? 'selected' : ''}>Factibilidad (Poste Cerca)</option>
                <option value="paneles_solares" ${record.electricidad === 'paneles_solares' ? 'selected' : ''}>Paneles Solares/Generador</option>
                <option value="sin_factibilidad" ${record.electricidad === 'sin_factibilidad' ? 'selected' : ''}>Sin Factibilidad</option>
              </select>
            </div>
            <div class="ei-form-group">
              <label>Agua Potable</label>
              <select id="ei-agua">
                <option value="">Seleccionar...</option>
                <option value="apr_conectado" ${record.agua === 'apr_conectado' ? 'selected' : ''}>Conectado a Red/APR</option>
                <option value="pozo_profundo_listo" ${record.agua === 'pozo_profundo_listo' ? 'selected' : ''}>Pozo profundo listo</option>
                <option value="puntera" ${record.agua === 'puntera' ? 'selected' : ''}>Puntera</option>
                <option value="factibilidad_pozo" ${record.agua === 'factibilidad_pozo' ? 'selected' : ''}>Factibilidad de pozo</option>
                <option value="camion_aljibe" ${record.agua === 'camion_aljibe' ? 'selected' : ''}>Solo camión aljibe</option>
              </select>
            </div>
            <div class="ei-form-group">
              <label>Nivel de Acceso</label>
               <select id="ei-acceso">
                <option value="">Seleccionar...</option>
                <option value="pavimentado_a_la_puerta" ${record.acceso === 'pavimentado_a_la_puerta' ? 'selected' : ''}>Pavimentado a la puerta</option>
                <option value="ripio_buen_estado" ${record.acceso === 'ripio_buen_estado' ? 'selected' : ''}>Ripio buen estado (todo vehículo)</option>
                <option value="tierra_transitable" ${record.acceso === 'tierra_transitable' ? 'selected' : ''}>Tierra transitable en verano</option>
                <option value="solo_4x4" ${record.acceso === 'solo_4x4' ? 'selected' : ''}>Solo 4x4</option>
                <option value="dificil" ${record.acceso === 'dificil' ? 'selected' : ''}>Difícil acceso</option>
              </select>
            </div>
            <div class="ei-form-group">
              <label>Cierre Perimetral</label>
              <input type="text" id="ei-cierre" value="${escapeHTML(record.cierre_perimetral)}" placeholder="Ej: Cerco vivo, Malla Acuenta">
            </div>
            <div class="ei-form-group">
              <label>Portón / Seguridad</label>
              <input type="text" id="ei-porton" value="${escapeHTML(record.porton)}" placeholder="Ej: Portón eléctrico">
            </div>
          </div>
        </div>

        <div id="ei-tab-natural" class="ei-panel tab-panel">
          <div class="ei-form-grid">
            <div class="ei-form-group full-width">
              <label>Atributos Naturales Exclusivos (separados por coma)</label>
              <input type="text" id="ei-naturales" value="${escapeHTML(Array.isArray(record.atributos_naturales) ? record.atributos_naturales.join(', ') : (record.atributos_naturales || ''))}" placeholder="Ej: Bosque nativo, Río, Vista a volcanes">
            </div>
            <div class="ei-form-group">
              <label>Topografía Principal</label>
              <select id="ei-topografia">
                <option value="">Seleccionar...</option>
                <option value="plano_100" ${record.topografia === 'plano_100' ? 'selected' : ''}>Plano 100%</option>
                <option value="plano_mayoria" ${record.topografia === 'plano_mayoria' ? 'selected' : ''}>Mayoría plano, leve pendiente</option>
                <option value="suave_lomaje" ${record.topografia === 'suave_lomaje' ? 'selected' : ''}>Suave lomaje</option>
                <option value="ladera_usable" ${record.topografia === 'ladera_usable' ? 'selected' : ''}>Ladera usable/Terrazas</option>
                <option value="ladera_fuerte" ${record.topografia === 'ladera_fuerte' ? 'selected' : ''}>Ladera de fuerte pendiente</option>
                <option value="quebrada" ${record.topografia === 'quebrada' ? 'selected' : ''}>Quebrada/Poco usable</option>
              </select>
            </div>
            <div class="ei-form-group">
              <label>Tipo de Suelo</label>
              <input type="text" id="ei-suelo" value="${escapeHTML(record.suelo)}" placeholder="Ej: Trumao, Arcilloso">
            </div>
          </div>
        </div>

        <div id="ei-tab-ubicacion" class="ei-panel tab-panel">
          <div class="ei-form-grid">
            <div class="ei-form-group">
              <label>Región Geográfica</label>
              <input type="text" id="ei-region" value="${escapeHTML(record.region)}">
            </div>
            <div class="ei-form-group">
              <label>Comuna</label>
              <input type="text" id="ei-comuna" value="${escapeHTML(record.comuna)}">
            </div>
            <div class="ei-form-group">
              <label>Sector Específico</label>
              <input type="text" id="ei-sector" value="${escapeHTML(record.sector)}" placeholder="Ej: Sector Los Maquis">
            </div>
            <div class="ei-form-group">
              <label>Distancia a Ruta Principal (km)</label>
              <input type="number" step="0.1" id="ei-distancia-ruta" value="${record.distancia_ruta_principal_km || ''}">
            </div>
            <div class="ei-form-group">
              <label>Latitud GPS</label>
              <input type="number" step="any" id="ei-lat" value="${record.lat || ''}">
            </div>
            <div class="ei-form-group">
              <label>Longitud GPS</label>
              <input type="number" step="any" id="ei-lng" value="${record.lng || ''}">
            </div>
          </div>
          <div style="margin-top: 1.5rem;">
             <label style="font-size: 0.85rem; font-weight: 600; color: #475569; text-transform: uppercase;">Ajuste en Mapa</label>
             <div id="ei-mapa" style="height:350px; width:100%; border: 1px solid #cbd5e1; margin-top:0.5rem; border-radius:8px; z-index:1;"></div>
          </div>
        </div>

        <div id="ei-tab-owner" class="ei-panel tab-panel">
          <div class="ei-form-grid">
            <div class="ei-form-group">
              <label>Nombre del Propietario</label>
              <input type="text" id="ei-dueno-nombre" value="${escapeHTML((typeof record.metadata==='string'?JSON.parse(record.metadata):record.metadata)?.contacto_nombre || record.contacto_nombre || record.dueno_nombre)}">
            </div>
            <div class="ei-form-group">
              <label>Teléfono Propietario</label>
              <input type="text" id="ei-dueno-telefono" value="${escapeHTML((typeof record.metadata==='string'?JSON.parse(record.metadata):record.metadata)?.contacto_telefono || record.contacto_telefono || record.dueno_telefono)}">
            </div>
            <div class="ei-form-group full-width">
              <label>Email Propietario</label>
              <input type="email" id="ei-dueno-email" value="${escapeHTML((typeof record.metadata==='string'?JSON.parse(record.metadata):record.metadata)?.contacto_email || record.contacto_email || record.dueno_email)}">
            </div>
            <div class="ei-form-group">
              <label>Corredor/Captador Asignado</label>
              <input type="text" id="ei-corredor-asignado" value="${escapeHTML(record.corredor_asignado || record.corredor)}" placeholder="Staff TPL o Partner">
            </div>
            <div class="ei-form-group">
              <label>Email Encargado de Venta</label>
              <input type="text" id="ei-encargado-proyecto" value="${escapeHTML((typeof record.metadata==='string'?JSON.parse(record.metadata):record.metadata)?.encargado_proyecto || record.encargado_proyecto || record.encargado)}">
            </div>
          </div>
        </div>

        <div id="ei-tab-casa" class="ei-panel tab-panel">
            <div class="ei-form-grid">
              <div class="ei-form-group full-width">
                <label>Propiedad con construcciones</label>
                <p style="font-size:0.85rem; color:#64748b; margin-top:2px; margin-bottom:8px;">Si la parcela incluye una casa, ingresa la cantidad de dormitorios y su materialidad. El motor TPL sumará el valor de la construcción basado en la plusvalía de la zona.</p>
              </div>
              <div class="ei-form-group">
                <label>Materialidad / Calidad</label>
                <select id="ei-mat-casa">
                  <option value="ligera" ${materialidad_casa === 'ligera' ? 'selected' : ''}>Ligera / Básica (Madera simple)</option>
                  <option value="estandar" ${materialidad_casa === 'estandar' || !materialidad_casa ? 'selected' : ''}>Estándar / Mixta</option>
                  <option value="solida" ${materialidad_casa === 'solida' ? 'selected' : ''}>Sólida (Albañilería / Hormigón)</option>
                  <option value="premium" ${materialidad_casa === 'premium' ? 'selected' : ''}>Premium (Terminaciones Lujo)</option>
                </select>
              </div>
              <div class="ei-form-group">
                <label>Superficie Construida (m2) - Opcional</label>
                <input type="number" id="ei-sup-casa" value="${sup_casa}" placeholder="Ej. 120">
              </div>
              <div class="ei-form-group">
                <label>Dormitorios</label>
                <input type="number" id="ei-dorm-casa" value="${dorm_casa}" placeholder="Ej. 3">
              </div>
              <div class="ei-form-group">
                <label>Baños</label>
                <input type="number" step="0.5" id="ei-banos-casa" value="${banos_casa}" placeholder="Ej. 2">
              </div>
              <!-- Estos ocho campos estaban en el guardado (payload/casa_datos) pero
                   habian desaparecido del HTML. El resultado era que CADA guardado
                   moria con "Cannot read properties of null (reading 'value')"
                   antes de llegar al update: no se podia guardar nada, ni siquiera
                   cambiar el estado a "eliminada". Restaurados aqui. -->
              <div class="ei-form-group">
                <label>Recepción municipal</label>
                <select id="ei-casa-reg">
                  <option value="" ${casa_regularizada === '' ? 'selected' : ''}>Sin declarar</option>
                  <option value="si" ${casa_regularizada === 'si' ? 'selected' : ''}>Regularizada</option>
                  <option value="no" ${casa_regularizada === 'no' ? 'selected' : ''}>No regularizada</option>
                  <option value="en_tramite" ${casa_regularizada === 'en_tramite' ? 'selected' : ''}>En trámite</option>
                </select>
              </div>
              <div class="ei-form-group">
                <label>Antigüedad (años)</label>
                <input type="number" id="ei-casa-ant" value="${casa_antiguedad}" placeholder="Ej. 8">
              </div>
              <div class="ei-form-group full-width">
                <label style="margin-top:0.5rem;">Extras del terreno</label>
              </div>
              <div class="ei-form-group">
                <label>Piscina</label>
                <select id="ei-extra-piscina">
                  <option value="" ${extras_piscina === '' ? 'selected' : ''}>No</option>
                  <option value="si" ${extras_piscina === 'si' ? 'selected' : ''}>Sí</option>
                </select>
              </div>
              <div class="ei-form-group">
                <label>Material de la piscina</label>
                <select id="ei-extra-piscmat">
                  <option value="fibra" ${extras_piscina_mat === 'fibra' ? 'selected' : ''}>Fibra</option>
                  <option value="hormigon" ${extras_piscina_mat === 'hormigon' ? 'selected' : ''}>Hormigón</option>
                  <option value="desmontable" ${extras_piscina_mat === 'desmontable' ? 'selected' : ''}>Desmontable</option>
                </select>
              </div>
              <div class="ei-form-group">
                <label>Superficie piscina (m²)</label>
                <input type="number" id="ei-extra-piscm2" value="${extras_piscina_m2}" placeholder="Ej. 32">
              </div>
              <div class="ei-form-group">
                <label>Quincho</label>
                <select id="ei-extra-quincho">
                  <option value="" ${extras_quincho === '' ? 'selected' : ''}>No</option>
                  <option value="si" ${extras_quincho === 'si' ? 'selected' : ''}>Sí</option>
                </select>
              </div>
              <div class="ei-form-group">
                <label>Cabaña adicional</label>
                <select id="ei-extra-cabana">
                  <option value="" ${extras_cabaña === '' ? 'selected' : ''}>No</option>
                  <option value="si" ${extras_cabaña === 'si' ? 'selected' : ''}>Sí</option>
                </select>
              </div>
              <div class="ei-form-group">
                <label>Riego automático</label>
                <select id="ei-extra-riego">
                  <option value="" ${extras_riego === '' ? 'selected' : ''}>No</option>
                  <option value="si" ${extras_riego === 'si' ? 'selected' : ''}>Sí</option>
                </select>
              </div>
            </div>
          </div>
          
          <div id="ei-tab-analytics" class="ei-panel tab-panel">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:2rem; text-align:center;">
            <div style="font-size:3rem; margin-bottom:1rem;">🕵️</div>
            <h3 style="margin:0 0 0.5rem 0; color:#0f172a; font-size:1.25rem;">Actividad en Tiempo Real</h3>
            <p style="color:#64748b; font-size:0.95rem; margin-bottom:1.5rem; max-width:400px; margin-left:auto; margin-right:auto;">El Asesor Espía registra cada visita y evento importante ocurrido en esta propiedad, detectando patrones de interés térmico.</p>
            <div id="ei-analytics-content" style="max-height:400px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:8px; background:white; text-align:left;">
              <div style="padding:2rem; text-align:center; color:#94a3b8;">Sincronizando radares...</div>
            </div>
          </div>
        </div>

        <div class="ei-footer">
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
              <div class="ei-tasacion-box">
                <div class="ei-tasacion-item">
                    <span class="ei-tasacion-label" style="color: #059669;">Recomendado</span>
                    <span class="ei-tasacion-value" id="ei-tasacion-recomendado" style="color: #059669;">—</span>
                </div>
                <div class="ei-tasacion-item">
                    <span class="ei-tasacion-label" style="color: #dc2626;">Apuro</span>
                    <span class="ei-tasacion-value" id="ei-tasacion-apuro" style="color: #dc2626;">—</span>
                </div>
                <div class="ei-tasacion-item">
                    <span class="ei-tasacion-label">Score</span>
                    <span class="ei-tasacion-value" id="ei-tasacion-score">—</span>
                </div>
                <div class="ei-tasacion-item">
                    <span class="ei-tasacion-label">Brecha Publicada</span>
                    <span class="ei-tasacion-value" id="ei-tasacion-brecha">—</span>
                </div>
                            <button type="button" id="ei-btn-simular" class="ei-btn ei-btn-secondary" style="align-self:flex-start; font-size: 0.85rem; padding: 0.4rem 0.75rem;">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Recalcular Motor Tasador
              </button>
          </div>
          <div style="display:flex; gap:0.75rem;">
            <button type="button" id="ei-btn-informe-valores" class="ei-btn" style="background:#111827; color:#D4AF37; border:none; padding:0.5rem 1rem; border-radius:4px; font-weight:600; cursor:pointer; font-family: 'Playfair Display', serif;">📜 Informe Premium TPL</button>
            <button type="button" id="ei-btn-link-propietario" class="ei-btn ei-btn-secondary">🔗 Link Propietario</button>
            <button type="submit" id="ei-btn-guardar" class="ei-btn ei-btn-primary">Guardar Propiedad</button>
          </div>
        </div>
      </form>
    </div>
  `;

}

function initEIMap(lat, lng) {
  const mapEl = document.getElementById('ei-mapa');
  if (!mapEl) return;
  
  // Need Leaflet global object (L)
  if (typeof L === 'undefined') {
    mapEl.innerHTML = '<p style="padding:1rem;">Mapa no disponible (Leaflet no cargado)</p>';
    return;
  }

  const defaultLat = -33.4489;
  const defaultLng = -70.6693;
  const targetLat = lat || defaultLat;
  const targetLng = lng || defaultLng;

  if (!eiMap) {
    eiMap = L.map('ei-mapa').setView([targetLat, targetLng], lat ? 13 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(eiMap);
    eiMarker = L.marker([targetLat, targetLng], { draggable: true }).addTo(eiMap);
    
    eiMarker.on('dragend', function (e) {
      const coords = e.target.getLatLng();
      document.getElementById('ei-lat').value = coords.lat.toFixed(6);
      document.getElementById('ei-lng').value = coords.lng.toFixed(6);
    });
    
    eiMap.on('click', function(e) {
      eiMarker.setLatLng(e.latlng);
      document.getElementById('ei-lat').value = e.latlng.lat.toFixed(6);
      document.getElementById('ei-lng').value = e.latlng.lng.toFixed(6);
    });
  } else {
    eiMap.setView([targetLat, targetLng], lat ? 13 : 5);
    eiMarker.setLatLng([targetLat, targetLng]);
    setTimeout(() => eiMap.invalidateSize(), 100);
  }
}

// ---------------------------------------------------------------------------
// Fotos reales de la parcela (tabla tpl_propiedad_imagenes).
//
// Antes solo existía un textarea donde alguien pegaba URLs a mano en
// metadata.imagenes — nunca subía nada, solo mostraba texto. Esto sube el
// archivo de verdad (misma Edge Function que usa el propietario y el
// publicador, subir-foto-propietario, con una tercera vía para staff
// autenticado del CRM) y deja gestionar portada/eliminar desde acá.
// ---------------------------------------------------------------------------

async function cargarFotosGrid(modalEl, record) {
  const grid = modalEl.querySelector('#ei-fotos-grid');
  const contador = modalEl.querySelector('#ei-fotos-contador');
  if (!grid) return;
  grid.innerHTML = '<p class="ei-fotos-vacio">Cargando fotos…</p>';
  try {
    const client = getClient();
    const { data, error } = await client
      .from('tpl_propiedad_imagenes')
      .select('id,url,storage_path,es_portada,orden')
      .eq('propiedad_id', record.id)
      .order('es_portada', { ascending: false })
      .order('orden', { ascending: true });
    if (error) throw error;
    renderFotosGrid(grid, data || []);
    if (contador) contador.textContent = data?.length ? `(${data.length})` : '';
  } catch (err) {
    console.error('No se pudieron cargar las fotos de la parcela', err);
    grid.innerHTML = '<p class="ei-fotos-vacio">No pudimos cargar las fotos guardadas.</p>';
  }
}

function renderFotosGrid(grid, fotos) {
  if (!fotos.length) {
    grid.innerHTML = '<p class="ei-fotos-vacio">Todavía no hay fotos guardadas para esta parcela.</p>';
    return;
  }
  grid.innerHTML = fotos.map((f) => `
    <div class="ei-fotos-item ${f.es_portada ? 'es-portada' : ''}" data-imagen-id="${escapeHTML(f.id)}">
      <img src="${escapeHTML(f.url || '')}" alt="Foto de la parcela" loading="lazy">
      <div class="ei-fotos-actions">
        <button type="button" class="ei-fotos-btn ei-fotos-btn-portada ${f.es_portada ? 'activo' : ''}" title="Marcar como portada">★</button>
        <button type="button" class="ei-fotos-btn ei-fotos-btn-eliminar" title="Eliminar foto">🗑</button>
      </div>
      ${f.es_portada ? '<span class="ei-fotos-portada-tag">Portada</span>' : ''}
    </div>
  `).join('');
}

function initEIFotos(modalEl, record) {
  const grid = modalEl.querySelector('#ei-fotos-grid');
  const input = modalEl.querySelector('#ei-fotos-input');
  const btnSubir = modalEl.querySelector('#ei-fotos-subir-btn');
  if (!grid || !input || !btnSubir) return;

  cargarFotosGrid(modalEl, record);

  btnSubir.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;

    btnSubir.disabled = true;
    const textoOriginal = btnSubir.textContent;
    let ok = 0;
    let fallidas = 0;

    for (const file of files) {
      btnSubir.textContent = `Subiendo ${ok + fallidas + 1}/${files.length}...`;
      try {
        const client = getClient();
        const form = new FormData();
        form.append('propiedad_id', record.id);
        form.append('file', file, file.name);
        const { data, error } = await client.functions.invoke('subir-foto-propietario', { body: form });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'Fallo desconocido');
        ok++;
      } catch (err) {
        console.error('No se pudo subir la foto', file.name, err);
        fallidas++;
      }
    }

    btnSubir.disabled = false;
    btnSubir.textContent = textoOriginal;
    await cargarFotosGrid(modalEl, record);

    if (fallidas === 0) {
      showToast(ok === 1 ? '1 foto subida' : `${ok} fotos subidas`, 'success');
    } else if (ok === 0) {
      showToast('No se pudo subir ninguna foto. Revisa el formato/tamaño (máx. 8MB, jpg/png/webp).', 'error');
    } else {
      showToast(`${ok} foto(s) subidas, ${fallidas} fallaron.`, 'warning');
    }
  });

  grid.addEventListener('click', async (e) => {
    const item = e.target.closest('.ei-fotos-item');
    if (!item) return;
    const imagenId = item.dataset.imagenId;
    const esPortadaBtn = e.target.closest('.ei-fotos-btn-portada');
    const eliminarBtn = e.target.closest('.ei-fotos-btn-eliminar');
    if (!esPortadaBtn && !eliminarBtn) return;

    if (eliminarBtn && !confirm('¿Eliminar esta foto? No se puede deshacer.')) return;

    const botones = item.querySelectorAll('.ei-fotos-btn');
    botones.forEach((b) => { b.disabled = true; });

    try {
      const client = getClient();
      const form = new FormData();
      form.append('accion', eliminarBtn ? 'eliminar' : 'portada');
      form.append('imagen_id', imagenId);
      const { data, error } = await client.functions.invoke('subir-foto-propietario', { body: form });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'No se pudo completar la acción.');
      await cargarFotosGrid(modalEl, record);
      showToast(eliminarBtn ? 'Foto eliminada' : 'Portada actualizada', 'success');
    } catch (err) {
      console.error('Error al gestionar la foto', err);
      showToast(err?.message || 'No se pudo completar la acción sobre la foto.', 'error');
      botones.forEach((b) => { b.disabled = false; });
    }
  });
}

function attachEditorEvents(modalId, record) {
  const modalEl = document.getElementById(modalId);
  if (!modalEl) return;

  const editorTabs = modalEl.querySelectorAll('.tab-btn');
  const editorPanels = modalEl.querySelectorAll('.tab-panel');
  const editorForm = modalEl.querySelector('#editorIntegralForm');
  const btnSimular = modalEl.querySelector('#ei-btn-simular');

  editorTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      editorTabs.forEach(t => t.classList.remove('active'));
      editorPanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      modalEl.querySelector('#' + targetId).classList.add('active');
      
      if (targetId === 'ei-tab-ubicacion') {
        const lat = parseFloat(document.getElementById('ei-lat').value);
        const lng = parseFloat(document.getElementById('ei-lng').value);
        initEIMap(isNaN(lat) ? null : lat, isNaN(lng) ? null : lng);
      }
      
      if (targetId === 'ei-tab-analytics') {
        const id = document.getElementById('ei-id').value;
        const container = document.getElementById('ei-analytics-content');
        if (id && container) {
            container.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8;">Cargando registros espía...</div>';
            import('../../core/supabase.js').then(({ getClient }) => {
                const client = getClient();
                client.from('tpl_web_analytics')
                    .select('*')
                    .eq('parcela_id', id)
                    .order('created_at', { ascending: false })
                    .limit(20)
                    .then(({ data, error }) => {
                        if (error) {
                            container.innerHTML = '<div style="padding:1rem; color:#e63946;">Error al cargar registros.</div>';
                            return;
                        }
                        if (!data || data.length === 0) {
                            container.innerHTML = '<div style="padding:1rem; color:#64748b; text-align:center;">Aún no hay actividad registrada por el Asesor Espía.</div>';
                            return;
                        }
                        let html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
                        html += '<tr style="background:#f1f5f9; border-bottom:1px solid #cbd5e1; text-align:left;">';
                        html += '<th style="padding:8px;">Fecha/Hora</th><th style="padding:8px;">Evento</th><th style="padding:8px;">Tiempo (s)</th></tr>';
                        data.forEach(row => {
                            const date = new Date(row.created_at).toLocaleString('es-CL');
                            const actionIcon = row.action_type === 'whatsapp_click' ? '🟢' : (row.action_type === 'bot_trigger' ? '🤖' : '👁️');
                            html += `<tr style="border-bottom:1px solid #e2e8f0;">`;
                            html += `<td style="padding:8px; color:#475569;">${date}</td>`;
                            html += `<td style="padding:8px; font-weight:bold;">${actionIcon} ${row.action_type}</td>`;
                            html += `<td style="padding:8px;">${row.time_spent_seconds} s</td>`;
                            html += `</tr>`;
                        });
                        html += '</table>';
                        container.innerHTML = html;
                    });
            });
        }
      }
    });
  });


  // Botón: Abrir Informe Metodología TPL
  const btnInformeValores = modalEl.querySelector('#ei-btn-informe-valores');
  if (btnInformeValores) {
      btnInformeValores.addEventListener('click', () => {
          const id = document.getElementById('ei-id').value;
          if (!id) { alert('Debes guardar la propiedad en la base de datos primero.'); return; }
          window.open(`../informe-valores/index.html?id=${id}`, '_blank');
      });
  }

  if (btnSimular) {
    btnSimular.addEventListener('click', async () => {
      try {
        const engineInput = {
          superficie: Number(document.getElementById('ei-superficie').value),
          asking: Number(document.getElementById('ei-precio').value),
          comuna: document.getElementById('ei-comuna').value,
          region: document.getElementById('ei-region').value,
          electricity: document.getElementById('ei-luz').value,
          water: document.getElementById('ei-agua').value,
          rol: document.getElementById('ei-rol').value,
          topography: document.getElementById('ei-topografia').value,
          lat: Number(document.getElementById('ei-lat').value) || null,
          lng: Number(document.getElementById('ei-lng').value) || null
        };

        const TPLLandEngine = window.TPLLandEngine;
        // Sin las referencias comunales cargadas el motor no tiene con que
        // contrastar y la simulacion sale 100% tecnica.
        await (window.TPLReferenciasComunales || Promise.resolve());
        const res = TPLLandEngine.calculate(engineInput);

        if (res && res.valor_recomendado) {
          const fmtMoney = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
          document.getElementById('ei-tasacion-recomendado').textContent = fmtMoney(res.valor_recomendado);
          document.getElementById('ei-tasacion-apuro').textContent = fmtMoney(res.valor_venta_apuro);
          document.getElementById('ei-tasacion-score').textContent = (res.score || 0) + '/100';
          
          const precio = engineInput.asking || 0;
          if (precio > 0) {
            const diff = Math.round(((precio - res.valor_recomendado) / res.valor_recomendado) * 100);
            const sign = diff > 0 ? '+' : '';
            document.getElementById('ei-tasacion-brecha').textContent = `${sign}${diff}%`;
            document.getElementById('ei-tasacion-brecha').style.color = diff > 0 ? '#e63946' : '#2a9d8f';
          } else {
            document.getElementById('ei-tasacion-brecha').textContent = '—';
          }
          showToast('Tasación simulada exitosamente', 'success');
        } else {
          showToast('Error simulando tasación: ' + (res?.error || 'Desconocido'), 'warning');
        }
      } catch (err) {
        console.error(err);
        showToast('Motor TPL no disponible localmente en el Editor.', 'warning');
      }
    });
  }

  const btnLink = modalEl.querySelector('#ei-btn-link-propietario');
  if (btnLink) {
    btnLink.addEventListener('click', async () => {
      const id = document.getElementById('ei-id').value;
      if (!id) return;

      // El portal del propietario ya no acepta ?id=, exige ?token= (RPC
      // tpl_propietario_actualizar_por_token_v1). Mismo arreglo que ya se
      // aplicó al botón "📋 Link" de la grilla en modules/parcelas/index.js.
      const textoOriginal = btnLink.textContent;
      btnLink.disabled = true;
      btnLink.textContent = 'Generando...';
      try {
        const client = getClient();
        const { data, error } = await client.rpc('tpl_crm_generar_link_propietario_v1', {
          p_propiedad_id: id,
          p_dias: 30,
        });
        if (error) throw error;
        if (!data?.ok || !data?.token) throw new Error(data?.error || 'No se pudo generar el link.');

        const baseUrl = window.location.origin + window.location.pathname.replace('/crm-tpl-v1/', '/propietario/');
        const link = `${baseUrl}?token=${data.token}`;
        await navigator.clipboard.writeText(link);
        showToast('¡Link del Propietario copiado! Vence en 30 días.', 'success');
      } catch (err) {
        console.error('Error al generar el link del propietario:', err);
        showToast(err?.message || 'Error al generar el link', 'error');
      } finally {
        btnLink.disabled = false;
        btnLink.textContent = textoOriginal;
      }
    });
  }

  initEIFotos(modalEl, record);

  if (editorForm) {
    editorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('ei-id').value;
      if (!id) return;
      
      const btnGuardar = document.getElementById('ei-btn-guardar');
      btnGuardar.disabled = true;
      btnGuardar.textContent = 'Guardando...';

      // Todo lo que sigue -- armar el payload, recalcular la tasacion, guardar --
      // ahora vive dentro de un unico try/catch/finally que envuelve TODA la
      // funcion. Antes solo el guardado final estaba protegido: un error o una
      // excepcion en el armado del payload o en el recalculo de tasacion (por
      // ejemplo un fetch a Overpass que falla, o un campo inesperado) quedaba
      // sin capturar y el boton se quedaba pegado en "Guardando..." para
      // siempre, sin ningun aviso de error ni de exito. Esto tambien tapaba el
      // caso de "eliminar" desde el selector de estado: es un guardado como
      // cualquier otro, asi que si el guardado quedaba pegado o fallaba en
      // silencio, la propiedad seguia apareciendo como activa.
      try {

      const parseNaturales = valorCampo('ei-naturales').split(',').map(s=>s.trim()).filter(Boolean);
      const parseImagenes = valorCampo('ei-imagenes').split('\n').map(s=>s.trim()).filter(Boolean);

      const payload = {
        titulo: valorCampo('ei-titulo'),
        estado: valorCampo('ei-estado'),
        tipo: valorCampo('ei-tipo'),
        descripcion: valorCampo('ei-descripcion'),
        superficie_m2: Number(valorCampo('ei-superficie')) || null,
        precio_publicado: Number(valorCampo('ei-precio')) || null,
        rol_situacion: valorCampo('ei-rol'),
        region: valorCampo('ei-region'),
        comuna: valorCampo('ei-comuna'),
        sector: valorCampo('ei-sector'),
        lat: Number(valorCampo('ei-lat')) || null,
        lng: Number(valorCampo('ei-lng')) || null,
        distancia_ruta_principal_km: Number(valorCampo('ei-distancia-ruta')) || null,
        electricidad: valorCampo('ei-luz'),
        agua: valorCampo('ei-agua'),
        acceso: valorCampo('ei-acceso'),
        topografia: valorCampo('ei-topografia'),
        suelo: valorCampo('ei-suelo'),
        cierre_perimetral: valorCampo('ei-cierre'),
        porton: valorCampo('ei-porton'),
        atributos_naturales: parseNaturales.length ? parseNaturales : null,
        corredor_asignado: valorCampo('ei-corredor-asignado') || null,
        updated_at: new Date().toISOString()
      };

      let oldMeta = typeof record.metadata === 'string' ? JSON.parse(record.metadata) : (record.metadata || {});
      oldMeta.videoUrl = valorCampo('ei-video-url');
      oldMeta.imagenes = parseImagenes.length ? parseImagenes : [];
      oldMeta.contacto_nombre = valorCampo('ei-dueno-nombre');
      oldMeta.contacto_telefono = valorCampo('ei-dueno-telefono');
        oldMeta.materialidad = valorCampo('ei-mat-casa') || '';
        oldMeta.superficie_construida = Number(valorCampo('ei-sup-casa')) || null;
        oldMeta.dormitorios = Number(valorCampo('ei-dorm-casa')) || null;
        oldMeta.banos = Number(valorCampo('ei-banos-casa')) || null;
        oldMeta.regularizada = valorCampo('ei-casa-reg');
        oldMeta.antiguedad_anios = Number(valorCampo('ei-casa-ant')) || 0;
        oldMeta.piscina = valorCampo('ei-extra-piscina');
        oldMeta.piscina_mat = valorCampo('ei-extra-piscmat');
        oldMeta.piscina_m2 = Number(valorCampo('ei-extra-piscm2')) || 0;
        oldMeta.quincho = valorCampo('ei-extra-quincho');
        oldMeta.cabana = valorCampo('ei-extra-cabana');
        oldMeta.riego = valorCampo('ei-extra-riego');

      oldMeta.contacto_email = valorCampo('ei-dueno-email');
      oldMeta.encargado_proyecto = valorCampo('ei-encargado-proyecto');

      // La pestaña "Casa y Extras" escribia solo en metadata, y de metadata la
      // volvia a leer este mismo editor: era un circuito cerrado. El adaptador
      // del informe premium (js/core/valuation-adapter.js), el recalculo por
      // lotes y el disparador de la cola leen `casa_datos`, la columna. Sin
      // esta copia, editar la casa en el CRM no cambiaba nada fuera del CRM.
      payload.casa_datos = {
        ...(record.casa_datos || {}),
        materialidad: oldMeta.materialidad || '',
        superficie_construida: oldMeta.superficie_construida,
        superficieConstruida: oldMeta.superficie_construida,
        dormitorios: oldMeta.dormitorios,
        banos: oldMeta.banos,
        regularizada: oldMeta.regularizada || '',
        antiguedad_anios: oldMeta.antiguedad_anios || 0,
        antiguedadAnios: oldMeta.antiguedad_anios || 0,
        piscina: oldMeta.piscina || '',
        piscina_mat: oldMeta.piscina_mat || '',
        piscina_m2: oldMeta.piscina_m2 || 0,
        quincho: oldMeta.quincho || '',
        cabana: oldMeta.cabana || '',
        riego: oldMeta.riego || ''
      };
      
      // Recalcular tasacion si el motor esta disponible.
      //
      // Dos cosas que estaban mal aqui y hacian que guardar en el CRM dejara la
      // ficha peor de como estaba:
      //
      //   1. Se llamaba al motor con la fila cruda, SIN las distancias del
      //      atlas territorial. El motor entonces cae al tramo "mas de 50 km"
      //      (multiplicador 1) y devuelve un piso tecnico. En Caburgua eso era
      //      $12.070.000 en vez de $136.390.000. Ahora se parte de
      //      `tasacion_entrada_actual`, que ya trae las distancias reales que
      //      calculo scripts/recalcular-tasaciones.mjs, y encima se aplican los
      //      campos recien editados.
      //   2. Se escribian `valor_tpl_total` y `tasacion_resultado_resumen`, que
      //      NINGUNA pantalla lee, y no se tocaban `valor_tpl_recomendado` ni
      //      `valor_comunal`, que son los que muestra la grilla. Editar una
      //      parcela dejaba la grilla mostrando el valor viejo.
      if (window.TPLLandEngine) {
          try {
              await (window.TPLReferenciasComunales || Promise.resolve());

              const entradaBase = oldMeta.tasacion_entrada_actual || {};
              const calcData = {
                  ...entradaBase,
                  area: Number(payload.superficie_m2) || Number(entradaBase.area) || 0,
                  comuna: payload.comuna || entradaBase.comuna || '',
                  region: payload.region || entradaBase.region || '',
                  rol: payload.rol_situacion || entradaBase.rol || '',
                  water: payload.agua || entradaBase.water || '',
                  electricity: payload.electricidad || entradaBase.electricity || '',
                  access: payload.acceso || entradaBase.access || '',
                  topography: payload.topografia || entradaBase.topography || '',
                  fencing: payload.cierre_perimetral || entradaBase.fencing || '',
                  gate: payload.porton || entradaBase.gate || '',
                  nature: payload.atributos_naturales || entradaBase.nature || [],
                  asking: Number(payload.precio_publicado) || Number(entradaBase.asking) || 0,
              };

              const vData = window.TPLLandEngine.calculate(calcData);
              if (vData && !vData.error && vData.valorFinal > 0) {
                  // Mismas claves que escribe scripts/recalcular-tasaciones.mjs,
                  // para que el script y el CRM no puedan discrepar.
                  oldMeta.valor_tpl_recomendado = vData.valorFinal;
                  oldMeta.valor_tpl_tasador = vData.valorFinal;
                  oldMeta.valor_tpl_tasador_ajustado = vData.valorFinal;
                  oldMeta.valor_tpl_tecnico = vData.valorTplTasadorAjustado;
                  oldMeta.valor_tpl_tecnico_potencial = vData.technicalPotential;
                  oldMeta.valor_comunal = vData.valor_comunal;
                  oldMeta.valor_promedio_comunal = vData.valor_comunal;
                  oldMeta.valor_venta_apuro = vData.valor_venta_apuro;
                  oldMeta.valor_tpl_m2 = vData.area ? Math.round(vData.valorFinal / vData.area) : null;
                  oldMeta.referencia_comunal_m2 = vData.marketReference?.medianM2Ajustado || null;
                  oldMeta.referencia_comunal_segmento = vData.marketReference?.segmentName || null;
                  oldMeta.referencia_comunal_origen = vData.marketReference?.origin || null;
                  oldMeta.referencia_comunal_muestra = vData.marketReference?.sampleSize || 0;
                  oldMeta.tasacion_composicion = vData.composicionValor;
                  oldMeta.tasacion_advertencias = vData.cautions || [];
                  oldMeta.tasacion_entrada_actual = calcData;
                  oldMeta.tasacion_version_motor = vData.engineVersion;
                  oldMeta.tasacion_calculada_at = new Date().toISOString();
                  // Restos de motores anteriores: si se dejan, alguna pantalla
                  // puede volver a leer un numero que ya nadie produce.
                  delete oldMeta.valor_tpl_total;
                  delete oldMeta.tasacion_resultado_resumen;
                  console.log('CRM Tasacion recalc:', vData.valorFinal, vData.composicionValor);
              }
          } catch(e) {
              console.warn('Error recalculando tasacion en CRM', e);
          }
      }
      payload.metadata = oldMeta;

      // Antes había aquí una SEGUNDA recalculación de tasación (gatillada por
      // valuationChanged), que volvía a llamar al motor con un `engineInput`
      // distinto y más pobre que `calcData` de arriba, y encima repetía el
      // fetch a Overpass (fetchNearbyContext, hasta 16s) que el bloque de
      // arriba ya había hecho. Su único efecto posible -- escribir
      // `payload.valor_tpl` -- nunca se disparaba en la práctica porque
      // `res.valor_tpl_recomendado` no es una clave que el motor devuelva
      // (ver js/core/valuation-engine.js: los nombres reales son
      // valor_recomendado/valorRecomendado). Era codigo muerto que solo
      // agregaba una espera de red innecesaria a cada guardado -- eliminado.
      // La tasación de esta pantalla vive en un único lugar ahora: el bloque
      // de arriba (window.TPLLandEngine.calculate(calcData)).

      const client = getClient();
      // .select('id') es clave aqui: sin representacion, Supabase devuelve
      // 200/error:null aunque RLS haya bloqueado el update y 0 filas se hayan
      // tocado (mismo problema que tenia el boton Eliminar, ver
      // btn-delete-parcela en modules/parcelas/index.js). Sin este chequeo, un
      // guardado bloqueado por permisos se reportaba como exitoso y la
      // propiedad quedaba exactamente igual -- incluida cuando lo que se
      // "guardaba" era estado: 'eliminada' desde el selector.
      const { data: saved, error: saveError } = await client
        .from('tpl_propiedades')
        .update(payload)
        .eq('id', id)
        .select('id');
      if (saveError) throw saveError;
      if (!saved?.length) {
        throw new Error('La base no confirmó el guardado (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.');
      }

      btnGuardar.textContent = '✔ Guardado';
      showToast('Propiedad guardada correctamente', 'success');
      document.dispatchEvent(new CustomEvent('crm-property-updated', { detail: { id, payload } }));
      // Se deja ver la confirmacion antes de recargar: antes el reload ocurria
      // practicamente en el mismo instante que el toast, asi que en la
      // practica nunca se alcanzaba a ver "Guardado" -- la pantalla pasaba
      // directo de "Guardando..." a la recarga y parecia que se habia quedado
      // pegada.
      await new Promise((resolve) => setTimeout(resolve, 700));
      closeModal(modalId);
      // El resto del CRM (dashboard, operaciones, etc.) lee de un snapshot que
      // no se refresca solo. Antes esto era un window.location.reload(), que
      // significaba repetir el boot completo -- SDK, sesion, permisos de staff,
      // dos RPC y las referencias comunales del tasador -- por cada guardado.
      await refrescarSnapshot();
      } catch (err) {
        console.error(err);
        showToast('Error al guardar: ' + err.message, 'error');
      } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
      }
    });
  }
}

export async function openIntegralEditor(parcelaId) {
  try {
    let record = null;
    try {
        const client = getClient();
        const { data, error } = await client.from('tpl_propiedades').select('*').eq('id', parcelaId).single();
        if (!error) record = data;
        else console.warn('Error al obtener la parcela desde Supabase', error);
    } catch (e) {
        console.warn('No se pudo obtener la parcela desde Supabase', e);
    }

    if (!record) {
      showToast('No pudimos recuperar la parcela.', 'error');
      return;
    }

    const htmlContent = renderEditorHTML(record);
    showModal({
      title: 'Editor Integral - ' + (record.codigo || 'Propiedad'),
      body: htmlContent,
      size: 'lg'
    });
    
    // Reset map reference
    eiMap = null;
    eiMarker = null;

    attachEditorEvents('modalBackdrop', record);
    
    // Trigger first tab active to setup map if it's the first tab, etc.
    const modalEl = document.getElementById('modalBackdrop');
    if (modalEl) {
        modalEl.querySelector('.tab-btn').click();
    }
  } catch (error) {
    console.error('Error opening integral editor:', error);
    showToast('Error al abrir el editor', 'error');
  }
}
