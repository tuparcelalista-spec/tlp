# Auditoría e implementación CRM · Tasar y guardar datos

## Diagnóstico

El CRM podía registrar una tasación, pero los antecedentes completados en el Tasador no se persistían en `tpl_propiedades`. Por ello la ficha canónica, `parcela.html` y los informes posteriores no reutilizaban los datos mejorados.

## Implementación

- Botón **Tasación básica**: calcula automáticamente con la información existente, guarda la tasación y sincroniza la ficha.
- Botón **Completar y tasar**: abre el formulario preciso precargado y permite completar datos faltantes.
- Botón principal del Tasador embebido: **Tasar y guardar datos**.
- Nueva RPC segura `tpl_crm_guardar_datos_tasacion_v1`.
- Persistencia en `tpl_propiedades` de ubicación, servicios, terreno, accesos, atributos y `casa_datos`.
- Conservación del origen, modo, entrada y resumen del resultado en `metadata`.
- Al terminar, el CRM recarga la ficha y abre el Informe Premium.

## Regla de seguridad

La RPC exige usuario autenticado y activo en `tpl_staff`; no sobrescribe campos existentes con valores vacíos.
