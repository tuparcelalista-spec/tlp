# Implementación: Tasador TPL como fuente canónica

## Objetivo
El Tasador público y el Tasador integrado en Publicar producen el mismo perfil territorial estructurado. Ese perfil se guarda versionado en Supabase y alimenta CRM, parcela.html, proyecto.html e Informe Premium.

## Fuente canónica
Nueva tabla: `tpl_analisis_territoriales`.

Bloques almacenados:
- ubicación y precisión;
- geometría;
- accesibilidad;
- entorno;
- infraestructura;
- distancias;
- riesgos y clima preparados para futuras fuentes oficiales;
- Índices TPL;
- recomendaciones;
- resumen público;
- análisis aplicado al proyecto;
- contenido del Informe Premium;
- entrada y resultado completos del motor.

## Presentaciones
- `parcela.html`: resumen público, sin exponer coordenadas exactas.
- `proyecto.html`: decisiones prácticas, obras previas y próximos pasos.
- Informe Premium: segunda página territorial con ubicación, infraestructura, índices, potencial y recomendaciones.
- CRM: la tabla queda disponible para trazabilidad y futuras ediciones del asesor.

## Archivos modificados
- `supabase/migrations/202608020008_tpl_tasador_fuente_canonica_v1.sql`
- `supabase/functions/generar-informe-premium/index.ts`
- `frontend-v2/js/core/tpl-data-service.js`
- `frontend-v2/plataforma/publicar/tpl-tasador-supabase.js`
- `frontend-v2/plataforma/publicar/publicar.js`
- `frontend-v2/parcela.html`
- `frontend-v2/js/parcela.js`
- `frontend-v2/css/parcela.css`
- `frontend-v2/proyecto.html`
- `frontend-v2/js/proyecto.js`
- `frontend-v2/css/proyecto.css`

## Despliegue
1. Ejecutar la migración `202608020008_tpl_tasador_fuente_canonica_v1.sql`.
2. Desplegar nuevamente `generar-informe-premium`.
3. Subir frontend a Vercel.

## Nota
Riesgos, clima, pendiente, altitud y geometría quedan preparados en el modelo, pero solo deben completarse con datos verificables o fuentes oficiales. El sistema no inventa esos antecedentes.
