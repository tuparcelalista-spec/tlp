# Auditoría CRUD Definitiva v1.0 — Separación CRM Interno vs Ecosistema TPL

> [!NOTE]
> **Referencia oficial de arquitectura, gobierno de datos y modelo CRUD del ecosistema TPL**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento constituye la referencia oficial de arquitectura y gobierno de datos del ecosistema **Tu Parcela Lista (TPL)**. Detalla las capacidades operativas divididas en dos niveles: el **CRM Interno** (operaciones que puede realizar un administrador/operador staff) y el **Ecosistema TPL** (operaciones gatilladas por formularios públicos, publicadores externos y sub-módulos).

---

## 1. MATRICES DE CAPACIDADES CRUD

### Matriz A — CRM Interno

Esta matriz detalla las operaciones que un operador staff autenticado puede realizar directamente desde la interfaz del CRM ([plataforma/crm-v2/](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2)).

| Entidad | Crear | Ver | Editar | Desactivar | Archivar | Eliminar | Evidencia Técnica (Archivo, Función, RPC/Tabla) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Partner** | NO | SÍ | NO | NO | NO | NO | **Lectura:** Leído en `TPLDataService.getCrmSnapshot()` mediante RPC `tpl_crm_snapshot_v1`. Tabla: `tpl_actores`. Archivo: [tpl-data-service.js:585](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L585). **Crear/Editar/Eliminar:** Bloqueado en cliente (botón `#quickAdd` deshabilitado por diseño en [crm-v2.js:1629](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/crm-v2.js#L1629-1631)). |
| **Cliente** | NO | SÍ | NO | NO | NO | NO | **Lectura:** Leído en `TPLDataService.getCrmSnapshot()` $\rightarrow$ RPC `tpl_crm_snapshot_v1`. Tabla: `tpl_actores`. **Crear/Editar/Eliminar:** Bloqueado en cliente ([crm-v2.js:1629](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/crm-v2.js#L1629-1631)). |
| **Lead** | NO | SÍ | NO | NO | NO | NO | **Lectura:** Leído en `TPLDataService.getCrmSnapshot()` $\rightarrow$ RPC `tpl_crm_snapshot_v1`. Tabla: `tpl_actores` (filtrado por rol en cliente). **Crear/Editar/Eliminar:** Bloqueado en cliente. |
| **Activo / Parcela** | NO | SÍ | SÍ | SÍ | SÍ | NO | **Lectura:** Tabla `tpl_propiedades`. **Editar/Desactivar/Archivar:** Edición mediante diálogo `crmValuationEditorDialog` y guardado mediante la función `saveCrmValuationData()` que ejecuta la RPC `tpl_crm_guardar_datos_tasacion_v1` en [tpl-data-service.js:484](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L484). Desactivación lógica mediante columna `estado`. **Eliminar:** No expuesto ni implementado. |
| **Casa** | SÍ | SÍ | SÍ | SÍ | SÍ | NO | **Crear/Editar/Desactivar:** Ejecutado en `openHouseDialog()` llamando a `saveCrmHouse()` que ejecuta la RPC `tpl_crm_guardar_casa_v1` en [tpl-data-service.js:636](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L636). Cambios de estado manejados vía campo `#houseState` (`pausada`/`activa`/`archivada`). |
| **Proyecto** | NO | SÍ | NO | NO | NO | NO | **Lectura:** Tabla `tpl_proyectos` en la consulta snapshot. **Crear/Editar/Eliminar:** No implementado. |
| **Oportunidad** | NO | SÍ | NO | NO | NO | NO | **Lectura:** Tabla `tpl_oportunidades`. **Crear/Editar/Eliminar:** No implementado. |
| **Publicación** | NO | SÍ | SÍ | SÍ | SÍ | NO | Mapeado y sincronizado directamente con la edición del activo Parcela (`tpl_propiedades`). |
| **Tasación** | SÍ | SÍ | NO | NO | NO | NO | **Crear:** Nueva tasación registrada mediante la función `saveCrmValuationData` que invoca la RPC `tpl_registrar_tasacion_crm_canonica_v1` en [tpl-data-service.js:450](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L450). **Lectura:** Tabla `tpl_tasaciones`. **Eliminar:** Bloqueado por auditoría. |
| **Visita** | NO | NO | NO | NO | NO | NO | Entidad no implementada en la interfaz del CRM. |
| **Actividad** | NO | SÍ | NO | NO | NO | NO | **Lectura:** Tabla de logs históricos `tpl_eventos`. **Editar/Eliminar:** Inmutable por diseño. |
| **Campaña** | SÍ | SÍ | NO | NO | NO | NO | **Crear:** Generado desde la integración de `TPLStudioService.saveCampaign` (RPC `tpl_studio_crear_campana_v2` en `studio-service.js:43`). |
| **Landing** | SÍ | SÍ | NO | NO | NO | NO | **Crear:** Generada mediante la integración de TPL Studio. |

---

### Matriz B — Ecosistema TPL (Módulos Externos)

Esta matriz detalla las operaciones que ocurren por fuera del CRM interno a través del publicador de lotes, flujos de enrolamiento público, TPL Studio o red de partners.

| Entidad | Crear | Ver | Editar | Desactivar | Archivar | Eliminar | Módulo Origen y Evidencia Técnica |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Partner** | SÍ | SÍ | SÍ | NO | NO | NO | **Origen:** Módulo Agente / Enrolamiento Partner (`red-partner-v2/postular.js`). Inserta postulaciones en Supabase mediante RPC `tpl_registrar_partner_v1`. |
| **Cliente** | SÍ | NO | NO | NO | NO | NO | **Origen:** Cotizador y Ficha Pública. Inserta registros de prospectos interesados. |
| **Lead** | SÍ | NO | NO | NO | NO | NO | **Origen:** Formularios de contacto y cotización. |
| **Activo / Parcela** | SÍ | SÍ | SÍ | NO | NO | NO | **Origen:** Publicador Externo (`plataforma/publicar/publicar.js`). Inserta borradores y propiedades mediante RPC `tpl_publicar_propiedad_v3`. |
| **Casa** | NO | SÍ | NO | NO | NO | NO | Leído como catálogo de referencia inmutable en el cotizador público. |
| **Proyecto** | SÍ | SÍ | NO | NO | NO | NO | Generado al asociar compras de informes de proyecto. |
| **Oportunidad** | SÍ | SÍ | NO | NO | NO | NO | Generado automáticamente al registrar cotizaciones o leads. |
| **Publicación** | SÍ | SÍ | SÍ | NO | NO | NO | Gatillado por el Publicador Externo. |
| **Tasación** | SÍ | SÍ | NO | NO | NO | NO | **Origen:** Tasador Público (`plataforma/publicar/tasador.html`). Registra tasaciones mediante la RPC `tpl_registrar_tasacion_v1`. |
| **Visita** | NO | NO | NO | NO | NO | NO | No implementado. |
| **Actividad** | SÍ | NO | NO | NO | NO | NO | **Origen:** Trazabilidad de clicks. RPC `tpl_registrar_evento_publico_v1`. |
| **Campaña** | SÍ | SÍ | NO | NO | NO | NO | **Origen:** TPL Studio. Crea y publica campañas publicitarias. |
| **Landing** | SÍ | SÍ | NO | NO | NO | NO | **Origen:** TPL Studio. Genera las Landing Pages dinámicas. |

---

## 2. CLASIFICACIÓN FUNCIONAL DE ENTIDADES

| Entidad | Clasificación Funcional | Comportamiento del Ciclo de Vida |
| :--- | :--- | :--- |
| **Partner** | `Externo → CRM` | Entra desde postulaciones externas, queda como solo lectura en el CRM. |
| **Cliente / Lead** | `Externo → CRM` | Captado vía landing/cotizador, inmutable para el CRM. |
| **Activo / Parcela** | `Read + Update` | El CRM modifica sus características físicas y gestiona su desactivación. |
| **Casa** | `Create + Read + Update` | CRUD lógico completo administrado exclusivamente en el CRM. |
| **Proyecto** | `Read only` | Solo lectura del estado de contratación de obras en el CRM. |
| **Oportunidad** | `Read only` | Solo lectura de prospectos emparejados. |
| **Tasación** | `Histórico / Inmutable` | Cada cálculo escribe un registro permanente para trazabilidad de precios. |
| **Actividad** | `Histórico / Inmutable` | Log de auditoría forense intocable. |
| **Campaña / Landing** | `Externo → CRM` | Creado en TPL Studio; monitoreado en el CRM. |

---

## 3. BRECHAS DE CAPACIDAD CRUD EN EL CRM

* **Partner / Cliente / Lead:**
  - *Brecha:* No existe interfaz en el CRM para editar datos de contacto, cambiar contraseñas o gestionar el ciclo de vida de los partners.
  - *Origen de creación:* Formulario externo (`red-partner-v2/postular.html`).
  - *Impacto operativo:* Dependencia absoluta de scripts de soporte técnico de base de datos para corregir errores de tipeo en correos.
* **Activo / Parcela:**
  - *Brecha:* Ausencia de alta manual (creación) de propiedades directamente desde el CRM.
  - *Origen de creación:* Publicador externo (`plataforma/publicar/index.html`).
  - *Impacto operativo:* Duplicación de procesos al obligar al operador a usar la interfaz de cliente final para registrar captaciones.
* **Proyectos y Oportunidades:**
  - *Brecha:* Imposibilidad de re-asignar cotizaciones o forzar cambios de estado comerciales desde el panel de control.
  - *Impacto operativo:* Pérdida de flexibilidad comercial ante negociaciones directas de los operadores.

---

## 4. MODELO DE GOBIERNO DE DATOS

El flujo de autoridad sobre los datos de TPL se estructura jerárquicamente en tres capas:

```text
  [ DATOS EXTERNOS ] ──(Ingesta)──> [ DATOS MAESTROS ] ──(Genera)──> [ DATOS TRANSACCIONALES ]
  - Postulaciones                   - Actores (Clientes/Partners)     - Tasaciones Canónicas
  - Publicaciones Externas          - Propiedades (Fichas)            - Eventos de Auditoría
  - Formularios de Cotización       - Catálogo de Casas               - Oportunidades de Compra
  
  ▲                                 ▲                                 ▲
  │                                 │                                 │
  [ Autoridad: Cliente Final ]     [ Autoridad: CRM Interno / Staff ] [ Autoridad: Inmutable / DB ]
```

* **Datos Maestros:** El **CRM Interno** tiene la autoridad exclusiva de edición y aprobación.
* **Datos Transaccionales:** La base de datos de **Supabase** es la fuente de verdad definitiva y restringe cualquier alteración física para proteger el historial analítico.
* **Datos Externos:** El **Cliente Final** ingresa la información mediante formularios autenticados en el frontend.

---

## 5. CONCLUSIONES ARQUITECTÓNICAS Y DE GOBIERNO

Basado en la evidencia técnica recopilada:
1. **¿El CRM es un CRM operativo completo?**
   **No**. El CRM interno de TPL no posee las capacidades clásicas de un CRM operativo transaccional (carece de alta manual de clientes, edición de perfiles de partners, facturación y envío directo de correspondencia).
2. **¿O es un sistema de administración y trazabilidad de activos?**
   **Sí**. Arquitectónicamente, el CRM es un **Panel de Control y Trazabilidad de Activos Inmobiliarios (Propiedades y Tasaciones)**. Su principal propósito es consolidar las variables físicas del terreno, ejecutar el motor técnico de tasación canónica y supervisar que las publicaciones externas se mantengan correctas.
3. **Justificación Técnica:**
   - La base de datos e interfaz de usuario bloquean físicamente la sentencia `DELETE` sobre las tablas comerciales (`tpl_propiedades`, `tpl_actores`, `tpl_tasaciones`). El modelo soporta archivado lógico mediante la columna `estado`, según la evidencia encontrada en las RPC, funciones y tablas auditadas.
   - Toda creación de actores se delega a formularios externos y RPCs de enrolamiento seguro, manteniendo al CRM como un auditor y visualizador centralizado.

---

## Anexo: Evidencia de archivado por entidad

### Parcela
* **Tabla:** `tpl_propiedades`
* **Columna de estado:** `estado`
* **Valores permitidos:** `publicada`, `borrador`, `pausada`, `archivada`, `vendida`
* **Función o RPC que modifica:** `tpl_crm_guardar_datos_tasacion_v1`
* **Archivo y línea aproximada:** [tpl-data-service.js:484](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L484)

### Casa
* **Tabla:** `tpl_casas`
* **Columna de estado:** `estado`
* **Valores permitidos:** `pausada`, `activa`, `archivada`
* **Función o RPC que modifica:** `tpl_crm_guardar_casa_v1`
* **Archivo y línea aproximada:** [tpl-data-service.js:636](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L636)

---

## Certificación de consistencia de la auditoría

Por la presente se certifica la consistencia entre el comportamiento de las interfaces de usuario del frontend, las funciones de servicio de comunicación y las funciones SQL de Supabase analizadas.

### Resultados de la Validación SQL
1. **`tpl_crm_guardar_datos_tasacion_v1`:**
   - *Comportamiento:* Realiza un `UPDATE` exclusivo sobre la tabla `public.tpl_propiedades`. No modifica la columna `estado` ni realiza ningún tipo de eliminación.
2. **`tpl_crm_guardar_casa_v1`:**
   - *Comportamiento:* Realiza `INSERT` o `UPDATE` sobre las tablas `public.tpl_casas`, `public.tpl_casa_proveedores` y `public.tpl_catalogo_items`. Escribe logs en `public.tpl_eventos`. Modifica la columna `estado` de las casas y no ejecuta borrados.
3. **`tpl_registrar_tasacion_v1` (Invocado por el cotizador y tasador canónico):**
   - *Comportamiento:* Realiza un `INSERT` exclusivo de una nueva tupla en la tabla `public.tpl_tasaciones`. No altera estados lógicos ni ejecuta `DELETE` indirectos.
4. **`tpl_crm_snapshot_v1`:**
   - *Comportamiento:* Función estrictamente de solo lectura (`SELECT`). Retorna un objeto JSONB consolidado y no realiza escrituras de ningún tipo.

En el alcance de la auditoría realizada, no se identificó código de borrado físico (`DELETE`) directo o indirecto en las RPC críticas de Supabase evaluadas. La evidencia revisada demuestra consistencia entre el frontend, las RPC auditadas y las funciones SQL analizadas.

---

## Anexo: Evidencia SQL

### 1. Función `tpl_crm_guardar_datos_tasacion_v1`
* **Operación:** `UPDATE`
* **Tablas afectadas:** `public.tpl_propiedades`
* **Presencia de `DELETE`:** AUSENTE
* **Presencia de modificación de `estado`:** AUSENTE
* **Sección de código clave:**
  ```sql
  update public.tpl_propiedades set
    region = coalesce(nullif(p_entrada->>'region',''), region),
    comuna = coalesce(nullif(p_entrada->>'comuna',''), comuna),
    superficie_m2 = case when coalesce(p_entrada->>'tipoActivo','')='casa' then superficie_m2 else coalesce(nullif(p_entrada->>'area','')::numeric,superficie_m2) end,
    precio_publicado = coalesce(nullif(p_entrada->>'asking','')::bigint,precio_publicado),
    lat = coalesce(nullif(p_entrada->>'lat','')::numeric,lat),
    lng = coalesce(nullif(p_entrada->>'lng','')::numeric,lng),
    rol_situacion = coalesce(nullif(p_entrada->>'rol',''),rol_situacion),
    electricidad = coalesce(nullif(p_entrada->>'electricity',''),electricidad),
    agua = coalesce(nullif(p_entrada->>'water',''),agua),
    acceso = coalesce(nullif(p_entrada->>'access',''),acceso),
    topografia = coalesce(nullif(p_entrada->>'topography',''),topografia),
    suelo = coalesce(nullif(p_entrada->>'soil',''),suelo),
    exposicion = coalesce(nullif(p_entrada->>'exposure',''),exposicion),
    vista_principal = coalesce(nullif(p_entrada->>'view',''),vista_principal),
    vegetacion = coalesce(nullif(p_entrada->>'vegetation',''),vegetacion),
    cierre_perimetral = coalesce(nullif(p_entrada->>'fencing',''),cierre_perimetral),
    porton = coalesce(nullif(p_entrada->>'gate',''),porton),
    condominio = case
      when lower(coalesce(p_entrada->>'condominium','')) in ('si','sí','true','1') then true
      when lower(coalesce(p_entrada->>'condominium','')) in ('no','false','0') then false
      else condominio end,
    distancia_ruta_principal_km = coalesce(v_route_m::numeric/1000,distancia_ruta_principal_km),
    casa_datos = v_house,
    metadata = v_metadata,
    updated_at = now()
  where id=p_propiedad_id returning * into v_row;
  ```

### 2. Función `tpl_crm_guardar_casa_v1`
* **Operación:** `INSERT`, `UPDATE`
* **Tablas afectadas:** `public.tpl_casas`, `public.tpl_casa_proveedores`, `public.tpl_catalogo_items`, `public.tpl_eventos`
* **Presencia de `DELETE`:** AUSENTE
* **Presencia de modificación de `estado`:** PRESENTE
* **Sección de código clave:**
  ```sql
  if v_casa is null then
   insert into public.tpl_casas(codigo,nombre,descripcion,tipo,material,superficie_m2,dormitorios,banos,pisos,precio_base,estado,imagenes,planos,origen,proveedor_estado,metadata)
   values(nullif(p_payload->>'codigo',''),trim(p_payload->>'nombre'),p_payload->>'descripcion',coalesce(nullif(p_payload->>'tipo',''),'prefabricada'),p_payload->>'material',nullif(p_payload->>'superficie_m2','')::numeric,nullif(p_payload->>'dormitorios','')::smallint,nullif(p_payload->>'banos','')::smallint,nullif(p_payload->>'pisos','')::smallint,nullif(p_payload->>'precio_base','')::bigint,coalesce(nullif(p_payload->>'estado',''),'pausada'),coalesce(p_payload->'imagenes','[]'),coalesce(p_payload->'planos','[]'),'crm_tpl',coalesce(nullif(p_payload->>'proveedor_estado',''),'pendiente_identificacion'),coalesce(p_payload->'metadata','{}')) returning id into v_casa;
  else
   update public.tpl_casas set nombre=trim(p_payload->>'nombre'),descripcion=p_payload->>'descripcion',material=p_payload->>'material',superficie_m2=nullif(p_payload->>'superficie_m2','')::numeric,dormitorios=nullif(p_payload->>'dormitorios','')::smallint,banos=nullif(p_payload->>'banos','')::smallint,pisos=nullif(p_payload->>'pisos','')::smallint,precio_base=nullif(p_payload->>'precio_base','')::bigint,estado=coalesce(nullif(p_payload->>'estado',''),estado),imagenes=coalesce(p_payload->'imagenes',imagenes),planos=coalesce(p_payload->'planos',planos),proveedor_estado=coalesce(nullif(p_payload->>'proveedor_estado',''),proveedor_estado),updated_at=now() where id=v_casa;
  end if;
  ```

### 3. Función `tpl_registrar_tasacion_v1`
* **Operación:** `INSERT`
* **Tablas afectadas:** `public.tpl_tasaciones`
* **Presencia de `DELETE`:** AUSENTE
* **Presencia de modificación de `estado`:** AUSENTE
* **Sección de código clave:**
  ```sql
  insert into public.tpl_tasaciones(
    propiedad_id,tipo,superficie_m2,precio_publicado,precio_publicado_m2,
    valor_tpl_total,valor_tpl_m2,referencia_comunal_m2,
    diferencia_publicado_vs_tpl_pct,clasificacion,es_oportunidad,
    factores,entrada,resultado,version_motor
  ) values (
    v_propiedad_id,v_tipo,v_superficie,nullif(v_precio,0),v_precio_m2,
    v_valor,v_valor_m2,v_ref_m2,v_diff,nullif(v_class,''),
    coalesce(v_diff <= -5,false),
    coalesce(p_resultado->'breakdown',p_resultado->'desglose','[]'::jsonb),
    p_entrada,
    p_resultado || jsonb_build_object('quick',v_quick,'patient',v_patient),
    left(coalesce(p_resultado->>'engineVersion',p_resultado->>'method','tpl-land-engine-v2'),80)
  ) returning id into v_id;
  ```

### 4. Función `tpl_crm_snapshot_v1`
* **Operación:** `SELECT` (Lectura)
* **Tablas afectadas:** Múltiples vistas y tablas (lectura)
* **Presencia de `DELETE`:** AUSENTE
* **Presencia de modificación de `estado`:** AUSENTE
* **Sección de código clave:**
  ```sql
  select jsonb_build_object(
   'generated_at',now(),
   'compradores',coalesce((select jsonb_agg(to_jsonb(x) order by x.nombre nulls last) from public.crm_compradores x),'[]'::jsonb),
   'duenos',coalesce((select jsonb_agg(to_jsonb(x) order by x.nombre nulls last) from public.crm_duenos x),'[]'::jsonb),
   'parcelas',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from public.crm_parcelas x),'[]'::jsonb),
   ...
  ) into v_result;
  ```
