const text = `Lote En Sector Villa Italia - Coronel | Portalinmobiliario.com
Precio CLP
250000000
Precio UF
11800
Superficie (m²)
550000
Comuna el original es asi Lote En Sector Villa Italia - Coronel
Agregar a favoritos
Publicado hace 33 días
Corredora conidentidad verificada
UF3.021
$123.427.911
WhatsApp
Publicado porCarro Y Cia Ltda
Responde sus consultas
¿Tuviste un problema con la publicación? Avísanos.
Información de la corredora
Carro Y Cia Ltda
Respuestas a consultas
Basado en opiniones de otras personas.
Código de la propiedad
788623
Consejos de seguridad
Desde Portalinmobiliario.com, nunca te pediremos contraseñas, PIN o códigos de verificación a través de WhatsApp, teléfono, SMS o email.
Verifica que el inmueble exista y desconfía si te dicen que necesitan vender o arrendar con urgencia.
Revisa el remitente de los e-mails para asegurarte que los envía Portalinmobiliario.com.
Solicita la mayor cantidad posible de información sobre el inmueble, así como fotos y/o videos para comprobar su veracidad.
Sospecha si el precio te parece demasiado barato como para ser cierto.
No uses servicios de pago anónimos para pagar, reservar o adelantar dinero sin haber visto el inmueble.
Ubicación
Villa Italia, Coronel, Biobío
Características del inmueble
Antigüedad
0 años
Distancia al asfalto
0 km
Gastos comunes
0 CLP
Precio por unidad de área
0 $/m2
Descripción
Se venden 1 lote en parcela ubicada en Villa Italia, Coronel. La propiedad está ubicada en calle Vivaldi casi esquina con Puccini. El uso es 100% habitacional Descripción del terreno: Superficie: 1 lote de 2.307,47 m² El lote se vende con ROL El agua se capta por puntera, la electricidad está orilla de la parcela La Comisión del corredor de propiedades es de 2% más IVA del valor de venta Valor de venta 3.021 UF Contacto: Carolina Lorenzini clorenzini@carroycia.cl +56 975188917
Ver descripción completa`;

const supRegex = /(?:(?:[AÁaá]rea total(?: del terreno)?\s*\(m²\)|\bSuperficie total\b|\bSuperficie\s*\(m²\))\s*\n*\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?))|([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)\s*(?:\b(?:ha|has|hect[aá]reas|metros(?!\s+(?:de|del|al|a\b)))\b|m2|m²|mts2?(?:\b|\s|$))/gi;

console.log('Matches:', [...text.matchAll(supRegex)].map(m => m[0]));
