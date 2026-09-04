export class TerritoryManager {
  constructor() {
    this.regionSelect = document.getElementById('region');
    this.comunaSelect = document.getElementById('comuna');
    this.localidadInput = document.getElementById('localidad');
    this.map = null;
    this.marker = null;
    
    // Almacenamos el catálogo completo para poder buscar coordenadas
    this.catalogData = null;
    this.regionsMap = {};
    
    this.init();
  }

  async init() {
    try {
      // Import the single source of truth catalog from V1 folder
      const module = await import('../../../publicar/tpl-national-catalog.mjs');
      this.catalogData = module.TPL_NATIONAL_CATALOG;
      
      if (Array.isArray(this.catalogData?.regions) && Array.isArray(this.catalogData?.communes)) {
        const names = new Map(this.catalogData.regions.map(r => [r.code, r.name]));
        
        // Build map
        this.catalogData.regions.forEach(r => { this.regionsMap[r.name] = []; });
        this.catalogData.communes.forEach(c => {
          const regionName = names.get(c.reg);
          if (regionName && c.name) this.regionsMap[regionName].push(c.name);
        });
        
        // Sort
        Object.values(this.regionsMap).forEach(list => list.sort((a,b) => a.localeCompare(b, 'es')));
        this.populateRegions();
      }
    } catch (error) {
      console.error('Error loading territory catalog:', error);
      this.regionSelect.innerHTML = '<option value="">Error cargando regiones</option>';
    }

    // Listeners
    this.regionSelect.addEventListener('change', () => this.handleRegionChange());
    this.comunaSelect.addEventListener('change', () => this.handleComunaChange());
    
    // Escuchar cuando el usuario termina de escribir la localidad
    if (this.localidadInput) {
      this.localidadInput.addEventListener('blur', () => this.handleLocalidadChange());
    }
  }

  populateRegions() {
    const defaultOption = '<option value="">Selecciona una región</option>';
    const options = Object.keys(this.regionsMap)
      .map(name => `<option value="${name}">${name}</option>`)
      .join('');
    this.regionSelect.innerHTML = defaultOption + options;
  }

  handleRegionChange() {
    const region = this.regionSelect.value;
    if (!region) {
      this.comunaSelect.innerHTML = '<option value="">Primero selecciona región</option>';
      this.comunaSelect.disabled = true;
      return;
    }

    const comunas = this.regionsMap[region] || [];
    const defaultOption = '<option value="">Selecciona una comuna</option>';
    const options = comunas.map(c => `<option value="${c}">${c}</option>`).join('');
    
    this.comunaSelect.innerHTML = defaultOption + options;
    this.comunaSelect.disabled = false;
  }

  handleComunaChange() {
    const comunaName = this.comunaSelect.value;
    if (!comunaName || !this.catalogData) return;

    // Buscar las coordenadas de la comuna en el catálogo
    const comunaData = this.catalogData.communes.find(c => c.name === comunaName);
    
    if (comunaData && comunaData.lat && comunaData.lng) {
      this.updateMapPosition(comunaData.lat, comunaData.lng, 12);
    }
  }

  async handleLocalidadChange() {
    const localidad = this.localidadInput.value.trim();
    const comunaName = this.comunaSelect.value;
    
    if (!localidad || !comunaName) return;

    // Usamos la API pública de Nominatim para geocodificar la localidad dentro de la comuna
    // Formato de búsqueda: Localidad, Comuna, Chile
    const query = encodeURIComponent(`${localidad}, ${comunaName}, Chile`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
    
    try {
      const response = await fetch(url);
      const results = await response.json();
      
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        this.updateMapPosition(lat, lng, 15); // Zoom más cercano para localidad
      }
    } catch (error) {
      console.warn('No se pudo ubicar la localidad geográficamente', error);
      // Falla silenciosamente, el usuario siempre puede mover el marcador a mano
    }
  }

  updateMapPosition(lat, lng, zoomLevel = 12) {
    if (!this.map || !this.marker) return;

    // Actualizar inputs ocultos
    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;

    // Mover mapa y marcador
    this.map.setView([lat, lng], zoomLevel);
    this.marker.setLatLng([lat, lng]);
  }

  initMap() {
    if (this.map || typeof L === 'undefined') return;

    // Centrado en la zona centro-sur, que es donde está el catálogo TPL.
    // Antes abría en zoom 5 sobre el Pacífico: el usuario veía mar y un pin
    // fuera de lugar, sin entender qué debía marcar.
    this.map = L.map('v2Map').setView([-37.0, -72.4], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.marker = L.marker([-35.675, -71.543], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      document.getElementById('lat').value = pos.lat;
      document.getElementById('lng').value = pos.lng;
    });

    this.map.on('click', (e) => {
      this.marker.setLatLng(e.latlng);
      document.getElementById('lat').value = e.latlng.lat;
      document.getElementById('lng').value = e.latlng.lng;
    });
  }
}
