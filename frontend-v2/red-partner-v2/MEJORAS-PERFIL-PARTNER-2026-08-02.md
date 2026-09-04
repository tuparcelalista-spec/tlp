# Mejoras perfil Partner

Se incorporó captura y presentación de:

- Propuesta de valor en máximo cinco palabras.
- Diferenciación concreta frente a otros proveedores.
- Puntaje de completitud visible durante la postulación.
- Actividades y proceso habitual del servicio.
- Último trabajo explicado por etapas, duración y evidencia.
- Métodos, anticipo, garantía y condiciones de pago.
- Presentación de estos atributos en perfil y currículum cuando el backend público los exponga.

## Supabase

El RPC `tpl_postular_partner_v2(jsonb)` recibe un objeto JSONB, por lo que el frontend envía las claves nuevas sin romper las existentes. Para mostrarlas públicamente, la tabla/vista o RPC público debe conservar y devolver: `propuesta_corta`, `diferenciacion`, `puntaje_completitud_inicial`, `condiciones_pago` y `ultimo_trabajo`.

El puntaje implementado es de **completitud inicial**, no reputación. La reputación futura debe calcularse con trabajos confirmados, cumplimiento, evaluaciones, tiempos de respuesta y documentación verificada.
