# Auditoría y corrección de parcela.html

## Fallas encontradas

1. La ficha pública dependía de un único parámetro `id`.
2. La consulta remota aceptaba solo propiedades con estado exacto `publicada`.
3. No recuperaba fotografías desde `tpl_propiedad_imagenes`.
4. El respaldo local exigía coincidencia exacta únicamente con `p.id`.
5. Los enlaces del CRM eran relativos y dependían de la profundidad de la ruta.
6. Si la identificación no coincidía, la ficha quedaba en estado no encontrado sin suficiente diagnóstico.

## Correcciones

- Soporte para `id`, `codigo` y `parcela`.
- Reconocimiento de UUID, código y referencia histórica.
- Consulta compatible con estados `publicada`, `activa` y `disponible`.
- Recuperación de medios desde `tpl_propiedad_imagenes` y `metadata.imagenes`.
- Enlace absoluto desde CRM a `/frontend-v2/parcela.html`.
- Versionado de scripts para evitar caché antigua.

## Pruebas recomendadas

- Abrir una parcela histórica desde el index.
- Abrir una parcela canónica desde el CRM.
- Probar con código y UUID.
- Confirmar fotografía principal, galería, precio y descripción.
