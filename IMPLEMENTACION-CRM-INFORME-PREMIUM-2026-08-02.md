# CRM · Informe Premium de Tasación

Implementa generación, descarga, envío por correo e historial por parcela.

## Requisitos
1. Ejecutar `supabase/migrations/202608020006_tpl_crm_informe_premium_v1.sql`.
2. Desplegar `generar-informe-premium`.
3. Verificar secrets `RESEND_API_KEY`, `TPL_EMAIL_FROM` y `TPL_REPLY_TO`.

## Uso
CRM → Parcelas → Informe Premium → completar destinatario → Generar y descargar / Generar y enviar.

Si la parcela no tiene una tasación previa, el PDF se genera con los antecedentes disponibles y deja visible que no existe valoración calculada. Para análisis económico completo conviene registrar primero una tasación.
