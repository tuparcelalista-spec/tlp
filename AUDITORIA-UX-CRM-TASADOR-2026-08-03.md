# Auditoría UX CRM y Tasador TPL

## Objetivo
Simplificar el trabajo del asesor y estabilizar el flujo: Ver propiedad → Tasar → entender valores → completar datos → Informe Premium.

## Cambios aplicados
- Acciones principales reducidas a Ver propiedad, Tasar, Informe Premium y Más.
- Tasación rápida no abre automáticamente el informe; primero muestra Valor TPL, Apuro y Sin apuro en la tarjeta.
- Informe Premium queda deshabilitado mientras no exista una tasación real.
- Acciones secundarias pasan a Más: Vista CRM, completar/recalcular y TPL Studio.
- Se agregó explicación desplegable de cómo se obtuvo el valor usando mercado comunal, ponderación técnica, mercado observado, ubicación, superficie y confianza.
- Mapa Leaflet con zoom visible, rueda, doble clic y gestos táctiles.
- Marcador TPL propio para evitar iconos invisibles por rutas CDN.
- Mensaje sobre el mapa para orientar al asesor.
- Tasación completa mantiene guardado de antecedentes; la rápida usa región, comuna y superficie como mínimos.

## Flujo recomendado
1. Verificar región, comuna y superficie.
2. Presionar Tasar.
3. Revisar Valor TPL, Apuro y Sin apuro.
4. Abrir Cómo se llegó a estos valores.
5. Usar Más → Completar datos y tasar para mejorar precisión.
6. Generar Informe Premium.

## Archivos modificados
- frontend-v2/plataforma/crm-v2/crm-v2.js
- frontend-v2/plataforma/crm-v2/crm-v2.css
- frontend-v2/plataforma/publicar/tasador.html
- frontend-v2/plataforma/publicar/tasador-publico.js
- frontend-v2/plataforma/publicar/tasador-publico.css
