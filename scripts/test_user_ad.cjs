const texto_original = `Parcela en Venta
Parcela En Venta En Coihueco
Agregar a favoritos
Publicado hace 5 meses por[Alejandro Jaime V. & Asociados](https://www.portalinmobiliario.com/tienda/alejandro-jaime-v-asociados)
UF9.800
$400.360.325
10 ha totales
WhatsApp
Tienda oficial[Alejandro Jaime V. & Asociados](https://www.portalinmobiliario.com/MLC-4047168494-parcela-en-venta-en-coihueco-_JM#seller_profile)
Responde sus consultas
¿Tuviste un problema con la publicación? [Avísanos.](https://www.portalinmobiliario.com/noindex/denounce?item_id=MLC4047168494&element_type=ITM)
Información de la tienda
Alejandro Jaime V. & Asociados
Respuestas a consultas
Basado en opiniones de otras personas.
Ir a la tienda oficial de [Alejandro Jaime V. & Asociados](https://www.portalinmobiliario.com/tienda/alejandro-jaime-v-asociados)
Código de la propiedad
50836
Consejos de seguridad
Desde Portalinmobiliario.com, nunca te pediremos contraseñas, PIN o códigos de verificación a través de WhatsApp, teléfono, SMS o email.
Verifica que el inmueble exista y desconfía si te dicen que necesitan vender o arrendar con urgencia.
Revisa el remitente de los e-mails para asegurarte que los envía Portalinmobiliario.com.
Solicita la mayor cantidad posible de información sobre el inmueble, así como fotos y/o videos para comprobar su veracidad.
Sospecha si el precio te parece demasiado barato como para ser cierto.
No uses servicios de pago anónimos para pagar, reservar o adelantar dinero sin haber visto el inmueble.
11
Ubicación
La Puntilla De San Juan / Coihueco, Coihueco, Ñuble
Características del inmueble
Superficie total
10 ha
Antigüedad
0 años
Distancia al asfalto
0 km
Gastos comunes
0 CLP
Precio por unidad de área
0 $/m2
Descripción
Excelente Terreno en Región de Ñuble. Tenemos otros disponibles en el mismo lugar, No dudes en consultar! Conéctate con la naturaleza, en un lugar rodeado de árboles nativos, flora y fauna propia de la Región, cerca de esteros, Termas, cascadas y más! Cercano a esteros, a 10 K de colegios, comercio, centro médico y más. Consulta más antecedentes por interno. Atendemos los 365 días del año sin excepción. Atención corredores HACEMOS CANJE!`;

const supRegexOld = /([0-9]+(?:[.,][0-9]+)?)\s*(?:m2|m²|mts2?|metros|hect[aá]reas|has?)/gi;
const supMatchesOld = [...texto_original.matchAll(supRegexOld)];

console.log("=== OLD REGEX ===");
let maxSOld = 0;
for(let m of supMatchesOld) {
    let matchText = m[1];
    let isHa = m[0].toLowerCase().includes('ha') || m[0].toLowerCase().includes('hect');
    let s;
    if (matchText.includes('.') || matchText.includes(',')) {
        let normalized = matchText.replace(',', '.');
        if (!isHa && /\.[0-9]{3}$/.test(normalized)) {
            s = parseFloat(normalized.replace('.', ''));
        } else {
            s = parseFloat(normalized);
        }
    } else {
        s = parseFloat(matchText);
    }
    if (isHa) s = s * 10000;
    console.log("Match:", m[0], "=> Size:", s);
    if (s > maxSOld) maxSOld = s;
}
console.log("MAX OLD:", maxSOld);

const supRegexNew = /([0-9]+(?:[.,][0-9]+)?)\s*(?:\b(?:ha|has|hect[aá]reas|metros)\b|m2|m²|mts2?(?:\b|$))/gi;
const supMatchesNew = [...texto_original.matchAll(supRegexNew)];

console.log("\n=== NEW REGEX ===");
let maxSNew = 0;
for(let m of supMatchesNew) {
    let matchText = m[1];
    let isHa = m[0].toLowerCase().includes('ha') || m[0].toLowerCase().includes('hect');
    let s;
    if (matchText.includes('.') || matchText.includes(',')) {
        let normalized = matchText.replace(',', '.');
        if (!isHa && /\.[0-9]{3}$/.test(normalized)) {
            s = parseFloat(normalized.replace('.', ''));
        } else {
            s = parseFloat(normalized);
        }
    } else {
        s = parseFloat(matchText);
    }
    if (isHa) s = s * 10000;
    console.log("Match:", m[0], "=> Size:", s);
    if (s > maxSNew) maxSNew = s;
}
console.log("MAX NEW:", maxSNew);
