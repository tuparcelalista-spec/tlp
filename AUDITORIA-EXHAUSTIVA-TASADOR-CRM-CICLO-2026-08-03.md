# Auditoría exhaustiva del Tasador y CRM TPL

Fecha: 3 de agosto de 2026

## Alcance

Se revisó el flujo completo CRM → propiedad → Tasación básica/Completar y tasar → registro Supabase → actualización de propiedad → retorno al CRM → presentación de valores → Informe Premium.

## Causa principal del comportamiento cíclico

`TPLTasadorSupabase.register()` capturaba internamente el error de `tpl_registrar_tasacion_v1` y devolvía un resultado sin `tasacion_id`. El Tasador continuaba guardando la propiedad y enviaba `TPL_TASACION_GUARDADA` al CRM con `tasacion_id = null`. El CRM recargaba el snapshot, no encontraba una tasación vinculada y volvía a abrir automáticamente el Tasador al intentar generar el informe. Esto producía aperturas, cierres y retornos repetidos.

## Correcciones aplicadas

1. Registro estricto: dentro del CRM, el flujo se detiene si Supabase no confirma `tasacion_id`.
2. Mensajes seguros: el CRM solo acepta mensajes provenientes del iframe activo, del mismo origen y con `propiedad_id` + `tasacion_id` válidos.
3. Antiduplicación: cada `tasacion_id` se procesa una sola vez.
4. Informe sin ciclo: el informe solo se abre cuando `open_report = true` y se fuerza la tasación recién confirmada, sin volver a consultar una condición desactualizada.
5. Tasación básica mínima: requiere solamente región, comuna y superficie mayor que cero. La distancia faltante queda neutral y no se inventa como 0 km.
6. Precarga normalizada: región, comuna y selects se comparan ignorando mayúsculas, minúsculas y acentos.
7. Recuperación canónica: el CRM combina columnas directas con `metadata`, `metadata.ubicacion` y `casa_datos`.
8. Estado único: se impide abrir dos tasadores simultáneamente para la misma sesión.
9. Resultado visible: las tarjetas del CRM muestran Valor TPL, Apuro y Sin apuro usando la última tasación registrada o el resultado recién confirmado.
10. Caché: se actualizaron las versiones de scripts y CSS para impedir que producción siga cargando archivos anteriores.

## Requisitos mínimos definitivos

Para Tasación básica de parcela:
- Región.
- Comuna.
- Superficie mayor que cero.

No son obligatorios para el cálculo básico:
- Coordenadas.
- Distancia a centro comunal.
- Precio publicado.
- Agua, electricidad, Rol u otros atributos.

Estos antecedentes mejoran precisión y calidad, pero no bloquean.

Para Tasación completa:
- Región.
- Comuna.
- Superficie.
- Coordenadas válidas.

## Flujo final esperado

### Tasación básica

CRM → clic Tasación básica → precarga → cálculo automático una sola vez → registro confirmado → guardado de propiedad → retorno al CRM → valores visibles → Informe Premium si fue solicitado.

### Completar y tasar

CRM → Completar y tasar → formulario precargado → edición → Tasar y guardar datos → registro confirmado → actualización canónica → retorno al CRM → valores visibles → Informe Premium.

## Archivos modificados

- frontend-v2/plataforma/crm-v2/index.html
- frontend-v2/plataforma/crm-v2/crm-v2.js
- frontend-v2/plataforma/crm-v2/crm-v2.css
- frontend-v2/plataforma/publicar/tasador.html
- frontend-v2/plataforma/publicar/tasador-publico.js
- frontend-v2/plataforma/publicar/tpl-tasador-supabase.js

## Validaciones estáticas

- `node --check` correcto para crm-v2.js.
- `node --check` correcto para tasador-publico.js.
- `node --check` correcto para tpl-tasador-supabase.js.
- Existe un único emisor y un único receptor de `TPL_TASACION_GUARDADA`.
- El auto-submit está protegido por `data-auto-submitted`.

## Validación pendiente en producción

La comprobación final requiere que Supabase confirme:
- una fila nueva en `tpl_tasaciones`;
- `propiedad_id` correcto;
- actualización de `tpl_propiedades`;
- valores visibles en CRM;
- generación del informe sin reabrir el Tasador.
