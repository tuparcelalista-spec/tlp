# Implementación Index · Búsqueda premium y comunas

## Cambios
- Barra de comunas bajo el menú, ordenada por región.
- Acceso directo desde comuna a la grilla filtrada.
- “Más cercanas” reordena la grilla actual sin saltar al buscador.
- Búsqueda de parcelas diferenciada de parcela + vivienda.
- Estética más sobria, minimalista y premium.
- Textos más claros sobre el alcance de cada búsqueda.

## Archivos modificados
- frontend-v2/index.html
- frontend-v2/css/index.css
- frontend-v2/js/index.js

## Despliegue
```bash
git add .
git commit -m "Mejorar búsqueda de parcelas y proyectos"
git push origin main
vercel --prod
```

No requiere migración de Supabase.
