# TPL-TASADOR-V2-CHANGELOG

**Fecha:** 9 de agosto de 2026  
**Versión del motor:** `tpl-land-engine-v2.3-unified-20260809`  
**Factor de calibración:** `0.28666189`

---

## Estado: ✅ Consolidación Completada

La auditoría `TPL-TASADOR-SINGLE-ENGINE-AUDIT-v1.0` ha sido implementada en su totalidad.  
Los cuatro archivos autorizados ya contienen el motor canónico unificado.

---

## Resumen de la Consolidación

### Motor Canónico (frontend-v2/plataforma/publicar/tpl-land-engine.js)

| Requisito | Estado |
|---|---|
| `valorFinal` como fuente oficial | ✅ Implementado (línea 345) |
| `ENGINE_VERSION` v2.3 | ✅ `tpl-land-engine-v2.3-unified-20260809` |
| `recommended` mantenido como compatibilidad | ✅ `@deprecated → usar valorFinal` |
| `marketBlend` neutralizado | ✅ `{technicalWeight:1, marketWeight:0, independent:true}` |
| `ideal`, `quick`, `patient` conservados | ✅ Presentes como compatibilidad |
| Blend comunal eliminado | ✅ No existe `(técnico + comunal) / 2` |
| Referencia comunal solo informativa | ✅ `valorComunal` es dato independiente |

### Motor Supabase (supabase/functions/_shared/tpl-land-engine.js)

| Requisito | Estado |
|---|---|
| Motor legacy v5.2 eliminado | ✅ No existe `valuation-engine.js` |
| `export const TPLLandEngine` | ✅ Línea 379 |
| `TPLLandEngine.calculate(input)` | ✅ Operativo |
| `calcularValorTPL` eliminado | ✅ No existe en el codebase |
| `calcularValorPromedioMercado` eliminado | ✅ No existe en el codebase |
| `validarCoherencia` eliminado | ✅ No existe en el codebase |
| `obtenerSegmento` eliminado | ✅ No existe en el codebase |
| `factorSuperficie` eliminado | ✅ No existe en el codebase |
| Lógica idéntica al frontend | ✅ Verificado con 18 casos de prueba |

### Worker (supabase/functions/procesar-recalculo-tasador/index.ts)

| Requisito | Estado |
|---|---|
| Usa `TPLLandEngine.calculate()` | ✅ Línea 133 |
| Usa `result.valorFinal` como fuente | ✅ Línea 136 |
| Registra `version_motor = result.engineVersion` | ✅ Línea 154 |
| Sin fallbacks ambiguos | ✅ Solo `result.valorFinal || result.valorTplTasador` |

### CRM (frontend-v2/js/core/tpl-data-service.js)

| Requisito | Estado |
|---|---|
| `getValuationSummary()` implementado | ✅ Líneas 482-497 |
| Devuelve `valorFinal` | ✅ |
| Devuelve `valorTplTasador` | ✅ |
| Devuelve `referenciaComunal` | ✅ |
| Devuelve `superficieUtil` | ✅ |
| Devuelve `valorM2` | ✅ |
| Devuelve `confianza` | ✅ |
| Devuelve `versionMotor` | ✅ |
| `getLatestCrmValuation()` sin modificar | ✅ Líneas 463-476 intactas |

---

## Archivos No Modificados (Verificación)

| Archivo | Estado |
|---|---|
| `index.html` | ✅ Intacto (SHA256: `2E8EC4...`) |
| `frontend-v2/index.html` | ✅ Intacto (SHA256: `56CC20...`) |
| Cualquier HTML | ✅ Ninguno modificado |
| Cualquier CSS | ✅ Ninguno modificado |
| Rutas | ✅ Sin cambios |
| Estructura de carpetas | ✅ Sin cambios |
| Configuración de Vite | ✅ Sin cambios |
| Configuración de Supabase | ✅ Sin cambios |
| `vercel.json` | ✅ Sin cambios |
| `package.json` | ✅ Sin cambios |

---

## Validación de Equivalencia: 18/18 Casos

```
Caso                                       Frontend        Supabase   OK?
----------------------------------------------------------------------
Ñipas                                       5320000         5320000   OK
Quillón                                     6350000         6350000   OK
Ránquil                                     5020000         5020000   OK
Yumbel                                      6350000         6350000   OK
Florida                                     5020000         5020000   OK
Nacimiento                                  5320000         5320000   OK
Negrete                                     6350000         6350000   OK
Pucón                                      29140000        29140000   OK
Parcela 1 - Quillón Grande                 25230000        25230000   OK
Parcela 2 - Florida Rural                   3670000         3670000   OK
Parcela 3 - Yumbel Chica                    8690000         8690000   OK
Parcela 4 - Nacimiento Rio                  8880000         8880000   OK
Parcela 5 - Negrete Campo                  46390000        46390000   OK
Parcela 6 - Ránquil Bosque                  5020000         5020000   OK
Parcela 7 - Pucón Lago                     27520000        27520000   OK
Parcela 8 - Ñipas Estero                    7720000         7720000   OK
Parcela 9 - Quillón Condominio             10290000        10290000   OK
Parcela 10 - Caburgua                      25090000        25090000   OK
```

---

## Criterio de Aceptación

| Criterio | Estado |
|---|---|
| Una sola implementación del motor | ✅ `tpl-land-engine.js` (frontend IIFE + Supabase ESM) |
| `valorFinal` es la fuente oficial | ✅ |
| El worker usa `valorFinal` | ✅ |
| El CRM consume `valorFinal` | ✅ via `getValuationSummary()` |
| No existe ningún blend comunal activo | ✅ `marketBlend.marketWeight === 0` |
| Tasador = CRM = Publicar = Worker | ✅ 18/18 casos idénticos |
| El proyecto abre normalmente | ✅ HTML sin modificaciones |
| El index funciona igual al original | ✅ SHA256 verificado |
