import { arr } from '../../core/state.js';
import { formatCLP, escapeHtml } from '../../core/utils.js';
import { showModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { refrescarSnapshot } from '../../core/refresh.js';
import { render as editorRender, init as editorInit } from './editor.js';
import { getClient } from '../../core/supabase.js';

export function render() {
    const casas = arr('casas');
    
    const styles = `
    <style>
        .casas-container {
            padding: 24px 16px;
            max-width: 1400px;
            margin: 0 auto;
            font-family: system-ui, -apple-system, sans-serif;
            color: #1e293b;
        }
        
        .header-bar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
        }

        @media (min-width: 640px) {
            .header-bar {
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
            }
        }

        .header-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
        }

        .btn-primary {
            background-color: #005aa0;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary:hover {
            background-color: #00457a;
        }

        .casas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 2rem;
        }

        .casa-card {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: 1px solid #e2e8f0;
        }

        .casa-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .card-image-wrap {
            position: relative;
            height: 200px;
            background-color: #f1f5f9;
        }

        .card-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .card-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
        }

        .card-status {
            position: absolute;
            top: 12px;
            right: 12px;
            background-color: #10b981;
            color: white;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .card-content {
            padding: 20px;
            display: flex;
            flex-direction: column;
            flex: 1;
        }

        .card-title {
            font-size: 1.125rem;
            font-weight: 700;
            margin: 0 0 4px 0;
            color: #0f172a;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .card-code {
            font-size: 0.8125rem;
            color: #64748b;
            font-family: monospace;
            margin-bottom: 16px;
        }

        .card-specs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
        }

        .spec-item {
            background-color: #f8fafc;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #f1f5f9;
        }

        .spec-label {
            display: block;
            font-size: 0.7rem;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
            font-weight: 600;
        }

        .spec-value {
            display: block;
            font-size: 0.9375rem;
            font-weight: 700;
            color: #334155;
        }

        .card-price {
            margin-top: auto;
            margin-bottom: 20px;
            padding-top: 16px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        
        .price-label {
            display: block;
            font-size: 0.75rem;
            color: #64748b;
            margin-bottom: 4px;
        }
        
        .price-amount {
            font-size: 1.25rem;
            font-weight: 800;
            color: #0369a1;
        }

        .card-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .btn-action {
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.8125rem;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
            text-decoration: none;
        }

        .btn-edit {
            background-color: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
        }

        .btn-edit:hover {
            background-color: #e2e8f0;
            color: #1e293b;
        }

        .btn-delete {
            background-color: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
        }

        .btn-delete:hover {
            background-color: #fee2e2;
        }
    </style>
    `;

    function renderCasa(c) {
        return `
            <div class="casa-card" data-id="${c.id}">
                <div class="card-image-wrap">
                    ${c.imagenes && c.imagenes.length 
                        ? `<img src="${c.imagenes[0]}" class="card-image" alt="Foto de la casa">` 
                        : `<div class="card-placeholder">
                               <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                           </div>`}
                    <div class="card-status">${c.estado || 'DISPONIBLE'}</div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${escapeHtml(c.nombre || 'Casa sin nombre')}</h3>
                    <div class="card-code">ID: ${escapeHtml(c.codigo || c.id.substring(0,8))}</div>
                    
                    <div class="card-specs">
                        <div class="spec-item">
                            <span class="spec-label">Superficie</span>
                            <span class="spec-value">${c.superficie_m2 || 0} m</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Dorm/Baos</span>
                            <span class="spec-value">${c.dormitorios || 0} / ${c.banos || 0}</span>
                        </div>
                    </div>
                    
                    <div class="card-price">
                        <div>
                            <span class="price-label">Precio Base</span>
                            <span class="price-amount">${formatCLP(c.precio_base || 0)}</span>
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn-action btn-edit btn-editar-casa" data-id="${c.id}">Editar Vivienda</button>
                        <button class="btn-action btn-delete btn-eliminar-casa" data-id="${c.id}">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        ${styles}
        <div class="casas-container">
            <div class="header-bar">
                <h1 class="header-title">Inventario de Casas y Construcciones</h1>
                <button id="btn-nueva-casa" class="btn-primary">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Aadir Casa
                </button>
            </div>
            
            ${casas.length > 0 ? `
                <div class="casas-grid">
                    ${casas.map(c => renderCasa(c)).join('')}
                </div>
            ` : `
                <div style="padding: 40px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; color: #64748b;">
                    No hay casas en el inventario de TPL.
                </div>
            `}
        </div>
    `;
}

/**
 * Abre el editor de una casa dentro del modal comun.
 *
 * QUE ESTABA ROTO
 *   Se llamaba showModal(html, callback), pero components/modal.js recibe UN
 *   objeto: showModal({ title, body, actions, size }). Al desestructurar un
 *   string, `title` y `body` quedaban undefined, el modal se abria con la
 *   palabra "undefined" adentro y el segundo argumento (el init del formulario)
 *   se ignoraba por completo. Es decir: "Anadir Casa" y "Editar Vivienda" no
 *   funcionaron nunca.
 *
 *   Ademas el editor cerraba con un CustomEvent 'close-modal' que ningun
 *   archivo escuchaba, asi que la X y el boton Cancelar tampoco hacian nada.
 *   Por eso ahora se escucha ese evento aqui.
 */
function abrirEditorCasa(casa) {
    showModal({
        title: casa ? `Editar casa · ${casa.nombre || casa.codigo || ''}` : 'Nueva casa',
        body: editorRender(casa),
        size: 'lg',
    });
    // El HTML del editor recien existe despues de showModal.
    editorInit(casa);
}

// La X y el boton Cancelar del editor emiten este evento. Se registra una sola
// vez por carga de pagina, no una por render, para no acumular listeners.
if (!window.__tplCasasCloseModalWired) {
    window.__tplCasasCloseModalWired = true;
    document.addEventListener('close-modal', () => closeModal());
}

export function init() {
    const btnNueva = document.getElementById('btn-nueva-casa');
    if (btnNueva) {
        btnNueva.addEventListener('click', () => abrirEditorCasa(null));
    }

    document.querySelectorAll('.btn-editar-casa').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const casa = arr('casas').find(c => c.id === id);
            abrirEditorCasa(casa || null);
        });
    });

    document.querySelectorAll('.btn-eliminar-casa').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const btnEl = e.currentTarget;
            if (!confirm('¿Seguro que quieres eliminar esta casa del inventario? Esta acción no se puede deshacer.')) return;

            const textoOriginal = btnEl.textContent;
            btnEl.disabled = true;
            btnEl.textContent = 'Borrando...';

            try {
                // .select('id') es imprescindible: sin representacion, Supabase
                // responde 200 / error:null aunque RLS haya bloqueado el borrado
                // y no se haya tocado ninguna fila. Sin este chequeo, un borrado
                // bloqueado por permisos se anunciaba como exito y la casa
                // seguia ahi. Mismo arreglo que ya tiene el borrado de parcelas.
                const { data: borradas, error } = await getClient()
                    .from('tpl_casas')
                    .delete()
                    .eq('id', id)
                    .select('id');
                if (error) throw error;
                if (!borradas?.length) {
                    throw new Error('La base no confirmó el borrado (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.');
                }
                toast('Casa eliminada del inventario', 'success');
                // El inventario sale del snapshot, que no se refresca solo.
                await refrescarSnapshot();
            } catch (err) {
                console.error('Error al eliminar la casa', err);
                toast('No se pudo eliminar: ' + (err?.message || err), 'error');
                btnEl.disabled = false;
                btnEl.textContent = textoOriginal;
            }
        });
    });
}
