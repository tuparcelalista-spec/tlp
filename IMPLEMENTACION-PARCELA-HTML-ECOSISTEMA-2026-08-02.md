# Implementación parcela.html integrada al ecosistema TPL

## Cambios
- Portada reducida y equilibrada; mantiene fotografía de la propiedad con tratamiento oscuro y menor altura.
- Corrección de rutas a Cómo comprar, Red Partner V2 y TPL Business.
- WhatsApp reemplazado por configuración TPL actual.
- Supabase es la primera fuente de datos mediante `getPublishedPropertyById`; `parcelas.js` queda como respaldo temporal.
- Corrección de rutas de fotografías mediante `document.baseURI`.
- Las ofertas y solicitudes se registran en `tpl_oportunidades` mediante `tpl_registrar_oportunidad_publica_v1`.
- Respaldo local solo si falla la conexión real.
- Contexto estructurado de parcela guardado para continuar un Proyecto TPL.
- Mapa público muestra un radio aproximado, no un pin exacto.
- Mejora del formato y seguridad de la descripción.

## Supabase
Ejecutar `supabase/migrations/202608020004_tpl_parcela_ecosistema_v1.sql`.

## Compatibilidad
No eliminar todavía `parcelas.js`; sigue proporcionando imágenes y datos históricos cuando una parcela aún no está completamente migrada a Supabase.
