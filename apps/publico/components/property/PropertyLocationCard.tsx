import { Button } from "@tpl/ui";
import { propertyLocationCardCss } from "./propertyLocationCard.css";

export interface PropertyLocationCardProps {
  location: string;
  coordinates: { lat: number; lng: number } | null;
}

/**
 * Reemplaza el texto plano "mapa interactivo disponible en un bloque
 * futuro" por un componente limpio, sin agregar Leaflet ni ninguna
 * librería de mapas nueva (regla vigente: eso requiere aprobación
 * explícita aparte). En vez de un mapa embebido, un link real a Google
 * Maps con las coordenadas exactas — funciona hoy, sin API key, sin
 * dependencia nueva, y sin inventar una "vista previa" que no sea un mapa
 * real. Si más adelante se aprueba un mapa embebido (Leaflet u otro),
 * este componente es el punto exacto a reemplazar — `coordinates` y
 * `distanceKm` (Search Core, @tpl/core) ya están disponibles para eso.
 */
export function PropertyLocationCard({ location, coordinates }: PropertyLocationCardProps) {
  const mapsHref = coordinates ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}` : null;

  return (
    <div className="tpl-location-card">
      <style>{propertyLocationCardCss}</style>
      <div className="tpl-location-card__row">
        <div className="tpl-location-card__pin" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
        </div>
        <div>
          <p className="tpl-location-card__place">{location}</p>
          {coordinates ? (
            <p className="tpl-location-card__coords">
              {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
            </p>
          ) : (
            <p className="tpl-location-card__coords">Coordenadas por confirmar.</p>
          )}
        </div>
      </div>
      {mapsHref ? (
        <Button href={mapsHref} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
          Ver en Google Maps
        </Button>
      ) : null}
    </div>
  );
}
