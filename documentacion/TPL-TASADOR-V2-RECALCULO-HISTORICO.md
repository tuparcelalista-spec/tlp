# TPL Tasador V2 - Recálculo Histórico Masivo

## Objetivo
Ejecutar el motor `TPLLandEngine V2.3` sobre todo el historial de propiedades en `tpl_propiedades` asegurando que la única fuente de verdad sea el `valorFinal` del motor unificado.

## Ejecución

Para iniciar el recálculo masivo sin necesidad de alterar el worker remoto en Supabase, se ha generado un script local preparado para utilizar el motor original del proyecto.

### Instrucciones:

1. Asegúrate de tener en `.env.local` la variable `SUPABASE_SERVICE_ROLE_KEY` (puedes agregarla temporalmente para la ejecución si no está).
2. Abre la terminal en el proyecto y ejecuta:
```bash
node scripts/recalcular-todas-las-propiedades.mjs
```

### Comportamiento del Script:
- Extrae la lista completa de propiedades y la procesa en lotes de 50.
- Ejecuta `TPLLandEngine.calculate()` para cada propiedad.
- Inserta una nueva entrada en `tpl_tasaciones` con la versión del motor `tpl-land-engine-v2.3-unified`.
- Conserva el historial intacto; no se realiza ningún borrado o alteración destructiva.

## Verificación de Criterios

- [x] Motor Intacto: El script requiere y usa directamente el archivo `supabase/functions/_shared/tpl-land-engine.js`.
- [x] Historial conservado: Las tasaciones antiguas quedan en la base de datos (con fechas anteriores).
- [x] Resiliencia: Diseñado para reanudarse por lotes y atrapar errores sin detener el lote completo.
