import { arr } from '../../core/state.js';
import { escapeHtml, relativeDate } from '../../core/utils.js';
import { getClient } from '../../core/supabase.js';
import { toast } from '../../components/toast.js';
import { refrescarSnapshot } from '../../core/refresh.js';

const clp = (n) => (Number(n) > 0
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(n))
    : '—');

const dato = (etiqueta, valor) => `
    <div class="rev-dato">
        <span>${escapeHtml(etiqueta)}</span>
        <strong>${valor === null || valor === undefined || valor === '' ? '—' : escapeHtml(String(valor))}</strong>
    </div>`;

const vacio = (v) => v === null || v === undefined || v === '';

// Campos que el sistema muestra automáticamente en el resto de las parcelas
// (rellenados por el trigger de integración o cargados a mano en el editor).
// Si una publicación llega sin ellos hay que avisarle a quien revisa, para
// que los complete a mano antes o después de aprobar.
const CAMPOS_REQUERIDOS = [
    { etiqueta: 'Superficie', valor: (p) => p.superficie_m2 },
    { etiqueta: 'Precio pedido', valor: (p) => p.precio_publicado },
    { etiqueta: 'Comuna', valor: (p) => p.comuna },
    { etiqueta: 'Región', valor: (p) => p.region },
    { etiqueta: 'Descripción', valor: (p) => p.descripcion },
    { etiqueta: 'Agua', valor: (p) => p.agua },
    { etiqueta: 'Electricidad', valor: (p) => p.electricidad },
    { etiqueta: 'Acceso', valor: (p) => p.acceso },
    { etiqueta: 'Topografía', valor: (p) => p.topografia },
    { etiqueta: 'Rol / situación', valor: (p) => p.rol_situacion },
];

function camposFaltantes(p, fotos) {
    const faltantes = CAMPOS_REQUERIDOS
        .filter((c) => vacio(c.valor(p)))
        .map((c) => c.etiqueta);
    if (!fotos || !fotos.length) faltantes.push('Fotos');
    return faltantes;
}

export function render() {
    const revisiones = arr('publicaciones_revision');

    if (!revisiones.length) {
        return `
            <div class="rev-modulo">
                <h1 class="rev-titulo">Bandeja de revisión</h1>
                <div class="card"><div class="card__body">
                    <p class="dash-vacio">No hay publicaciones esperando revisión. Todo al día.</p>
                </div></div>
            </div>`;
    }

    return `
        <div class="rev-modulo">
            <div class="rev-cabecera">
                <h1 class="rev-titulo">Bandeja de revisión</h1>
                <span class="rev-contador">${revisiones.length} ${revisiones.length === 1 ? 'pendiente' : 'pendientes'}</span>
            </div>

            <div class="card">
                <div class="card__body">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Publicación</th><th>Comuna</th><th>Superficie</th>
                                <th>Precio pedido</th><th>Enviada</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${revisiones.map((r) => {
                                const d = r.datos || {};
                                return `<tr>
                                    <td><strong>${escapeHtml(d.titulo || r.codigo || 'Sin título')}</strong><small>${escapeHtml(r.codigo || '')}</small></td>
                                    <td>${escapeHtml(d.comuna || '—')}</td>
                                    <td>${d.superficie ? Number(d.superficie).toLocaleString('es-CL') + ' m²' : '—'}</td>
                                    <td>${clp(d.precio)}</td>
                                    <td title="${escapeHtml(new Date(r.enviada_at || r.created_at).toLocaleString('es-CL'))}">${escapeHtml(relativeDate(r.enviada_at || r.created_at))}</td>
                                    <td><button class="btn btn--sm btn--primary btn-revisar" data-id="${escapeHtml(r.id)}">Revisar</button></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="rev-detalle" class="rev-detalle" hidden></div>
        </div>`;
}

/** Ficha completa para poder decidir con la información a la vista. */
function pintarDetalle(caja, d) {
    const p = d.propiedad || {};
    const pub = d.publicacion || {};
    const meta = (typeof p.metadata === 'string' ? JSON.parse(p.metadata || '{}') : p.metadata) || {};
    const casa = p.casa_datos || {};
    const t = d.tasacion || {};
    const fotos = d.fotos || [];
    const naturales = Array.isArray(p.atributos_naturales) ? p.atributos_naturales : [];
    const faltantes = camposFaltantes(p, fotos);

    caja.hidden = false;
    caja.innerHTML = `
        <div class="rev-panel">
            <div class="rev-panel__head">
                <div>
                    <span class="rev-kicker">${escapeHtml(pub.codigo || '')} · ${escapeHtml(p.tipo || '')}</span>
                    <h2>${escapeHtml(p.titulo || 'Sin título')}</h2>
                    <p class="rev-sub">${escapeHtml([p.comuna, p.region].filter(Boolean).join(', ')) || 'Sin ubicación'}</p>
                </div>
                <button class="btn btn--sm btn--outline" id="rev-cerrar">Cerrar</button>
            </div>

            ${faltantes.length ? `
            <div class="rev-seccion rev-seccion--alerta">
                <h3>⚠️ Faltan ${faltantes.length} ${faltantes.length === 1 ? 'campo' : 'campos'} por completar</h3>
                <p class="rev-alerta">Esta publicación llegó sin estos datos que el sistema muestra automáticamente en el resto de las parcelas. Revísalos antes de aprobar; si hace falta, complétalos a mano en el editor de la parcela.</p>
                <ul class="rev-faltantes">
                    ${faltantes.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
                </ul>
            </div>` : ''}

            <div class="rev-seccion">
                <h3>Lo esencial</h3>
                <div class="rev-datos">
                    ${dato('Superficie', p.superficie_m2 ? Number(p.superficie_m2).toLocaleString('es-CL') + ' m²' : '')}
                    ${dato('Precio pedido', clp(p.precio_publicado))}
                    ${dato('Valor TPL', t.valor_tpl_total ? clp(t.valor_tpl_total) : 'Sin tasación')}
                    ${dato('$/m² pedido', p.precio_publicado && p.superficie_m2 ? clp(Math.round(p.precio_publicado / p.superficie_m2)) : '')}
                    ${dato('Sector', p.sector)}
                    ${dato('Coordenadas', p.lat && p.lng ? `${p.lat}, ${p.lng}` : 'Sin marcar')}
                </div>
            </div>

            <div class="rev-seccion">
                <h3>Antecedentes del terreno</h3>
                <div class="rev-datos">
                    ${dato('Rol', p.rol_situacion)}
                    ${dato('Agua', p.agua)}
                    ${dato('Electricidad', p.electricidad)}
                    ${dato('Acceso', p.acceso)}
                    ${dato('Topografía', p.topografia)}
                    ${dato('Suelo', p.suelo)}
                    ${dato('Cierre perimetral', p.cierre_perimetral)}
                    ${dato('Portón', p.porton)}
                    ${dato('Atributos naturales', naturales.length ? naturales.join(', ') : '')}
                </div>
            </div>

            ${Number(casa.superficieConstruida) > 0 ? `
            <div class="rev-seccion">
                <h3>Vivienda declarada</h3>
                <div class="rev-datos">
                    ${dato('Superficie construida', casa.superficieConstruida + ' m²')}
                    ${dato('Materialidad', casa.materialidad)}
                    ${dato('Antigüedad', casa.antiguedadAnios != null ? casa.antiguedadAnios + ' años' : '')}
                    ${dato('Recepción municipal', casa.regularizada)}
                    ${dato('Piscina', casa.piscina === 'si' ? `${casa.piscinaM2 || '?'} m² de ${casa.piscinaMaterial || 'material sin declarar'}` : 'No')}
                    ${dato('Quincho', casa.quincho === 'si' ? `${casa.quinchoM2 || '?'} m²` : 'No')}
                    ${dato('Cabaña', casa.cabana === 'si' ? `${casa.cabanaM2 || '?'} m²` : 'No')}
                    ${dato('Riego automático', casa.riego === 'si' ? 'Sí' : 'No')}
                </div>
            </div>` : ''}

            <div class="rev-seccion">
                <h3>Descripción</h3>
                <p class="rev-descripcion">${escapeHtml(p.descripcion || 'Sin descripción.')}</p>
            </div>

            <div class="rev-seccion">
                <h3>Fotos <span class="rev-cuenta">${fotos.length}</span></h3>
                ${fotos.length
                    ? `<div class="rev-fotos-grid">${fotos.map((f) => {
                        const nombre = (f.metadata || {}).nombre_original || f.storage_path || 'Foto';
                        return f.url
                            ? `<a class="rev-fotos-item" href="${escapeHtml(f.url)}" target="_blank" rel="noopener" title="${escapeHtml(nombre)}">
                                 <img src="${escapeHtml(f.url)}" alt="${escapeHtml(nombre)}" loading="lazy">
                               </a>`
                            : `<div class="rev-fotos-item rev-fotos-item--rota" title="${escapeHtml(nombre)}"><span>Sin URL</span></div>`;
                    }).join('')}</div>`
                    : '<p class="rev-alerta">Esta publicación no trae fotos. Sin imágenes casi no recibe consultas.</p>'}
            </div>

            <div class="rev-seccion">
                <h3>Contacto</h3>
                <div class="rev-datos">
                    ${dato('Nombre', meta.contacto_nombre)}
                    ${dato('Correo', meta.contacto_email)}
                    ${dato('Teléfono', meta.contacto_telefono)}
                </div>
                ${!meta.contacto_email ? '<p class="rev-alerta">Sin correo registrado: no podremos avisarle la decisión.</p>' : ''}
            </div>

            <div class="rev-decision">
                <label for="rev-motivo">Motivo (obligatorio si rechazas, opcional si apruebas)</label>
                <textarea id="rev-motivo" rows="3" placeholder="Ej: Faltan fotos del acceso y el precio está muy sobre la tasación de la zona."></textarea>
                <p class="rev-estado" id="rev-estado" hidden></p>
                <div class="rev-botones">
                    <button class="btn btn--danger" id="rev-rechazar" data-pub="${escapeHtml(pub.id)}">Rechazar</button>
                    <button class="btn btn--primary" id="rev-aprobar" data-pub="${escapeHtml(pub.id)}">Aprobar y publicar</button>
                </div>
                <p class="rev-nota">Al decidir se envía un correo automático a ${escapeHtml(meta.contacto_email || 'quien publicó')}.
                Si apruebas, se le invita a crear su acceso a TPL Business.</p>
            </div>
        </div>`;
}

export function init() {
    const caja = document.getElementById('rev-detalle');

    document.querySelectorAll('.btn-revisar').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            caja.hidden = false;
            caja.innerHTML = '<div class="rev-panel"><p class="dash-vacio">Cargando la publicación…</p></div>';
            caja.scrollIntoView({ behavior: 'smooth', block: 'start' });

            try {
                const client = getClient();
                const { data, error } = await client.rpc('tpl_publicacion_detalle_v1', { p_publicacion_id: id });
                if (error) throw error;
                if (!data?.ok) throw new Error(data?.error || 'No pudimos abrir la publicación.');
                pintarDetalle(caja, data);
                conectarDecision(caja);
            } catch (error) {
                console.error('No se pudo cargar el detalle de la publicación', error);
                caja.innerHTML = `<div class="rev-panel"><p class="rev-alerta">No pudimos abrir esta publicación. ${escapeHtml(error.message || '')}</p></div>`;
            }
        });
    });
}

function conectarDecision(caja) {
    document.getElementById('rev-cerrar')?.addEventListener('click', () => { caja.hidden = true; caja.innerHTML = ''; });

    const estado = document.getElementById('rev-estado');
    const decir = (texto, ok = false) => {
        estado.textContent = texto;
        estado.className = `rev-estado${ok ? ' rev-estado--ok' : ''}`;
        estado.hidden = false;
    };

    const decidir = async (decision, boton) => {
        const motivo = document.getElementById('rev-motivo').value.trim();
        if (decision === 'rechazar' && !motivo) {
            decir('Escribe el motivo del rechazo: es lo que le vamos a explicar a la persona.');
            document.getElementById('rev-motivo').focus();
            return;
        }

        const otro = decision === 'rechazar' ? document.getElementById('rev-aprobar') : document.getElementById('rev-rechazar');
        boton.disabled = true; otro.disabled = true;
        const textoOriginal = boton.textContent;
        boton.textContent = decision === 'aprobar' ? 'Publicando…' : 'Rechazando…';
        estado.hidden = true;

        try {
            const client = getClient();
            const { data, error } = await client.rpc('tpl_revisar_publicacion_v1', {
                p_publicacion_id: boton.dataset.pub,
                p_decision: decision,
                p_motivo: motivo || null,
            });
            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || 'No pudimos registrar la decisión.');

            const aviso = data?.correo_encolado
                ? `Le avisamos a ${data.destinatario}.`
                : 'No había correo registrado, así que no se envió aviso.';
            decir(decision === 'aprobar'
                ? `Publicada. ${aviso}`
                : `Rechazada. ${aviso}`, true);
            toast(decision === 'aprobar' ? 'Publicación aprobada' : 'Publicación rechazada', 'success');

            // La bandeja y el panel leen de un snapshot que no se refresca solo.
            setTimeout(() => refrescarSnapshot(), 1800);
        } catch (error) {
            console.error('No se pudo registrar la decisión', error);
            decir(error?.message || 'No pudimos registrar la decisión. Inténtalo otra vez.');
            boton.disabled = false; otro.disabled = false;
            boton.textContent = textoOriginal;
        }
    };

    document.getElementById('rev-aprobar')?.addEventListener('click', (e) => decidir('aprobar', e.currentTarget));
    document.getElementById('rev-rechazar')?.addEventListener('click', (e) => decidir('rechazar', e.currentTarget));
}
