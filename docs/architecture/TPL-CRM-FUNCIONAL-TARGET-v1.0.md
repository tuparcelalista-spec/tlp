# Diseño Funcional Objetivo del CRM TPL — v1.0

Este documento presenta la propuesta de arquitectura funcional futura y el modelo objetivo para la evolución del CRM de **Tu Parcela Lista (TPL)** de un panel de control y trazabilidad de activos físicos a un **CRM Comercial Completo**. 

---

## 1. PROPÓSITO Y MODELO DE INFORMACIÓN OBJETIVO POR ENTIDAD

### 1. Partner
* **Propósito:** Empresa constructora, captador inmobiliario o aliado estratégico de la red.
* **Información Objetivo:** Datos fiscales, scoring de satisfacción, catálogo asignado, contratos comerciales de partner.
* **Información Existente:** Nombre, logo, descripción de experiencia ([red-partner-v2/perfil.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/red-partner-v2/perfil.html)).
* **Origen de Datos:** Formulario externo de postulación (`red-partner-v2/postular.html`).
* **Relaciones:** Proyectos asignados, parcelas aportadas.
* **Capacidad Faltante:** Modificación de perfiles, re-evaluación de scoring e inhabilitación desde el CRM.

### 2. Cliente
* **Propósito:** Propietario de lote o comprador final del proyecto.
* **Información Objetivo:** Nombre, rut, teléfono, preferencias de compra, presupuesto, bitácora de llamadas.
* **Información Existente:** Identificador y datos de contacto en `tpl_actores`.
* **Origen de Datos:** Ingesta de formularios de cotización de parcelas/casas.
* **Relaciones:** Oportunidades comerciales abiertas, tasaciones solicitadas.
* **Capacidad Faltante:** Gestión de notas comerciales e historial de seguimiento del ejecutivo.

### 3. Lead
* **Propósito:** Prospecto frío captado a través de campañas de marketing.
* **Información Objetivo:** Email, UTM de campaña, origen de Landing, tags de interés.
* **Información Existente:** Registros básicos en base de datos.
* **Origen de Datos:** Formulario de landing o TPL Studio.
* **Relaciones:** Oportunidades futuras.
* **Capacidad Faltante:** Módulo de asignación automática de leads a ejecutivos y cambio a estado `Cliente`.

### 4. Activo / Parcela
* **Propósito:** El terreno físico comercializado.
* **Información Objetivo:** Ficha GEOINT, topografía, factibilidad de servicios, certificado de rol, tasación canónica.
* **Información Existente:** Ficha completa de características en `tpl_propiedades`.
* **Origen de Datos:** Publicador público y tasador del CRM.
* **Relaciones:** Publicaciones activas, tasaciones históricas, proyectos asociados.
* **Capacidad Faltante:** Carga manual directa de fichas técnicas en caliente desde la vista del CRM.

### 5. Casa
* **Propósito:** Modelos de construcción prefabricados homologados por TPL.
* **Información Objetivo:** Planos, metrajes, especificaciones técnicas, precio base del partner.
* **Información Existente:** Datos almacenados en la tabla `tpl_casas`.
* **Origen de Datos:** Formulario de edición del CRM.
* **Relaciones:** Proveedores asignados (Constructores).
* **Capacidad Faltante:** Ninguna (CRUD actual completo en CRM).

### 6. Proyecto
* **Propósito:** Combinación comercial de Parcela + Casa.
* **Información Objetivo:** Código de proyecto, porcentaje de avance de obras, cronograma de hitos.
* **Información Existente:** Tabla `tpl_proyectos` (lectura).
* **Origen de Datos:** Creado de forma automática por la base de datos al calificar un lote y modelo.
* **Relaciones:** Parcela, Casa, Partner a cargo, Comprador.
* **Capacidad Faltante:** Control de hitos y plazos de construcción directamente en la interfaz.

### 7. Oportunidad
* **Propósito:** Intención comercial calificada de compra o corretaje.
* **Información Objetivo:** Estado del embudo (contacto, visita, propuesta, cierre), montos ofertados.
* **Información Existente:** Ofertas recibidas en `tpl_oportunidades`.
* **Origen de Datos:** Registro de cotizaciones en caliente de usuarios públicos.
* **Relaciones:** Cliente, Parcela, Ejecutivo de cuentas.
* **Capacidad Faltante:** Movimiento de oportunidades entre etapas del pipeline comercial en el CRM.

### 8. Publicación
* **Propósito:** El anuncio público en el catálogo de TPL.
* **Información Objetivo:** Título, descripción comercial, fotos validadas, estado de publicación.
* **Información Existente:** Estado en `tpl_propiedades` y bandeja de revisión del CRM.
* **Origen de Datos:** Publicador externo.
* **Relaciones:** Parcela vinculada.
* **Capacidad Faltante:** Edición de creatividades de anuncios sin usar TPL Studio.

### 9. Tasación
* **Propósito:** Certificado de valor técnico del motor.
* **Información Objetivo:** Desglose de factores, inputs geográficos, valor recomendado, valor apuro.
* **Información Existente:** Historial completo en `tpl_tasaciones`.
* **Origen de Datos:** Motor `tpl-land-engine.js` (CRM/Supabase).
* **Relaciones:** Parcela.
* **Capacidad Faltante:** Anular o sobreescribir valores canónicos con justificación del operador staff.

### 10. Visita / Actividad
* **Propósito:** Registro físico de reuniones en terreno y llamadas.
* **Información Objetivo:** Fecha de agenda, ejecutivo asignado, feedback del lote, fotos en terreno.
* **Información Existente:** Trazabilidad en logs históricos (`tpl_eventos`).
* **Origen de Datos:** Clicks del cliente en el portal público.
* **Relaciones:** Cliente, Parcela, Oportunidad.
* **Capacidad Faltante:** Módulo de agenda y calendario operativo en el CRM.

---

## 2. MATRIZ FUNCIONAL OBJETIVO

| Entidad | Crear | Ver | Editar | Desactivar | Archivar | Eliminar | Historial | Permisos Staff | Estado Actual | Estado Objetivo |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| **Partner** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Administrador | `Read only` | `Create + Read + Update + Desactivar` |
| **Cliente** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Ejecutivo / Admin | `Read only` | `Create + Read + Update + Desactivar` |
| **Lead** | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | Ejecutivo / Admin | `Read only` | `CRUD Completo` (Solo leads fríos) |
| **Parcela** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Ejecutivo / Admin | `Read + Update` | `Create + Read + Update + Desactivar` |
| **Casa** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Administrador | `Create + Read + Update` | `Create + Read + Update + Desactivar` |
| **Proyecto** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Ejecutivo / Admin | `Read only` | `Create + Read + Update + Desactivar` |
| **Oportunidad**| SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Ejecutivo / Admin | `Read only` | `Create + Read + Update + Desactivar` |
| **Publicación**| SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Ejecutivo / Admin | `Read + Update` | `Create + Read + Update + Desactivar` |
| **Tasación** | SÍ | SÍ | NO | NO | NO | NO | SÍ | Automático / DB | `Create + Read` | `Create + Read` (Inmutable) |
| **Visita** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Ejecutivo / Admin | `No implementado`| `Create + Read + Update + Desactivar` |
| **Actividad** | SÍ | SÍ | NO | NO | NO | NO | SÍ | Automático / DB | `Read only` | `Create + Read` (Inmutable) |
| **Campaña** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Diseñador / Admin | `Create + Read` | `Create + Read + Update + Desactivar` |
| **Landing** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ | Diseñador / Admin | `Create + Read` | `Create + Read + Update + Desactivar` |

---

## 3. MAPA CONCEPTUAL DE RELACIONES OBJETIVO

```text
  [ Partner ] (Constructor/Aportante)
       │
       └─── Ejerce autoridad sobre ──> [ Proyecto (Parcela + Casa) ]
                                             ▲
  [ Cliente / Lead ]                         │
       │                                     │
       └─── Genera e interactúa con ──> [ Oportunidad ]
                                             │
                                             └─── Vincula un activo ──> [ Parcela / Activo ]
                                                                             │
                                                                             ├─── Genera ──> [ Publicación ]
                                                                             │                     │
                                                                             │                     └─── Registra visitas ──> [ Visitas / Actividad ]
                                                                             │
                                                                             └─── Evalúa su valor ──> [ Tasación Canónica ]
```

### Relaciones Faltantes en el CRM:
1. **Oportunidad $\leftrightarrow$ Visitas:** No existe asignación ni registro de agenda de visitas asociadas a una cotización comercial.
2. **Partner $\leftrightarrow$ Proyectos:** La relación de contratos comerciales de partners para la construcción no está unificada en la interfaz del CRM.

---

## 4. BRECHAS DE CAPACIDAD COMERCIAL

Para pasar de un **Panel de Trazabilidad de Activos** a un **CRM Comercial Completo**, se identifican las siguientes brechas:

### A. Inexistentes (Críticas para Ventas)
* **Pipeline / Embudo Comercial:** Falta una vista Kanban interactiva para arrastrar Oportunidades y cambiar su estado comercial (`Contacto` $\rightarrow$ `Visita` $\rightarrow$ `Oferta` $\rightarrow$ `Vendido`).
* **Módulo de Calendario y Agenda:** No existe un planificador de visitas para los ejecutivos comerciales asociados a las parcelas del inventario.
* **Alta Directa de Prospectos:** La creación de Clientes y Leads está bloqueada en la UI del CRM.

### B. Parciales (Requieren Expansión)
* **Ficha de Propiedades:** Permite editar variables, pero no agregar una nueva Parcela desde cero sin pasar por el formulario público del cliente.
* **Seguimiento Histórico:** Existen logs de auditoría técnica (`tpl_eventos`), pero no una bitácora de comentarios del ejecutivo sobre las interacciones con el cliente.

---

## 5. RECOMENDACIONES DE IMPLEMENTACIÓN FUTURA

> [!IMPORTANT]
> **Lineamiento Arquitectónico:** Las siguientes recomendaciones se plantean a nivel de diseño conceptual y no deben implementarse hasta contar con aprobación expresa del usuario.

1. **Mantener RPCs de Escritura Única:** Para preservar la consistencia de los datos transaccionales, las nuevas acciones comerciales (ej. agregar visitas o modificar prospectos) deben consumir RPCs dedicadas de Supabase, evitando la inyección de consultas directas (`INSERT` / `UPDATE` directos) en el cliente.
2. **Implementar Pipeline Visual:** Diseñar una vista Kanban simplificada consumiendo la columna `estado` de las oportunidades existentes.
3. **Mantener Bloqueo de DELETE:** Respetar la inmutabilidad de los datos históricos certificada en la versión v1.0 de la auditoría CRUD.
