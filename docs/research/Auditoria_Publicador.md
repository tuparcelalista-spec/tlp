# Auditoría Técnica y Exhaustiva: Publicador TPL V2

## 1. Arquitectura y Código (Código Fuente: `publicar.js` - 1105 Líneas)
El archivo principal que controla la publicación es un script monolítico de gran envergadura. Aunque está estructurado con el patrón de Módulo IIFE para proteger el alcance global, presenta oportunidades de mejora.

- **✅ Acierto Arquitectónico:** Uso de `TPLDataService` (Servicio de Datos Centralizado). Esto separa inteligentemente la lógica de presentación de las llamadas a Supabase y pasarelas de pago.
- **✅ Resiliencia Offline:** El publicador está programado para guardar "Drafts" (Borradores) en `localStorage` ante cualquier caída de internet, evitando que el usuario pierda sus datos.
- **⚠️ Riesgo Técnico (Deuda Técnica):** Al tener más de 1.100 líneas, modificar flujos del "Wizard" se vuelve complejo. 
  - *Sugerencia:* Refactorizar en módulos (`wizard-ui.js`, `map-picker.js`, `photo-handler.js`).

## 2. Experiencia de Usuario (UX) y Validaciones
- **⚠️ Alertas Nativas y Validaciones Básicas:** El validador de pasos (`validateStep`) usa `alert('Selecciona al menos una mejora')` y verificaciones genéricas de campos `[required]`. Esto se percibe anticuado.
  - *Sugerencia:* Reemplazar `alert()` por notificaciones Toast integradas y mensajes de error in-line bajo los campos vacíos (ej. bordes rojos).
- **⚠️ Manejo de Archivos (Imágenes):** Al cargar fotos, se usan `URL.createObjectURL(file)`. Si el usuario carga 50 fotos en alta resolución desde un celular, el navegador podría colapsar por consumo excesivo de memoria RAM, ya que no hay compresión ni liberación en caliente (`URL.revokeObjectURL`).
  - *Sugerencia:* Implementar un redimensionamiento previo o un límite estricto de megabytes/cantidad en el front-end.

## 3. Seguridad de Datos
- **✅ Integración CRM y Seguridad RLS:** El uso del `remoteDraftToken` y las funciones RPC en PostgreSQL (Ej. `tpl_guardar_borrador_publicador_v1`) garantizan que no se inyecte código malicioso directamente a las tablas.
- **⚠️ Tokens Persistentes:** Los borradores se guardan en el navegador indefinidamente hasta su publicación. Si es un computador público, otro usuario podría leer el borrador.

## 4. Geoubicación (Geo-Picker y Mapas)
- **✅ Flexibilidad Híbrida:** Se permite poner el link directo de Google Maps o usar el mapa nativo (Leaflet). Esto reduce la fricción si el usuario no sabe navegar el mapa y prefiere pegar un link.
- **⚠️ Parsing de Enlaces de Maps:** La función que extrae coordenadas desde el link de Google Maps (`coordsFromMapsValue`) puede fallar si Google actualiza la estructura de sus URLs cortas (`goo.gl` o `maps.app.goo.gl`).
  - *Sugerencia:* Integrar una API de validación para enlaces acortados.

## 5. Monetización e Integración de Pagos (Flow)
- **✅ Pasarela Sin Fricción:** Al hacer clic en el Informe Premium (`submitReportOrder`), el sistema crea una orden temporal (`tpl_report_purchase_intent_v2`) antes de redireccionar a Flow. Si el pago falla, el sistema tiene la orden lista para reintentar sin perder los datos de tasación.
- **⚠️ Abandono de Carrito:** Actualmente, si el usuario abandona la pasarela de Flow, el borrador queda en `localStorage`. 
  - *Sugerencia:* Enviar un webhook (correo) a los 30 minutos indicando: *"Tu tasación está lista, finaliza tu compra aquí"*.

## Veredicto TPL
El publicador actual es un motor **altamente resiliente y funcional**, con excelentes bases de datos y persistencia. La prioridad número 1 para optimizar a corto plazo es **el manejo de múltiples fotos pesadas en memoria** y mejorar el **feedback visual de los errores** (quitando los `alerts` del navegador).
