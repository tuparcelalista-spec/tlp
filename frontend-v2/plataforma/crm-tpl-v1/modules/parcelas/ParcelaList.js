import { subscribe } from '../../core/state.js';
import { fetchParcelas } from '../../core/supabase.js';

export class ParcelaList {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.parcelas = [];
        
        // Subscribe to state changes to re-render if filters change
        subscribe((newState) => {
            this.handleStateChange(newState);
        });
    }

    async init() {
        if (!this.container) return;
        this.renderLoading();
        try {
            // Initial fetch
            this.parcelas = await fetchParcelas();
            this.render();
        } catch (error) {
            this.renderError(error);
        }
    }

    async handleStateChange(state) {
        // Here we could debounce and re-fetch based on state.filters
        // For now, let's just log it
        console.log("State changed, applying filters:", state.filters);
        // this.parcelas = await fetchParcelas(state.filters);
        // this.render();
    }

    renderLoading() {
        const skeletons = Array(6).fill(`
            <div class="parcela-card skeleton" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; height: 300px;">
                <div style="height: 180px; background: #e2e8f0; animation: pulse 1.5s infinite;"></div>
                <div style="padding: 16px;">
                    <div style="height: 20px; background: #e2e8f0; width: 70%; margin-bottom: 8px; animation: pulse 1.5s infinite;"></div>
                    <div style="height: 16px; background: #e2e8f0; width: 40%; margin-bottom: 16px; animation: pulse 1.5s infinite;"></div>
                    <div style="height: 36px; background: #e2e8f0; width: 100%; border-radius: 4px; animation: pulse 1.5s infinite;"></div>
                </div>
            </div>
        `).join('');

        this.container.innerHTML = `
            <style>
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            </style>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                ${skeletons}
            </div>
        `;
    }

    renderError(error) {
        this.container.innerHTML = `<div class="error">Error cargando parcelas: ${error.message}</div>`;
    }

    render() {
        if (this.parcelas.length === 0) {
            this.container.innerHTML = '<div class="empty">No se encontraron parcelas.</div>';
            return;
        }

        const html = this.parcelas.map(p => `
            <div class="parcela-card" data-id="${p.id}">
                <h3>${p.nombre || 'Parcela'}</h3>
                <p>Comuna: ${p.comuna}</p>
                <p>Precio: ${p.precio} UF</p>
                <button class="btn-select">Ver Detalles</button>
            </div>
        `).join('');

        this.container.innerHTML = html;
        this.bindEvents();
    }

    bindEvents() {
        const buttons = this.container.querySelectorAll('.btn-select');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.parcela-card');
                const id = card.dataset.id;
                console.log("Parcela selected:", id);
                // setState({ selectedParcela: id }) // from core/state.js
            });
        });
    }
}
