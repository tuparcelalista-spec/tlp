import { subscribe } from '../../core/state.js';

export class MapView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.map = null;
        this.markers = [];
        
        subscribe((newState) => {
            // Re-render markers if parcelas or viewMode changes
            if (newState.viewMode === 'map') {
                this.show();
                // Normally we'd pass filtered parcelas here
            } else {
                this.hide();
            }
        });
    }

    init() {
        if (!this.container) return;
        this.render();
        // Assuming Google Maps or Leaflet would be initialized here
    }

    render() {
        this.container.innerHTML = `
            <div id="map-canvas" style="width: 100%; height: 400px; background: #eee;">
                <!-- Map integration goes here -->
                <p style="text-align:center; padding-top:180px; color:#666;">Mapa Cargando...</p>
            </div>
        `;
        this.hide();
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
            // Trigger map resize event if needed
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    updateMarkers(parcelas) {
        // Update map markers based on current filtered parcelas
        console.log("Updating map markers for", parcelas.length, "parcelas");
    }
}
