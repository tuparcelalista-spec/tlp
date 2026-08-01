# Etapa 2 — Pago seguro y entrega de informe premium

## Implementado
- Edge Function `crear-pago-informe`: crea la orden en Supabase y solicita el pago a Flow sin exponer secretos.
- Edge Function `flow-webhook`: recibe el token de Flow, consulta `payment/getStatus` y actualiza la orden.
- Edge Function `generar-informe-premium`: genera un PDF privado, lo guarda en Storage y opcionalmente lo envía por Resend.
- Edge Function `estado-informe`: entrega al frontend solamente el estado y una URL firmada temporal.
- Página `plataforma/publicar/pago-informe.html` con consulta automática del estado.
- El botón del informe ahora inicia el pago y redirige a Flow.

## Supabase: pasos obligatorios
1. Ejecutar `202608010001_tpl_productos_planes_informes_v1.sql` si aún no se ejecutó.
2. Ejecutar `202608010002_tpl_pagos_informes_v1.sql`.
3. Desplegar las cuatro Edge Functions.
4. Configurar secretos indicados abajo.

## Secretos
- `FLOW_API_KEY`
- `FLOW_SECRET_KEY`
- `FLOW_ENV=sandbox` para pruebas o `production` para cobros reales
- `TPL_SITE_URL=https://www.parcelalista.cl`
- Opcionales para correo: `RESEND_API_KEY` y `TPL_EMAIL_FROM`

## Comandos sugeridos
```bash
npx supabase@latest functions deploy crear-pago-informe --no-verify-jwt
npx supabase@latest functions deploy flow-webhook --no-verify-jwt
npx supabase@latest functions deploy generar-informe-premium
npx supabase@latest functions deploy estado-informe --no-verify-jwt

npx supabase@latest secrets set FLOW_API_KEY="TU_API_KEY"
npx supabase@latest secrets set FLOW_SECRET_KEY="TU_SECRET_KEY"
npx supabase@latest secrets set FLOW_ENV="sandbox"
npx supabase@latest secrets set TPL_SITE_URL="https://www.parcelalista.cl"
```

Para correo:
```bash
npx supabase@latest secrets set RESEND_API_KEY="TU_RESEND_API_KEY"
npx supabase@latest secrets set TPL_EMAIL_FROM="Tu Parcela Lista <informes@parcelalista.cl>"
```

## Seguridad
- El monto oficial se conserva en la orden creada por el backend.
- Flow confirma mediante callback; la redirección del navegador no marca el pago como pagado.
- El PDF queda en bucket privado.
- La descarga usa URL firmada de una hora.
- Flow envía un token al callback; el servidor consulta el estado real en `payment/getStatus`.
