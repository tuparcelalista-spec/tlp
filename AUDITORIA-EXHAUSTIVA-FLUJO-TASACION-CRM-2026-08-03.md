# Auditoría exhaustiva del flujo de tasación TPL + CRM

Fecha: 3 de agosto de 2026

## Alcance revisado

- Inventario de propiedades del CRM.
- Detección de tasación existente.
- Tasación básica automática.
- Tasación completa editable.
- Precarga desde `tpl_propiedades` y `metadata`.
- Registro en `tpl_tasaciones`.
- Guardado de antecedentes en `tpl_propiedades`.
- Recarga del snapshot del CRM.
- Preparación del Informe Premium.
- Generación, Storage, descarga y envío opcional.
- Variantes parcela, parcela + casa y casa.

## Hallazgos críticos corregidos

### 1. Precarga incompleta
El CRM leía principalmente las columnas directas de `tpl_propiedades`. Varias propiedades antiguas conservan antecedentes en `metadata`, `metadata.ubicacion` o `metadata.casa_datos`, por lo que el Tasador se abría con campos vacíos aunque la información existía.

**Corrección:** `tasadorUrlFor()` ahora usa columnas canónicas y respaldos de metadata para región, comuna, superficie, precio, ubicación, servicios, atributos, vivienda y distancias.

### 2. Selectores aparentemente vacíos
Los valores almacenados no siempre coinciden literalmente con los textos de las opciones del Tasador. Por ejemplo, diferencias de mayúsculas, acentos o etiquetas provocaban que el navegador dejara el selector sin coincidencia.

**Corrección:** la precarga normaliza acentos, mayúsculas y texto visible antes de seleccionar la opción equivalente.

### 3. Falso éxito al guardar
`TPLTasadorSupabase.register()` captura errores internamente. El flujo CRM podía continuar, actualizar la propiedad y notificar éxito aunque no existiera una fila real en `tpl_tasaciones`. Después, el Informe Premium volvía a indicar que no había tasación.

**Corrección:** en modo CRM se exige explícitamente `registration.tasacion_id`. Si Supabase no confirma la tasación, el proceso se detiene con un mensaje útil y no abre el informe.

### 4. Distancia comunal falsa
Cuando una propiedad no tenía coordenadas ni distancia al centro comunal, el CRM enviaba `0`. Esto permitía pasar la validación, pero podía sobrevalorar la accesibilidad simulando que la propiedad estaba en el centro.

**Corrección:** ya no se inventa `0 km`. La tasación básica utiliza una referencia comunal neutral y la tasación precisa exige coordenadas reales.

### 5. Informe abierto sin respetar intención
El listener del CRM abría siempre el Informe Premium después de guardar, aunque el mensaje indicara otra intención.

**Corrección:** ahora respeta `open_report`.

## Flujo final esperado

### Tasación básica

1. CRM recupera propiedad.
2. Combina columnas canónicas y metadata.
3. Abre Tasador embebido en modo rápido.
4. Precarga y normaliza campos.
5. Calcula sin exigir coordenadas.
6. Registra una fila real en `tpl_tasaciones`.
7. Guarda datos no vacíos en `tpl_propiedades`.
8. Notifica al CRM.
9. Recarga snapshot.
10. Abre Informe Premium solamente si fue solicitado.

### Tasación completa

1. CRM abre el formulario preciso ya rellenado.
2. El asesor completa o corrige antecedentes.
3. Se exigen coordenadas para análisis territorial preciso.
4. Se calcula y registra una nueva versión.
5. Los datos quedan guardados en la propiedad.
6. Se conserva historial de tasaciones.
7. El Informe Premium usa la última tasación vinculada.

## Validaciones realizadas

- `node --check frontend-v2/plataforma/crm-v2/crm-v2.js`: correcto.
- `node --check frontend-v2/plataforma/publicar/tasador-publico.js`: correcto.
- Verificación de parámetros CRM → Tasador.
- Verificación de `propiedad_id` en registro y guardado.
- Verificación de descarga sin correo (`enviar=false`).
- Verificación de correo obligatorio solo para envío.

## Dependencias obligatorias en Supabase

Deben existir y estar ejecutadas:

- `tpl_registrar_tasacion_v1`
- `tpl_crm_guardar_datos_tasacion_v1`
- `tpl_crm_preparar_informe_tasacion_v1`
- `tpl_crm_historial_informes_v1`
- `tpl_es_staff`

Migraciones relevantes incluidas en el proyecto:

- `202608020008_tpl_tasador_fuente_canonica_v1.sql`
- `202608020010_tpl_crm_informe_premium_fix_v1.sql`
- `202608020011_tpl_crm_guardar_datos_tasacion_v1.sql`

## Pruebas de aceptación recomendadas

1. Parcela con región, comuna y superficie, sin coordenadas: tasación básica debe guardarse.
2. Parcela antigua con datos solo en metadata: campos deben aparecer precargados.
3. Parcela con coordenadas: completar y tasar debe abrir modo preciso.
4. Parcela + casa: debe precargar m², materialidad, dormitorios y baños.
5. Casa: no debe sumar valor de terreno.
6. Fallo de `tpl_registrar_tasacion_v1`: no debe mostrar éxito ni abrir informe.
7. Descarga de PDF sin nombre/correo/teléfono.
8. Envío por correo con validación de email.

## Limitación honesta

La auditoría valida el código y los contratos incluidos en el proyecto. No fue posible ejecutar una prueba real contra tu Supabase de producción desde este entorno. La comprobación final debe hacerse después de desplegar, observando la consola y verificando filas en `tpl_tasaciones`, `tpl_propiedades` y `tpl_informes_tasacion`.
