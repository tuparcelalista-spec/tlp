# Ficha Inteligente TPL para parcelas históricas

## Objetivo
Permitir que las parcelas provenientes de `parcelas.js` completen únicamente los antecedentes que nunca existieron, conservando todos los datos previos y dejando una ficha canónica reutilizable por CRM, Tasador, parcela.html, proyecto.html e Informe Premium.

## Implementación
- El CRM detecta qué campos ya tienen valor, incluyendo columnas, `metadata`, `atributos_naturales` y `casa_datos`.
- El Tasador preciso oculta los campos ya conocidos y muestra únicamente los faltantes.
- Se incorpora un medidor de completitud y un resumen de datos recuperados.
- Los selects opcionales ya no inventan datos usando su primera opción.
- `Tasar y guardar datos` registra una nueva tasación y actualiza la ficha canónica.
- La RPC ampliada conserva datos anteriores y guarda atributos naturales, distancias, turismo, vivienda, obras y trazabilidad.

## Regla de seguridad de datos
Un valor vacío nunca reemplaza un dato existente. Un precio vacío o cero tampoco reemplaza el precio publicado.

## Flujo
CRM → Parcela histórica → Más → Completar datos y tasar → solo campos vacíos → Tasar y guardar datos → ficha actualizada → Informe Premium.
