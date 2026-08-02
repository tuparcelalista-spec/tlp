# Auditoría CRM · Informe Premium Tasador

## Diagnóstico

El flujo no funcionaba por cuatro regresiones acumuladas:

1. La vista nueva del Command Center sobrescribió `parcelsView()` y eliminó el botón **Informe Premium**.
2. `tpl-data-service.js` perdió `prepareCrmPremiumReport`, `generateCrmPremiumReport` y `getCrmReportHistory`.
3. La RPC anterior validaba una función administrativa distinta del esquema real; ahora usa `tpl_es_staff()`.
4. La Edge Function `generar-informe-premium` volvió a aceptar solo la `service_role`, imposible de enviar desde un navegador de asesor.

## Correcciones

- Se restauró la grilla visual de parcelas y el botón Informe Premium.
- Se restauró el modal de destinatario e historial.
- Se restauraron los métodos del servicio de datos.
- Se creó la migración `202608020010_tpl_crm_informe_premium_fix_v1.sql`.
- La RPC exige usuario autenticado y activo en `tpl_staff`.
- La RPC exige que la parcela tenga una tasación real registrada.
- La Edge Function valida el JWT del asesor y luego confirma su registro activo en `tpl_staff`.
- El PDF queda en el bucket privado `informes-tasacion`.
- Se entrega una URL firmada por siete días.
- El envío por Resend es opcional y queda registrado.
- Se conserva el análisis territorial cuando existe.

## Flujo final

CRM → Parcelas → Informe Premium → preparar orden administrativa → generar PDF → Storage privado → historial → descarga o envío.

## Pruebas necesarias

1. Parcela con tasación: generar y descargar.
2. Parcela con tasación: generar y enviar.
3. Parcela sin tasación: debe mostrar mensaje para ejecutar primero el Tasador.
4. Usuario fuera de `tpl_staff`: debe recibir acceso denegado.
5. Verificar registro en `tpl_informes_tasacion` y archivo en Storage.
