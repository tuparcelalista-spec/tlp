# Auditoría e implementación CRM – Catálogo visual

## Hallazgos

1. El snapshot no limitaba parcelas, pero solo consultaba `tpl_propiedades`; 32 propiedades históricas seguían únicamente en `parcelas.js`.
2. Las casas ya contenían `imagenes` y `planos`, pero el CRM solo mostraba una tabla textual.
3. La ficha genérica usaba `alert()`, sin preview del anuncio ni navegación pública.
4. No existía un indicador claro de fichas sin foto, sin proveedor o sin publicación.

## Implementado

- Migración idempotente de 32 parcelas históricas a `tpl_propiedades`.
- Conservación de imágenes en `tpl_propiedad_imagenes` y metadata.
- Vistas CRM enriquecidas con imagen principal y conteos.
- Grilla visual de parcelas y casas.
- Preview grande dentro del CRM.
- Enlace directo a `parcela.html`.
- Métricas de inventario incompleto.
