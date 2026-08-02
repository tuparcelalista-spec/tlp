# Implementación Etapa 3B — Onboarding Propietario Gratis

## Flujo implementado

1. El publicador registra actor, propiedad y publicación mediante `tpl_publicar_propiedad_v3`.
2. El frontend invoca `activar-propietario-gratis` con el ID de publicación y el correo confirmado.
3. La Edge Function valida que el correo coincida con el actor de la publicación.
4. Crea o reutiliza una suscripción al Plan Gratis.
5. Genera un enlace seguro de invitación o magic link con Supabase Auth.
6. Envía por Resend:
   - Confirmación de publicación recibida.
   - Bienvenida y acceso a Mi Propiedad TPL.
7. Crea notificaciones internas y registra el evento en CRM.
8. Guarda estados, IDs de Resend, intentos y errores para reintentos idempotentes.

## Archivos agregados

- `supabase/migrations/202608010004_tpl_onboarding_propietario_gratis_v1.sql`
- `supabase/functions/activar-propietario-gratis/index.ts`

## Archivos modificados

- `frontend-v2/js/core/tpl-data-service.js`
- `frontend-v2/plataforma/publicar/publicar.js`
- `frontend-v2/plataforma/publicar/index.html`

## Configuración Supabase

Ejecutar la migración `202608010004...` y desplegar la función:

```bash
npx supabase@latest functions deploy activar-propietario-gratis --no-verify-jwt
```

Configurar remitente y correo de respuesta:

```bash
npx supabase@latest secrets set TPL_OWNER_EMAIL_FROM="Tu Parcela Lista <propietarios@parcelalista.cl>"
npx supabase@latest secrets set TPL_REPLY_TO="tuparcelalista@gmail.com"
```

`RESEND_API_KEY` y `TPL_SITE_URL` deben continuar configurados.

## Seguridad

- La función no confía solo en el correo del navegador: compara el correo con el actor real de la publicación.
- La activación está limitada a publicaciones recientes.
- Máximo de cinco reintentos automáticos.
- El proceso es idempotente por publicación y por correo de Resend.
- Las claves privadas permanecen únicamente en Supabase Secrets.
- La publicación no se pierde si falla Auth o Resend.
