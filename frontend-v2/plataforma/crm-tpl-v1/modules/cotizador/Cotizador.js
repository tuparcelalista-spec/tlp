import { subscribe } from '../../core/state.js';

export class Cotizador {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentState = null;
        
        subscribe((newState) => {
            this.currentState = newState;
            this.updateCalculations();
        });
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="cotizador-panel">
                <h2>Cotizador</h2>
                <div id="cotizador-results">
                    <p>Selecciona una parcela y un modelo de casa para comenzar.</p>
                </div>
            </div>
        `;
    }

    updateCalculations() {
        if (!this.currentState) return;
        
        const { selectedParcela, selectedCasa, budget } = this.currentState;
        const resultsContainer = this.container.querySelector('#cotizador-results');
        
        if (!selectedParcela || !selectedCasa) {
            resultsContainer.innerHTML = '<p>Selecciona una parcela y un modelo de casa para comenzar.</p>';
            return;
        }

        // Dummy calculation logic simulating the legacy app.js complexity
        const parcelaPrice = selectedParcela.precio || 0;
        const casaPrice = selectedCasa.precio || 0;
        const total = parcelaPrice + casaPrice;
        
        let html = `
            <div class="summary">
                <p><strong>Parcela:</strong> ${selectedParcela.nombre} (${parcelaPrice} UF)</p>
                <p><strong>Casa:</strong> ${selectedCasa.nombre} (${casaPrice} UF)</p>
                <hr>
                <p><strong>Total Estimado:</strong> ${total} UF</p>
            </div>
        `;
        
        if (budget > 0) {
            const diff = budget - total;
            html += `<p class="${diff >= 0 ? 'budget-ok' : 'budget-exceeded'}">
                ${diff >= 0 ? 'Dentro del presupuesto' : 'Excede el presupuesto'} por ${Math.abs(diff)} UF
            </p>`;
        }

        resultsContainer.innerHTML = html;
    }
}
