# TPL Ecosystem Blueprint 1.0

## Objetivo
Convertir el CRM actual en el Centro de Operaciones TPL sin interrumpir la operación existente.

## Hallazgos principales

1. **El CRM depende de un snapshot monolítico.** `tpl_crm_snapshot_v1()` concentra personas, propiedades, proyectos, tareas, alertas, tasaciones y actividad. Una relación faltante puede bloquear todo el panel.
2. **Existen fuentes paralelas.** Parte del catálogo histórico sigue en archivos JavaScript, mientras los módulos nuevos escriben en Supabase.
3. **Los módulos están conectados por datos, pero no por experiencia operativa.** Publicador, Partner, TPL Business, Tasador, Studio e Informes existen, aunque el asesor no tiene todavía una bandeja única de acciones.
4. **La seguridad base es correcta.** El CRM exige sesión Supabase y la RPC valida `tpl_staff`; se debe mantener este patrón para cada escritura.
5. **La navegación creció por acumulación.** El menú anterior estaba organizado por tablas o funciones, no por el trabajo diario del asesor.

## Fuentes oficiales

- Personas y empresas: `tpl_actores` + `tpl_actor_roles`.
- Propiedades: `tpl_propiedades`.
- Publicaciones y revisión: `tpl_publicaciones`.
- Proyectos: `tpl_proyectos` + `tpl_proyecto_componentes`.
- Partners: `tpl_partner_perfiles` y sus postulaciones.
- Catálogo: `tpl_catalogo_items`; casas técnicas en `tpl_casas`.
- Oportunidades: `tpl_oportunidades`.
- Tasaciones: `tpl_tasaciones`.
- Informes: `tpl_ordenes_informe` + `tpl_informes_tasacion`.
- Operación: `tpl_tareas`, `tpl_eventos`, notificaciones y documentos.

## Arquitectura objetivo

```text
Sitio público / Publicador / Red Partner / TPL Business
                         ↓
                   RPC / Edge Functions
                         ↓
                     Supabase
                         ↓
       Command Center · CRM · Expedientes · Informes
```

## Centro de Operaciones

La navegación oficial queda agrupada en:

1. Centro de Operaciones: resumen, proyectos, revisión y tareas.
2. Personas: compradores, propietarios, Partners y empresas.
3. Catálogo: parcelas, proyectos parcela + casa, casas y modelos.
4. Información y documentos: tasaciones, informes, Studio y comunicaciones.
5. Inteligencia: analytics, actividad y trazabilidad.

## Implementación de esta etapa

- RPC independiente `tpl_crm_command_center_v1()`.
- Identidad y rol del asesor en el dashboard.
- Conteo de publicaciones, tareas vencidas, Partners e informes pendientes.
- Buscador universal sobre los datos ya cargados en el snapshot.
- Vista `crm_alertas` canónica y repetible.
- Menú reordenado por trabajo operativo.
- Compatibilidad total con las vistas anteriores.

## Próximos sprints

### Sprint 2 — Expediente TPL
Ficha única para cliente, propietario, comprador, Partner o proyecto; documentos, conversaciones, tareas, pagos e historial.

### Sprint 3 — Centro Documental
Crear, versionar, descargar y enviar informes de tasación, proyectos, comparativos y documentos comerciales.

### Sprint 4 — Comunicación intermediada
Correo, WhatsApp, notificaciones, registro de llamadas y trazabilidad. Contacto TPL central configurable.

### Sprint 5 — TPL Advisor
Siguiente mejor acción para asesores y recomendaciones contextualizadas para propietarios, compradores y Partners.

## Regla de arquitectura

Toda funcionalidad nueva debe indicar:

- actor involucrado;
- proyecto o expediente asociado;
- fuente oficial de datos;
- evento que registra;
- permiso requerido;
- siguiente acción operativa.
