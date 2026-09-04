# TPL Tasador V2 - Ranking de Sensibilidad de Factores

Este reporte identifica qué parámetros tienen mayor peso absoluto en la variación de las propiedades y explican la tendencia del -22% de la muestra general.

| Ranking | Componente / Ajuste | Impacto Absoluto Promedio | Ocurrencias en Muestra |
|---|---|---|---|
| 1 | territorial | $75.138.125 | 20/20 |
| 2 | nipas_calibration | $70.674.583 | 20/20 |
| 3 | nature | $23.700.000 | 1/20 |
| 4 | seasonal | $20.292.645 | 20/20 |
| 5 | access_gate | $3.950.000 | 1/20 |
| 6 | route_distance | $0 | 0/20 |
| 7 | water | $0 | 0/20 |
| 8 | electricity | $0 | 0/20 |
| 9 | topography | $0 | 0/20 |
| 10 | tourism | $0 | 0/20 |

## Conclusión de Sensibilidad
El factor con mayor sensibilidad que explica el ajuste agresivo del motor es **territorial** con un impacto absoluto promedio de $75.138.125 CLP, seguido por **nipas_calibration**. Esto indica que para corregir el -22% sin desestabilizar el modelo, se debe revisar la ponderación de **territorial**.
