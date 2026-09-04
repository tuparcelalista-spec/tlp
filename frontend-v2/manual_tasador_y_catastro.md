# Manual Operativo TPL: Tasador, Catastro e Informe Premium

Este instructivo detalla el flujo de trabajo ideal ("Single Source of Truth") para tasar una propiedad, recolectar inteligencia de mercado y presentar los resultados al cliente mediante el Informe Premium.

---

## 1. El Catastro de Mercado (Inteligencia Competitiva)

El Catastro es tu recolector automático de competencia. Su objetivo es alimentar a Tu Parcela Lista con datos reales del mercado actual.

### A. ¿Cuándo usarlo?
- **Rutina Semanal:** Para mantener a la IA de TPL actualizada sobre los precios de las comunas donde tienes mayor volumen de parcelas.
- **Antes de una Tasación Específica:** Si entra una parcela nueva en una comuna que hace tiempo no trabajas (ej. Frutillar), lo primero que debes hacer es ir a portales y traer datos frescos de Frutillar al Catastro *antes* de correr el motor del Tasador.

### B. ¿Cómo realizar una Extracción Masiva?
1. Ingresa a [PortalInmobiliario](https://www.portalinmobiliario.com) u otro portal.
2. Realiza una búsqueda (ej. "Parcelas en Venta en Frutillar").
3. Copia la URL completa de esa página de resultados.
4. En el CRM de TPL, abre la pestaña **Catastro de Mercado**.
5. Pega la URL en la barra superior y presiona **Ingerir Datos**.
6. El sistema detectará que es un listado y extraerá de golpe todas las parcelas (Título, Precio, Superficie, URL).
7. Verás un resumen con el **Valor Promedio** estimado de esa lista.
8. En el selector inferior, puedes elegir **"Vincular a Parcela (Opcional)"**. Si seleccionas la parcela de tu cliente, todas estas parcelas competidoras quedarán "amarradas" a él para su Informe Premium.
9. Presiona **Guardar Todas**.

---

## 2. El Motor Tasador TPL (Análisis Técnico)

El Tasador es el cerebro matemático que calcula el valor real de la parcela basándose en atributos físicos y territoriales.

### A. El Flujo de Tasación
1. En el CRM, abre el **Editor Integral** de la parcela.
2. Completa las pestañas de **Características Físicas** (Topografía, Suelo, Vista) y **Conectividad** (Acceso, Agua, Electricidad). *Nota: Cada factor influye en el precio final.*
3. Dirígete a la pestaña de **Tasación**.
4. Verás dos grandes bloques:
   - **Valor Técnico (Conit):** Basado puramente en las características físicas de la parcela.
   - **Ajuste de Mercado:** Aquí es donde el Tasador lee la base de datos para ver si esa comuna está de moda o no. (Por eso era importante el paso del Catastro).
5. Dale clic a **Ejecutar Motor Tasador**.
6. El sistema generará una "Versión Canónica" oficial del valor y calculará el "Valor Apuro" (venta rápida). 
7. Dale clic a **Guardar Tasación Oficial**. Este será el valor oficial de TPL.

---

## 3. El Informe Premium (El Producto Final)

El Informe Premium es el entregable final. Es una página web dinámica y un PDF profesional que le justifica al cliente por qué su parcela vale lo que vale.

### A. ¿Cómo generarlo y enviarlo?
1. En la grilla de parcelas del CRM, ubica la parcela del cliente.
2. Haz clic en el botón de **Herramientas (💎)** o el ícono de opciones de la parcela.
3. Se abrirá un menú. Haz clic en **Abrir Web (Informe Premium)**.
4. Revisa que toda la información esté correcta:
   - El *Valor TPL Oficial* (que calculó el Tasador).
   - Los *Factores de Valoración* (si tiene agua, luz, buena topografía).
5. **Posicionamiento de Mercado (Ranking):** Al final del informe, verás una tabla comparativa. Aquí aparecerán automáticamente las parcelas de la competencia que extrajiste en el **Catastro**. La parcela de tu cliente aparecerá resaltada como **"⭐ Tu Propiedad"**, demostrando visualmente en qué posición de competitividad se encuentra frente a los precios de mercado actuales de su comuna.
6. **Enviar al Cliente:** Desde el mismo menú de Herramientas (💎), puedes hacer clic en el botón de **WhatsApp** para enviarle directamente un enlace al informe interactivo, o puedes abrir el informe y usar el botón superior **Descargar / Guardar PDF** para enviárselo por correo.

---

### Resumen del Flujo Perfecto:
`Catastro (Ingerir datos de la competencia y vincularlos)` ➔ `Tasador (Calcular valor técnico ajustado al mercado)` ➔ `Informe Premium (Presentar el ranking y justificación al cliente)`.
