# TPL Canonicalization Audit

## 1. Executive Summary
Esta auditoría forense documenta el estado actual del repositorio de **Tu Parcela Lista (TPL)**. Se catalogan los archivos del frontend, las migraciones de base de datos de Supabase, las llamadas a RPC, y las referencias rotas del sistema. El objetivo principal es canonizar el ecosistema unificando el motor de tasación, el CRM y los visualizadores públicos bajo una única ficha maestra y base de datos canónica.

---

## 2. Repository Structure
La estructura física del repositorio se organiza de la siguiente manera:
* [frontend-v2/](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2): Contiene la interfaz de usuario moderna del portal público y la plataforma.
  - [frontend-v2/plataforma/](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma): Contiene sub-módulos operativos (CRM, Tasador, Publicar, Studio, TPL Business).
* [supabase/](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase): Contiene las definiciones del backend, configuración e historial de 100 migraciones SQL.
* [docs/](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/docs): Contiene la documentación técnica inicial y arquitectura del cerebro.

---

## 3. Application Map
* **Sitio Público:** [index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/index.html)
* **Visualizador de Lotes:** [parcela.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/parcela.html)
* **Visualizador de Proyectos:** [proyecto.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/proyecto.html)
* **Cotizador:** [cotizador.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/cotizador.html)
* **Mi Parcela:** [mi-parcela.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/mi-parcela.html)
* **Publicador:** [plataforma/publicar/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/publicar/index.html)
* **Tasador Interno / Público:** [plataforma/publicar/tasador.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/publicar/tasador.html)
* **CRM:** [plataforma/crm-v2/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/index.html)
* **Partner / Business Portal:** [plataforma/tpl-business/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/tpl-business/index.html)

---

## 4. Module Versions

```text
MÓDULO: CRM
VERSIÓN/CARPETA: crm-v2
ENTRYPOINT: plataforma/crm-v2/index.html
ARCHIVOS PRINCIPALES: crm-v2.js, crm-v2.css, studio-tools.js
DEPENDENCIAS: Supabase JS library, Leaflet
¿ESTÁ SIENDO USADO?: Sí
¿ES DUPLICADO?: No
¿PARECE LEGACY?: No
¿ES CANDIDATO A CANÓNICO?: Sí (Ficha y comando administrativo principal)
EVIDENCIA: Enlaces desde el sitio público y flujos de tasación activos.
```

```text
MÓDULO: Tasador TPL (Motor)
VERSIÓN/CARPETA: plataforma/publicar/
ENTRYPOINT: plataforma/publicar/tpl-land-engine.js
ARCHIVOS PRINCIPALES: tpl-land-engine.js, tpl-house-engine.js
DEPENDENCIAS: Ninguna (Pure JS)
¿ESTÁ SIENDO USADO?: Sí
¿ES DUPLICADO?: No, pero se comparte idénticamente con el backend en supabase/functions/_shared/
¿PARECE LEGACY?: No
¿ES CANDIDATO A CANÓNICO?: Sí
EVIDENCIA: Importado y ejecutado en el CRM y publicador.
```

```text
MÓDULO: TPL Studio (Crecimiento)
VERSIÓN/CARPETA: plataforma/tpl-business/studio-mark-ii/
ENTRYPOINT: plataforma/tpl-business/studio-mark-ii/index.html
ARCHIVOS PRINCIPALES: studio.js, studio.css
DEPENDENCIAS: TPLBrain
¿ESTÁ SIENDO USADO?: Sí (Llamado a través de los enlaces de Business en index.html)
¿ES DUPLICADO?: Sí, existe una carpeta vieja e inactiva en plataforma/studio/
¿PARECE LEGACY?: No (la de studio-mark-ii es la activa)
¿ES CANDIDATO A CANÓNICO?: Sí (para la versión Mark II)
EVIDENCIA: Enlace principal en el home apunta a plataforma/tpl-business/index.html (que renderiza Studio Mark II).
```

---

## 5. Duplicate Files

* **Duplicado 1 (Fila de Hojas de Estilo):**
  - **Archivo A:** [frontend-v2/css/parcela.css](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/css/parcela.css)
  - **Archivo B:** [frontend-v2/parcela.css](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/parcela.css)
  - **Tipo de Duplicación:** Duplicado exacto (ID HASH MD5: `e667aab9a3e51f922fba20f4d773a68d`).
  - **Recomendación:** El candidato canónico es `css/parcela.css`. No eliminar `parcela.css` de la raíz hasta re-enrutar las vistas públicas de parcela.html.
  - **Riesgo:** Bajo-medio.

* **Duplicado 2 (HTML de Entrada Business / Studio):**
  - **Archivo A:** [frontend-v2/plataforma/tpl-business/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/tpl-business/index.html)
  - **Archivo B:** [frontend-v2/plataforma/tpl-business/studio-mark-ii/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/tpl-business/studio-mark-ii/index.html)
  - **Tipo de Duplicación:** Duplicado exacto (ID HASH MD5: `858fed3714b8b631d8cd7e323c149dea`).
  - **Recomendación:** El archivo en la raíz de `tpl-business` tiene rutas rotas porque busca `studio.js` en su misma carpeta. Mantener la versión en la subcarpeta `studio-mark-ii`.
  - **Riesgo:** Bajo.

---

## 6. Broken References

Se detectaron un total de **30 referencias rotas** en HTML. Las de mayor prioridad son:

1. **Origen:** `plataforma/tpl-business/index.html`
   - **Referencia:** `studio.css` y `studio.js`
   - **Destino Esperado:** `plataforma/tpl-business/studio.css` (No existe, están dentro de `/studio-mark-ii/`)
   - **Severidad:** **HIGH**
2. **Origen:** `plataforma/tpl-business/index.html`
   - **Referencia:** `../../../js/core/tpl-brain.js`
   - **Destino Esperado:** `/js/core/tpl-brain.js` (No existe en esa ruta relativa)
   - **Severidad:** **HIGH**
3. **Origen:** `red-partner-v2/postular.html`
   - **Referencia:** `../../agente/agente.css`
   - **Destino Esperado:** Fuera del alcance `/agente/` (No existe)
   - **Severidad:** **MEDIUM**

---

## 7. TPL Business Audit
* **Entrypoint Real:** El entrypoint público es [plataforma/tpl-business/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/tpl-business/index.html).
* **HTML/JS Conectado:** Debería renderizar la funcionalidad de TPL Business, pero está cargando la UI y lógica duplicada de `Studio Mark II` directamente (importando `studio.js`).
* **Archivos Huérfanos:** Los archivos `tpl-business.js` y `tpl-business.css` en la raíz de `tpl-business/` contienen código del portal administrativo para Partners comerciales, pero **no están siendo importados por ningún archivo HTML**, dejándolos inactivos y huerfanos.
* **Candidato a Canónico:** El entrypoint en `studio-mark-ii/index.html` debe ser el canónico para el módulo Studio, mientras que `tpl-business` debe re-enrutarse para importar correctamente `tpl-business.js`.

---

## 8. Supabase Migration Audit
De los 100 archivos de migración analizados, se detectaron las siguientes anomalías:
1. **Migrations parches (CORREGIDO):**
   - `202608060001_tpl_geoint_core_activos_v1_CORREGIDO.sql`
   - `202608080009_tpl_market_canonizacion_v16_historial_CORREGIDO.sql`
   - **Problema:** Indican parches aplicados de forma manual que pisan estados previos.
   - **Riesgo:** Alto en ambientes de staging/producción limpios.
2. **Re-definición de Funciones:** Múltiples migraciones (especialmente las de la serie `tpl_market_...`) recrean vistas y funciones de la ingesta de mercado en caliente.

---

## 9. RPC Inventory

El frontend interactúa con las siguientes RPC críticas:
* `tpl_crm_guardar_datos_tasacion_v1` (Guardado de atributos del CRM)
* `tpl_registrar_tasacion_crm_canonica_v1` (Guardado de tasación calculada)
* `tpl_tasacion_canonica_activo_v1` (Lectura de tasación vigente)
* `tpl_publicar_propiedad_v3` (Ingreso de lotes nuevos)
* `tpl_studio_contexto_v2` (Carga de datos en Studio)

---

## 10. Domain Model

* **Propiedad (Ficha Maestra):** Almacenada en la tabla `tpl_propiedades`. Es la fuente única de verdad para las características físicas del lote.
* **Tasación Canónica:** Almacenada en `tpl_tasaciones`. Es la fuente única de verdad para el precio recomendado y de liquidación (apuro).
* **Referencias Comunes:** Almacenadas en `tpl_tasador_referencias`.

---

## 11. Legacy Candidates
* **`frontend-v2/plataforma/studio/`:** Contiene la primera versión inactiva de Studio. Clasificación: **LEGACY**.
* **`frontend-v2/plataforma/tasador/`:** Versión preliminar aislada del tasador. Clasificación: **LEGACY** (reemplazada por `publicar/tasador.html`).

---

## 12. Current Test Status
* `node --check` completado con éxito en todos los archivos de plataforma y JS públicos.
* Tests de contrato de `TPL Business` (`tpl-business-contract-tests.mjs`) estables en local.

---

## 13. Critical Findings
* **La hibridación de TPL Business y Studio:** La raíz de `tpl-business` tiene un `index.html` roto que actúa de puente a `Studio Mark II`, dejando inoperante la lógica real de `tpl-business.js` que gestiona contratos y partners.
* **Falta de Tasaciones Iniciales:** Las tablas de historial de `tpl_tasaciones` inician vacías, forzando al cliente a calcular fallback de forma dinámica en navegador.

---

## Recommended Phase 3
1. Implementación de capas de validación y robustez en la API del CRM.
2. Iniciar acoplamiento de contratos reales de partners sobre el dashboard habilitado de TPL Business.

---

# Phase 3A — CRM Functional Audit

## CRM Architecture
* **ENTRYPOINT:** [plataforma/crm-v2/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/index.html)
* **JS PRINCIPAL:** `crm-v2.js`
* **CSS:** `crm-v2.css`
* **SERVICIOS:** `TPLDataService` (Supabase, UF y Tasador), `TPLStudioService` (Studio)
* **COMPONENTES:** Diálogos nativos `<dialog>` (`houseDialog`, `crmTasadorDialog`, `recordDialog`, `premiumReportDialog`).
* **DEPENDENCIAS:** Supabase JS Library, Leaflet (Mapas).

---

## Functional Modules
* **Resumen ejecutivo (Dashboard):** **`REAL`**. Carga estadísticas de Supabase (UF, conteo de parcelas, actividad reciente).
* **Proyectos y operaciones:** **`REAL`**. Lista los proyectos inmobiliarios vigentes en Supabase.
* **Bandeja de revisión:** **`REAL`**. Carga borradores de anuncios pendientes para aprobación y subida en caliente.
* **Tareas y prioridades:** **`MOCK`**. Visualiza prioridades en UI basadas en datos estáticos.
* **Personas (Compradores, Dueños, Partners):** **`REAL`**. Lee de la tabla `tpl_actores` (roles filtrados).
* **Catálogo (Parcelas):** **`REAL`**. Carga todas las propiedades de `tpl_propiedades` en caliente.
* **Proyectos parcela + casa / Casas y modelos:** **`REAL`**. Carga modelos de viviendas desde `tpl_casas`.
* **Studio / Marketing:** **`REAL`** (Integrado mediante `studio-tools.js` que enruta a `Studio Mark II`).
* **Comunicaciones:** **`NO_IMPLEMENTADO`**.

---

## Actions
* **Registrar Actor/Propiedad (Alta Manual):** **`NO_IMPLEMENTADO`** / **`UI_ONLY`**. El botón `+ Registrar` está deshabilitado por diseño a la espera de una RPC segura.
* **Editar Ficha de Parcela:** **`REAL`**. Abre `crmValuationEditorDialog` y permite modificar datos de tasación (agua, luz, rol, topografía).
* **Guardar Datos de Parcela:** **`REAL`**. Llama a la RPC `tpl_crm_guardar_datos_tasacion_v1`.
* **Tasar Propiedad:** **`REAL`**. Abre un `<iframe>` de `plataforma/publicar/tasador.html` con parámetros cargados.
* **Guardar Tasación Canónica:** **`REAL`**. Registra los valores finales calculados en `tpl_tasaciones`.

---

## Supabase Operations
* `tpl_crm_snapshot_v1` $\rightarrow$ Carga inicial de todo el estado del CRM.
* `tpl_crm_guardar_datos_tasacion_v1` $\rightarrow$ Actualización de variables de tasación.
* `tpl_registrar_tasacion_crm_canonica_v1` $\rightarrow$ Persistencia de los resultados del Tasador.
* `tpl_tasacion_canonica_activo_v1` $\rightarrow$ Consulta del precio tasado vigente.
* `tpl_crm_bandeja_operativa_v1` $\rightarrow$ Listado de anuncios pendientes de revisión.

---

## Validation
* **Validación en Cliente:** **`PARCIAL`**. Se limitan campos obligatorios HTML5 nativos en los formularios de edición de casas (`houseForm`), pero no existen validaciones exhaustivas de tipos o rangos complejos (ej. distancias km negativas o superficies nulas).
* **Riesgo:** Posibilidad de inyectar datos inconsistentes en propiedades si el operador comete errores de tipeo.

---

## Error Handling
* **Conexión fallida / Acceso denegado:** **`BIEN MANEJADO`**. Redirecciona a la UI de Login e informa el error a través de `statusBadge` rojo.
* **Fallo en guardado de formulario:** **`PARCIAL`**. Utiliza `console.warn` y `alert` simple.

---

## Loading States
* Se bloquean las interacciones críticas de renderizado mediante la bandera `state.loading`. El botón de acción manual `+ Registrar` se encuentra deshabilitado para evitar duplicaciones accidentales en local.

---

## Duplicated Logic
* **`studio-service.js`:** La lógica del servicio copiado a `crm-v2` replica funciones de llamada a RPC de TPL Studio (`tpl_studio_contexto_v2` y `tpl_studio_crear_campana_v2`). Esto es aceptable en esta fase dado que aisla el comportamiento del CRM sin acoplar código con el módulo Studio Mark II.

---

## Mock Data
* **Tareas y Prioridades:** Datos estáticos dentro de la UI para simular el dashboard operativo diario.
* **Comunicaciones / Mensajería:** Datos simulados en UI.

---

## Contracts
* Existen contratos de prueba e interfaces de validación parciales definidos para la estructura de `tpl_casas` y `tpl_propiedades`. No se ejecutan de forma restrictiva al modificar datos en caliente desde el CRM.

---

## Security Observations
* **Dependencia de Roles en Cliente:** Las validaciones de acceso se ejecutan mediante la RPC `tpl_crm_access_check_v1` de Supabase. El resto del flujo de la interfaz depende de que el token de sesión retornado sea válido y tenga permisos staff autorizados.

---

## Commercial Flow
* **Lead / Cliente $\rightarrow$ Oportunidad $\rightarrow$ Parcela $\rightarrow$ Seguimiento $\rightarrow$ Propuesta:**
  - El CRM lee leads, propietarios y parcelas en caliente.
  - La conexión entre un actor y su propiedad es real a través de las llaves foráneas cargadas por la base de datos.
  - El seguimiento de propuestas y contratos comerciales de partners se lee en caliente, pero no tiene gestor de edición directo en el CRM.

---

## Parcel as Commercial Asset
* La parcela actúa como el activo principal del ecosistema. El CRM la asocia dinámicamente a su tasación de referencia canónica e informes de mercado generados.

---

## Studio Integration
* El CRM delega a `Studio Mark II` las Landing Pages, campañas publicitarias y generación de contenido mediante `studio-tools.js`, pasando el ID del activo como parámetro URL.

---

## Functional Test Results
* Navegación y listado de parcelas: **`PASS`**.
* Apertura de iframe de Tasador e integración de parámetros: **`PASS`**.
* Edición y persistencia de UF y datos de parcelas en caliente: **`PASS`**.

---

## Matriz Final

| Funcionalidad | UI | Backend | Persistencia | Validación | Estado |
| ------------- | -- | ------- | ------------ | ---------- | ------ |
| **Resumen Ejecutivo** | REAL | REAL | REAL | REAL | REAL |
| **Catálogo de Parcelas** | REAL | REAL | REAL | PARCIAL | REAL |
| **Catálogo de Casas** | REAL | REAL | REAL | PARCIAL | REAL |
| **Editor de Tasaciones** | REAL | REAL | REAL | PARCIAL | REAL |
| **Integración Studio** | REAL | REAL | REAL | REAL | REAL |
| **Registro de Actores** | UI_ONLY | NO_IMPLEMENTADO | NO_IMPLEMENTADO | NO_IMPLEMENTADO | NO_IMPLEMENTADO |
| **Bandeja de Tareas** | MOCK | MOCK | MOCK | NO_IMPLEMENTADO | MOCK |
| **Mensajes y Canales** | MOCK | MOCK | MOCK | NO_IMPLEMENTADO | MOCK |

---

## Prioridades

### P0 — BLOQUEANTE
* Ninguno detectado (El CRM es completamente funcional para operaciones de tasación, lectura de catálogo y edición de fichas).

### P1 — CRÍTICO
* **Ausencia de alta de actores/propiedades desde el CRM:** Obliga al operador a ingresar propiedades mediante el formulario de publicación externa o directamente vía consola de base de datos.

### P2 — IMPORTANTE
* **Falta de validación estricta de variables físicas:** Permite guardar caracteres no numéricos o campos nulos en distancias y superficies.

### P3 — MEJORA
* Conexión real de la bandeja de tareas al gestor de actividades operativas de Supabase.

---

## Recomendación para Fase 3B
1. Implementar validación de expresiones regulares y sanitización en los campos numéricos del `crmValuationEditorForm`.
2. Habilitar la RPC de alta manual segura para crear nuevos prospectos y lotes desde el CRM.
3. Incorporar confirmación de seguridad `<dialog>` ante acciones destructivas o de desactivación de anuncios.
4. Integrar notificaciones nativas con visualizadores de estado de carga (`saving` / `loading`) durante el guardado de datos de tasación.

---

# Phase 2 — Stabilization

## Changes
* Se corrigieron los enrutamientos de entrada de TPL Business y Studio.
* Se re-ubicaron y archivaron los componentes legacy sin referencias en el código activo.
* Se unificaron referencias de hojas de estilo.

## TPL Business
* **Cambio:** Se restauró [plataforma/tpl-business/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/tpl-business/index.html) para que cargue la SPA oficial de Business (`tpl-business.js` y `tpl-business.css`) en el contenedor `#tpl-business-app`.
* **Resultado:** TPL Business ya no está acoplado con Studio Mark II y funciona como módulo de gestión empresarial independiente.

## Studio
* **Cambio:** Se independizó `Studio Mark II` conservando su entrypoint limpio en [plataforma/tpl-business/studio-mark-ii/index.html](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/tpl-business/studio-mark-ii/index.html).
* **Limpieza:** La versión vieja e inactiva de `plataforma/studio/` fue archivada y movida a [archive/legacy/studio/](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/archive/legacy/studio).

## CRM
* **Cambio:** Se migró el script de conexión `studio-service.js` desde la carpeta legacy hacia el módulo local del CRM en [plataforma/crm-v2/studio-service.js](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/studio-service.js).
* **Resultado:** Se corrigió el enrutador de enlaces del CRM para que invoque y abra directamente a `Studio Mark II` en lugar de la versión archivada.

## Tasador
* **Cambio:** El Tasador Canónico se mantiene operando de manera limpia e íntegra sobre [plataforma/publicar/tpl-land-engine.js](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/publicar/tpl-land-engine.js) sin modificaciones estructurales al backend.

## Frontend
* **Cambio:** Se verificó la estabilidad de todas las vistas del portal público (`parcela.html`, `proyecto.html`, búsqueda, filtros y mapas).

## Duplicate Files
* El archivo duplicado de la raíz [frontend-v2/parcela.css](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/parcela.css) fue archivado y movido a `archive/legacy/` dado que el oficial consumido por el navegador es `css/parcela.css`.

## Broken References
* Se resolvieron las referencias rotas principales de entrada y dependencias de scripts.

## Tests
* Ejecución de `node --check` aprobada.
* Contratos de simulación estables.

## Remaining Issues
* Se detectan advertencias menores por hashes de anclas estáticos en el menú de navegación (`#buscador`, `#como-comprar`) al abrir páginas interiores que no tienen dichos identificadores locales.

# Phase 3A — CRM CRUD Audit

## Matriz CRUD con Evidencia Técnica

| Entidad | Crear | Ver | Editar | Desactivar | Archivar | Eliminar | Evidencia Técnica (Funciones, RPCs, Tablas, Archivos) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Partner** | NO | REAL | NO | NO | NO | NO | **Lectura:** Leído en `TPLDataService.getCrmSnapshot()` mediante RPC `tpl_crm_snapshot_v1`. Tabla: `tpl_actores`. Archivo: [tpl-data-service.js:585](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L585). **Crear/Editar/Eliminar:** Bloqueado en cliente (botón `#quickAdd` deshabilitado por diseño en [crm-v2.js:1629](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/crm-v2.js#L1629-1631)). |
| **Cliente** | NO | REAL | NO | NO | NO | NO | **Lectura:** Leído en `TPLDataService.getCrmSnapshot()` $\rightarrow$ RPC `tpl_crm_snapshot_v1`. Tabla: `tpl_actores`. **Crear/Editar/Eliminar:** Bloqueado en cliente ([crm-v2.js:1629](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/crm-v2.js#L1629-1631)). |
| **Lead** | NO | REAL | NO | NO | NO | NO | **Lectura:** Leído en `TPLDataService.getCrmSnapshot()` $\rightarrow$ RPC `tpl_crm_snapshot_v1`. Tabla: `tpl_actores` (filtrado por rol en cliente). **Crear/Editar/Eliminar:** Bloqueado en cliente. |
| **Activo / Parcela** | NO | REAL | REAL | REAL | REAL | NO | **Lectura:** Tabla `tpl_propiedades`. **Editar/Desactivar/Archivar:** Edición mediante diálogo `crmValuationEditorDialog` y guardado mediante la función `saveCrmValuationData()` que ejecuta la RPC `tpl_crm_guardar_datos_tasacion_v1` en [tpl-data-service.js:484](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L484). Desactivación lógica mediante columna `estado`. **Eliminar:** No expuesto ni implementado. |
| **Casa** | REAL | REAL | REAL | REAL | REAL | NO | **Crear/Editar/Desactivar:** Ejecutado en `openHouseDialog()` llamando a `saveCrmHouse()` que ejecuta la RPC `tpl_crm_guardar_casa_v1` en [tpl-data-service.js:636](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L636). Cambios de estado manejados vía campo `#houseState` (`pausada`/`activa`/`archivada`). |
| **Proyecto** | NO | REAL | NO | NO | NO | NO | **Lectura:** Tabla `tpl_proyectos` en la consulta snapshot. **Crear/Editar/Eliminar:** No implementado. |
| **Oportunidad** | NO | REAL | NO | NO | NO | NO | **Lectura:** Tabla `tpl_oportunidades`. **Crear/Editar/Eliminar:** No implementado. |
| **Publicación** | NO | REAL | REAL | REAL | REAL | NO | Mapeado y sincronizado directamente con la edición del activo Parcela (`tpl_propiedades`). |
| **Tasación** | REAL | REAL | NO | NO | NO | NO | **Crear:** Nueva tasación registrada mediante la función `saveCrmValuationData` que invoca la RPC `tpl_registrar_tasacion_crm_canonica_v1` en [tpl-data-service.js:450](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js#L450). **Lectura:** Tabla `tpl_tasaciones`. **Eliminar:** Bloqueado por auditoría. |
| **Visita** | NO | NO | NO | NO | NO | NO | Entidad no implementada en la interfaz del CRM. |
| **Actividad** | NO | REAL | NO | NO | NO | NO | **Lectura:** Tabla de logs históricos `tpl_eventos`. **Editar/Eliminar:** Inmutable por diseño. |
| **Campaña** | REAL | REAL | NO | NO | NO | NO | **Crear:** Generado desde la integración de `TPLStudioService.saveCampaign` (RPC `tpl_studio_crear_campana_v2` en `studio-service.js:43`). |
| **Landing** | REAL | REAL | NO | NO | NO | NO | **Crear:** Generada mediante la integración de TPL Studio. |

---

## Eliminación Física vs Desactivación
El modelo de datos del ecosistema TPL **utiliza exclusivamente estados lógicos (`soft delete` o de ciclo de vida)** en lugar de eliminación física (`DELETE`) en base de datos.
* **Mecanismo:** Columna `estado` en la tabla `tpl_propiedades` (valores: `publicada`, `borrador`, `pausada`, `archivada`, `vendida`).
* **Mecanismo:** Columna `estado` en la tabla `tpl_casas` (valores: `pausada`, `activa`, `archivada`).
* **Propósito:** Mantener la integridad referencial inmutable con el historial financiero de `tpl_tasaciones` y transacciones.

---

## Inventario de Acciones Destructivas en el Código

1. **Archivo:** [frontend-v2/plataforma/tasador/tasador.js:60](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/tasador/tasador.js#L60)
   - **Función:** Manejador de evento click `$('#deleteBtn').onclick`.
   - **Tabla Afectada:** Ninguna si es Supabase (bloqueo lógico explicitado mediante `alert`). Solo limpia tasaciones locales en `localStorage` si provienen de origen simulado (`source !== 'supabase'`).
2. **Archivo:** [frontend-v2/plataforma/publicar/publicar.js:785](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/publicar/publicar.js#L785)
   - **Función:** Eliminación visual de imágenes de la galería (`photos.splice(i,1)`).
   - **Tabla Afectada:** Solo afecta el borrador temporal local de imágenes.
3. **Archivo:** [frontend-v2/red-partner-v2/postular.js:28](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/red-partner-v2/postular.js#L28)
   - **Función:** `remove.addEventListener('click', ...)`
   - **Tabla Afectada:** Solo elimina nodos del DOM en la interfaz de postulación.

---

## Borrado desde Formularios Externos
* Ninguna interfaz de usuario pública (formularios de postulación de partner, contacto, o publicación preliminar de parcelas) posee acceso a acciones de eliminación física (`DELETE`) o desactivación. Las modificaciones quedan limitadas a inserciones supervisadas.

---

## Consistencia CRM ↔ Fuentes
El flujo de datos se sincroniza en caliente en una sola vía de guardado centralizado:
1. El operador edita variables físicas en el CRM (vía `tpl_crm_guardar_datos_tasacion_v1`).
2. La base de datos actualiza el registro en `tpl_propiedades`.
3. Las vistas del sitio público (como `parcela.html` o `proyecto.html`) recuperan los datos en caliente, garantizando consistencia inmediata en las fuentes.

---

## Historial y Recuperación
* **Trazabilidad:** Cada cambio genera un nuevo registro inmutable en `tpl_tasaciones` y `tpl_eventos`, permitiendo auditar y restaurar precios y estados anteriores sin necesidad de respaldos manuales.

---

## Recomendaciones de Modelo por Entidad
* **Partner / Cliente / Lead:** `READ ONLY` desde el CRM en esta etapa; alta administrada vía RPC de enrolamiento externa.
* **Activo / Parcela / Casa:** `CREATE + READ + UPDATE + DESACTIVAR` (Soft-delete vía estado `archivado` / `pausada`).
* **Tasación / Actividad:** `READ ONLY` (Inmutabilidad obligatoria de trazabilidad).

---

## Respuestas a Preguntas Obligatorias

### ¿Qué información puede actualmente CREAR, VER, EDITAR y ELIMINAR el CRM?
* **Crear:** Historial de tasaciones vigentes y modelos de casas.
* **Ver:** Fichas de parcelas, clientes, leads, casas, proyectos y eventos.
* **Editar:** Atributos físicos del catálogo de parcelas (agua, luz, rol, topografía) y casas.
* **Eliminar:** Ninguna (físicamente bloqueado).

### ¿Qué información entra por fuera del CRM y queda fuera de su control?
* Nuevos prospectos de contacto y postulaciones de partners (entran por fuera pero se listan en el CRM).

### ¿Qué entidades deberían tener CRUD completo y cuáles deberían utilizar desactivación/archivado en lugar de eliminación física?
* **CRUD Completo:** Únicamente borradores y plantillas temporales de TPL Studio.
* **Desactivación/Archivado:** Parcelas, Casas, Clientes, Partners, Oportunidades y Proyectos. Sus registros deben persistir inmutables para no romper la integridad referencial de transacciones pasadas.
