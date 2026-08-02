# Auditoría e implementación visual — Tasador Integral TPL

## Evaluación

El Tasador Integral TPL ya tenía una estructura funcional sólida: modos rápido y preciso, separación terreno/vivienda, desglose, referencias comunales, índices TPL e Informe Premium. La principal fricción estaba en la captura de ubicación exacta: el usuario debía conocer coordenadas o usar únicamente la geolocalización del dispositivo, sin comprobar visualmente el punto.

## Mejoras implementadas

### Ubicación asistida

La tasación precisa ahora permite cuatro métodos equivalentes:

1. Marcar el terreno directamente sobre un mapa.
2. Pegar una URL completa de Google Maps que contenga coordenadas.
3. Usar la ubicación GPS del dispositivo.
4. Ingresar latitud y longitud manualmente.

Todos los métodos sincronizan los campos `lat` y `lng`, el marcador y el enlace de comprobación.

### Mapa interactivo

- Mapa Leaflet con base OpenStreetMap.
- Marcador movible mediante clic.
- Zoom suficiente para identificar acceso o lote.
- Actualización automática de coordenadas.
- Compatible con escritorio y móvil.

### Enlace Google Maps

Se reconocen URLs con formatos habituales:

- `@latitud,longitud`
- `q=latitud,longitud`
- `query=latitud,longitud`
- coordenadas pegadas directamente

Los enlaces cortos de `maps.app.goo.gl` no contienen siempre las coordenadas dentro del texto. En ese caso se solicita abrir el lugar y copiar la URL completa.

### Confirmación visual

El usuario ve:

- método con el que se obtuvo la ubicación;
- coordenadas finales;
- estado confirmado;
- enlace “Comprobar punto en Google Maps”.

### Mejoras visuales

- Panel de ubicación jerarquizado y más fácil de entender.
- Tres opciones presentadas como acciones claras.
- Estado pendiente/confirmado con feedback visual.
- Diseño sobrio y coherente con el azul/amarillo corporativo.
- Adaptación móvil sin comprimir el mapa ni los controles.

## Archivos modificados

- `frontend-v2/plataforma/publicar/tasador.html`
- `frontend-v2/plataforma/publicar/tasador-publico.js`
- `frontend-v2/plataforma/publicar/tasador-publico.css`

## Supabase

Esta mejora no requiere migración ni nuevas Edge Functions. Las coordenadas continúan enviándose por las estructuras que ya usaba el Tasador.
