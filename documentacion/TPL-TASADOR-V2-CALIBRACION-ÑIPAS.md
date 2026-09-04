# TPL Tasador V2 - Calibración Ñipas (Anchor)

El modelo utiliza un ancla de valor sobre la comuna de Ñipas. Todo el valor técnico se multiplica por el factor de calibración para llevarlo a precios reales de mercado.

## Muestra Ancla (Ñipas)
- ID: 8118c042-975d-4933-8a2a-15ac053a3c34
- Factor de calibración aplicado: 0.2866x
- Ajuste absoluto Ñipas: $-48.005.086,786
- El valor final para Ñipas en la simulación resultó en **$19.290.000**

### Análisis del Ancla
Al multiplicar el valor ajustado por este factor constante, el modelo fuerza una escala relativa. Si Ñipas tiene un valor real de mercado muy inferior a lo que el motor técnico estima, el factor de calibración será menor a 1, arrastrando a todas las demás propiedades a la baja (que es lo que produce gran parte del -22%).
