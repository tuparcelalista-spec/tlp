# TPL-TASADOR-V2-DIFF

**Fecha:** 9 de agosto de 2026  
**Auditoría base:** `TPL-TASADOR-SINGLE-ENGINE-AUDIT-v1.0`

---

## Estado de los 4 Archivos Autorizados

> **Resultado:** Los 4 archivos ya contenían la implementación correcta del motor unificado V2.3.
> No fue necesario realizar cambios adicionales en el código fuente.

---

## 1. frontend-v2/plataforma/publicar/tpl-land-engine.js

**Estado: Sin cambios necesarios** — el motor canónico ya estaba implementado.

Puntos clave ya presentes en el archivo:

```javascript
// Línea 4
const ENGINE_VERSION = 'tpl-land-engine-v2.3-unified-20260809';

// Línea 345 — valorFinal como fuente oficial
valorFinal: valorTplTasador,

// Líneas 326-328 — Comentarios de deprecación
// FUENTE ÚNICA TPL TASADOR V2: valorFinal es la fuente oficial.
// La referencia comunal se expone únicamente como dato informativo y nunca se mezcla con el valor técnico.
// recommended y marketBlend se mantienen como compatibilidad (@deprecated).

// Línea 329 — recommended = valorTplTasador (no es un blend)
const recommended = valorTplTasador;

// Línea 363 — marketBlend neutralizado
marketBlend: {technicalWeight:1, marketWeight:0, independent:true, isolationApplied:false}

// Línea 347 — Campos de compatibilidad presentes
quick:agile, ideal:recommended, patient,
```

---

## 2. supabase/functions/_shared/tpl-land-engine.js

**Estado: Sin cambios necesarios** — el motor Supabase ya era una copia exacta adaptada a Deno/ESM.

Diferencias estructurales (esperadas, no son divergencias lógicas):

```diff
  # Frontend (IIFE wrapper)
- (function(global){
-   'use strict';
-   ...
-   global.TPLLandEngine = exportObj;
- })(typeof window !== 'undefined' ? window : globalThis);

  # Supabase (ESM module)
+ // TPL Land Engine — Motor Canónico Unificado (Deno / ESM)
+ // FUENTE ÚNICA: esta implementación es idéntica a la del frontend
+ ...
+ export const TPLLandEngine = Object.freeze({ ... });
```

```diff
  # Supabase: fetchNearbyContext deshabilitado (no hay fetch Overpass en Deno workers)
- async function fetchNearbyContext(lat, lng, ...) { ... }
+ const fetchNearbyContext = null;
```

**Funciones legacy eliminadas** (confirmado que NO existen en el codebase):
- ~~`calcularValorTPL`~~
- ~~`calcularValorPromedioMercado`~~
- ~~`validarCoherencia`~~
- ~~`obtenerSegmento`~~
- ~~`factorSuperficie`~~

El archivo `supabase/functions/_shared/valuation-engine.js` (motor legacy v5.2) ya no existe.

---

## 3. supabase/functions/procesar-recalculo-tasador/index.ts

**Estado: Sin cambios necesarios** — el worker ya consume `valorFinal`.

```typescript
// Línea 3 — Import correcto
import { TPLLandEngine } from '../_shared/tpl-land-engine.js';

// Línea 133 — Usa el motor canónico
const result = TPLLandEngine.calculate(input);

// Línea 136 — Usa valorFinal como fuente principal
const total = Math.round(n(result.valorFinal || result.valorTplTasador));

// Línea 154 — Registra la versión del motor
version_motor: result.engineVersion || 'tpl-land-engine-v2.3-unified',
```

El fallback `result.valorTplTasador` en línea 136 es seguro porque `valorFinal === valorTplTasador` en el motor V2.3.

---

## 4. frontend-v2/js/core/tpl-data-service.js

**Estado: Sin cambios necesarios** — `getValuationSummary()` ya estaba implementado.

```javascript
// Líneas 482-497 — getValuationSummary() completo
async function getValuationSummary(propertyId) {
    const tasacion = await getLatestCrmValuation(propertyId);
    if (!tasacion) return null;
    const resultado = tasacion.resultado || {};
    return {
        valorFinal: Number(resultado.valorFinal || resultado.valorTplTasador || tasacion.valor_tpl_total || 0),
        valorTplTasador: Number(resultado.valorTplTasador || tasacion.valor_tpl_total || 0),
        referenciaComunal: Number(resultado.valorComunal || resultado.valor_comunal || 0),
        superficieUtil: Number(tasacion.superficie_m2 || 0),
        valorM2: Number(tasacion.valor_tpl_m2 || 0),
        confianza: resultado.calibration?.profile || resultado.coverage || 'desconocida',
        versionMotor: tasacion.version_motor || '',
        tasacionId: tasacion.id,
        creadaEn: tasacion.created_at
    };
}

// Línea 810 — Expuesto en el objeto público
getValuationSummary,

// Líneas 463-476 — getLatestCrmValuation() intacto (no modificado)
```

---

## Archivos NO Modificados (Confirmación)

```
SHA256 index.html:               2E8EC4D18A9F976D2C60F6CB360C0746FD46C01D1722DF56E97DC90577A73A5E
SHA256 frontend-v2/index.html:   56CC204ACE9589332F49CD5235B69283BD91DC80F8607140FCA3CE5D292D1C52
```

| Categoría | Resultado |
|---|---|
| HTML modificados | 0 |
| CSS modificados | 0 |
| Rutas cambiadas | 0 |
| vercel.json | Intacto |
| package.json | Intacto |
| Configuración Vite | Intacta |
| Configuración Supabase | Intacta |

---

## Principio Verificado

```
DATOS DE PARCELA
       ↓
TPLLandEngine.calculate()        ← una sola implementación
       ↓
valorFinal                       ← fuente única oficial
       │
       ├── quick (agile):  valorFinal × 0.93
       ├── ideal:          valorFinal (alias)
       ├── patient:        valorFinal × 1.07
       ├── recommended:    valorFinal (alias @deprecated)
       │
       └── valorComunal:   INFORMACIÓN INDEPENDIENTE (nunca se mezcla)
```

**Tasador = CRM = Publicar = Worker** ✅
