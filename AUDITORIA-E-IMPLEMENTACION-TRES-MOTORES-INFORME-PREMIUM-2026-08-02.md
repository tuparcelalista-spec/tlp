# Auditoría e implementación · Tres motores del Tasador e Informe Premium TPL

Fecha: 2 de agosto de 2026

## Diagnóstico

El Tasador ya separaba internamente terreno, vivienda y obras, pero la interfaz trataba la vivienda como una casilla secundaria. El CRM tampoco enviaba un tipo de activo canónico y el PDF Premium estaba limitado a un resumen económico y una lectura territorial básica.

## Implementación

- Selector explícito de tres variantes: Parcela, Parcela + casa y Casa.
- La variante Casa utiliza el motor de vivienda y obras sin sumar el terreno.
- El CRM transmite `tipo_activo` al Tasador Express.
- El Informe Premium v4 incorpora:
  - Valor TPL, apuro, sin apuro, propietario y mercado en una línea estratégica.
  - Índice de Calidad TPL de 0 a 1.000.
  - Proyección de calidad al completar mejoras.
  - Fortalezas y factores que limitan confianza o comercialización.
  - Desglose terreno, vivienda, fundación y obras.
  - Plan de mejoramiento priorizado.
  - Tipo de Partner TPL sugerido para cada mejora.
  - Lectura territorial cuando existe análisis geográfico.
- Los datos personales continúan siendo opcionales para descargar.

## Criterio de seguridad comercial

Las mejoras propuestas aumentan la preparación, presentación, completitud y confianza. El informe no promete que una obra aumentará el precio en un monto exacto.

## Archivos modificados

- `frontend-v2/plataforma/publicar/tasador.html`
- `frontend-v2/plataforma/publicar/tasador-publico.js`
- `frontend-v2/plataforma/publicar/tasador-publico.css`
- `frontend-v2/plataforma/publicar/tpl-house-engine.js`
- `frontend-v2/plataforma/crm-v2/crm-v2.js`
- `supabase/functions/generar-informe-premium/index.ts`
