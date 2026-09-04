import { setFilter, subscribe } from '../../core/state.js';

export class ParcelaFilters {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Listen to state changes to update UI if needed (e.g. clear filters)
        subscribe((newState) => {
            this.syncUI(newState.filters);
        });
    }

    init() {
        if (!this.container) return;
        this.render();
        this.bindEvents();
    }

    syncUI(filters) {
        // Sync UI inputs with the state
        const communeSelect = this.container.querySelector('#filter-commune');
        if (communeSelect && communeSelect.value !== filters.commune) {
            communeSelect.value = filters.commune || 'all';
        }
        
        const economicCheck = this.container.querySelector('#filter-economic');
        if (economicCheck && economicCheck.checked !== filters.economic) {
            economicCheck.checked = !!filters.economic;
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="filters-panel">
                <h4>Filtros</h4>
                <div class="filter-group">
                    <label for="filter-commune">Comuna:</label>
                    <select id="filter-commune">
                        <option value="all">Todas</option>
                        <option value="Frutillar">Frutillar</option>
                        <option value="Puerto Varas">Puerto Varas</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>
                        <input type="checkbox" id="filter-economic">
                        Más Económicas
                    </label>
                </div>
                <!-- Other filters (GPS, Size, Water, etc.) go here -->
            </div>
        `;
    }

    bindEvents() {
        const communeSelect = this.container.querySelector('#filter-commune');
        communeSelect.addEventListener('change', (e) => {
            setFilter('commune', e.target.value);
        });

        const economicCheck = this.container.querySelector('#filter-economic');
        economicCheck.addEventListener('change', (e) => {
            setFilter('economic', e.target.checked);
        });
    }
}
