# Auditoría e implementación — Flujo Parcela → Cotizador → Proyecto

Fecha: 2026-07-31

## Hallazgos críticos

1. **La parcela podía llegar al cotizador con valor $0.** `parcelas.js` declaraba `const parcelas`, mientras `js/cotizador.js` buscaba prioritariamente `window.parcelas`. El fallback a `parcels[0]` podía incluso cargar una parcela equivocada.
2. **No existía `proyecto.html`.** El cotizador guardaba un objeto local, pero no había una página final que transformara presupuesto en experiencia, información y conversión.
3. **El cotizador repetía acciones comerciales.** Asesoría, visita y reserva estaban dentro del cotizador, cuando conceptualmente corresponden al proyecto terminado.
4. **El publicador repetía datos.** Había un campo de acceso genérico y otro detallado, una clasificación de terreno automática pero editable, una grilla rápida de servicios que duplicaba los selects detallados, y campos de casa que repetían ubicación/acceso del terreno.
5. **La reserva no estaba modelada como 1% del valor de la parcela en la experiencia final.**

## Cambios aplicados

- `parcelas.js` expone el catálogo como `window.parcelas`.
- `parcela.html/js/parcela.js` conserva ID + snapshot de la parcela antes de entrar al cotizador.
- `cotizador.js` recupera por ID exacto, snapshot local o catálogo; eliminó el fallback a la primera parcela. Si no encuentra la propiedad, muestra error y no cotiza con $0.
- El cotizador se enfoca en vivienda + presupuesto y termina con **Ver mi proyecto completo**.
- Se creó `proyecto.html`, `css/proyecto.css` y `js/proyecto.js`.
- `proyecto.html` incluye hero aspiracional, virtudes reales, vivienda y galería/plano, cercanías, mapa, lectura de inversión, presupuesto, mejoras posibles, ideas de uso y frase personalizada.
- Se agregaron CTAs: llamada, pregunta, visita y reserva.
- La reserva calcula **1% del valor de la parcela** y prepara integración con `/api/flow/create-payment`; si el endpoint no responde, conserva la intención sin fingir que el pago fue realizado.
- Las acciones se guardan localmente y, cuando `TPLDataService.trackEvent` está disponible, se registran como evento remoto.
- Todos los símbolos de la nueva página usan SVG de línea; no se incorporaron emoticones.

## Limpieza del publicador

Se eliminaron por redundancia o bajo aporte:
- Acceso genérico (se conserva Acceso detallado).
- Clasificación del terreno (ya se deduce por tipo y superficie).
- Factibilidad para construir (no alimentaba el motor vigente y podía inducir a respuestas no verificadas).
- Orientación/exposición y privacidad como campos separados (no alimentaban el motor vigente).
- Grilla rápida Agua/Luz/Rol/Cerco/Portón/Naturaleza (duplicaba campos detallados). Estos indicadores ahora se derivan de los datos detallados.
- En Casa con terreno: tipo de casa, centro urbano de referencia, minutos al centro, camino de acceso y agua de vivienda cuando repetían antecedentes generales del predio.

Se mantienen porque sí aportan a tasación, ficha o decisión: superficie, suelo, distancia comunal, rol, condominio, subdivisión, uso de suelo, turismo, topografía, vegetación, vista, agua, electricidad y distancia a poste, acceso, distancia a ruta, cierre, portón, atributos naturales y los datos estructurales principales de la vivienda.

## Pendiente backend

La UI de reserva queda lista para intentar `/api/flow/create-payment`. Para cumplir el flujo completo de pago + correo automático, el backend debe validar el monto desde la base de datos, confirmar el webhook de Flow y recién entonces crear la reserva definitiva y enviar el correo/comprobante. El frontend no marca una reserva como pagada sin esa confirmación.
