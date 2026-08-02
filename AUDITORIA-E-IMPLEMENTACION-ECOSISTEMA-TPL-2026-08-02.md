# Auditoría e implementación de consolidación del ecosistema TPL

## Diagnóstico

TPL tenía correctamente separados varios dominios funcionales, pero no una fuente única para el catálogo. Las casas históricas seguían en `casas.js`, `tpl_casas` existía con un esquema reducido, PlaceMarket publicaba solamente la oferta principal escrita dentro del perfil Partner y el CRM podía listar casas, pero no editarlas. Esto generaba cuatro riesgos: precios divergentes, casas sin proveedor verificable, duplicación entre Partner y catálogo, y dificultad para convertir una cotización en Proyecto TPL.

## Arquitectura consolidada

### Actor
Persona o empresa única, con múltiples roles.

### Partner
Perfil comercial vinculado al actor. Puede ofrecer casas, servicios, productos, arriendos y turismo.

### Catálogo universal
`tpl_catalogo_items` es la fuente pública común. Cada elemento tiene tipo, Partner, precio, ubicación, multimedia, atributos, SEO, estado y métricas. Las páginas `casas.html`, `servicios.html`, `productos.html` y `placemarket.html` son vistas filtradas del mismo catálogo.

### Casas
`tpl_casas` conserva la ficha técnica neutral. `tpl_casa_proveedores` conserva quién la ofrece y sus condiciones. `tpl_casas_proyectos_realizados` acredita obras reales. Así una casa no se confunde con la empresa ni con el precio vigente.

### Oportunidad
`tpl_oportunidades` recibe consultas, cotizaciones, compras, reservas, servicios y arriendos. Todas llegan al mismo CRM.

### Proyecto TPL
`tpl_proyecto_componentes` permite agregar al proyecto una parcela, casa, quincho, pozo, huerta, producto, cabaña o cualquier otro componente, con estado, costo y dependencia.

## Cambios aplicados

1. Migración idempotente `202608020003_tpl_ecosistema_consolidado_v1.sql`.
2. Importación de las 14 casas históricas de `casas.js` usando su ID original.
3. Proveedores históricos conservados como nombre pendiente, sin inventar un actor.
4. Vista CRM de casas ampliada con oferta y estado de publicación.
5. RPC segura `tpl_crm_guardar_casa_v1` para crear o editar una casa y sincronizar ficha, oferta y catálogo en una sola transacción.
6. RPC pública `tpl_catalogo_publico_buscar_v2` para todas las vitrinas.
7. CRM con formulario real para nombre, superficie, dormitorios, baños, material, precio, proveedor, relación, plazo, garantía, imágenes y planos.
8. PlaceMarket actualizado para consultar el catálogo universal.
9. `casas.js` se conserva solo como respaldo temporal. Después de validar Supabase puede retirarse gradualmente del cotizador antiguo.

## Reglas operativas

- El CRM administra y aprueba.
- TPL Business permite al Partner proponer cambios y administrar su catálogo.
- Supabase es la única fuente oficial.
- El sitio público solamente consulta elementos `publicado`.
- Una casa sin proveedor muestra “Proveedor en proceso de validación”.
- Una oferta conserva precio, plazo, garantía y vigencia separados de la ficha técnica.
- Toda consulta pública futura debe crear una oportunidad CRM y, al ser aceptada, un componente del Proyecto TPL.

## Orden de instalación

1. Ejecutar la migración en Supabase SQL Editor.
2. Actualizar frontend y CRM.
3. Revisar las 14 casas importadas en CRM → Casas canónicas.
4. Vincular cada nombre histórico con un `partner_actor_id` cuando la empresa sea confirmada.
5. Validar casas.html y PlaceMarket.
6. Mantener `casas.js` hasta comprobar que el cotizador consume Supabase sin diferencias.

## Próxima fase recomendada

- “Mi catálogo” en TPL Business para múltiples casas, servicios, productos y arriendos.
- Flujo Partner propone → CRM revisa → catálogo publica.
- Formulario público de cotización que genere `tpl_oportunidades`.
- Conversión oportunidad → propuesta → componente de proyecto → orden → avances → pagos → reputación.
