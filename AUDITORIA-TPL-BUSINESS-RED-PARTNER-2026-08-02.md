# Auditoría de integración TPL Business + Red Partner

## Alcance

Se revisó el proyecto completo `frontend-v2`, incluyendo:

- `frontend-v2/plataforma/tpl-business/`
- `frontend-v2/plataforma/tpl-business/studio-mark-ii/`
- `frontend-v2/plataforma/studio/`
- `frontend-v2/red-partner-v2/`
- migraciones comerciales, de seguridad, agenda, Studio y núcleo Partner en Supabase.

## Conclusión ejecutiva

La plataforma ya contiene gran parte de las piezas necesarias para convertir Red Partner en un producto SaaS conectado a TPL Business, pero hoy esas piezas funcionan como módulos paralelos.

Actualmente:

1. Red Partner capta postulaciones, archivos, servicios, cobertura, etapas, pagos y experiencia.
2. La aprobación crea un actor con rol `partner` y un perfil público.
3. TPL Business autentica usuarios y consulta exclusivamente el resumen del propietario.
4. TPL Studio contempla explícitamente el rol `partner` y sabe generar una landing orientada a servicios.
5. Los planes y suscripciones existen, incluyendo Plan Básico con 30 días de prueba.
6. No existe todavía un proceso canónico que, al aprobar al Partner, cree su cuenta Auth, asigne la prueba, habilite TPL Business, cree la landing y envíe el correo de acceso.

La solución correcta no es crear otro portal. Debe convertirse TPL Business en un portal multirol que cargue una experiencia distinta para propietario, Partner, corredor o futuro comprador.

---

## Hallazgos críticos

### 1. TPL Business está limitado al rol propietario

El servicio llama únicamente a:

`tpl_agenda_propietario_resumen_v1()`

La navegación está fija en:

- Mis propiedades
- Tasaciones
- Documentos
- Notificaciones
- Planes para administrar una propiedad

Un Partner autenticado puede entrar, pero recibirá un portal pensado para un propietario o un mensaje de actor sin propiedades.

**Impacto:** bloquea el lanzamiento del mes gratis para proveedores.

**Corrección:** crear `tpl_business_resumen_v2()` o un router RPC que detecte roles y devuelva un objeto común con módulos habilitados por rol.

---

### 2. La aprobación del Partner no crea una cuenta de acceso

`tpl_revisar_partner_v2()`:

- crea o encuentra `tpl_actores`;
- agrega rol `partner`;
- crea `tpl_partner_perfiles`.

No crea ni invita `auth.users`, no envía magic link y no vincula de manera explícita `auth_user_id`.

**Impacto:** un proveedor aprobado no puede entrar automáticamente a TPL Business.

**Corrección:** Edge Function `activar-partner-aprobado` ejecutada después de la aprobación administrativa.

---

### 3. La prueba del Plan Básico existe, pero no se asigna al Partner

`tpl_planes_comerciales` incluye:

- `basico`
- `dias_prueba = 30`

`tpl_suscripciones` admite:

- estado `prueba`;
- `prueba_hasta`.

Pero no hay una operación que, al aprobar al Partner, inserte o actualice su suscripción.

**Impacto:** el concepto comercial está modelado, pero no operativo.

**Corrección:** crear suscripción con:

- `actor_id = partner`;
- `plan_id = basico`;
- `estado = prueba`;
- `inicio_at = now()`;
- `prueba_hasta = now() + interval '30 days'`;
- metadata con origen, postulación y tipo de cliente `partner`.

---

### 4. Los planes actuales están redactados solo para propietarios

Los códigos `gratis`, `basico`, `profesional` y `premium` son reutilizables, pero sus características hablan de:

- publicaciones de propiedades;
- ediciones de anuncios;
- precio y visitas de propiedades;
- administración de venta.

**Impacto:** un mismo plan no puede comunicar correctamente beneficios a propietarios y Partners.

**Corrección recomendada:** no duplicar inmediatamente toda la tabla. Añadir `segmento` o una tabla `tpl_plan_variantes` con variantes:

- propietario;
- partner;
- corredor.

Para Partner Básico, la prueba debería incluir:

- perfil público;
- landing automática;
- CRM básico;
- recepción de solicitudes;
- galería y último trabajo;
- cotizaciones;
- métricas básicas;
- TPL Studio básico.

---

### 5. Studio Mark II contempla Partners, pero usa datos locales simulados

El módulo contiene lógica específica para Partner:

- diagnóstico de portafolio;
- landing con propuesta de valor;
- servicios;
- proceso de trabajo;
- trabajos realizados;
- cobertura;
- solicitud de cotización.

Sin embargo, usa un `brain.read('studio')` y estructuras locales, no los datos canónicos de Supabase ni las tablas `studio_campaigns` y `studio_outputs`.

**Impacto:** la capacidad visual existe, pero todavía no genera una landing persistente, publicable ni medible.

**Corrección:** reemplazar el almacenamiento local por RPC/servicio Supabase y vincular cada campaña con:

- `owner_user_id`;
- `tipo_objetivo = partner`;
- `objetivo_id = partner_perfil.id`;
- `actor_id` en metadata o columna canónica.

---

### 6. La landing pública del Partner ya existe, pero no es una landing comercial administrable

`perfil.html` y `curriculum.html` muestran un perfil público. No existe todavía:

- estado borrador/publicada;
- editor dentro de TPL Business;
- URL de landing registrada en el Partner;
- versiones;
- métricas;
- formularios que creen leads;
- conexión con Studio.

**Corrección:** distinguir:

1. **Perfil Red Partner:** ficha pública del marketplace.
2. **Landing comercial:** página editable y medible incluida en Plan Básico.

La landing puede usar inicialmente la misma información, pero debe tener identidad, CTA, analítica y formularios propios.

---

## Hallazgos altos

### 7. No existe un panel Partner dentro de TPL Business

Faltan vistas para:

- inicio de empresa;
- perfil y puntuación;
- landing;
- solicitudes;
- propuestas;
- trabajos;
- calendario;
- clientes;
- Studio;
- resultados;
- plan y facturación.

### 8. No existe una tabla canónica de propuestas comerciales del Partner

`tpl_ordenes_servicio` representa trabajos u órdenes, pero falta una etapa anterior donde varios Partners puedan cotizar una misma necesidad.

Se recomienda `tpl_propuestas_partner` con:

- necesidad/orden;
- Partner;
- alcance;
- monto;
- anticipo;
- forma de pago;
- etapas;
- vigencia;
- documentos;
- estado;
- observaciones del cliente.

### 9. No existe recepción de leads desde la landing

Studio habla de captación, pero no hay una entidad que registre:

- formulario;
- llamada;
- clic de WhatsApp;
- fuente;
- campaña;
- Partner;
- landing.

Debe reutilizarse el núcleo comercial de contactos/eventos o agregarse una tabla de leads vinculada a actor y campaña.

### 10. No existe expiración efectiva de la prueba

La tabla puede guardar `prueba_hasta`, pero no hay proceso que:

- avise días restantes;
- marque la prueba vencida;
- limite funciones;
- mantenga los datos;
- oculte/desactive la landing comercial;
- permita reactivación.

### 11. La relación Auth ↔ actor depende del correo

`tpl_actor_actual_id()` vincula por correo. Es útil como transición, pero puede fallar si el Partner cambia su correo o hay duplicados.

**Corrección:** agregar `auth_user_id` único en `tpl_actores` o una tabla de identidades.

---

## Riesgos de seguridad y mantenimiento

1. La clave anon de Supabase aparece repetida directamente en archivos públicos. Esto no es secreto, pero aumenta riesgo de divergencia y errores de proyecto. Debe centralizarse.
2. `.env.local` y `.vercel/` están dentro del ZIP. Deben excluirse de entregas públicas y Git cuando corresponda.
3. `supabase/.temp/` aparece en el proyecto y no debe versionarse.
4. TPL Business y otros módulos crean clientes Supabase separados. Conviene un cliente canónico compartido para evitar múltiples instancias GoTrue y estados de sesión inconsistentes.
5. La puntuación calculada en frontend no debe considerarse fuente de verdad. Supabase debe recalcularla.

---

## Arquitectura objetivo

### Portal único multirol

`/plataforma/tpl-business/`

1. Usuario inicia sesión.
2. RPC obtiene actor, roles, suscripción y capacidades.
3. TPL Business muestra la experiencia adecuada.

#### Propietario

- propiedades;
- tasaciones;
- informes;
- interesados;
- landing;
- marketing;
- documentos.

#### Partner

- mi empresa;
- perfil y puntuación;
- servicios y cobertura;
- landing;
- solicitudes;
- propuestas;
- trabajos;
- agenda;
- clientes;
- Studio;
- resultados;
- plan.

#### Corredor

- cartera;
- propietarios;
- leads;
- visitas;
- publicaciones;
- campañas;
- cierres.

---

## Flujo Partner recomendado

1. Proveedor completa la postulación.
2. TPL revisa.
3. Al aprobar:
   - crea/vincula actor;
   - asigna rol Partner;
   - crea perfil;
   - crea/invita cuenta Auth;
   - asigna Plan Básico en prueba por 30 días;
   - crea notificación;
   - crea borrador de landing desde el perfil;
   - envía correo de bienvenida y acceso.
4. Partner entra a TPL Business.
5. Asistente inicial solicita completar lo faltante.
6. Al alcanzar un umbral de perfil, puede publicar su ficha y landing.
7. Solicitudes entran al CRM.
8. Partner cotiza.
9. Cliente acepta.
10. Se crea orden, avances, pagos y reputación.

---

## Plan de implementación seguro

### Fase P1 — Núcleo multirol

- `auth_user_id` canónico para actores.
- RPC `tpl_business_resumen_v2()`.
- menú dinámico por capacidades.
- experiencia Partner dentro de TPL Business.

### Fase P2 — Aprobación y prueba automática

- Edge Function `activar-partner-aprobado`.
- invitación Auth.
- Plan Básico 30 días.
- dos correos: aprobación y bienvenida.
- recordatorios 15, 7, 3 y 1 día antes del vencimiento.

### Fase P3 — Perfil y landing

- persistir nuevos campos Partner.
- puntaje de completitud calculado en servidor.
- borrador de landing generado automáticamente.
- editor y publicación.
- métricas reales.

### Fase P4 — Solicitudes y propuestas

- necesidades del cliente.
- matching de Partners.
- propuestas comparables.
- aceptación y orden.

### Fase P5 — Operación y reputación

- avances;
- evidencia;
- aprobación del cliente;
- pagos por hitos;
- calificación;
- reputación TPL.

---

## Prioridad inmediata recomendada

Antes de ampliar más pantallas, implementar **P1 + P2**. Son las piezas que convierten la postulación existente en un producto vendible:

> Partner aprobado → cuenta → 30 días gratis → TPL Business → landing → CRM.

Sin esa conexión, Red Partner seguirá siendo una postulación y TPL Business seguirá siendo únicamente una agenda para propietarios.
