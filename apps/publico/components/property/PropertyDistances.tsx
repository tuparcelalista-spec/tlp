import { distanceKm } from "@tpl/core";
import { propertyDistancesCss } from "./propertyDistances.css";

export interface PropertyDistancesProps {
  coordinates: { lat: number; lng: number } | null;
  commune: string;
}

const CIUDADES_REFERENCIA = [
  { name: "Concepción", lat: -36.8201, lng: -73.0444 },
  { name: "Chillán", lat: -36.6066, lng: -72.1034 },
  { name: "Los Ángeles", lat: -37.4697, lng: -72.3536 },
  { name: "Temuco", lat: -38.7397, lng: -72.5901 },
  { name: "Valdivia", lat: -39.8142, lng: -73.2459 },
  { name: "Puerto Montt", lat: -41.4693, lng: -72.9424 },
  { name: "Santiago", lat: -33.4489, lng: -70.6693 },
];

export function PropertyDistances({ coordinates, commune }: PropertyDistancesProps) {
  let closestCity = "Concepción";
  let distCityKm = 15;
  let distCommuneKm = 8;

  if (coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)) {
    let minD = Infinity;
    for (const city of CIUDADES_REFERENCIA) {
      const d = Math.round(distanceKm(coordinates.lat, coordinates.lng, city.lat, city.lng) * 1.25);
      if (d < minD) {
        minD = d;
        closestCity = city.name;
        distCityKm = d;
      }
    }
    distCommuneKm = Math.max(3, Math.round(distCityKm * 0.35));
  }

  // Estimación de distancias a servicios esenciales
  const distRutaKm = Math.max(1, Math.round(distCommuneKm * 0.25));
  const distSaludKm = Math.max(2, Math.round(distCommuneKm * 0.8));
  const distComercioKm = Math.max(2, Math.round(distCommuneKm * 0.6));

  return (
    <div className="tpl-distances-container" aria-label="Distancias y conectividad">
      <style>{propertyDistancesCss}</style>

      {/* Ciudades de Referencia */}
      <div className="tpl-city-distances">
        <div className="tpl-city-distance-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v2H9V7zm0 4h1v2H9v-2zm0 4h1v2H9v-2zm4-8h1v2h-1V7zm0 4h1v2h-1v-2zm0 4h1v2h-1v-2z" />
          </svg>
          <span>
            <strong>A {distCityKm} km</strong> de {closestCity}
          </span>
        </div>

        {commune && (
          <div className="tpl-city-distance-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>
              <strong>A {distCommuneKm} km</strong> de {commune}
            </span>
          </div>
        )}
      </div>

      {/* Tarjetas de Distancia a Servicios */}
      <div className="tpl-services-grid">
        {/* Ruta / Carretera */}
        <div className="tpl-service-card">
          <div className="tpl-service-icon tpl-service-icon--route" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="19" r="2" />
              <circle cx="18" cy="19" r="2" />
              <path d="M10 19h4" />
              <path d="M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
            </svg>
          </div>
          <div>
            <span className="tpl-service-label">Ruta / Carretera</span>
            <span className="tpl-service-val">A {distRutaKm} km aprox.</span>
          </div>
        </div>

        {/* Centro de Salud */}
        <div className="tpl-service-card">
          <div className="tpl-service-icon tpl-service-icon--health" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <span className="tpl-service-label">Centro de Salud</span>
            <span className="tpl-service-val">A {distSaludKm} km aprox.</span>
          </div>
        </div>

        {/* Comercio / Servicios */}
        <div className="tpl-service-card">
          <div className="tpl-service-icon tpl-service-icon--commerce" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div>
            <span className="tpl-service-label">Comercio / Servicios</span>
            <span className="tpl-service-val">A {distComercioKm} km aprox.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
