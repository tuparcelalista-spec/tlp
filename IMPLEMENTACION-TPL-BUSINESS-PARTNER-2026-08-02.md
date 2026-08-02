# Implementación TPL Business + Red Partner

## Alcance
- Portal TPL Business multirol.
- Panel Partner con empresa, puntuación, landing, solicitudes, propuestas, trabajos, Studio y plan.
- Prueba automática de 30 días del Plan Partner Básico.
- Creación de cuenta/invitación Supabase Auth.
- Borrador inicial de landing en Studio.
- Correos automáticos de aprobación y acceso.
- Persistencia de propuesta corta, diferenciación, último trabajo y puntuaciones.

## Supabase
Ejecutar primero:

`supabase/migrations/202608020001_tpl_business_partner_trial_v1.sql`

Desplegar:

```bash
npx supabase@latest functions deploy activar-partner-aprobado --no-verify-jwt
```

Configurar:

```bash
npx supabase@latest secrets set TPL_PARTNER_EMAIL_FROM="Tu Parcela Lista <partners@parcelalista.cl>"
npx supabase@latest secrets set TPL_REPLY_TO="tuparcelalista@gmail.com"
```

## Activación después de aprobar
La RPC `tpl_revisar_partner_v2` deja el onboarding en estado `pendiente`. El CRM administrativo debe invocar la Edge Function con el `postulacion_id` inmediatamente después de aprobar:

```js
const { data, error } = await supabase.functions.invoke('activar-partner-aprobado', {
  body: { postulacion_id }
});
```

La función comprueba que la sesión corresponda a un usuario registrado en `tpl_staff`.

## Prueba
1. Aprobar una postulación Partner desde una cuenta staff.
2. Invocar `activar-partner-aprobado`.
3. Confirmar dos correos.
4. Abrir el enlace de acceso.
5. Entrar a `/plataforma/tpl-business/`.
6. Confirmar panel Partner y prueba de 30 días.
7. Abrir Studio desde Mi landing.
