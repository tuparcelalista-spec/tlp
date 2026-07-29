# Cerebro TPL — Arquitectura V1

## Principio central

El proyecto es el centro de coordinación. Personas, propiedades, necesidades, acuerdos, trabajos, pagos y comunicaciones se relacionan con un proyecto, pero conservan su identidad propia.

## Fuentes de verdad

- **CRM:** personas, roles, propiedades, proyectos, historial y responsables.
- **Publicador:** captura y actualiza información declarada de la propiedad.
- **Tasador:** produce tasaciones e informes vinculados a una propiedad.
- **TPL Business:** muestra a cada actor solo las decisiones y datos que le corresponden.
- **Red Partner:** clasifica capacidades y disponibilidad de prestadores.
- **Studio Mark II:** consume datos existentes y genera borradores de marca, Landing, contenido y campañas.
- **Oficina:** programa comunicaciones y automatizaciones internas.

## Entidades V1

1. Actor: persona o empresa, con múltiples roles.
2. Propiedad: parcela, campo o inmueble.
3. Proyecto: coordinación de una oportunidad concreta.
4. Necesidad: mejora, verificación o servicio requerido.
5. Acuerdo: propuesta, condición, aceptación o contraoferta.
6. Servicio activo: capacidad habilitada por modalidad o plan.
7. Aprobación: acción preparada que requiere autorización.
8. Evento: bitácora inmutable de cambios relevantes.

## Reglas

- Un dato no se vuelve a pedir si ya existe y sigue vigente.
- La información declarada, estimada y confirmada se diferencia visualmente.
- Studio no publica ni gasta presupuesto sin aprobación explícita.
- Cuando TPL administra una propiedad, el dueño ve una experiencia simplificada y TPL asume las tareas operativas.
- Cada necesidad puede recomendar Partners, pero la asignación debe registrar criterios y aprobación.
- La veracidad de datos reduce visitas improductivas y debe comunicarse durante la publicación.

## Estado de esta entrega

La implementación utiliza localStorage como prototipo de contrato y eventos. Debe migrarse a Supabase con RLS antes de producción.
