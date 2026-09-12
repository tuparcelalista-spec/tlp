"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Fix conocido de Leaflet + bundlers (Webpack/Next.js no resuelve las rutas
 * relativas que `Icon.Default` calcula desde su propio CSS) — se apunta a
 * las mismas imágenes servidas por unpkg, la misma versión ya fijada en
 * `package.json` (1.9.4). No es un hack propio: es el workaround estándar
 * documentado para este problema exacto.
 */
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface ParcelMapPickerProps {
  lat: number | null;
  lng: number | null;
  /** Requerido solo en modo interactivo (arrastrar/clic) — el modo solo-lectura no lo llama nunca. */
  onChange?: (lat: number, lng: number) => void;
  /**
   * `true` (por defecto): pin arrastrable + clic para marcar — uso del
   * wizard de Publicar. `false`: pin fijo, sin arrastre ni clic — uso de la
   * ficha pública de detalle, donde el visitante NUNCA debe poder mover la
   * ubicación real de la propiedad.
   */
  interactive?: boolean;
  /** Solo modo no interactivo — texto del popup del pin (ej. el título de la propiedad). */
  popupText?: string;
}

/** Centro-sur de Chile — misma zona donde hoy está el catálogo real de TPL, no un punto arbitrario. */
const DEFAULT_CENTER: [number, number] = [-37.0, -72.4];
const DEFAULT_ZOOM = 8;
const PIN_ZOOM = 13;

/**
 * Cargado exclusivamente vía `next/dynamic(..., { ssr: false })` — Leaflet
 * toca `window`/`document` directamente y nunca debe evaluarse en el
 * servidor. Reutilizado en dos contextos (wizard de Publicar y ficha
 * pública de detalle) en vez de duplicar el componente — la única
 * diferencia real entre ambos es si el pin se puede mover.
 */
export function ParcelMapPicker({ lat, lng, onChange, interactive = true, popupText }: ParcelMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Inicializa el mapa una sola vez — recentrar ante cambios de lat/lng se maneja en el efecto de abajo.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER;
    const map = L.map(containerRef.current, { dragging: true, scrollWheelZoom: interactive }).setView(
      initialCenter,
      lat !== null ? PIN_ZOOM : DEFAULT_ZOOM,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(initialCenter, { draggable: interactive }).addTo(map);
    if (popupText) marker.bindPopup(popupText);

    if (interactive) {
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current?.(pos.lat, pos.lng);
      });
      map.on("click", (event: L.LeafletMouseEvent) => {
        marker.setLatLng(event.latlng);
        onChangeRef.current?.(event.latlng.lat, event.latlng.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inicialización única a propósito; el recentrado vive en el efecto siguiente.
  }, []);

  // Recentra cuando el padre cambia lat/lng (ej. al elegir una comuna nueva).
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || lat === null || lng === null) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], PIN_ZOOM);
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Mapa para marcar la ubicación exacta de tu propiedad"
      style={{ height: 360, borderRadius: "var(--tpl-radius-lg)", overflow: "hidden" }}
    />
  );
}
