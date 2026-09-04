# TPL-TASADOR-NIPAS-CALIBRATION-v1.0

## Objetivo
Ñipas se establece como parcela patrón de calibración monetaria del único motor TPL.

## Ancla
- Comuna: Ñipas
- Superficie: 5.000 m²
- Valor patrón: $25.000.000
- Referencia: $5.000/m²
- Perfil: `nipas-anchor-v1`

## Regla
El motor `TPLLandEngine.calculate()` conserva superficie, distancia territorial y
ajustes de atributos, pero aplica una única normalización monetaria global derivada
del caso patrón Ñipas. No existe una calibración monetaria distinta por comuna.

## Nuevas parcelas
Las parcelas ingresadas desde Publicar continúan usando `TPLLandEngine.calculate()`,
por lo que reciben automáticamente la misma calibración global.

## Referencia comunal
La referencia informativa se ancla a Ñipas y no se mezcla con el Valor TPL oficial.

## Flujo
```text
DATOS PARCELA
    ↓
TPLLandEngine.calculate()
    ↓
CÁLCULO TÉCNICO
    ↓
CALIBRACIÓN GLOBAL ÑIPAS
    ↓
VALOR TPL
```

## Estado
Implementado en el motor activo. Requiere validación con casos reales antes de
considerarlo definitivo para producción.
