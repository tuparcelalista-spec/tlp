import { ParcelaList } from '../parcelas/ParcelaList.js';
import { ParcelaFilters } from '../parcelas/ParcelaFilters.js';
import { Cotizador } from '../cotizador/Cotizador.js';
import { MapView } from '../map/MapView.js';

export function render() {
    return `
        <div class="simulador-module-container" style="display:flex; gap: 24px; padding: 24px; max-width: 1400px; margin: 0 auto; min-height: calc(100vh - 100px);">
            <aside style="width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 24px;">
                <div class="card p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <h2 class="text-xl font-bold mb-4">Filtros</h2>
                    <div id="filters-container"></div>
                </div>
                <div class="card p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div id="cotizador-container"></div>
                </div>
            </aside>
            <main style="flex: 1; display: flex; flex-direction: column; gap: 24px;">
                <div class="card p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div id="map-container" style="border-radius: 8px; overflow: hidden;"></div>
                </div>
                <div class="card p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex-1">
                    <h2 class="text-xl font-bold mb-4">Resultados</h2>
                    <div id="list-container"></div>
                </div>
            </main>
        </div>
    `;
}

export function init() {
    // Initialize our decoupled modules
    const filters = new ParcelaFilters('filters-container');
    filters.init();

    const list = new ParcelaList('list-container');
    list.init();

    const map = new MapView('map-container');
    map.init();

    const cotizador = new Cotizador('cotizador-container');
    cotizador.init();
}
