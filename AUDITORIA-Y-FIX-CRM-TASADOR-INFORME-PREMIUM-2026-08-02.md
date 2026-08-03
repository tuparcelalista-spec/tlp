# Auditoría y corrección: Tasador e Informe Premium desde CRM

Fecha: 2 de agosto de 2026

## Problema comprobado

El CRM mostraba el botón Informe Premium, pero no ofrecía una acción capaz de crear la tasación vinculada a la propiedad. La RPC `tpl_crm_preparar_informe_tasacion_v1` exige una fila previa en `tpl_tasaciones` con el mismo `propiedad_id`; por eso respondía que la parcela no tenía tasación registrada.

La descarga sin correo ya era permitida por la Edge Function cuando `enviar=false`, pero la interfaz presentaba nombre, correo y WhatsApp sin explicar que eran opcionales.

## Corrección aplicada

1. Botón **Tasar ahora** en cada parcela sin tasación.
2. Botón **Recalcular tasación** cuando ya existe una.
3. Tasador abierto dentro de un modal/iframe del CRM.
4. Precarga automática de propiedad_id, código, región, comuna, superficie, precio, ubicación, Rol, electricidad, agua, acceso, topografía y suelo.
5. La tasación registrada conserva el vínculo con `propiedad_id`.
6. Al guardar, el Tasador notifica al CRM mediante `postMessage` del mismo origen.
7. El CRM recarga el snapshot y abre inmediatamente el Informe Premium.
8. El botón de descarga se llama **Descargar PDF**.
9. Nombre, correo y WhatsApp aparecen explícitamente como opcionales.
10. El correo solo se valida al elegir **Generar y enviar**.

## Flujo final

CRM → Parcelas → Tasar ahora → calcular → guardar → CRM actualizado → Descargar PDF.

El correo no es requerido para descargar. Solo se requiere al enviar.

## Archivos modificados

- frontend-v2/plataforma/crm-v2/index.html
- frontend-v2/plataforma/crm-v2/crm-v2.js
- frontend-v2/plataforma/crm-v2/crm-v2.css
- frontend-v2/plataforma/publicar/tasador.html
- frontend-v2/plataforma/publicar/tasador-publico.js
- frontend-v2/plataforma/publicar/tasador-publico.css

## Despliegue

No requiere una nueva migración si ya se ejecutó `202608020010_tpl_crm_informe_premium_fix_v1.sql` y está desplegada `generar-informe-premium`.
