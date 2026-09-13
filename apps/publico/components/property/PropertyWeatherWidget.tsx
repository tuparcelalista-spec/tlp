"use client";

import { useState, useEffect } from "react";
import { propertyWeatherWidgetCss } from "./propertyWeatherWidget.css";

export interface WeatherData {
  temp: number;
  icon: string;
  label: string;
  humidity: number;
  windSpeed: number;
  minTemp: number | null;
  maxTemp: number | null;
}

const WMO_WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Cielo despejado", icon: "☀️" },
  1: { label: "Principalmente despejado", icon: "🌤️" },
  2: { label: "Parcialmente nublado", icon: "⛅" },
  3: { label: "Nublado", icon: "☁️" },
  45: { label: "Niebla matinal", icon: "🌫️" },
  48: { label: "Niebla con escarcha", icon: "🌫️" },
  51: { label: "Llovizna suave", icon: "🌦️" },
  53: { label: "Llovizna moderada", icon: "🌦️" },
  61: { label: "Lluvia ligera", icon: "🌧️" },
  63: { label: "Lluvia moderada", icon: "🌧️" },
  65: { label: "Lluvia intensa", icon: "🌧️" },
  80: { label: "Chubascos suaves", icon: "🌦️" },
  81: { label: "Chubascos moderados", icon: "🌧️" },
  95: { label: "Tormenta eléctrica", icon: "⛈️" },
};

function getBioclimaticProfile(commune: string, region: string): { style: string; note: string } {
  const c = commune.toLowerCase();
  const r = region.toLowerCase();

  if (r.includes("los lagos") || r.includes("los ríos") || r.includes("los rios") || c.includes("valdivia") || c.includes("frutillar") || c.includes("puerto varas")) {
    return {
      style: "Templado lluvioso valdiviano",
      note: "Abundantes precipitaciones anuales que aseguran praderas verdes todo el año, aire de extrema pureza y gran reserva hídrica natural.",
    };
  }
  if (r.includes("araucanía") || r.includes("araucania") || c.includes("pucón") || c.includes("pucon") || c.includes("villarrica")) {
    return {
      style: "Templado precordillerano lacustre",
      note: "Microclima regulado por lagos y volcanes, con veranos templados ideales para el descanso y vida al aire libre.",
    };
  }
  if (r.includes("biobío") || r.includes("biobio") || r.includes("ñuble") || r.includes("nuble") || c.includes("yumbel") || c.includes("quillón") || c.includes("chillán")) {
    return {
      style: "Mediterráneo templado cálido",
      note: "Veranos cálidos con alta radiación solar, óptimo para huertos familiares, frutales, paneles solares y proyectos sustentables.",
    };
  }
  if (r.includes("maule") || r.includes("o'higgins") || r.includes("metropolitana")) {
    return {
      style: "Mediterráneo central de estación seca",
      note: "Clima agradable con más de 250 días despejados al año, baja humedad relativa y marcado ciclo estacional.",
    };
  }
  return {
    style: "Templado rural sustentable",
    note: "Entorno campestre con aire limpio, ventilación natural y alta aptitud para desarrollo habitacional y huertas.",
  };
}

function useWeatherData(coordinates: { lat: number; lng: number } | null) {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    const lat = coordinates?.lat ?? -36.82;
    const lng = coordinates?.lng ?? -73.04;

    const cacheKey = `tpl_weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
          setData(parsed.data);
          return;
        }
      }
    } catch {}

    const controller = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Weather fetch failed"))))
      .then((result) => {
        const current = result.current;
        const daily = result.daily || {};
        const code = current.weather_code ?? 0;
        const info = WMO_WEATHER_CODES[code] || { label: "Despejado", icon: "☀️" };

        const weather: WeatherData = {
          temp: Math.round(current.temperature_2m),
          icon: info.icon,
          label: info.label,
          humidity: Math.round(current.relative_humidity_2m || 0),
          windSpeed: Math.round(current.wind_speed_10m || 0),
          minTemp: daily.temperature_2m_min?.[0] !== undefined ? Math.round(daily.temperature_2m_min[0]) : null,
          maxTemp: daily.temperature_2m_max?.[0] !== undefined ? Math.round(daily.temperature_2m_max[0]) : null,
        };

        setData(weather);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: weather, timestamp: Date.now() }));
        } catch {}
      })
      .catch(() => {
        // Fallback silencioso sin romper nada
      });

    return () => controller.abort();
  }, [coordinates?.lat, coordinates?.lng]);

  return data;
}

export function PropertyWeatherHeaderBadge({
  coordinates,
}: {
  coordinates: { lat: number; lng: number } | null;
}) {
  const weather = useWeatherData(coordinates);
  if (!weather) return null;

  return (
    <div className="tpl-weather-header-badge" aria-label={`Clima actual: ${weather.temp}°C, ${weather.label}`}>
      <style>{propertyWeatherWidgetCss}</style>
      <span>{weather.icon}</span>
      <span className="tpl-weather-header-badge__temp">{weather.temp}°C</span>
      <span>{weather.label}</span>
    </div>
  );
}

export function PropertyWeatherWidget({
  coordinates,
  commune,
  region,
}: {
  coordinates: { lat: number; lng: number } | null;
  commune: string;
  region: string;
}) {
  const weather = useWeatherData(coordinates);
  const bio = getBioclimaticProfile(commune, region);

  if (!weather) return null;

  return (
    <div className="tpl-weather-card" aria-label="Widget de clima y condiciones del terreno">
      <style>{propertyWeatherWidgetCss}</style>

      <div className="tpl-weather-main">
        <div className="tpl-weather-temp-wrap">
          <span className="tpl-weather-icon-large" aria-hidden="true">
            {weather.icon}
          </span>
          <div>
            <div className="tpl-weather-temp-row">
              <span className="tpl-weather-temp-val">{weather.temp}°C</span>
              <span className="tpl-weather-temp-desc">{weather.label}</span>
            </div>
            <div className="tpl-weather-range">
              {weather.minTemp !== null && weather.maxTemp !== null
                ? `Mín ${weather.minTemp}°C · Máx ${weather.maxTemp}°C hoy`
                : `Temperatura en vivo en ${commune}`}
            </div>
          </div>
        </div>

        <div className="tpl-weather-meta-grid">
          <div className="tpl-weather-meta-col">
            <span className="tpl-weather-meta-label">💧 Humedad</span>
            <strong className="tpl-weather-meta-val">{weather.humidity}%</strong>
          </div>
          <div className="tpl-weather-meta-col">
            <span className="tpl-weather-meta-label">💨 Viento</span>
            <strong className="tpl-weather-meta-val">{weather.windSpeed} km/h</strong>
          </div>
          <div className="tpl-weather-meta-col">
            <span className="tpl-weather-meta-label">🌱 Bioclima</span>
            <strong className="tpl-weather-meta-val">{bio.style}</strong>
          </div>
        </div>
      </div>

      <p className="tpl-weather-note">
        <strong>🌱 Perfil Territorial:</strong> {bio.note}
      </p>
    </div>
  );
}
