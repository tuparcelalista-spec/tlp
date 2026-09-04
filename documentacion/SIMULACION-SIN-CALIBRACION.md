# Simulación Sin Calibración Global (Ñipas)

> **IMPORTANTE**: Este reporte es una simulación. No se ha modificado el motor oficial.

## Factor de Calibración Actual
- **CALIBRATION_FACTOR**: `0.28666189`
- **Efecto**: Multiplica todos los valores finales por ~28.7% (reduce el valor un ~71.3%)
- **Origen**: Ancla de Ñipas (parcela 5.000 m² a 2,48 km = $25.000.000 CLP)

## Resumen Comparativo Global

| Métrica | Con Calibración Ñipas | Sin Calibración | ¿Mejora? |
|---|---|---|---|
| **Error Porcentual Medio (MPE)** | -69.3% | 7.2% | ✅ |
| **Error Absoluto Porcentual Medio (MAPE)** | 69.3% | 47.4% | ✅ |
| **Mediana de Diferencia** | -77.5% | -21.5% | ✅ |
| **Desviación Estándar** | 16.4% | 57.2% | ❌ |
| **Error Absoluto Medio ($)** | $29.659.788 | $21.528.818 | ✅ |

### Veredicto
> [!TIP]
> **4/5 métricas mejoran** al eliminar la calibración global. Se recomienda proceder con la eliminación.

## Tabla Comparativa Completa (33 Propiedades)

| ID | Comuna | Superficie | Valor Publicado | Tasador Actual | Sin Calibración | Dif Actual (%) | Dif Sin Calib (%) | $/m² Publicado | $/m² Sin Calib |
|---|---|---|---|---|---|---|---|---|---|
| `00693890…` | Florida | 5.030 m² | $35.000.000 | $5.790.000 | $20.190.000 | -83.5% | -42.3% ✅ | $6.958 | $4.014 |
| `55017df4…` | Quillón | 100.000 m² | $120.000.000 | $68.210.000 | $237.960.000 | -43.2% | 98.3%  | $1.200 | $2.380 |
| `e839fc10…` | Florida | 11.000 m² | $150.000.000 | $10.940.000 | $38.180.000 | -92.7% | -74.5% ✅ | $13.636 | $3.471 |
| `dec71129…` | Nacimiento | 5.000 m² | $6.690.000 | $2.740.000 | $9.550.000 | -59.0% | 42.8% ✅ | $1.338 | $1.910 |
| `dd042326…` | Florida | 8.700 m² | $42.640.000 | $9.060.000 | $31.600.000 | -78.8% | -25.9% ✅ | $4.901 | $3.632 |
| `d17473c4…` | Negrete | 5.000 m² | $36.200.000 | $5.470.000 | $19.090.000 | -84.9% | -47.3% ✅ | $7.240 | $3.818 |
| `5833f5eb…` | Pemuco | 100.000 m² | $98.000.000 | $37.900.000 | $132.200.000 | -61.3% | 34.9% ✅ | $980 | $1.322 |
| `7576efac…` | Nacimiento | 10.000 m² | $14.900.000 | $5.370.000 | $18.720.000 | -64.0% | 25.6% ✅ | $1.490 | $1.872 |
| `86685702…` | Negrete | 5.000 m² | $28.900.000 | $5.470.000 | $19.090.000 | -81.1% | -33.9% ✅ | $5.780 | $3.818 |
| `8ef15268…` | Quillón | 6.000 m² | $10.000.000 | $6.500.000 | $22.680.000 | -35.0% | 126.8%  | $1.667 | $3.780 |
| `023b9e7d…` | Quillón | 8.000 m² | $13.500.000 | $7.630.000 | $26.630.000 | -43.5% | 97.3%  | $1.688 | $3.329 |
| `1bbe3e83…` | Pucón | 5.000 m² | $180.000.000 | $26.180.000 | $91.340.000 | -85.5% | -49.3% ✅ | $36.000 | $18.268 |
| `14d670f4…` | Yumbel | 5.000 m² | $31.100.000 | $4.100.000 | $14.320.000 | -86.8% | -54.0% ✅ | $6.220 | $2.864 |
| `3638ed74…` | Quillón | 5.000 m² | $26.300.000 | $5.910.000 | $20.620.000 | -77.5% | -21.6% ✅ | $5.260 | $4.124 |
| `c4a50080…` | Yumbel | 40.200 m² | $50.480.000 | $26.180.000 | $91.340.000 | -48.1% | 80.9%  | $1.256 | $2.272 |
| `2a32a70d…` | Nacimiento | 5.000 m² | $13.658.000 | $4.820.000 | $16.800.000 | -64.7% | 23.0% ✅ | $2.732 | $3.360 |
| `86fc06ab…` | Nacimiento | 5.000 m² | $9.578.000 | $2.900.000 | $10.120.000 | -69.7% | 5.7% ✅ | $1.916 | $2.024 |
| `f1410d68…` | Florida | 5.000 m² | $24.360.000 | $5.470.000 | $19.090.000 | -77.5% | -21.6% ✅ | $4.872 | $3.818 |
| `c28641d2…` | Yumbel | 7.000 m² | $24.980.000 | $3.830.000 | $13.360.000 | -84.7% | -46.5% ✅ | $3.569 | $1.909 |
| `3377f828…` | Yumbel | 43.600 m² | $46.400.000 | $28.280.000 | $98.650.000 | -39.1% | 112.6%  | $1.064 | $2.263 |
| `afb09c54…` | Florida | 5.021 m² | $24.377.000 | $5.490.000 | $19.160.000 | -77.5% | -21.4% ✅ | $4.855 | $3.816 |
| `fd811fd7…` | Florida | 5.000 m² | $20.000.000 | $4.790.000 | $16.700.000 | -76.0% | -16.5% ✅ | $4.000 | $3.340 |
| `8118c042…` | Ñipas | 5.000 m² | $25.000.000 | $4.920.000 | $17.180.000 | -80.3% | -31.3% ✅ | $5.000 | $3.436 |
| `78172e87…` | Nacimiento | 5.000 m² | $15.800.000 | $4.820.000 | $16.800.000 | -69.5% | 6.3% ✅ | $3.160 | $3.360 |
| `c981f721…` | Florida | 9.800 m² | $47.580.000 | $9.960.000 | $34.740.000 | -79.1% | -27.0% ✅ | $4.855 | $3.545 |
| `093355bf…` | Florida | 6.800 m² | $33.200.000 | $7.440.000 | $25.960.000 | -77.6% | -21.8% ✅ | $4.882 | $3.818 |
| `268e05c1…` | Yumbel | 5.000 m² | $24.980.000 | $4.920.000 | $17.180.000 | -80.3% | -31.2% ✅ | $4.996 | $3.436 |
| `21e2e93f…` | Quillón | 9.500 m² | $16.000.000 | $9.620.000 | $33.550.000 | -39.9% | 109.7%  | $1.684 | $3.532 |
| `2cf624fd…` | Nacimiento | 5.000 m² | $12.500.000 | $4.820.000 | $16.800.000 | -61.4% | 34.4% ✅ | $2.500 | $3.360 |
| `6da1141a…` | Quillón | 5.000 m² | $8.490.000 | $4.920.000 | $17.180.000 | -42.0% | 102.4%  | $1.698 | $3.436 |
| `5b09f810…` | Yumbel | 6.500 m² | $15.800.000 | $3.560.000 | $12.410.000 | -77.5% | -21.5% ✅ | $2.431 | $1.909 |
| `6a749e24…` | Yumbel | 10.700 m² | $36.720.000 | $8.030.000 | $28.000.000 | -78.1% | -23.7% ✅ | $3.432 | $2.617 |
| `9bc37c4c…` | Yumbel | 20.000 m² | $95.000.000 | $13.320.000 | $46.460.000 | -86.0% | -51.1% ✅ | $4.750 | $2.323 |

## Resumen por Comuna

| Comuna | Parcelas | Prom. Publicado | Prom. Actual | Prom. Sin Calib | Dif Actual (%) | Dif Sin Calib (%) | $/m² Pub | $/m² Sin Calib | ¿Mejora? |
|---|---|---|---|---|---|---|---|---|---|
| **Pucón** | 1 | $180.000.000 | $26.180.000 | $91.340.000 | -85.5% | -49.3% | $36.000 | $18.268 | ✅ Mejora |
| **Negrete** | 2 | $32.550.000 | $5.470.000 | $19.090.000 | -83.0% | -40.6% | $6.510 | $3.818 | ✅ Mejora |
| **Florida** | 8 | $47.144.625 | $7.367.500 | $25.702.500 | -80.3% | -31.4% | $6.120 | $3.682 | ✅ Mejora |
| **Ñipas** | 1 | $25.000.000 | $4.920.000 | $17.180.000 | -80.3% | -31.3% | $5.000 | $3.436 | ✅ Mejora |
| **Yumbel** | 8 | $40.682.500 | $11.527.500 | $40.215.000 | -72.6% | -4.3% | $3.465 | $2.449 | ✅ Mejora |
| **Nacimiento** | 6 | $12.187.667 | $4.245.000 | $14.798.333 | -64.7% | 23.0% | $2.189 | $2.648 | ✅ Mejora |
| **Pemuco** | 1 | $98.000.000 | $37.900.000 | $132.200.000 | -61.3% | 34.9% | $980 | $1.322 | ✅ Mejora |
| **Quillón** | 6 | $32.381.667 | $17.131.667 | $59.770.000 | -46.8% | 85.5% | $2.200 | $3.430 | ❌ Empeora |

## Análisis de Comunas Clave

### Pucón (1 parcelas)
- Promedio publicado: $180.000.000
- Promedio tasador actual: $26.180.000 (-85.5%)
- Promedio sin calibración: $91.340.000 (-49.3%)
- $/m² publicado: $36.000 | $/m² sin calibración: $18.268
- Resultado: ✅ Mejora

### Quillón (6 parcelas)
- Promedio publicado: $32.381.667
- Promedio tasador actual: $17.131.667 (-46.8%)
- Promedio sin calibración: $59.770.000 (85.5%)
- $/m² publicado: $2.200 | $/m² sin calibración: $3.430
- Resultado: ❌ Empeora

### Yumbel (8 parcelas)
- Promedio publicado: $40.682.500
- Promedio tasador actual: $11.527.500 (-72.6%)
- Promedio sin calibración: $40.215.000 (-4.3%)
- $/m² publicado: $3.465 | $/m² sin calibración: $2.449
- Resultado: ✅ Mejora

### Florida (8 parcelas)
- Promedio publicado: $47.144.625
- Promedio tasador actual: $7.367.500 (-80.3%)
- Promedio sin calibración: $25.702.500 (-31.4%)
- $/m² publicado: $6.120 | $/m² sin calibración: $3.682
- Resultado: ✅ Mejora

## Evaluación de Criterios de Aprobación

| Criterio | Resultado |
|---|---|
| Error promedio disminuye | ✅ SÍ (-69.3% → 7.2%) |
| Diferencias por comuna se reducen | ✅ SÍ (7/8 comunas mejoran) |
| Pucón, Quillón, Yumbel, Florida coherentes | ✅ SÍ (Pucón: ✅, Quillón: ❌, Yumbel: ✅, Florida: ✅) |
| Modelo estable | ❌ NO (σ: 16.4% → 57.2%) |

### Decisión Recomendada

> [!IMPORTANT]
> **No todos los criterios se cumplen.** Se recomienda revisar los resultados antes de proceder.
> Criterios cumplidos: 3/4
