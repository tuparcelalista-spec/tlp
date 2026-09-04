# Diseño Funcional Detallado del CRM TPL — v1.0

> [!NOTE]
> **Documento de especificación funcional y gobernanza de procesos de Tu Parcela Lista (TPL)**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de diseño:** 9 de agosto de 2026

Este documento detalla el diseño funcional y conceptual para la evolución del CRM de TPL. Establece las reglas de negocio, ciclo de vida de entidades, pipeline de ventas, flujos de conversión de prospectos y la segregación de permisos sin alterar el esquema de base de datos ni el código actual.

---

## 1. DISEÑO DEL PIPELINE DE VENTAS (EMBUDO COMERCIAL)

El pipeline de ventas representa el embudo de conversión para las parcelas y proyectos. Se propone una simplificación del flujo comercial basada en la operación real de corretaje y venta en TPL:

```text
  [ Nuevo Lead ] ──> [ Contactado ] ──> [ Calificado ] ──> [ Agendado ] ──> [ Negociación ] ──> [ Reservado ] ──> [ Vendido ]
```

### Detalle de Etapas:

1. **Nuevo Lead:**
   - *Propósito:* Ingreso inicial del prospecto interesado.
   - *Condición de entrada:* Ingesta de cotización de lote o modelo de casa.
   - *Condición de salida:* El ejecutivo realiza el primer intento de contacto telefónico o por correo.
   - *Campos Reutilizados:* `tpl_oportunidades.estado = 'nueva'`.
2. **Contactado:**
   - *Propósito:* Primer contacto exitoso con el interesado.
   - *Condición de entrada:* Primera llamada o respuesta de correo registrada en el timeline.
   - *Condición de salida:* El ejecutivo recaba las necesidades básicas y presupuesto del cliente.
3. **Calificado:**
   - *Propósito:* Determinar si el prospecto cumple con el perfil ideal de compra.
   - *Condición de entrada:* Registro de presupuesto y rango de ubicación deseada en la ficha.
   - *Condición de salida:* Coordinación y propuesta de una visita física a terreno.
4. **Agendado (Visita):**
   - *Propósito:* Visita en terreno programada y asignada.
   - *Condición de entrada:* Registro de fecha y lote seleccionado en la agenda del CRM.
   - *Condición de salida:* Realización de la visita física por el ejecutivo y cliente.
5. **Negociación:**
   - *Propósito:* Evaluación de oferta por el terreno o proyecto casa+terreno.
   - *Condición de entrada:* Presentación de una propuesta económica formal por parte del cliente.
   - *Condición de salida:* Aceptación o rechazo definitivo de los términos comerciales.
6. **Reservado:**
   - *Propósito:* Bloqueo temporal del lote por pago de reserva.
   - *Condición de entrada:* Carga del comprobante de abono en el expediente digital.
   - *Condición de salida:* Firma del contrato comercial de compraventa definitiva.
7. **Vendido:**
   - *Propósito:* Cierre de venta exitosa.
   - *Condición de entrada:* Contrato definitivo firmado ante notario y pagado en su totalidad.
   - *Condición de salida:* Traspaso de la parcela a estado `vendida` en `tpl_propiedades`.

---

## 2. DISEÑO Y CICLO DE VIDA DE LEADS

### Nivel de Representación en Datos:
Un Lead **no es una entidad independiente**, sino un **Actor** (`tpl_actores`) calificado temporalmente con un **Rol** (`tpl_actor_roles.rol = 'comprador'`) y cuyo estado transaccional en `tpl_oportunidades` se encuentra en etapas tempranas (`nueva`, `cotizacion`).

### Flujo de Conversión:
```text
  Actor (tpl_actores) ──> Rol Comprador (tpl_actor_roles) ──> Lead (Oportunidad Activa) ──> Cliente (Venta Cerrada)
```

* **Origen:** Un Lead nace ante una cotización en caliente en el portal público o landing de TPL Studio.
* **Ciclo:** Un mismo Lead puede tener múltiples Oportunidades simultáneas (ej. cotizar 3 parcelas diferentes).
* **Conversión a Cliente:** Ocurre únicamente cuando una de las oportunidades alcanza el estado `Reservado` o `Vendido`. El Actor mantiene su ID único (`actor_id`) y se consolida todo su historial anterior de consultas y visitas en su ficha unificada, evitando duplicados.

---

## 3. CICLO COMERCIAL DE PARTNERS

Se establece la separación conceptual entre el **Rol de Partner** (permisos de seguridad del actor) y el **Perfil Comercial del Partner** (desempeño de construcción y captaciones):

```text
  [ Postulante ] ──> [ Validación ] ──> [ Partner Activo ] ──> [ Partner Evaluado ] ──> [ Inactivo / Archivado ]
```

* **Postulante:** Registro inicial desde `red-partner-v2/postular.html` (estado `'pendiente_aprobacion'`).
* **Validación:** Operador staff audita la experiencia previa y materialidad del constructor.
* **Partner Activo:** Rol `'partner'` insertado en `tpl_actor_roles` habilitando su catálogo público de casas.
* **Partner Evaluado:** Calificación periódica del constructor guardada en la columna flexible `metadata` de su perfil para generar el scoring comercial.
* **Inactivo / Archivado:** Suspensión temporal de su catálogo sin eliminar físicamente su ficha para resguardar la trazabilidad de casas construidas en proyectos históricos.

---

## 4. DISEÑO CONCEPTUAL DE VISITAS

Dada la necesidad de un módulo de agenda físico para visitas a terreno, se define el siguiente modelo conceptual:

### Atributos Clave:
* `id` (uuid)
* `oportunidad_id` (uuid references `tpl_oportunidades(id)`)
* `actor_cliente_id` (uuid references `tpl_actores(id)`)
* `propiedad_id` (uuid references `tpl_propiedades(id)`)
* `fecha_visita` (date), `hora_visita` (time)
* `responsable_actor_id` (uuid references `tpl_actores(id)`) $\rightarrow$ Ejecutivo staff a cargo de guiar al cliente.
* `estado_visita` (text) $\rightarrow$ Estados: `programada`, `confirmada`, `realizada`, `cancelada`, `no_asistio`.
* `observaciones` (text) $\rightarrow$ Bitácora del lote.
* `created_at`, `updated_at` (timestamps)

---

## 5. ACTIVIDADES E HISTORIAL (SEGREGACIÓN DE CONCEPTOS)

Para mantener la base de datos limpia y rápida, se segregan conceptualmente las actividades en dos niveles:

1. **Actividades Operativas (Gestión de Ventas):**
   - Comentarios de los ejecutivos, notas de llamadas y recordatorios de tareas. Se proponen almacenar en una tabla flexible de comentarios o dentro del JSONB `metadata` del Actor o la Oportunidad.
2. **Eventos de Auditoría (Trazabilidad Técnica):**
   - Log inmutable del sistema que registra quién aprobó una publicación o cuándo se generó un PDF de tasación. Se registran en la tabla existente `tpl_eventos`.

---

## 6. MATRIZ DE PERMISOS CONCEPTUAL (CRM)

| Entidad / Módulo | Administrador | Ejecutivo Comercial | Ejecutivo Tasador | Diseñador Marketing | Partner Externo |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Actores** | CRUD | R+U | READ | READ | NO |
| **Oportunidades** | CRUD | CRUD | READ | READ | NO |
| **Propiedades** | CRUD | R+U | R+U | READ | NO |
| **Casas** | CRUD | READ | READ | R+U | R+U (Solo propias) |
| **Publicaciones** | CRUD | R+U | READ | READ | NO |
| **Tasaciones** | CRUD | READ | CRUD | READ | NO |
| **Visitas** | CRUD | CRUD | READ | READ | NO |
| **Actividades** | CRUD | CRUD | READ | READ | NO |
| **Campañas** | CRUD | READ | READ | CRUD | NO |

---

## 7. MATRIZ DE ESTRUCTURAS: EXISTENTE VS OBJETIVO

| Funcionalidad | Existe | Parcial | No Existe | Estrategia (Reutilizar / Ampliar / Crear) |
| :--- | :---: | :---: | :---: | :--- |
| **Gestión de Actores** | SÍ | NO | NO | **Reutilizar:** Usar la tabla única `tpl_actores`. |
| **Segmentación de Leads** | NO | SÍ | NO | **Reutilizar/Ampliar:** Roles de `tpl_actor_roles` y atributos de `metadata`. |
| **Pipeline Comercial** | NO | SÍ | NO | **Ampliar:** Añadir columna de fase comercial en `tpl_oportunidades`. |
| **Agenda de Visitas** | NO | NO | SÍ | **Crear Nueva Estructura:** Tabla `tpl_visitas` (requerida por relaciones cruzadas). |
| **Bitácora de Notas** | NO | SÍ | NO | **Reutilizar/Ampliar:** Atributos dinámicos en el JSONB `metadata` del Actor. |
| **Gestión de Partners** | SÍ | NO | NO | **Reutilizar:** Tabla de perfiles `tpl_partner_perfiles`. |
| **Historial de Tasaciones** | SÍ | NO | NO | **Reutilizar:** Historial inmutable en `tpl_tasaciones`. |
| **Gestión de Proyectos** | SÍ | NO | NO | **Reutilizar:** Panel de avance físico en `tpl_proyectos`. |
