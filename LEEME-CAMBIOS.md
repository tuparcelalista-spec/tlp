# Corrección parcela.html y catálogo público

Archivos modificados:

- `frontend-v2/parcela.html`
- `frontend-v2/css/parcela.css`
- `frontend-v2/js/parcela.js`
- `frontend-v2/js/core/tpl-data-service.js`
- `frontend-v2/index.html`
- `frontend-v2/js/index.js`
- `frontend-v2/campo-chileno.html`

## Cambios aplicados

1. `parcela.html` muestra todos los atributos canónicos disponibles.
2. La normalización ya no elimina dirección, exposición, vista, vegetación, condominio, cercanías, casa existente y otros campos.
3. El diagnóstico utiliza primero campos estructurados de Supabase.
4. Se mejoró el reconocimiento de valores informados como “Rol propio”, “Factibilidad eléctrica” y descripciones similares.
5. El catálogo público acepta estados `publicada`, `activa` y `disponible`.
6. Las imágenes con `storage_path` se convierten a URL pública.
7. `index.html` consulta Supabase y combina el resultado con `parcelas.js` como respaldo.
8. Se corrigieron rutas de Red Partner y el logo de `campo-chileno.html`.

## Validación

Los tres archivos JavaScript modificados pasaron `node --check` sin errores de sintaxis.
