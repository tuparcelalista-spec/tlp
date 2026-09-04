/**
 * Resumen ejecutivo del CRM.
 *
 * QUÉ ESTABA MAL
 *   Esta pantalla, la primera que ve el equipo cada mañana, era casi toda una
 *   maqueta con datos inventados escritos a mano en el HTML:
 *
 *     - El embudo mostraba 3 / 2 / 1 oportunidades. En la base hay 0.
 *     - Las "Tareas Diarias" eran tres frases fijas: "Llamar a Juan Pérez para
 *       confirmar visita a Parcela Caburgua", "Rut: 12.xxx.xxx-x"…
 *     - "Nuevas Captaciones" listaba una parcela de Chillán y otra de Los
 *       Ángeles que no existen; las dos publicaciones reales en revisión son
 *       otras.
 *     - "Recomendaciones TPL (IA)" era un párrafo fijo presentado como análisis
 *       de una IA que nunca se ejecutó.
 *     - "Analíticas de Tráfico" declaraba 1.245 visitas hoy con un +12%, 34
 *       clics y 8 descargas del informe. Ninguna de esas cifras se mide.
 *     - El "Monitor de Salud del Sitio" inventaba un error 404 en
 *       /parcelas/valdivia-2, una advertencia de rendimiento en la galería de
 *       Yumbel y un 100% de correos entregados.
 *
 *   Alguien podía llamar a "Juan Pérez" o dar por bueno un 100% de entrega.
 *
 * QUÉ HACE AHORA
 *   Todo sale del snapshot real (tpl_crm_snapshot_v1) y de la misma tasación
 *   canónica que usan la grilla, el informe premium y el portal del propietario.
 *   Lo que no se mide se dice que no se mide, en vez de rellenarlo.
 */

import { arr } from '../../core/state.js';
import { escapeHtml } from '../../core/utils.js';
import { getClient } from '../../core/supabase.js';

// Mismos estados y etiquetas que el tablero de pipeline.
const ETAPAS = [
    ['nueva', 'Nuevas'],
    ['contactada', 'Contactadas'],
    ['calificada', 'Calificadas'],
    ['agendada', 'Visita agendada'],
    ['negociacion', 'En negociación'],
    ['reservada', 'Reservadas'],
];

const num = (n) => Number(n || 0).toLocaleString('es-CL');
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');

/** Valor TPL canónico de una parcela del snapshot. */
function valorTpl(p) {
    return Number(p?.metadata?.valor_tpl_recomendado) || 0;
}

function kpis() {
    const parcelas = arr('parcelas');
    const conValor = parcelas.filter((p) => valorTpl(p) > 0);
    const cartera = conValor.reduce((s, p) => s + valorTpl(p), 0);

    const items = [
        { lbl: 'Parcelas en catálogo', val: num(parcelas.length), sub: `${conValor.length} con tasación al día` },
        { lbl: 'Valor TPL de la cartera', val: money(cartera), sub: conValor.length ? `Suma de ${conValor.length} tasaciones` : 'Sin tasaciones cargadas' },
        { lbl: 'Tasaciones registradas', val: num(arr('tasaciones').length), sub: 'Histórico completo' },
        { lbl: 'Pendientes de revisión', val: num(arr('publicaciones_revision').length), sub: 'Publicaciones por aprobar' },
    ];

    return `<div class="dash-kpis">${items.map((k) => `
        <div class="kpi-card">
            <div class="kpi-card__info">
                <span class="kpi-card__label">${escapeHtml(k.lbl)}</span>
                <span class="kpi-card__value">${escapeHtml(k.val)}</span>
                <small>${escapeHtml(k.sub)}</small>
            </div>
        </div>`).join('')}</div>`;
}

function embudo() {
    const ops = arr('oportunidades');
    if (!ops.length) {
        return `<div class="card">
            <div class="card__header"><h2>Embudo comercial</h2></div>
            <div class="card__body">
                <p class="dash-vacio">Todavía no hay oportunidades registradas. Las consultas que entren por el sitio aparecerán aquí y en el tablero de pipeline.</p>
            </div>
        </div>`;
    }

    const total = ops.length;
    const filas = ETAPAS.map(([id, label]) => {
        const n = ops.filter((o) => o.estado === id).length;
        return { label, n, pct: total ? Math.round((n / total) * 100) : 0 };
    }).filter((f) => f.n > 0);

    return `<div class="card">
        <div class="card__header"><h2>Embudo comercial</h2><span class="card__meta">${total} activas</span></div>
        <div class="card__body">
            ${filas.map((f) => `
                <div class="dash-etapa">
                    <div class="dash-etapa__top"><span>${escapeHtml(f.label)}</span><strong>${f.n}</strong></div>
                    <div class="dash-etapa__barra"><span style="width:${f.pct}%"></span></div>
                </div>`).join('')}
        </div>
    </div>`;
}

function tareas() {
    const pendientes = arr('tareas')
        .filter((t) => t.estado !== 'completada' && t.estado !== 'cancelada')
        .sort((a, b) => new Date(a.vence_at || 8.64e15) - new Date(b.vence_at || 8.64e15));

    if (!pendientes.length) {
        return `<div class="card">
            <div class="card__header"><h2>Tareas pendientes</h2></div>
            <div class="card__body"><p class="dash-vacio">No hay tareas pendientes.</p></div>
        </div>`;
    }

    const ahora = Date.now();
    const filas = pendientes.slice(0, 8).map((t) => {
        const vence = t.vence_at ? new Date(t.vence_at) : null;
        const vencida = vence && vence.getTime() < ahora;
        const cuando = vence
            ? vence.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
            : 'Sin fecha';
        return `<li class="dash-tarea${vencida ? ' dash-tarea--vencida' : ''}">
            <div>
                <strong>${escapeHtml(t.titulo || 'Tarea')}</strong>
                ${t.detalle ? `<small>${escapeHtml(t.detalle)}</small>` : ''}
            </div>
            <span class="dash-tarea__fecha">${vencida ? 'Venció ' : ''}${escapeHtml(cuando)}</span>
        </li>`;
    }).join('');

    const vencidas = pendientes.filter((t) => t.vence_at && new Date(t.vence_at).getTime() < ahora).length;

    return `<div class="card">
        <div class="card__header">
            <h2>Tareas pendientes</h2>
            <span class="card__meta">${pendientes.length}${vencidas ? ` · ${vencidas} vencida${vencidas === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div class="card__body"><ul class="dash-tareas">${filas}</ul></div>
    </div>`;
}

function captaciones() {
    const pendientes = arr('publicaciones_revision');

    if (!pendientes.length) {
        return `<div class="card">
            <div class="card__header"><h2>Nuevas captaciones</h2></div>
            <div class="card__body"><p class="dash-vacio">No hay publicaciones esperando revisión.</p></div>
        </div>`;
    }

    const filas = pendientes.map((p) => {
        const d = p.datos || {};
        const enviada = p.enviada_at ? new Date(p.enviada_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—';
        return `<tr>
            <td><strong>${escapeHtml(d.titulo || p.codigo || 'Sin título')}</strong><small>${escapeHtml(p.codigo || '')}</small></td>
            <td>${escapeHtml(d.comuna || '—')}</td>
            <td>${d.superficie ? num(d.superficie) + ' m²' : '—'}</td>
            <td>${d.precio ? money(d.precio) : 'Sin precio'}</td>
            <td>${escapeHtml(enviada)}</td>
        </tr>`;
    }).join('');

    return `<div class="card">
        <div class="card__header">
            <h2>Nuevas captaciones</h2>
            <a class="btn btn--sm btn--outline" href="#revision">Ir a la bandeja</a>
        </div>
        <div class="card__body">
            <table class="data-table">
                <thead><tr><th>Publicación</th><th>Comuna</th><th>Superficie</th><th>Precio pedido</th><th>Enviada</th></tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    </div>`;
}

/**
 * Brecha entre lo que pide el propietario y el valor TPL.
 *
 * Reemplaza al bloque que se firmaba como "Recomendaciones TPL (IA)" con un
 * párrafo fijo. Esto sí se calcula, con la misma tasación que muestran la
 * grilla y el informe premium, y se puede auditar parcela por parcela.
 */
function brechaPrecios() {
    const filas = arr('parcelas')
        .map((p) => {
            const tpl = valorTpl(p);
            const pedido = Number(p.precio_publicado) || 0;
            if (!tpl || !pedido) return null;
            return { p, tpl, pedido, dif: ((pedido - tpl) / tpl) * 100 };
        })
        .filter(Boolean)
        .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif))
        .slice(0, 5);

    if (!filas.length) {
        return `<div class="card">
            <div class="card__header"><h2>Precio pedido vs. valor TPL</h2></div>
            <div class="card__body"><p class="dash-vacio">Ninguna parcela tiene a la vez precio publicado y tasación vigente.</p></div>
        </div>`;
    }

    return `<div class="card">
        <div class="card__header">
            <h2>Precio pedido vs. valor TPL</h2>
            <span class="card__meta">Mayores diferencias</span>
        </div>
        <div class="card__body">
            <table class="data-table">
                <thead><tr><th>Parcela</th><th>Pide</th><th>Valor TPL</th><th>Diferencia</th></tr></thead>
                <tbody>
                    ${filas.map((f) => {
                        const alta = Math.abs(f.dif) >= 25;
                        const signo = f.dif > 0 ? '+' : '';
                        return `<tr>
                            <td><strong>${escapeHtml(f.p.titulo || f.p.codigo || 'Parcela')}</strong><small>${escapeHtml(f.p.comuna || '')}</small></td>
                            <td>${money(f.pedido)}</td>
                            <td>${money(f.tpl)}</td>
                            <td><span class="badge ${alta ? 'badge--warning' : 'badge--neutral'}">${signo}${Math.round(f.dif)}%</span></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            <p class="dash-nota">Diferencia entre el precio publicado y el valor del motor TPL. Una diferencia alta no es un error: indica cuánta argumentación comercial exige esa parcela.</p>
        </div>
    </div>`;
}

/** Lo que todavía no se mide se declara, en vez de inventarse. */
function medicionPendiente() {
    return `<div class="card card--nota">
        <div class="card__header"><h2>Qué todavía no medimos</h2></div>
        <div class="card__body">
            <p class="dash-nota">
                Aquí había un panel de tráfico (1.245 visitas, +12%, 8 descargas del informe) y un monitor
                de salud del sitio con errores 404 y avisos de rendimiento. Ninguna de esas cifras se medía:
                estaban escritas a mano en el código.
            </p>
            <ul class="dash-pendientes">
                <li><strong>Visitas por parcela:</strong> la tabla <code>tpl_web_analytics</code> existe y recibe eventos, pero el 100% llega sin <code>parcela_id</code>, así que no se puede atribuir tráfico a una ficha.</li>
                <li><strong>Descargas del informe:</strong> todavía no se registra un evento al abrir el informe premium.</li>
                <li><strong>Entrega de correos:</strong> <code>tpl_comunicaciones_cola</code> guarda el estado de cada envío; falta traerlo a esta pantalla.</li>
            </ul>
        </div>
    </div>`;
}

/**
 * Aviso de publicaciones esperando revisión.
 *
 * Va arriba de todo y en naranjo porque es la única cosa del panel donde
 * alguien está esperando una respuesta nuestra: mientras no se revise, la
 * propiedad no existe para el público y quien la publicó no sabe nada.
 */
function avisoRevision() {
    const pendientes = arr('publicaciones_revision');
    if (!pendientes.length) return '';

    const n = pendientes.length;
    const masAntigua = pendientes
        .map((p) => p.enviada_at || p.created_at)
        .filter(Boolean)
        .sort()[0];
    const dias = masAntigua
        ? Math.floor((Date.now() - new Date(masAntigua).getTime()) / 86400000)
        : null;

    const espera = dias === null ? ''
        : dias === 0 ? 'La más reciente llegó hoy.'
        : dias === 1 ? 'La más antigua lleva 1 día esperando.'
        : `La más antigua lleva ${dias} días esperando.`;

    return `
        <div class="aviso-revision" role="alert">
            <div class="aviso-revision__marca">${n}</div>
            <div class="aviso-revision__texto">
                <strong>REVISAR PUBLICACIÓN</strong>
                <span>${n === 1
                    ? 'Hay una propiedad esperando tu aprobación para entrar al catálogo.'
                    : `Hay ${n} propiedades esperando tu aprobación para entrar al catálogo.`} ${espera}</span>
            </div>
            <a class="aviso-revision__btn" href="#revision">Revisar ahora</a>
        </div>`;
}

export function render() {
    return `
        <div class="dashboard-module">

            <!-- Clientes que confirmaron desde el correo que quieren partir.
                 Se rellena en init(); permanece hasta marcarse como atendida. -->
            <div id="comienzo-proyecto-alertas"></div>

            ${avisoRevision()}

            ${kpis()}

            <div>
                <h2 class="dash-titulo">Acciones rápidas</h2>
                <!-- Estos botones decian lo que NO hacian:
                     · "Nueva parcela" llevaba al listado, donde no hay ningun
                       boton de alta: el alta real es el publicador.
                     · "Ejecutar tasador TPL" llevaba a #tasaciones, que es un
                       historico de solo lectura y no ejecuta nada; el tasador
                       vive en su propia app y el recalculo masivo esta en el
                       listado de parcelas.
                     Ahora cada boton nombra el destino al que de verdad va. -->
                <div class="dash-acciones">
                    <button class="btn btn--primary" onclick="window.location.href='../publicar-v2/index.html'">Publicar una parcela nueva</button>
                    <button class="btn btn--primary" onclick="window.location.href='../tasador/index.html'">Abrir Tasador TPL</button>
                    <!-- El informe siempre es de una parcela concreta: abrirlo sin
                         ?id= muestra un error, asi que se entra por el listado. -->
                    <button class="btn btn--primary" onclick="window.location.hash='#parcelas'">Informe premium (elegir parcela)</button>
                    <button class="btn btn--outline" onclick="window.location.hash='#revision'">Bandeja de revisión</button>
                </div>
            </div>

            <div class="dash-grid">
                ${embudo()}
                ${tareas()}
            </div>

            ${captaciones()}
            ${brechaPrecios()}
            ${medicionPendiente()}
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
