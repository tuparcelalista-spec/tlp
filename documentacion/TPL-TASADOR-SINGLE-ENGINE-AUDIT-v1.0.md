# TPL — Auditoría de Cerebro Único del Tasador v1.0

Fecha: 9 de agosto de 2026

## Objetivo

Reducir el ecosistema a un único motor activo de valoración y evitar que referencias de mercado/comuna vuelvan a entrar al cálculo técnico.

## Hallazgos

### 🟢 Motor activo conservado

`frontend-v2/plataforma/publicar/tpl-land-engine.js`

Es el motor que actualmente consumen las interfaces públicas y de publicación mediante `TPLLandEngine.calculate()`.

### 🔴 Duplicado de fórmula detectado

`supabase/functions/_shared/valuation-engine.js` contenía una segunda función `calcularValorPromedioMercado()` y no tenía referencias activas en el código. Fue eliminado por estar sin consumidores.

### 🔴 Ruta histórica/alternativa detectada

La migración `202608070001_tpl_tasador_v3_preview_comercial_v1.sql` contiene un preview SQL independiente que calcula un valor final ponderando 50% técnico y 50% comunal. No se encontró consumidor activo en `frontend-v2` ni en `supabase/functions`.

La migración histórica NO se elimina: las migraciones aplicadas deben conservarse por integridad del historial de Supabase. Debe considerarse una implementación histórica/preview y no una fuente activa del valor TPL.

### 🟠 Worker de recálculo

`supabase/functions/procesar-recalculo-tasador/index.ts` importa `supabase/functions/_shared/tpl-land-engine.js`. Ese archivo actualmente no expone el `TPLLandEngine` esperado por el worker, por lo que esta ruta debe tratarse como una brecha técnica pendiente antes de considerarla parte del cerebro único productivo.

## Corrección aplicada

En `frontend-v2/plataforma/publicar/tpl-land-engine.js`:

- `recommended` ahora representa exclusivamente `valorTplTasador`.
- `valorTplTasadorComuna` deja de ser un promedio y refleja el valor técnico para compatibilidad de consumidores existentes.
- `valorComunal` continúa siendo una referencia independiente.
- `valorVentaApuro` se deriva del valor técnico mediante el factor de venta ágil.
- El cálculo `(${valorTplTasador} + ${valorComunal}) / 2` fue eliminado del motor activo.
- `tplM2` se calcula sobre el Valor TPL técnico.

En `frontend-v2/plataforma/publicar/publicar.js`:

- La selección inicial del resultado utiliza el Valor TPL técnico.
- Se elimina el modo activo de mezcla `blend`.
- La referencia comunal sigue disponible como referencia independiente.

## Principio definitivo

```text
DATOS DE PARCELA
       ↓
TPLLandEngine.calculate()
       ↓
VALOR TPL TÉCNICO  ← único valor calculado
       │
       ├── Venta ágil / potencial: derivados del mismo valor
       │
       └── Referencia comunal: INFORMACIÓN INDEPENDIENTE
```

## No se elimina

No se borraron migraciones SQL históricas de Supabase. Eliminarlas físicamente puede romper la trazabilidad del historial de despliegues.

## Pendiente obligatorio

Antes de declarar el ecosistema 100% unificado, debe resolverse la ruta del worker `procesar-recalculo-tasador` para que consuma el mismo motor canónico sin mantener una segunda implementación de fórmula.
