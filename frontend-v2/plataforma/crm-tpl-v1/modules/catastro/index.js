import { getClient } from '../../core/supabase.js';
import { showModal, closeModal } from '../../components/modal.js';
import { toast as showToast } from '../../components/toast.js';

let catastroData = [];
let isLoading = true;

/** Tira la caché local de filas. Ver la nota en modules/parcelas/index.js. */
export function invalidate() {
    isLoading = true;
    catastroData = [];
}
let currentTab = "todas"; // todas, parcelas, casas, urbano
let comunaFilter = '';
let portalFilter = '';
let tipoFilter = '';
let textFilter = '';
let viewMode = 'grid';
let activeVirtudes = [];

const escapeHtml = (str) => String(str || '').replace(/[&<>'"]/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[match]));

// Solo permite abrir enlaces http(s) — evita que una URL guardada como "javascript:...")
// (venga de un scrape de un tercero o de un ingreso manual) se ejecute al hacer click.
const safeUrl = (url) => {
    const raw = String(url || '').trim();
    try {
        const parsed = new URL(raw, window.location.origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return raw;
    } catch (e) {}
    return '#';
};

function getUniqueComunas(data) {
    const comunas = data.map(d => d.comuna).filter(Boolean);
    return [...new Set(comunas)];
}

function getUniquePortals(data) {
    const portals = data.map(d => {
        try {
            let url = new URL(d.url);
            return url.hostname.replace('www.', '');
        } catch(e) { return null; }
    }).filter(Boolean);
    return [...new Set(portals)];
}

export function render() {
    const styles = `
    <style>
        .catastro-container {
            padding: var(--sp-6) var(--sp-4);
            max-width: 1400px;
            margin: 0 auto;
        }
        .header-bar {
            display: flex;
            flex-direction: column;
            gap: var(--sp-4);
            margin-bottom: var(--sp-6);
        }
        @media (min-width: 640px) {
            .header-bar {
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
            }
        }
        .search-input {
            padding: var(--sp-3) var(--sp-4);
            border: 1px solid var(--c-border);
            border-radius: var(--radius-md);
            font-size: var(--fs-sm);
        }
        .search-btn {
            background-color: var(--c-primary);
            color: white;
            border: none;
            padding: 0 var(--sp-5);
            border-radius: var(--radius-md);
            cursor: pointer;
            font-weight: var(--fw-semibold);
        }
        .search-btn:hover {
            background-color: var(--c-primary-light);
        }
        .grid-catastro {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: var(--sp-6);
        }
        .card-catastro {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--radius-lg);
            padding: var(--sp-5);
            box-shadow: var(--shadow-sm);
            display: flex;
            flex-direction: column;
        }
        .card-catastro h3 {
            margin: 0 0 var(--sp-2) 0;
            font-size: var(--fs-lg);
            color: var(--c-text);
        }
        .card-catastro p {
            margin: 0 0 var(--sp-1) 0;
            font-size: var(--fs-sm);
            color: var(--c-text-secondary);
        }
        .loading-state {
            padding: var(--sp-12);
            text-align: center;
            color: var(--c-text-muted);
        }
        .banner-info {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1e3a8a;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .form-group {
            margin-bottom: var(--sp-4);
        }
        .form-group label {
            display: block;
            margin-bottom: var(--sp-1);
            font-size: var(--fs-sm);
            color: var(--c-text-secondary);
            font-weight: 500;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: var(--sp-2);
            border: 1px solid var(--c-border);
            border-radius: var(--radius-sm);
            font-size: 1rem;
        }
    .list-catastro {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }
        .list-catastro th, .list-catastro td {
            padding: var(--sp-3) var(--sp-4);
            text-align: left;
            border-bottom: 1px solid var(--c-border);
            font-size: var(--fs-sm);
        }
        .list-catastro th {
            background: #f8fafc;
            font-weight: 600;
            color: var(--c-text-secondary);
        }
        .list-catastro tr:last-child td {
            border-bottom: none;
        }
        .btn-toggle-view {
            background: white;
            border: 1px solid var(--c-border);
            padding: var(--sp-2) var(--sp-4);
            cursor: pointer;
            font-size: 0.85rem;
        }
        .btn-toggle-view.active {
            background: var(--c-primary-light, #e0f2fe);
            border-color: var(--c-primary, #0284c7);
            color: var(--c-primary, #0284c7);
            font-weight: bold;
        }
        .btn-delete {
            background: #fef2f2;
            color: #ef4444;
            border: 1px solid #fca5a5;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s;
        }
        .btn-delete:hover {
            background: #ef4444;
            color: white;
        }
        .virtue-pill {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 0.8rem;
            background: #f1f5f9;
            color: #64748b;
            cursor: pointer;
            border: 1px solid #e2e8f0;
            transition: all 0.2s;
            user-select: none;
        }
        .virtue-pill:hover {
            background: #e2e8f0;
        }
        .virtue-pill.active {
            background: #10b981;
            color: white;
            border-color: #059669;
        }
    </style>
    `;

    if (isLoading) {
        return `${styles}
        <div class="catastro-container">
            <div class="loading-state">Cargando catastro de mercado...</div>
        </div>`;
    }

    const uniqueComunas = getUniqueComunas(catastroData);
    const uniquePortals = getUniquePortals(catastroData);
    
    // Lista de virtudes comunes para el filtro
    const availableVirtudes = ['agua', 'luz', 'rol', 'río', 'plana', 'bosque'];

    const filteredData = catastroData.filter(d => {
        let matchComuna = true;
        let matchPortal = true;
        let matchTipo = true;
        let matchVirtudes = true;

        if (comunaFilter) {
            matchComuna = (d.comuna || '').toLowerCase() === comunaFilter.toLowerCase();
        }
        if (portalFilter) {
            try {
                let host = new URL(d.url).hostname.replace('www.', '');
                matchPortal = host === portalFilter;
            } catch(e) {}
        }
        if (tipoFilter && tipoFilter !== 'Todas') {
            matchTipo = (d.tipo_propiedad || 'Parcela') === tipoFilter;
        }
        
        // Filtro Acumulativo de Virtudes
        if (typeof activeVirtudes !== 'undefined' && activeVirtudes.length > 0) {
            const dText = `${d.titulo} ${d.descripcion || ''} ${JSON.stringify(d.metadata || {})}`.toLowerCase();
            matchVirtudes = activeVirtudes.every(v => dText.includes(v.toLowerCase()));
        }

        let matchText = true;
        if (textFilter) {
            const lowerFilter = textFilter.toLowerCase();
            const searchableText = `${d.titulo} ${d.atributos} ${d.comuna} ${d.localidad} ${d.superficie_m2} ${d.precio_clp} ${d.precio_uf} ${d.contacto_nombre}`.toLowerCase();
            matchText = searchableText.includes(lowerFilter);
        }
        return matchComuna && matchPortal && matchTipo && matchVirtudes && matchText;
    });

    return `
        ${styles}
        <div class="catastro-container">
            <div class="banner-info">
                <div style="font-size: 2rem;">🧩</div>
                <div>
                    <strong>Nuevo Sistema de Ingesta:</strong> Para agregar nuevas propiedades a este Catastro de Mercado, utiliza la <b>Extensión de Chrome TPL</b> navegando en PortalInmobiliario o Yapo, o usa el botón de <b>Ingreso Manual</b>.
                </div>
            </div>

            <div class="header-bar" style="margin-bottom: var(--sp-4);">
                <h1>Visor de Catastro</h1>
                <div style="display: flex; gap: var(--sp-2); align-items: center; flex-wrap: wrap;">
                    <div style="display: flex; margin-right: 1rem;">
                        <button id="btn-view-grid" class="btn-toggle-view ${viewMode==='grid'?'active':''}" style="border-radius: 4px 0 0 4px;">🔲 Grid</button>
                        <button id="btn-view-list" class="btn-toggle-view ${viewMode==='list'?'active':''}" style="border-radius: 0 4px 4px 0; border-left: none;">📄 Lista</button>
                    </div>
                    
                    <input type="text" id="filter-text" class="search-input" placeholder="Buscar título, atributos, m2..." value="${escapeHtml(textFilter)}" style="width: 220px;">
                    
                    <select id="filter-comuna" class="search-input" style="width: auto;">
                        <option value="">Todas las Comunas</option>
                        ${uniqueComunas.map(c => `<option value="${escapeHtml(c)}" ${comunaFilter===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
                    </select>
                    <select id="filter-portal" class="search-input" style="width: auto;">
                        <option value="">Todos los Portales</option>
                        ${uniquePortals.map(p => `<option value="${escapeHtml(p)}" ${portalFilter===p?'selected':''}>${escapeHtml(p)}</option>`).join('')}
                    </select>
                    <select id="filter-tipo" class="search-input" style="width: auto;">
                        <option value="Todas" ${tipoFilter==='Todas'?'selected':''}>Todas</option>
                        <option value="Parcela" ${tipoFilter==='Parcela'?'selected':''}>Parcela</option>
                        <option value="Parcela con casa" ${tipoFilter==='Parcela con casa'?'selected':''}>Parcela con casa</option>
                    </select>
                    <button id="btn-manual-add" class="search-btn" style="background: #10b981; margin-left: 1rem;">➕ Ingreso Manual</button>
                </div>
            </div>

            <!-- Filtros Sumativos (Acumulativos) -->
            <div style="margin-bottom: var(--sp-6); display: flex; gap: var(--sp-2); align-items: center; flex-wrap: wrap;">
                <span style="font-size: 0.85rem; font-weight: bold; color: var(--c-text-secondary); margin-right: 8px;">Filtros Específicos:</span>
                ${availableVirtudes.map(v => {
                    const isActive = typeof activeVirtudes !== 'undefined' && activeVirtudes.includes(v);
                    return `<div class="virtue-pill ${isActive ? 'active' : ''}" data-virtue="${v}">${v.toUpperCase()}</div>`;
                }).join('')}
                <span style="font-size: 0.8rem; color: #94a3b8; margin-left: auto;">${filteredData.length} parcelas encontradas</span>
            </div>
            
            ${filteredData.length > 0 ? (
                viewMode === 'grid' ? `
                <div class="grid-catastro">
                    ${filteredData.map(d => {
                        let clp = d.precio_clp ? new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(d.precio_clp) : 'N/A';
                        let uf = d.precio_uf ? d.precio_uf.toFixed(2) + ' UF' : '';
                        
                        return `
                        <div class="card-catastro">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
                                <h3>${escapeHtml(d.titulo || 'Sin título')}</h3>
                                <button class="btn-delete" data-id="${escapeHtml(d.id)}" title="Eliminar propiedad">🗑️</button>
                            </div>
                            <div style="margin-bottom: var(--sp-2);">
                                <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; background: var(--c-primary-light, #e0f2fe); color: var(--c-primary, #0284c7);">
                                    ${escapeHtml(d.tipo_propiedad || 'Parcela')}
                                </span>
                            </div>
                            <p><strong>Precio:</strong> ${clp} ${uf ? '('+uf+')' : ''}</p>
                            <p><strong>Superficie:</strong> ${escapeHtml(d.superficie_m2 || 'N/A')} m²</p>
                            <p><strong>Comuna:</strong> ${escapeHtml(d.comuna || 'N/A')}</p>
                            ${d.atributos ? `<p><strong>Atributos:</strong> ${escapeHtml(d.atributos)}</p>` : ''}
                            <div style="margin-top: auto; padding-top: var(--sp-4); display:flex; justify-content:space-between; align-items:center;">
                                <a href="${escapeHtml(safeUrl(d.url))}" target="_blank" rel="noopener noreferrer" style="color: var(--c-primary); font-size: var(--fs-sm); text-decoration: none; font-weight: bold;">Abrir Publicación ↗</a>
                            </div>
                        </div>
                    `}).join('')}
                </div>
                ` : `
                <div style="overflow-x: auto;">
                    <table class="list-catastro">
                        <thead>
                            <tr>
                                
                                <th>Título</th>
                                <th>Tipo</th>
                                <th>Comuna</th>
                                ${currentTab === 'casas' || currentTab === 'urbano' ? '<th>M² Casa</th><th>Hab/Baños</th>' : ''}
                                ${currentTab !== 'urbano' ? '<th>M² Terreno</th>' : ''}
                                <th>Precio CLP</th>
                                ${currentTab === 'parcelas' || currentTab === 'todas' ? '<th>Atributos</th>' : '<th>Detalles</th>'}
                                <th>Acciones</th>

                            </tr>
                        </thead>
                        <tbody>
                            ${filteredData.map(d => {
                                let clp = d.precio_clp ? new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(d.precio_clp) : '-';
                                return `
                                <tr>
                                    <td style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(d.titulo)}"><strong>${escapeHtml(d.titulo || 'Sin título')}</strong></td>
                                    <td>${escapeHtml(d.tipo_propiedad || 'Parcela')}</td>
                                    <td>${escapeHtml(d.comuna || '-')}</td>
                                    <td>${escapeHtml(d.superficie_m2 || '-')}</td>
                                    <td>${clp}</td>
                                    <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(d.atributos)}">${escapeHtml(d.atributos || '-')}</td>
                                    <td>
                                        <a href="${escapeHtml(safeUrl(d.url))}" target="_blank" rel="noopener noreferrer" style="margin-right:0.5rem; text-decoration:none; color:var(--c-primary);" title="Abrir Anuncio">↗️</a>
                                        <button class="btn-delete" data-id="${escapeHtml(d.id)}" title="Eliminar propiedad">🗑️</button>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                `
            ) : `
                <div class="loading-state">No hay datos en el catastro para los filtros seleccionados.</div>
            `}
        </div>
    `;
}

export async function init() {
    const mainView = document.getElementById('content');
    
    if (isLoading) {
        const client = getClient();
        const { data, error } = await client.from('tpl_catastro_mercado').select('*').order('created_at', { ascending: false }).limit(200);
        if (!error && data) {
            catastroData = data;
        } else {
            console.warn('No se pudo cargar tpl_catastro_mercado, o tabla no existe.', error);
            catastroData = [];
        }
        isLoading = false;
        
        if (mainView) {
            mainView.innerHTML = render();
            init();
        }
        return;
    }

    const filterComuna = document.getElementById('filter-comuna');
    const filterPortal = document.getElementById('filter-portal');
    const filterTipo = document.getElementById('filter-tipo');

    if (filterComuna) {
        filterComuna.addEventListener('change', (e) => {
            comunaFilter = e.target.value;
            mainView.innerHTML = render();
            init();
        });
    }

    if (filterPortal) {
        filterPortal.addEventListener('change', (e) => {
            portalFilter = e.target.value;
            mainView.innerHTML = render();
            init();
        });
    }

    if (filterTipo) {
        filterTipo.addEventListener('change', (e) => {
            tipoFilter = e.target.value;
            mainView.innerHTML = render();
            init();
        });
    }

    
    const filterText = document.getElementById('filter-text');
    if (filterText) {
        filterText.addEventListener('change', (e) => {
            textFilter = e.target.value;
            mainView.innerHTML = render();
            init();
            document.getElementById('filter-text').focus();
        });
        filterText.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                textFilter = e.target.value;
                mainView.innerHTML = render();
                init();
                document.getElementById('filter-text').focus();
            }
        });
    }

    
    const virtuePills = document.querySelectorAll('.virtue-pill');
    virtuePills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            const v = e.target.getAttribute('data-virtue');
            if (activeVirtudes.includes(v)) {
                activeVirtudes = activeVirtudes.filter(x => x !== v);
            } else {
                activeVirtudes.push(v);
            }
            mainView.innerHTML = render();
            init();
        });
    });

    const btnGrid = document.getElementById('btn-view-grid');
    if (btnGrid) btnGrid.addEventListener('click', () => { viewMode = 'grid'; mainView.innerHTML = render(); init(); });

    const btnList = document.getElementById('btn-view-list');
    if (btnList) btnList.addEventListener('click', () => { viewMode = 'list'; mainView.innerHTML = render(); init(); });

    const delBtns = document.querySelectorAll('.btn-delete');
    delBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if(confirm('¿Estás seguro de que quieres eliminar esta propiedad del Catastro? Esta acción no se puede deshacer.')) {
                try {
                    const client = getClient();
                    const { error } = await client.from('tpl_catastro_mercado').delete().eq('id', id);
                    if(error) throw error;
                    if (typeof showToast === 'function') showToast('Propiedad eliminada', 'success');
                    isLoading = true;
                    init();
                } catch(err) {
                    alert("Error al eliminar: " + err.message);
                }
            }
        });
    });

    const btnManualAdd = document.getElementById('btn-manual-add');
    if (btnManualAdd) {
        btnManualAdd.addEventListener('click', () => {
            const body = `
                <div class="form-group">
                    <label>Título / Descripción</label>
                    <input type="text" id="cat-man-titulo" placeholder="Ej. Parcela con vista al volcán">
                </div>
                <div style="display: flex; gap: 1rem;">
                    <div class="form-group" style="flex: 1;">
                        <label>Precio en CLP</label>
                        <input type="number" id="cat-man-clp" placeholder="Ej. 35000000">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Precio en UF</label>
                        <input type="number" id="cat-man-uf" step="0.1" placeholder="Ej. 950">
                    </div>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <div class="form-group" style="flex: 1;">
                        <label>Superficie (m²)</label>
                        <input type="number" id="cat-man-superficie" placeholder="Ej. 5000">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Comuna</label>
                        <input type="text" id="cat-man-comuna" list="cat-man-comuna-list" placeholder="Ej. Villarrica">
                        <datalist id="cat-man-comuna-list"><option value="Cauquenes"></option><option value="Chanco"></option><option value="Pelluhue"></option><option value="Curicó"></option><option value="Hualañé"></option><option value="Licantén"></option><option value="Molina"></option><option value="Rauco"></option><option value="Romeral"></option><option value="Sagrada Familia"></option><option value="Teno"></option><option value="Vichuquén"></option><option value="Colbún"></option><option value="Linares"></option><option value="Longaví"></option><option value="Parral"></option><option value="Retiro"></option><option value="San Javier"></option><option value="Villa Alegre"></option><option value="Yerbas Buenas"></option><option value="Constitución"></option><option value="Curepto"></option><option value="Empedrado"></option><option value="Maule"></option><option value="Pelarco"></option><option value="Pencahue"></option><option value="Río Claro"></option><option value="San Clemente"></option><option value="San Rafael"></option><option value="Talca"></option><option value="Bulnes"></option><option value="Chillán"></option><option value="Chillán Viejo"></option><option value="El Carmen"></option><option value="Pemuco"></option><option value="Pinto"></option><option value="Quillón"></option><option value="San Ignacio"></option><option value="Yungay"></option><option value="Cobquecura"></option><option value="Coelemu"></option><option value="Ninhue"></option><option value="Portezuelo"></option><option value="Quirihue"></option><option value="Ránquil"></option><option value="Treguaco"></option><option value="Coihueco"></option><option value="Ñiquén"></option><option value="San Carlos"></option><option value="San Fabián"></option><option value="San Nicolás"></option><option value="Concepción"></option><option value="Coronel"></option><option value="Chiguayante"></option><option value="Florida"></option><option value="Hualqui"></option><option value="Lota"></option><option value="Penco"></option><option value="San Pedro de la Paz"></option><option value="Santa Juana"></option><option value="Talcahuano"></option><option value="Tomé"></option><option value="Hualpén"></option><option value="Lebu"></option><option value="Arauco"></option><option value="Cañete"></option><option value="Contulmo"></option><option value="Curanilahue"></option><option value="Los Álamos"></option><option value="Tirúa"></option><option value="Los Ángeles"></option><option value="Antuco"></option><option value="Cabrero"></option><option value="Laja"></option><option value="Mulchén"></option><option value="Nacimiento"></option><option value="Negrete"></option><option value="Quilaco"></option><option value="Quilleco"></option><option value="San Rosendo"></option><option value="Santa Bárbara"></option><option value="Tucapel"></option><option value="Yumbel"></option><option value="Alto Biobío"></option><option value="Temuco"></option><option value="Carahue"></option><option value="Cunco"></option><option value="Curarrehue"></option><option value="Freire"></option><option value="Galvarino"></option><option value="Gorbea"></option><option value="Lautaro"></option><option value="Loncoche"></option><option value="Melipeuco"></option><option value="Nueva Imperial"></option><option value="Padre Las Casas"></option><option value="Perquenco"></option><option value="Pitrufquén"></option><option value="Pucón"></option><option value="Saavedra"></option><option value="Teodoro Schmidt"></option><option value="Toltén"></option><option value="Vilcún"></option><option value="Villarrica"></option><option value="Cholchol"></option><option value="Angol"></option><option value="Collipulli"></option><option value="Curacautín"></option><option value="Ercilla"></option><option value="Lonquimay"></option><option value="Los Sauces"></option><option value="Lumaco"></option><option value="Purén"></option><option value="Renaico"></option><option value="Traiguén"></option><option value="Victoria"></option><option value="Valdivia"></option><option value="Corral"></option><option value="Lanco"></option><option value="Los Lagos"></option><option value="Máfil"></option><option value="Mariquina"></option><option value="Paillaco"></option><option value="Panguipulli"></option><option value="La Unión"></option><option value="Futrono"></option><option value="Lago Ranco"></option><option value="Río Bueno"></option><option value="Puerto Montt"></option><option value="Calbuco"></option><option value="Cochamó"></option><option value="Fresia"></option><option value="Frutillar"></option><option value="Los Muermos"></option><option value="Llanquihue"></option><option value="Maullín"></option><option value="Puerto Varas"></option><option value="Castro"></option><option value="Ancud"></option><option value="Chonchi"></option><option value="Curaco de Vélez"></option><option value="Dalcahue"></option><option value="Puqueldón"></option><option value="Queilén"></option><option value="Quellón"></option><option value="Quemchi"></option><option value="Quinchao"></option><option value="Osorno"></option><option value="Puerto Octay"></option><option value="Purranque"></option><option value="Puyehue"></option><option value="Río Negro"></option><option value="San Juan de la Costa"></option><option value="San Pablo"></option><option value="Chaitén"></option><option value="Futaleufú"></option><option value="Hualaihué"></option><option value="Palena"></option></datalist>
                    </div>
                </div>
                <div class="form-group">
                    <label>Tipo de Propiedad</label>
                    <select id="cat-man-tipo">
                        <option value="Parcela">Parcela</option>
                        <option value="Parcela con casa">Parcela con casa</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>URL de origen (Opcional)</label>
                    <input type="url" id="cat-man-url" placeholder="https://facebook.com/marketplace/...">
                </div>
            `;

            showModal({
                title: '➕ Ingreso Manual de Propiedad',
                body: body,
                size: 'md',
                actions: [
                    {
                        label: 'Cancelar',
                        variant: 'ghost',
                        onClick: () => closeModal()
                    },
                    {
                        label: 'Guardar en Catastro',
                        variant: 'primary',
                        onClick: async () => {
                            try {
                                const titulo = document.getElementById('cat-man-titulo').value.trim();
                                let comuna = document.getElementById('cat-man-comuna').value.trim();
                                const url = document.getElementById('cat-man-url').value.trim() || 'Ingreso Manual';
                                
                                
                                const comunasValidas = ["Cauquenes","Chanco","Pelluhue","Curicó","Hualañé","Licantén","Molina","Rauco","Romeral","Sagrada Familia","Teno","Vichuquén","Colbún","Linares","Longaví","Parral","Retiro","San Javier","Villa Alegre","Yerbas Buenas","Constitución","Curepto","Empedrado","Maule","Pelarco","Pencahue","Río Claro","San Clemente","San Rafael","Talca","Bulnes","Chillán","Chillán Viejo","El Carmen","Pemuco","Pinto","Quillón","San Ignacio","Yungay","Cobquecura","Coelemu","Ninhue","Portezuelo","Quirihue","Ránquil","Treguaco","Coihueco","Ñiquén","San Carlos","San Fabián","San Nicolás","Concepción","Coronel","Chiguayante","Florida","Hualqui","Lota","Penco","San Pedro de la Paz","Santa Juana","Talcahuano","Tomé","Hualpén","Lebu","Arauco","Cañete","Contulmo","Curanilahue","Los Álamos","Tirúa","Los Ángeles","Antuco","Cabrero","Laja","Mulchén","Nacimiento","Negrete","Quilaco","Quilleco","San Rosendo","Santa Bárbara","Tucapel","Yumbel","Alto Biobío","Temuco","Carahue","Cunco","Curarrehue","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Melipeuco","Nueva Imperial","Padre Las Casas","Perquenco","Pitrufquén","Pucón","Saavedra","Teodoro Schmidt","Toltén","Vilcún","Villarrica","Cholchol","Angol","Collipulli","Curacautín","Ercilla","Lonquimay","Los Sauces","Lumaco","Purén","Renaico","Traiguén","Victoria","Valdivia","Corral","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","La Unión","Futrono","Lago Ranco","Río Bueno","Puerto Montt","Calbuco","Cochamó","Fresia","Frutillar","Los Muermos","Llanquihue","Maullín","Puerto Varas","Castro","Ancud","Chonchi","Curaco de Vélez","Dalcahue","Puqueldón","Queilén","Quellón","Quemchi","Quinchao","Osorno","Puerto Octay","Purranque","Puyehue","Río Negro","San Juan de la Costa","San Pablo","Chaitén","Futaleufú","Hualaihué","Palena"];
                                if (!titulo || !comuna) {
                                    if (typeof showToast === 'function') showToast('El título y la comuna son obligatorios', 'error');
                                    else alert('El título y la comuna son obligatorios');
                                    return;
                                }
                                let exactMatch = comunasValidas.find(c => c.toLowerCase() === comuna.toLowerCase());
                                if (!exactMatch) {
                                    let subMatch = comunasValidas.find(c => comuna.toLowerCase().includes(c.toLowerCase()));
                                    if (subMatch) {
                                        comuna = subMatch;
                                    } else {
                                        if (typeof showToast === 'function') showToast('No reconocemos la comuna. Asegúrate de ingresar solo el nombre correcto.', 'error');
                                        else alert('No reconocemos la comuna.');
                                        return;
                                    }
                                } else {
                                    comuna = exactMatch;
                                }


                                let clp = parseFloat(document.getElementById('cat-man-clp').value) || null;
                                let uf = parseFloat(document.getElementById('cat-man-uf').value) || null;
                                const sup = parseFloat(document.getElementById('cat-man-superficie').value) || null;
                                const tipo = document.getElementById('cat-man-tipo').value;

                                // Auto calcular UF o CLP si falta uno (asumiendo UF ~38.000 para ingreso rápido si no está)
                                if (clp && !uf) uf = parseFloat((clp / 38000).toFixed(2));
                                if (uf && !clp) clp = Math.round(uf * 38000);

                                const payload = {
                                    titulo,
                                    precio_clp: clp,
                                    precio_uf: uf,
                                    superficie_m2: sup,
                                    comuna,
                                    tipo_propiedad: tipo,
                                    url,
                                    fuente: url.includes('facebook') ? 'facebook' : 'manual'
                                };

                                const client = getClient();
                                const { error } = await client.from('tpl_catastro_mercado').insert([payload]);

                                if (error) throw error;

                                closeModal();
                                if (typeof showToast === 'function') showToast('Propiedad añadida al catastro', 'success');
                                
                                // Refrescar la vista
                                isLoading = true;
                                init();
                            } catch (e) {
                                console.error(e);
                                if (typeof showToast === 'function') showToast('Error al guardar: ' + e.message, 'error');
                            }
                        }
                    }
                ]
            });
        });
    }

    // --- REVISIÓN DE CATASTRO (FASE 3: PRUEBA DE TRANSPORTE) ---
    console.log("[TPL-CATASTRO] CRM Catastro inicializado");

    if (!window._tplCatastroListenerAttached) {
        window._tplCatastroListenerAttached = true;
        
        window.addEventListener('message', function(e) {
            const allowedOrigins = [
                'https://www.parcelalista.cl',
                'https://parcelalista.cl',
                'http://localhost:5500',
                'http://127.0.0.1:5500',
                'https://www.portalinmobiliario.com',
                'https://portalinmobiliario.com',
                'https://www.yapo.cl',
                'https://yapo.cl',
                'https://www.portalterreno.cl',
                'https://portalterreno.cl'
            ];
            
            // 1. Validar Origen Permitido
            const isAllowed = allowedOrigins.includes(e.origin) || 
                              e.origin.endsWith('.yapo.cl') || 
                              e.origin.endsWith('.portalinmobiliario.com') ||
                              e.origin.endsWith('.portalterreno.cl') ||
                              e.origin.endsWith('.mercadolibre.cl');
            if (!isAllowed) {
                console.warn("[TPL-CATASTRO] Origen no permitido:", e.origin);
                return;
            }

            // 2. Validar que provenga exclusivamente del opener (quien abrió esta ventana),
            // o de la propia página (puente interno de la extensión Chrome, ver más abajo:
            // el listener de 'tpl-extension-catastro-data' reenvía aquí con self-post,
            // siempre con e.origin ya validado contra la lista de arriba).
            if (e.source !== window.opener && e.source !== window) {
                console.warn("[TPL-CATASTRO] Mensaje rechazado porque event.source no coincide con window.opener");
                return;
            }

            // 3. Validar el protocolo esperado
            if (e.data && e.data.type === 'TPL_CATASTRO_DATA') {
                console.log("[TPL-CATASTRO] DATA recibida");
                console.log("[TPL-CATASTRO] Validación OK");
                
                // Acknowledge receipt back to the verified origin
                e.source.postMessage({ type: 'TPL_CATASTRO_RECEIVED' }, e.origin);
                console.log("[TPL-CATASTRO] RECEIVED enviado");
                
                const payload = e.data.payload;
                
                if (payload.prueba) {
                    // Mantenemos soporte para modo prueba por si acaso
                    const body = `
                        <div style="background: #eef2ff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #c7d2fe;">
                            <strong style="color: #4f46e5; font-size: 1.1rem;">📥 FASE 3: PRUEBA DE TRANSPORTE RECIBIDA</strong>
                            <p style="font-size: 0.85rem; margin-top:0.5rem; color: #4b5563;">Handshake completado. Payload de prueba.</p>
                        </div>
                    `;
                    showModal({ title: 'Modo Prueba', body: body, size: 'sm', actions: [{label: 'Cerrar', onClick: closeModal}] });
                    return;
                }

                // Generar indicadores de confianza
                const getStyle = (val) => val ? 'border-color: #10b981; background: #f0fdf4;' : 'border-color: #ef4444; background: #fef2f2;';
                const getWarning = (val) => val ? '' : '<span style="color: #ef4444; font-size: 0.75rem; margin-left: 0.5rem;">⚠️ No detectado, revisar manualmente</span>';

                const body = `
                    <div style="background: #f0fdf4; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #bbf7d0;">
                        <strong style="color: #166534; font-size: 1.1rem;">📥 NUEVA CAPTURA RECIBIDA</strong>
                        <p style="font-size: 0.85rem; margin-top:0.5rem; color: #166534;">Por favor revisa y corrige los campos extraídos antes de guardar en la base de datos.</p>
                    </div>
                    
                    <div class="form-group">
                        <label>Título ${getWarning(payload.titulo)}</label>
                        <input type="text" id="cat-rev-titulo" value="${escapeHtml(payload.titulo)}" style="${getStyle(payload.titulo)}">
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Precio CLP ${getWarning(payload.precio_clp)}</label>
                            <input type="number" id="cat-rev-clp" value="${escapeHtml(payload.precio_clp || '')}" style="${getStyle(payload.precio_clp)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Precio UF ${getWarning(payload.precio_uf)}</label>
                            <input type="number" id="cat-rev-uf" value="${escapeHtml(payload.precio_uf || '')}" step="0.1" style="${getStyle(payload.precio_uf)}">
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Superficie (m²) ${getWarning(payload.superficie_m2)}</label>
                            <input type="number" id="cat-rev-sup" value="${escapeHtml(payload.superficie_m2 || '')}" style="${getStyle(payload.superficie_m2)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Comuna ${getWarning(payload.comuna)}</label>
                            <input type="text" id="cat-rev-comuna" value="${escapeHtml(payload.comuna)}" style="${getStyle(payload.comuna)}">
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Sector / Localidad ${getWarning(payload.localidad)}</label>
                            <input type="text" id="cat-rev-loc" value="${escapeHtml(payload.localidad || '')}" placeholder="Ej. Lican Ray" style="${getStyle(payload.localidad)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Tipo de Propiedad</label>
                            <select id="cat-rev-tipo">
                                <option value="Parcela" ${payload.tipo_propiedad === 'Parcela' ? 'selected' : ''}>Parcela</option>
                                <option value="Parcela con casa" ${payload.tipo_propiedad === 'Parcela con casa' ? 'selected' : ''}>Parcela con casa</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 1rem; background-color: #f8fafc;" id="cat-rev-casas-group">
                        <div class="form-group" style="flex: 1;">
                            <label>Superficie Const. (m2)</label>
                            <input type="number" id="cat-rev-sup-const" value="${escapeHtml(payload.superficie_construida || '')}" style="${getStyle(payload.superficie_construida)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Dormitorios</label>
                            <input type="number" id="cat-rev-dormitorios" value="${escapeHtml(payload.dormitorios || '')}" style="${getStyle(payload.dormitorios)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Baños</label>
                            <input type="number" id="cat-rev-banos" value="${escapeHtml(payload.banos || '')}" style="${getStyle(payload.banos)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Materialidad</label>
                            <input type="text" id="cat-rev-material" value="${escapeHtml(payload.material || '')}" placeholder="Sólida...">
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Latitud ${getWarning(payload.lat)}</label>
                            <input type="number" id="cat-rev-lat" value="${escapeHtml(payload.lat || '')}" step="any" placeholder="-39.2..." style="${getStyle(payload.lat)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Longitud ${getWarning(payload.lng)}</label>
                            <input type="number" id="cat-rev-lng" value="${escapeHtml(payload.lng || '')}" step="any" placeholder="-72.1..." style="${getStyle(payload.lng)}">
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Contacto (Nombre)</label>
                            <input type="text" id="cat-rev-contacto-nombre" value="${escapeHtml(payload.contacto_nombre || '')}" placeholder="Nombre del vendedor">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Teléfono</label>
                            <input type="text" id="cat-rev-contacto-tel" value="${escapeHtml(payload.contacto_telefono || '')}" placeholder="+569...">
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Email</label>
                            <input type="email" id="cat-rev-contacto-email" value="${escapeHtml(payload.contacto_email || '')}" placeholder="correo@ejemplo.com">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Antigüedad del Anuncio</label>
                            <input type="text" id="cat-rev-antiguedad" value="${escapeHtml(payload.antiguedad || '')}" placeholder="Ej. hace 3 meses">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Atributos Detectados ${getWarning(payload.atributos)}</label>
                        <input type="text" id="cat-rev-atributos" value="${escapeHtml(payload.atributos || '')}" placeholder="Ej. orilla lago, nativo, termas" style="${getStyle(payload.atributos)}">
                    </div>

                    <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: #6b7280; margin-bottom: 1rem;">
                        <div><strong>Fuente:</strong> ${escapeHtml(payload.fuente)}</div>
                        <div><strong>ID Captura:</strong> ${escapeHtml(payload.capture_id)}</div>
                    </div>

                    <div class="form-group">
                        <label>Texto Original Completo (Solo lectura)</label>
                        <textarea disabled style="width: 100%; height: 100px; font-size: 0.8rem; background: #f9fafb; border: 1px solid #e5e7eb;">${escapeHtml(payload.texto_original)}</textarea>
                    </div>
                `;

                showModal({
                    title: 'Revisión y Aprobación de Captura',
                    body: body,
                    size: 'lg',
                    actions: [
                        {
                            label: 'Descartar',
                            variant: 'ghost',
                            onClick: () => {
                                closeModal();
                            }
                        },
                        {
                            label: 'Aprobar y Guardar',
                            variant: 'primary',
                            onClick: async (e) => {
                                const btn = e.target || document.getElementById('modalBtn1');
                                if (btn && btn.disabled) return;
                                
                                try {
                                    if(btn) {
                                        btn.disabled = true;
                                        btn.innerHTML = 'Guardando...';
                                    }
                                    
                                    const tituloVal = document.getElementById('cat-rev-titulo').value.trim();
                                    const comunaVal = document.getElementById('cat-rev-comuna').value.trim();
                                    
                                    if (!tituloVal || !comunaVal) {
                                        alert('El título y la comuna son obligatorios.');
                                        if(btn) { btn.disabled = false; btn.innerHTML = 'Aprobar y Guardar'; }
                                        return;
                                    }

                                    const client = getClient();
                                    
                                    // 1. Verificación de duplicados
                                    const { data: dups, error: dupErr } = await client
                                        .from('tpl_catastro_mercado')
                                        .select('id')
                                        .eq('url', payload.url);
                                        
                                    if (dupErr) throw new Error("Error verificando duplicados: " + dupErr.message);
                                    if (dups && dups.length > 0) {
                                        alert("❌ El anuncio ya existe en el catastro (URL duplicada).");
                                        if(btn) { btn.disabled = false; btn.innerHTML = 'Aprobar y Guardar'; }
                                        return;
                                    }

                                    // 2. Obtener usuario actual
                                    const { data: { user } } = await client.auth.getUser();
                                    const userId = user ? user.id : null;

                                    // 3. Preparar Inserción
                                    let clpVal = parseFloat(document.getElementById('cat-rev-clp').value) || null;
                                    let ufVal = parseFloat(document.getElementById('cat-rev-uf').value) || null;
                                    const supVal = parseFloat(document.getElementById('cat-rev-sup').value) || null;
                                    const locVal = document.getElementById('cat-rev-loc').value.trim();
                                    const tipoVal = document.getElementById('cat-rev-tipo').value;
                                    const atributosVal = document.getElementById('cat-rev-atributos').value.trim();
                                    const latVal = parseFloat(document.getElementById('cat-rev-lat').value) || null;
                                    const lngVal = parseFloat(document.getElementById('cat-rev-lng').value) || null;
                                    
                                    const nomVal = document.getElementById('cat-rev-contacto-nombre').value.trim();
                                    const telVal = document.getElementById('cat-rev-contacto-tel').value.trim();
                                    const emailVal = document.getElementById('cat-rev-contacto-email').value.trim();
                                    const antiVal = document.getElementById('cat-rev-antiguedad').value.trim();
                                    const supConstVal = parseFloat(document.getElementById('cat-rev-sup-const').value) || null;
                                    const dormVal = parseInt(document.getElementById('cat-rev-dormitorios').value) || null;
                                    const banosVal = parseInt(document.getElementById('cat-rev-banos').value) || null;
                                    const matVal = document.getElementById('cat-rev-material').value.trim();

                                    if (clpVal && !ufVal) ufVal = parseFloat((clpVal / 38000).toFixed(2));
                                    if (ufVal && !clpVal) clpVal = Math.round(ufVal * 38000);

                                    const finalPayload = {
                                        titulo: tituloVal,
                                        precio_clp: clpVal,
                                        precio_uf: ufVal,
                                        superficie_m2: supVal,
                                        comuna: comunaVal,
                                        localidad: locVal,
                                        lat: latVal,
                                        lng: lngVal,
                                        contacto_nombre: nomVal,
                                        contacto_telefono: telVal,
                                        contacto_email: emailVal,
                                        antiguedad: antiVal,
                                        tipo_propiedad: tipoVal,
                                        url: payload.url,
                                        fuente: payload.fuente,
                                        capture_id: payload.capture_id,
                                        captured_at: payload.captured_at,
                                        captured_by: userId,
                                        atributos: atributosVal,
                                        texto_original: payload.texto_original,
                                        metadata: {
                                            superficie_construida: typeof supConstVal !== 'undefined' ? supConstVal : null,
                                            dormitorios: typeof dormVal !== 'undefined' ? dormVal : null,
                                            banos: typeof banosVal !== 'undefined' ? banosVal : null,
                                            material: typeof matVal !== 'undefined' ? matVal : '',
                                            estado: payload.estado || ''
                                        }
                                    };

                                    const { error: insErr } = await client.from('tpl_catastro_mercado').insert([finalPayload]);
                                    if (insErr) {
                                        throw insErr;
                                    }

                                    if (typeof showToast === 'function') showToast('Propiedad añadida al catastro exitosamente', 'success');
                                    closeModal();
                                    
                                    // Recargar
                                    isLoading = true;
                                    init();
                                } catch (error) {
                                    console.error(error);
                                    alert('❌ Error al guardar: ' + error.message);
                                    btn.disabled = false;
                                    btn.innerHTML = 'Aprobar y Guardar';
                                }
                            }
                        }
                    ]
                });
                console.log('[TPL-CATASTRO] Modal de revisión real mostrado');
            }
        });

        // Puente para la extensión Chrome "TPL Catastro de Mercado": su content
        // script (crm-bridge.js, solo corre en esta página vía manifest) despacha
        // este CustomEvent con los datos capturados. Lo reenviamos como si fuera
        // un mensaje del opener para reutilizar exactamente la misma revisión y
        // validación de arriba, en vez de duplicar esa lógica.
        window.addEventListener('tpl-extension-catastro-data', function(ev) {
            console.log('[TPL-CATASTRO] Datos recibidos desde la extensión Chrome');
            window.postMessage({ type: 'TPL_CATASTRO_DATA', payload: ev.detail }, window.location.origin);
        });
    }

    // 4. Enviar TPL_CATASTRO_READY al opener para iniciar transferencia
    if (window.opener) {
        try {
            window.opener.postMessage({ type: 'TPL_CATASTRO_READY' }, '*');
            console.log('[TPL-CATASTRO] READY enviado con origin *');
        } catch(e) {
            console.error('[TPL-CATASTRO] Error enviando READY:', e);
        }
    }
}


// Aqui vivia window.setCatastroTab(tab): nadie la llamaba desde ningun archivo
// del proyecto, y ademas repintaba la vista SIN volver a llamar a init(), asi
// que si alguien la usaba dejaba sin handler el boton de eliminar, el de
// ingreso manual y todos los filtros. Se elimina en vez de dejarla como trampa.
// `currentTab` se mantiene en "todas", que es el unico valor que llegaba a tener.
