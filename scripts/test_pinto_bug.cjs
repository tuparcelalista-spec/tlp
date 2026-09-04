const text = `Quillón | ¡Oportunidad de inversión en Región del Ñuble, Quillón, parcela en venta!
$28.000.000
Precio
$28.000.000
Área total del terreno (m²)
5000
LocalizaciónQuillón
Publicado15/01/2026
Precio/M² de terreno$5.600
Gastos comunes[¡Pregunta al anunciante!](https://www.yapo.cl/bienes-raices-venta-de-propiedades-fincas/oportunidad-de-inversion-en-region-del-nuble-quillon-parcela-en-venta/31869815#)
Titulación[¡Pregunta al anunciante!](https://www.yapo.cl/bienes-raices-venta-de-propiedades-fincas/oportunidad-de-inversion-en-region-del-nuble-quillon-parcela-en-venta/31869815#)
Descripción
¡Oportunidad inmobiliaria en Quillón!Se vende una parcela de 5.000 m2 cada una, en la parcelación San Francisco, Quillón. A continuación, se presentan los detalles de esta excepcional oferta:Ubicación– Quillón, a 20 minutos de Ruta Itata– Parcelación San Francisco– Camino a Cacino de los AlemanesCaracterísticas de las parcelas– Superficie: 5.000 m2– Topografía: Llana, ideal para construcción– Acceso: Camino ripiadoValor de venta– $28.000.000Ventajas– Entorno natural y pintoresco– Acceso fácil y rápido a rutas principales– Oportunidad de disfrutar de actividades al aire libre y recreativas– Inversión atractiva en una zona en crecimientoNo te pierdas esta oportunidad de adquirir una parcela en una zona tranquila y natural. ¡Contáctanos para obtener más información!.PARA CONSULTAS ENVÍENOS UN WHATSAPP EN EL SIGUIENTE ENLACESIGUENOS EN INSTAGRAMMAS PROPIEDADES`;

const comunasComunes = ['Bulnes', 'Chillán', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón', 'San Ignacio'];

// Viejo fallback
const oldComuna = comunasComunes.find(c => new RegExp(c, 'i').test(text));
console.log("OLD Comuna:", oldComuna);

// Nuevo fallback
const newComuna = comunasComunes.find(c => new RegExp('\\\\b' + c + '\\\\b', 'i').test(text));
console.log("NEW Comuna:", newComuna);

// Regex ubi
const ubiRegexOld = /Ubicaci[oó]n\s+([^,\n]+)\s*,\s*([^,\n]+)(?:\s*,\s*([^,\n]+))?/i;
console.log("OLD UBI:", text.match(ubiRegexOld));

const ubiRegexNew = /Ubicaci[oó]n[\s:\-–]*([^,\n]+)\s*,\s*([^,\n]+)(?:\s*,\s*([^,\n]+))?/i;
console.log("NEW UBI:", text.match(ubiRegexNew));

