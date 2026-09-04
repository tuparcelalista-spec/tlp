import state, { arr } from '../../core/state.js';
import { navigate } from '../../core/router.js';
import { escapeHtml } from '../../core/utils.js';
import { getClient } from '../../core/supabase.js';

export function render() {
    const props = arr('parcelas').length;
    const ops = arr('oportunidades').length;
    return `
        <div class="dashboard-module" style="display: flex; flex-direction: column; gap: 2rem;">

            <!-- Clientes que confirmaron desde el correo que quieren partir.
                 Se rellena en init(); permanece hasta marcarse como atendida. -->
            <div id="comienzo-proyecto-alertas"></div>

            <!-- Accesos Rápidos -->
            <div>
                <h2 style="font-size: var(--fs-lg); margin-bottom: 1rem;">Acciones Rápidas</h2>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn--primary" onclick="window.location.hash='#/parcelas/new'">➕ Nueva Parcela</button>
                    <button class="btn btn--primary" onclick="window.location.hash='#/tasaciones'">🔍 Ejecutar Tasador TPL</button>
                    <!-- Este boton abria ../informe-valores/index.html SIN ?id=,
                         y esa pagina responde alert("ID de propiedad no
                         especificado") y no muestra nada. El informe siempre es
                         de una parcela concreta, asi que se entra por el listado. -->
                    <button class="btn btn--primary" onclick="window.location.hash='#/parcelas'">📑 Informe Premium (elegir parcela)</button>
                    <button class="btn btn--outline" onclick="window.location.href='../publicar-v2/index.html'">🚀 Ir a Publicador V2</button>
                </div>
            </div>

            <!-- Pipeline y Tareas -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                
                <!-- Embudo de Ventas (Oportunidades) -->
                <div class="card">
                    <div class="card__header">
                        <h2 style="font-size: var(--fs-lg); font-weight: var(--fw-bold); margin: 0;">Embudo de Ventas Activo</h2>
                    </div>
                    <div class="card__body" style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: #eef2ff; border-radius: 6px;">
                            <span>🆕 Nuevos Interesados</span>
                            <strong>3</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: #fffbeb; border-radius: 6px;">
                            <span>👀 En Visita / Negociación</span>
                            <strong>2</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: #f0fdf4; border-radius: 6px;">
                            <span>🤝 Promesa de Compra / Cierre</span>
                            <strong>1</strong>
                        </div>
                    </div>
                </div>

                <!-- Tareas Diarias -->
                <div class="card">
                    <div class="card__header">
                        <h2 style="font-size: var(--fs-lg); font-weight: var(--fw-bold); margin: 0;">Tareas Diarias (To-Do)</h2>
                    </div>
                    <div class="card__body">
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem;">
                            <li style="display: flex; gap: 10px; align-items: flex-start;">
                                <input type="checkbox" style="margin-top: 4px;">
                                <span>Llamar a Juan Pérez para confirmar visita a Parcela Caburgua.</span>
                            </li>
                            <li style="display: flex; gap: 10px; align-items: flex-start;">
                                <input type="checkbox" style="margin-top: 4px;">
                                <span>Revisar y aprobar tasación de la parcela ingresada en Yumbel.</span>
                            </li>
                            <li style="display: flex; gap: 10px; align-items: flex-start;">
                                <input type="checkbox" style="margin-top: 4px;">
                                <span>Enviar Informe Premium a propietario (Rut: 12.xxx.xxx-x).</span>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>

            <!-- Insights / Gemini -->
            <div class="card" style="border-left: 4px solid #be185d;">
                <div class="card__header">
                    <h2 style="font-size: var(--fs-lg); font-weight: var(--fw-bold); margin: 0; color: #be185d;">✨ Recomendaciones TPL (IA)</h2>
                </div>
                <div class="card__body">
                    <p style="margin: 0; font-size: var(--fs-md); color: #333;">
                        <strong>Sugerencia de Negocio:</strong> La Parcela en Florida lleva 15 días publicada. Su precio está un 20% bajo el tasador TPL. Sugiero generar campaña rápida en portales con inversión del 0,2% para asegurar cierre este mes.
                    </p>
                </div>
            </div>

            <!-- Nuevas Captaciones -->
            <div class="card">
                <div class="card__header">
                    <h2 style="font-size: var(--fs-lg); font-weight: var(--fw-bold); margin: 0;">Nuevas Captaciones (Pendientes de Revisión)</h2>
                </div>
                <div class="card__body">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--c-border-light);">
                                <th style="padding: 10px 0;">Fecha</th>
                                <th style="padding: 10px 0;">Comuna</th>
                                <th style="padding: 10px 0;">Superficie</th>
                                <th style="padding: 10px 0;">Estado</th>
                                <th style="padding: 10px 0;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid var(--c-border-light);">
                                <td style="padding: 10px 0;">Hoy</td>
                                <td style="padding: 10px 0;">Chillán</td>
                                <td style="padding: 10px 0;">5,000 m²</td>
                                <td style="padding: 10px 0;"><span style="background: #fef08a; padding: 2px 8px; border-radius: 12px; font-size: 12px; color: #854d0e;">En Revisión</span></td>
                                <td style="padding: 10px 0;"><button class="btn btn--sm btn--outline">Revisar</button></td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0;">Ayer</td>
                                <td style="padding: 10px 0;">Los Ángeles</td>
                                <td style="padding: 10px 0;">5,500 m² (con casa)</td>
                                <td style="padding: 10px 0;"><span style="background: #fef08a; padding: 2px 8px; border-radius: 12px; font-size: 12px; color: #854d0e;">En Revisión</span></td>
                                <td style="padding: 10px 0;"><button class="btn btn--sm btn--outline">Revisar</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Analíticas del Sitio (Web & Interacciones) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
                
                <!-- Tráfico y Eventos -->
                <div class="card">
                    <div class="card__header">
                        <h2 style="font-size: var(--fs-lg); font-weight: var(--fw-bold); margin: 0;">📊 Analíticas de Tráfico y Eventos</h2>
                    </div>
                    <div class="card__body" style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--c-border-light);">
                            <div>
                                <span style="display: block; font-size: 13px; color: var(--c-text-muted);">Visitas Generales (Hoy)</span>
                                <strong style="font-size: 18px;">1,245</strong>
                            </div>
                            <div style="color: #10b981; font-weight: bold; font-size: 14px;">↑ 12%</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--c-border-light);">
                            <div>
                                <span style="display: block; font-size: 13px; color: var(--c-text-muted);">Clics en "Agendar Visita"</span>
                                <strong style="font-size: 18px;">34</strong>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="display: block; font-size: 13px; color: var(--c-text-muted);">Descargas "Informe Premium"</span>
                                <strong style="font-size: 18px;">8</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Estado del Sistema (Errores / Problemas) -->
                <div class="card" style="border-left: 4px solid #ef4444;">
                    <div class="card__header">
                        <h2 style="font-size: var(--fs-lg); font-weight: var(--fw-bold); margin: 0; color: #ef4444;">⚠️ Monitor de Salud del Sitio</h2>
                    </div>
                    <div class="card__body">
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
                            <li style="padding: 10px; background: #fef2f2; border-radius: 6px; font-size: 14px;">
                                <strong style="color: #b91c1c;">Error 404:</strong> 3 usuarios intentaron entrar a <code>/parcelas/valdivia-2</code> (Enlace roto).
                            </li>
                            <li style="padding: 10px; background: #fffbeb; border-radius: 6px; font-size: 14px;">
                                <strong style="color: #b45309;">Advertencia de Rendimiento:</strong> La carga de imágenes en la galería de "Parcela Yumbel" está tomando más de 4 segundos.
                            </li>
                            <li style="padding: 10px; background: #f0fdf4; border-radius: 6px; font-size: 14px; color: #15803d;">
                                <strong>Sistema de Correos:</strong> Funcionando correctamente (100% entregados).
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    `;
}

const clp = (n) => '$' + (Number(n) || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 });

/** Hace legible cuánto lleva esperando el cliente. */
function desdeHace(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.round(ms / 60000);
    if (min < 1) return 'recién';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.round(h / 24)} d`;
}

function tarjetaComienzo(op) {
    const meta = op.metadata || {};
    const total = meta?.precios?.total;
    const parcela = meta?.parcela?.nombre || meta?.parcela_codigo || 'Parcela por confirmar';
    const contacto = [op.telefono, op.email].filter(Boolean).map(escapeHtml).join(' · ');
    const wa = op.telefono ? String(op.telefono).replace(/\D/g, '') : '';

    return `
    <article class="comienzo-card" data-op="${escapeHtml(op.id)}">
      <div class="comienzo-card__flag">COMIENZO DE PROYECTO</div>
      <div class="comienzo-card__body">
        <div>
          <h3>${escapeHtml(op.nombre_contacto || 'Cliente')}</h3>
          <p class="comienzo-card__meta">${escapeHtml(parcela)}</p>
          <p class="comienzo-card__contacto">${contacto || 'Sin datos de contacto'}</p>
        </div>
        <div class="comienzo-card__cifra">
          ${total ? `<strong>${clp(total)}</strong><small>proyecto estimado</small>` : '<small>Sin monto</small>'}
          <span class="comienzo-card__tiempo">${escapeHtml(desdeHace(op.comienzo_solicitado_at))}</span>
        </div>
      </div>
      <div class="comienzo-card__acciones">
        ${wa ? `<a class="btn btn--primary" target="_blank" rel="noopener"
                  href="https://wa.me/56${wa.replace(/^56/, '')}?text=${encodeURIComponent('Hola ' + (op.nombre_contacto || '') + ', te contacto de Tu Parcela Lista por el proyecto que confirmaste.')}">Contactar por WhatsApp</a>` : ''}
        ${op.email ? `<a class="btn btn--outline" href="mailto:${escapeHtml(op.email)}">Escribir correo</a>` : ''}
        <button class="btn btn--outline" data-atender="${escapeHtml(op.id)}">Marcar como atendida</button>
      </div>
    </article>`;
}

async function cargarComienzos() {
    const zona = document.getElementById('comienzo-proyecto-alertas');
    if (!zona) return;

    try {
        const cliente = getClient();
        const { data, error } = await cliente
            .from('tpl_oportunidades')
            .select('id,nombre_contacto,email,telefono,metadata,comienzo_solicitado_at')
            .not('comienzo_solicitado_at', 'is', null)
            .is('comienzo_atendido_at', null)
            .order('comienzo_solicitado_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        if (!data || !data.length) { zona.innerHTML = ''; return; }

        zona.innerHTML = `
          <section class="comienzo-wrap">
            <header class="comienzo-wrap__head">
              <span class="comienzo-wrap__pulse"></span>
              <h2>${data.length} ${data.length === 1 ? 'cliente quiere comenzar su proyecto' : 'clientes quieren comenzar su proyecto'}</h2>
            </header>
            ${data.map(tarjetaComienzo).join('')}
          </section>`;

        zona.querySelectorAll('[data-atender]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Guardando...';
                try {
                    const { error: err } = await getClient()
                        .rpc('tpl_marcar_comienzo_atendido_v1', { p_id: btn.dataset.atender });
                    if (err) throw err;
                    await cargarComienzos();
                } catch (e) {
                    console.error('No se pudo marcar como atendida', e);
                    btn.disabled = false;
                    btn.textContent = 'Reintentar';
                }
            });
        });
    } catch (e) {
        console.error('No se pudieron cargar los comienzos de proyecto', e);
        zona.innerHTML = '';
    }
}

export function init() {
    cargarComienzos();
}
