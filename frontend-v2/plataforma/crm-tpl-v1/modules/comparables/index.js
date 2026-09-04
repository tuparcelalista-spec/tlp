import { parseSearchQuery } from '../../core/search-parser.js';
import { calculateSimilarity } from '../../core/similarity-engine.js';
import { getClient } from '../../core/supabase.js';

/**
 * Valor de la UF en pesos.
 *
 * Acá había un `38000` escrito a mano para convertir los precios en UF del
 * catastro a pesos. La UF sube todos los días, así que ese número queda viejo
 * solo con que pase el tiempo, y de él dependen el promedio de mercado y el
 * $/m² que muestra esta pantalla: una UF desactualizada subvalora TODOS los
 * comparables en pesos y hace que nuestras parcelas parezcan más caras de lo
 * que están frente al mercado.
 *
 * El proyecto ya tiene la UF real en la base (RPC tpl_obtener_uf_v1, el mismo
 * que usa el motor de tasación al cargar sus referencias comunales). Se pide
 * una vez por sesión y se cachea; si falla, se cae al valor anterior para no
 * dejar la pantalla en blanco, pero queda un aviso en consola.
 */
const UF_RESPALDO = 38000;
let ufPromesa = null;

function obtenerUf() {
    if (ufPromesa) return ufPromesa;
    ufPromesa = (async () => {
        try {
            const { data, error } = await getClient().rpc('tpl_obtener_uf_v1');
            if (error) throw error;
            const valor = Number(data?.valor_clp || 0);
            if (!valor) throw new Error('La RPC no devolvió valor_clp');
            return valor;
        } catch (err) {
            console.warn(`[Comparables] No se pudo obtener la UF real; se usa el respaldo de ${UF_RESPALDO}. Los montos en pesos pueden estar desactualizados.`, err);
            return UF_RESPALDO;
        }
    })();
    return ufPromesa;
}

export function render() {
    return `
        <div class="comparables-module">
            <div class="search-section">
                <input type="text" id="comparables-search-bar" class="huge-search" placeholder="Escribe tu búsqueda: ej. Caburgua 5000m2 con bosque">
                
                <div class="advanced-filters">
                    <label class="filter-chip"><input type="checkbox" id="filter-agua"> Agua</label>
                    <label class="filter-chip"><input type="checkbox" id="filter-luz"> Luz</label>
                    <label class="filter-chip"><input type="checkbox" id="filter-bosque"> Bosque</label>
                    <label class="filter-chip"><input type="checkbox" id="filter-plana"> Plana</label>
                    <label class="filter-chip"><input type="checkbox" id="filter-rio"> Río</label>
                    <label class="filter-chip"><input type="checkbox" id="filter-lago"> Lago</label>
                    <label class="filter-chip"><input type="checkbox" id="filter-asfalto"> Asfalto</label>
                </div>
            </div>

            <!-- Market Intelligence Stats injected dynamically -->
            <div id="market-stats-container" class="market-stats-bar" style="display:none;"></div>
            
            <div class="results-grid" id="comparables-results">
                <!-- Results will be dynamically rendered here -->
            </div>
        </div>
        <style>
            .market-stats-bar {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-bottom: 2rem;
            }
            .stat-box {
                background: white;
                border: 1px solid #e2e8f0;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .stat-box .label { font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .stat-box .value { font-size: 1.5rem; color: var(--c-primary); font-weight: 800; margin-top: 0.25rem; }
            .stat-box.highlight .value { color: var(--c-brand-orange); }
            .comparables-module { 
                padding: 2rem; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #fafafa;
                min-height: 100vh;
            }
            .search-section {
                max-width: 800px;
                margin: 0 auto 3rem auto;
                text-align: center;
            }
            .huge-search { 
                width: 100%; 
                padding: 1.2rem 1.5rem; 
                font-size: 1.25rem; 
                border-radius: 12px; 
                border: 1px solid #ddd; 
                margin-bottom: 1.5rem; 
                box-sizing: border-box;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                transition: all 0.2s ease;
                outline: none;
            }
            .huge-search:focus {
                border-color: #0066ff;
                box-shadow: 0 4px 16px rgba(0, 102, 255, 0.15);
            }
            .advanced-filters { 
                display: flex; 
                gap: 0.75rem; 
                flex-wrap: wrap; 
                justify-content: center;
            }
            .filter-chip { 
                display: flex; 
                align-items: center; 
                gap: 0.5rem; 
                background: #fff; 
                padding: 0.5rem 1rem; 
                border-radius: 20px; 
                cursor: pointer; 
                border: 1px solid #eee;
                transition: all 0.2s ease;
                font-size: 0.9rem;
                color: #555;
                user-select: none;
            }
            .filter-chip:hover { 
                background: #f5f5f5; 
            }
            .filter-chip input[type="checkbox"]:checked + label,
            .filter-chip:has(input[type="checkbox"]:checked) {
                background: #e8f0fe;
                border-color: #0066ff;
                color: #0066ff;
                font-weight: 500;
            }
            .results-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
                gap: 2rem; 
                max-width: 1200px;
                margin: 0 auto;
            }
            .comparable-card { 
                border-radius: 16px; 
                padding: 1.5rem; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.06); 
                position: relative; 
                background: #fff;
                transition: transform 0.2s ease;
                border: 1px solid #eaeaea;
            }
            .comparable-card:hover {
                transform: translateY(-5px);
            }
            .similarity-badge { 
                position: absolute; 
                top: -15px; 
                right: -15px; 
                background: #10b981; 
                color: white; 
                width: 48px; 
                height: 48px; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: 700; 
                font-size: 1rem; 
                box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
            }
            .similarity-badge.low { background: #ef4444; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); }
            .similarity-badge.med { background: #f59e0b; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3); }
            .card-title {
                margin: 0 0 1rem 0;
                font-size: 1.2rem;
                color: #222;
            }
            .card-detail {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                color: #555;
                font-size: 0.95rem;
            }
            .card-detail strong { color: #333; }
            .card-attributes {
                margin-top: 1.25rem;
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
            }
            .attr-tag {
                background: #f0f4f8;
                padding: 0.25rem 0.6rem;
                border-radius: 6px;
                font-size: 0.8rem;
                color: #4a5568;
                border: 1px solid #e2e8f0;
            }
        </style>
    `;
}

export function init() {
    const searchInput = document.getElementById('comparables-search-bar');
    const filters = {
        'filter-agua': 'tiene_agua',
        'filter-luz': 'tiene_luz',
        'filter-bosque': 'tiene_bosque',
        'filter-plana': 'es_plana',
        'filter-rio': 'tiene_rio',
        'filter-lago': 'tiene_lago',
        'filter-asfalto': 'tiene_asfalto'
    };
    
    // Attempt to load target property ID from URL state
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('target_id');
    
    let targetProperty = null;
    
    // In production, we'd fetch this from Supabase. Mocked for MVP demonstration.
    if (targetId) {
        targetProperty = {
            id: targetId,
            comuna: 'Caburgua',
            superficie: 5000,
            precio: 100000000,
            tiene_agua: true,
            tiene_luz: true,
            tiene_bosque: true,
            es_plana: true,
            tiene_rio: false,
            tiene_lago: false,
            tiene_asfalto: false
        };
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        const parsed = parseSearchQuery(query);
        
        // Update checkboxes automatically from NLP
        for (const [id, key] of Object.entries(filters)) {
            const checkbox = document.getElementById(id);
            if (parsed[key] !== undefined) {
                checkbox.checked = parsed[key];
            } else {
                checkbox.checked = false;
            }
        }
        
        fetchAndRenderResults(parsed, targetProperty);
    });

    // Handle manual checkbox toggles
    for (const id of Object.keys(filters)) {
        document.getElementById(id).addEventListener('change', () => {
            const query = searchInput.value;
            const parsed = parseSearchQuery(query);
            
            // Override parsed with manual toggles
            for (const [fid, key] of Object.entries(filters)) {
                const checkbox = document.getElementById(fid);
                if (checkbox.checked) {
                    parsed[key] = true;
                }
            }
            fetchAndRenderResults(parsed, targetProperty);
        });
    }
    
    // Initial load
    fetchAndRenderResults({}, targetProperty);
}

async function fetchAndRenderResults(parsedQuery, targetProperty) {
    const resultsContainer = document.getElementById('comparables-results');
    resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem;">Buscando en el mercado...</div>';
    
    try {
        const client = getClient();
        let query = client.from('tpl_catastro_mercado').select('*');
        
        // Si queremos aplicar filtros estrictos desde parsedQuery, podemos hacerlo aquí.
        // Por ahora, traemos las últimas 500 y ordenamos por similitud en memoria, que es muy rápido.
        const [{ data: rawData, error }, ufClp] = await Promise.all([
            query.order('created_at', { ascending: false }).limit(500),
            obtenerUf(),
        ]);

        if (error) throw error;
        
        // Mapear los datos del catastro para que encajen en el motor de similitud
        let data = rawData.map(d => {
            const attr = (d.atributos || '').toLowerCase();
            return {
                id: d.id,
                name: d.titulo || 'Sin Título',
                comuna: d.comuna || 'N/A',
                superficie: d.superficie_m2 || 0,
                precio: d.precio_clp || (d.precio_uf ? Math.round(d.precio_uf * ufClp) : 0),
                precio_uf: d.precio_uf,
                tiene_agua: attr.includes('agua') || attr.includes('vertiente'),
                tiene_luz: attr.includes('luz') || attr.includes('empalme'),
                tiene_bosque: attr.includes('bosque') || attr.includes('nativo'),
                es_plana: attr.includes('plano') || attr.includes('plana'),
                tiene_rio: attr.includes('río') || attr.includes('rio'),
                tiene_lago: attr.includes('lago'),
                tiene_asfalto: attr.includes('asfalto') || attr.includes('pavimento'),
                url: d.url
            };
        });
        
        // Filtros manuales strictos (si el usuario marca el checkbox, SOLO mostramos los que lo tienen)
        if (parsedQuery.tiene_agua) data = data.filter(d => d.tiene_agua);
        if (parsedQuery.tiene_luz) data = data.filter(d => d.tiene_luz);
        if (parsedQuery.tiene_bosque) data = data.filter(d => d.tiene_bosque);
        if (parsedQuery.es_plana) data = data.filter(d => d.es_plana);
        if (parsedQuery.tiene_rio) data = data.filter(d => d.tiene_rio);
        if (parsedQuery.tiene_lago) data = data.filter(d => d.tiene_lago);
        if (parsedQuery.tiene_asfalto) data = data.filter(d => d.tiene_asfalto);

        // Filtro por texto / comuna si existe en parsedQuery
        const searchText = document.getElementById('comparables-search-bar').value.toLowerCase();
        if (searchText) {
            data = data.filter(d => {
                const searchable = `${d.name} ${d.comuna}`.toLowerCase();
                // Simple keyword match
                const keywords = searchText.split(' ').filter(k => k.length > 2);
                if (keywords.length === 0) return searchable.includes(searchText);
                return keywords.some(k => searchable.includes(k));
            });
        }

        if (targetProperty) {
            data.forEach(item => {
                item.similarity = calculateSimilarity(targetProperty, item);
            });

            // Ordenar por similitud
            data.sort((a, b) => b.similarity - a.similarity);
            
            // Tomar los top 15 para no saturar
            data = data.slice(0, 15);
        } else {
            // Ordenar por fecha o precio si no hay target
            const resultsContainer = document.getElementById('comparables-results');
            const statsContainer = document.getElementById('market-stats-container');
            
            const sortedData = data.slice(0, 50);
            
            resultsContainer.innerHTML = '';
            
            if (sortedData.length === 0) {
                resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem;">No se encontraron comparables.</div>';
                statsContainer.style.display = 'none';
                return;
            }

            // --- Market Intelligence Logic ---
            const ufPrices = sortedData.filter(d => d.precio_uf > 0).map(d => d.precio_uf);
            const avgUF = ufPrices.length ? Math.round(ufPrices.reduce((a,b)=>a+b,0)/ufPrices.length) : 0;
            
            const m2Prices = sortedData.filter(d => d.precio_uf > 0 && d.superficie > 0).map(d => d.precio_uf / d.superficie);
            const avgM2 = m2Prices.length ? (m2Prices.reduce((a,b)=>a+b,0)/m2Prices.length).toFixed(3) : 0;

            statsContainer.style.display = 'flex';
            statsContainer.innerHTML = `
                <div class="stat-box">
                    <div class="label">Muestra</div>
                    <div class="value">${sortedData.length} parcelas</div>
                </div>
                <div class="stat-box highlight">
                    <div class="label">Promedio Mercado</div>
                    <div class="value">${avgUF.toLocaleString()} UF</div>
                </div>
                <div class="stat-box highlight">
                    <div class="label">Promedio UF/m²</div>
                    <div class="value">${avgM2} UF</div>
                </div>
            `;
            // ---------------------------------
            
            data = sortedData;
        }
        
        if (data.length === 0) {
            resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: #666;">No se encontraron propiedades similares con esos filtros.</div>';
            return;
        }

        resultsContainer.innerHTML = data.map(item => {
            const clpStr = item.precio ? new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(item.precio) : 'N/A';
            const ufStr = item.precio_uf ? ` (${item.precio_uf.toFixed(2)} UF)` : '';
            return `
            <div class="comparable-card">
                ${item.similarity !== undefined ? `
                    <div class="similarity-badge ${item.similarity < 50 ? 'low' : item.similarity < 80 ? 'med' : ''}">
                        ${item.similarity}%
                    </div>
                ` : ''}
                <h3 class="card-title">${item.name}</h3>
                
                <div class="card-detail">
                    <span>Comuna:</span>
                    <strong>${item.comuna}</strong>
                </div>
                <div class="card-detail">
                    <span>Superficie:</span>
                    <strong>${item.superficie ? item.superficie.toLocaleString('es-CL') + ' m²' : 'N/A'}</strong>
                </div>
                <div class="card-detail">
                    <span>Precio:</span>
                    <strong>${clpStr}${ufStr}</strong>
                </div>
                
                <div class="card-attributes">
                    ${item.tiene_agua ? '<span class="attr-tag">💧 Agua</span>' : ''}
                    ${item.tiene_luz ? '<span class="attr-tag">⚡ Luz</span>' : ''}
                    ${item.tiene_bosque ? '<span class="attr-tag">🌲 Bosque</span>' : ''}
                    ${item.es_plana ? '<span class="attr-tag">📏 Plana</span>' : ''}
                    ${item.tiene_rio ? '<span class="attr-tag">🌊 Río</span>' : ''}
                    ${item.tiene_lago ? '<span class="attr-tag">🚤 Lago</span>' : ''}
                    ${item.tiene_asfalto ? '<span class="attr-tag">🛣️ Asfalto</span>' : ''}
                </div>
                
                ${item.url ? `<div style="margin-top: 1rem; text-align:right;"><a href="${item.url}" target="_blank" style="color:#0066ff; font-size:0.85rem; font-weight:bold; text-decoration:none;">Ver Original ↗</a></div>` : ''}
            </div>
            `
        }).join('');

    } catch (err) {
        console.error(err);
        resultsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: red;">Error al cargar datos del mercado: ${err.message}</div>`;
    }
}
