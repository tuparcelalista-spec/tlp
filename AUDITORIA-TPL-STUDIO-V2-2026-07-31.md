# Auditoría e implementación — TPL Studio V2

## Resultado
El ZIP contenía un MVP visual útil, pero guardaba campañas y cola únicamente en `localStorage`, pedía repetir manualmente todos los datos, no tenía atribución integral y no conectaba de forma canónica CRM/TPL Business con campañas.

## Conservado
- Navegación Crear / Storyboard / Producción / Biblioteca.
- Generación de storyboard y narración.
- Producción de múltiples formatos desde una sola entrada.
- Estética base del Studio.
- Landing anterior y su capacidad de mostrar video existente, especialmente YouTube.

## Mejorado
- Studio ahora acepta contexto de propiedad, proyecto, propietario, corredor, cliente, partner o marca.
- Puede abrirse con `?tipo=propiedad&id=<UUID>` desde CRM o TPL Business.
- Recupera contexto mediante `tpl_studio_contexto_v1` y autocompleta el formulario.
- Agrega objetivos comerciales, estrategia sugerida y una advertencia para no representar obras inexistentes como reales.
- Amplía productos: landing, video, Reel/Short, Facebook, Instagram, YouTube, blog/SEO, PDF y WhatsApp.
- Agrega selección de canales y uso de videos existentes de YouTube/Facebook/Instagram como fuente o contenido enlazado.
- Campañas y recursos se guardan en Supabase; `localStorage` queda solo como fallback.
- Se incorpora una vista de resultados con visitas, leads y conversiones atribuidas por `campaign_id`.

## Base Supabase agregada
- `studio_campaigns`
- `studio_outputs`
- `studio_channel_connections`
- `studio_events`
- RPC `tpl_studio_contexto_v1`
- RPC `tpl_studio_resumen_v1`
- RLS por propietario de campaña o administrador.

## Seguridad corregida conceptualmente
- Los tokens de YouTube/Meta no se guardan en el navegador ni en columnas públicas; `token_secret_ref` debe apuntar a secretos de backend/Vault.
- La publicación OAuth real todavía requiere funciones de backend específicas para YouTube Data API y Meta Graph API.
- El Studio no afirma publicar en redes mientras esas integraciones no estén conectadas.

## Pendiente de integración con el frontend principal
1. Copiar `studio/` a `frontend-v2/plataforma/studio/`.
2. Cargar el cliente Supabase canónico antes de `studio-service.js`.
3. Ejecutar la migración SQL.
4. Agregar botones “Crear con TPL Studio” en CRM y TPL Business con tipo e ID.
5. Enviar eventos de landing, proyecto, WhatsApp, llamadas, preguntas, visitas, reservas y cierres a `studio_events` con `campaign_id`.
6. Crear Edge Functions OAuth/publicación para YouTube, Facebook e Instagram.

## Nota honesta
Esta entrega transforma el MVP en una base canónica y medible, pero no publica automáticamente en redes todavía. Esa capacidad exige autorización OAuth de cada usuario, revisión de permisos de Meta/Google y secretos almacenados únicamente en backend.
