"use client";

import dynamic from "next/dynamic";
import { Button } from "@tpl/ui";
import { propertyLocationCardCss } from "./propertyLocationCard.css";

export interface PropertyLocationCardProps {
  location: string;
  coordinates: { lat: number; lng: number } | null;
}

/**
 * Mapa real embebido (Leaflet + OpenStreetMap, ya aprobado e instalado
 * para el wizard de Publicar) en modo **solo lectura**: sin arrastre, sin
 * clic para mover el pin — un visitante de la ficha pública nunca debe
 * poder cambiar la ubicación real de la propiedad. Antes de que Leaflet
 * fuera una dependencia aprobada, este componente solo mostraba un link a
 * Google Maps; se mantiene el link como respaldo/acceso directo, y se
 * agrega el mapa embebido como mejora real, sin dependencias nuevas (usa
 * exactamente el mismo `ParcelMapPicker` del wizard).
 */
const ParcelMapPicker = dynamic(() => import("../publicar/ParcelMapPicker").then((m) => m.ParcelMapPicker), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 280,
        borderRadius: "var(--tpl-radius-lg)",
        background: "var(--tpl-surface-sunken)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--tpl-content-muted)",
      }}
    >
      Cargando mapa…
    </div>
  ),
});

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

      {coordinates ? (
        <div style={{ marginTop: "12px" }}>
          <ParcelMapPicker lat={coordinates.lat} lng={coordinates.lng} interactive={false} popupText={location} />
        </div>
      ) : null}

      {mapsHref ? (
        <div style={{ marginTop: "12px" }}>
          <Button href={mapsHref} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
            Ver en Google Maps
          </Button>
        </div>
      ) : null}
    </div>
  );
}
