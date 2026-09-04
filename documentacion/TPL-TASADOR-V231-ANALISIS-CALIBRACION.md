# Reporte de Calibración y Sesgos Sistemáticos

## Sesgo Sistemático General
Existe un sesgo de subvaloración crítico en el motor V2.3. Las tasaciones se encuentran en promedio un **69.6% por debajo** del precio de venta publicado en el mercado real.

### Desglose por Comuna

| Comuna | Parcelas | Promedio Publicado | Promedio Tasador | Dif Promedio (%) | Dif Máxima (%) | Dif Mínima (%) |
|---|---|---|---|---|---|---|
| Florida | 8 | $47.144.625 | $7.367.500 | -80.3% | -76.0% | -92.7% |
| Quillón | 6 | $32.381.667 | $17.131.667 | -46.8% | -35.0% | -77.5% |
| Nacimiento | 6 | $12.187.667 | $4.245.000 | -64.7% | -59.0% | -69.7% |
| Negrete | 2 | $32.550.000 | $5.470.000 | -83.0% | -81.1% | -84.9% |
| Pemuco | 1 | $98.000.000 | $37.900.000 | -61.3% | -61.3% | -61.3% |
| Pucón | 1 | $180.000.000 | $4.630.000 | -97.4% | -97.4% | -97.4% |
| Yumbel | 8 | $40.682.500 | $11.527.500 | -72.6% | -39.1% | -86.8% |
| Ñipas | 1 | $25.000.000 | $4.920.000 | -80.3% | -80.3% | -80.3% |

### Ranking de Desviaciones (Sesgo Extremo)

#### Las 10 Parcelas Más Subvaloradas (Oportunidades Extremas / Calibración Necesaria):
1. Comuna **Pucón** (ID `1bbe3e83...`): Tasado en $4.630.000 vs publicado en $180.000.000 (**-97.4%**)
2. Comuna **Florida** (ID `e839fc10...`): Tasado en $10.940.000 vs publicado en $150.000.000 (**-92.7%**)
3. Comuna **Yumbel** (ID `14d670f4...`): Tasado en $4.100.000 vs publicado en $31.100.000 (**-86.8%**)
4. Comuna **Yumbel** (ID `9bc37c4c...`): Tasado en $13.320.000 vs publicado en $95.000.000 (**-86.0%**)
5. Comuna **Negrete** (ID `d17473c4...`): Tasado en $5.470.000 vs publicado en $36.200.000 (**-84.9%**)
6. Comuna **Yumbel** (ID `c28641d2...`): Tasado en $3.830.000 vs publicado en $24.980.000 (**-84.7%**)
7. Comuna **Florida** (ID `00693890...`): Tasado en $5.790.000 vs publicado en $35.000.000 (**-83.5%**)
8. Comuna **Negrete** (ID `86685702...`): Tasado en $5.470.000 vs publicado en $28.900.000 (**-81.1%**)
9. Comuna **Ñipas** (ID `8118c042...`): Tasado en $4.920.000 vs publicado en $25.000.000 (**-80.3%**)
10. Comuna **Yumbel** (ID `268e05c1...`): Tasado en $4.920.000 vs publicado en $24.980.000 (**-80.3%**)

#### Las 10 Parcelas Con Menor Desviación o Mayor Valoración:
1. Comuna **Quillón** (ID `8ef15268...`): Tasado en $6.500.000 vs publicado en $10.000.000 (**-35.0%**)
2. Comuna **Yumbel** (ID `3377f828...`): Tasado en $28.280.000 vs publicado en $46.400.000 (**-39.1%**)
3. Comuna **Quillón** (ID `21e2e93f...`): Tasado en $9.620.000 vs publicado en $16.000.000 (**-39.9%**)
4. Comuna **Quillón** (ID `6da1141a...`): Tasado en $4.920.000 vs publicado en $8.490.000 (**-42.0%**)
5. Comuna **Quillón** (ID `55017df4...`): Tasado en $68.210.000 vs publicado en $120.000.000 (**-43.2%**)
6. Comuna **Quillón** (ID `023b9e7d...`): Tasado en $7.630.000 vs publicado en $13.500.000 (**-43.5%**)
7. Comuna **Yumbel** (ID `c4a50080...`): Tasado en $26.180.000 vs publicado en $50.480.000 (**-48.1%**)
8. Comuna **Nacimiento** (ID `dec71129...`): Tasado en $2.740.000 vs publicado en $6.690.000 (**-59.0%**)
9. Comuna **Pemuco** (ID `5833f5eb...`): Tasado en $37.900.000 vs publicado en $98.000.000 (**-61.3%**)
10. Comuna **Nacimiento** (ID `2cf624fd...`): Tasado en $4.820.000 vs publicado en $12.500.000 (**-61.4%**)

## Propuesta de Calibración
1. **Calibración Comunal**: Es evidente que usar un anclaje único basado en Ñipas aplanó los valores de comunas de mayor dinamismo inmobiliario (como Pucón, con -97% de desviación).
2. **Ajuste de Multiplicadores Turísticos**: En Pucón, la distancia a la capital regional castiga de forma desmedida a una zona donde el metro cuadrado vale el triple. La variable "Zona Turística Nacional" debe configurarse para proteger el piso de valor.
3. **Calibración del Segmento Físico**: Se propone aumentar el valor por m² base de los tramos de superficie o aplicar multiplicadores de conectividad real CONIT (tiempo de traslado) en lugar de lineales para reducir el castigo por aislamiento.
