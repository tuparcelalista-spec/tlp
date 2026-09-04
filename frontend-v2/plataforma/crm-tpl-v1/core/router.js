// router.js
import state from './state.js';

// La define index.html, que se sirve sin cache. Ver el comentario alli.
export const APP_VERSION = (typeof window !== 'undefined' && window.__TPL_APP_VERSION) || 'dev';

/**
 * Menú lateral.
 *
 * Antes los cuatro grupos ordenaban por TIPO DE DATO — "Personas", "Catálogo",
 * "Información" — que es cómo está organizada la base de datos, no cómo se
 * trabaja. Ahora ordenan por MOMENTO DEL TRABAJO:
 *
 *   Hoy        · lo que espera una respuesta nuestra
 *   En marcha  · lo que ya está andando
 *   Inventario · lo que tenemos para vender
 *   Mercado    · con qué lo comparamos
 *
 * Tres cambios concretos:
 *   · "Bandeja de revisión" sube de sexta a segunda. Es la única pantalla del
 *     CRM donde alguien de afuera está esperando que le contestemos: mientras
 *     no se revise, su propiedad no existe para el público y no sabe nada.
 *   · "Personas" dejó de ser un grupo de un solo ítem y se juntó con las
 *     operaciones, que es donde de verdad se consulta un actor.
 *   · "Simulador / Cotizador" SALE del menú. Sus cuatro piezas
 *     (MapView, Cotizador, ParcelaFilters, ParcelaList) son andamios sin
 *     terminar: el mapa dice "Mapa Cargando…" para siempre, el cotizador tiene
 *     escrito "dummy calculation logic", los filtros ofrecen Frutillar y Puerto
 *     Varas (que no están en el catálogo) y la lista pinta "undefined UF"
 *     porque lee p.nombre/p.precio y la vista entrega titulo/precio_publicado.
 *     Los archivos siguen ahí; cuando el módulo funcione se vuelve a agregar
 *     la línea de abajo.
 */
export const groups = [
    ['Hoy', [
        ['dashboard', 'Resumen ejecutivo'],
        ['revision', 'Bandeja de revisión'],
        ['pipeline', 'Pipeline comercial'],
        ['visitas', 'Agenda de visitas']
    ]],
    ['En marcha', [
        ['operaciones', 'Proyectos y operaciones'],
        // 'partners' apuntaba a modules/partners/index.js, que no existe: el
        // enlace fallaba con "Error al cargar la vista". Las siete tablas de
        // partner estan vacias, asi que hoy no hay modulo que mostrar; cuando
        // haya datos se vuelve a agregar aqui.
        ['actores', 'Clientes, leads y partners']
    ]],
    ['Inventario', [
        ['parcelas', 'Parcelas'],
        ['casas', 'Casas y modelos'],
        ['tasaciones', 'Tasaciones e informes']
    ]],
    ['Mercado', [
        ['catastro', 'Catastro de Mercado'],
        ['comparables', 'Buscador de Comparables'],
        ['eventos', 'Actividad y trazabilidad']
        // ['simulador', 'Simulador / Cotizador']  ← ver la nota de arriba
    ]]
];

/**
 * @param {string}  viewId
 * @param {object}  opciones
 * @param {boolean} opciones.invalidar  Si el módulo expone `invalidate()`, se
 *   llama antes de renderizar. Lo usan parcelas y catastro, que guardan sus
 *   filas en una variable de módulo y de otro modo repintarían datos viejos
 *   después de un guardado (ver core/refresh.js).
 */
export async function navigate(viewId, { invalidar = false } = {}) {
    state.currentView = viewId;
    
    // Update active nav item
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.remove('active', 'bg-gray-800', 'text-white');
        link.classList.add('text-gray-300');
        if (link.dataset.view === viewId) {
            link.classList.add('active', 'bg-gray-800', 'text-white');
            link.classList.remove('text-gray-300');
        }
    });

    // Find and set title
    let title = 'Vista';
    for (const group of groups) {
        const match = group[1].find(item => item[0] === viewId);
        if (match) {
            title = match[1];
            break;
        }
    }
    
    const viewTitle = document.getElementById('viewTitle');
    if (viewTitle) viewTitle.textContent = title;

    const content = document.getElementById('content');
    if (!content) return;

    content.innerHTML = '<div class="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div><p>Cargando módulo...</p></div>';

    try {
        // Antes esto era `Date.now()`: cada navegacion descargaba el modulo de
        // nuevo y creaba una instancia distinta, con sus listeners duplicados.
        // Con una version fija el navegador cachea y el modulo se evalua una
        // sola vez; para publicar cambios se sube APP_VERSION.
        const module = await import(`../modules/${viewId}/index.js?v=${APP_VERSION}`);
        if (invalidar && typeof module.invalidate === 'function') module.invalidate();
        content.innerHTML = module.render ? module.render() : '';
        if (module.init) {
            module.init();
        }
    } catch (err) {
        console.error(`Error al cargar la vista ${viewId}:`, err);
        content.innerHTML = `<div class="p-8 text-center text-red-500">
            <h3 class="text-lg font-bold">Error al cargar la vista</h3>
            <p>${err.message}</p>
        </div>`;
    }
}

export function initRouter() {
    const handleHash = () => {
        const hash = window.location.hash.slice(1);
        const view = hash || 'dashboard';
        navigate(view);
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();
}
