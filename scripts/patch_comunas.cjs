const fs = require('fs');
let content = fs.readFileSync('scripts/master_bookmarklet_2.cjs', 'utf8');

const regex = /const comunasComunes = \[[^\]]+\];/s;

const newArray = `const comunasComunes = [
    'Villarrica', 'Pucón', 'Loncoche', 'Temuco', 'Valdivia', 'Puerto Varas', 'Frutillar', 'Osorno', 'Panguipulli',
    'Cobquecura', 'Coelemu', 'Ninhue', 'Portezuelo', 'Quirihue', 'Ránquil', 'Treguaco',
    'Bulnes', 'Chillán', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón',
    'San Ignacio', 'Yungay', 'Coihueco', 'Ñiquén', 'San Carlos', 'San Fabián', 'San Nicolás',
    'Concepción', 'Coronel', 'Chiguayante', 'Florida', 'Hualqui', 'Lota', 'Penco',
    'San Pedro de la Paz', 'Santa Juana', 'Talcahuano', 'Tomé', 'Hualpén',
    'Lebu', 'Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa',
    'Los Ángeles', 'Antuco', 'Cabrero', 'Laja', 'Mulchén', 'Nacimiento', 'Negrete',
    'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Yumbel', 'Alto Biobío',
    'Talca', 'Constitución', 'Curepto', 'Empedrado', 'Maule', 'Pelarco', 'Pencahue', 'Río Claro', 'San Clemente', 'San Rafael',
    'Cauquenes', 'Chanco', 'Pelluhue', 'Curicó', 'Hualañé', 'Licantén', 'Molina', 'Rauco', 'Romeral', 'Sagrada Familia', 'Teno', 'Vichuquén',
    'Linares', 'Colbún', 'Longaví', 'Parral', 'Retiro', 'San Javier', 'Villa Alegre', 'Yerbas Buenas',
    'Rancagua', 'Machalí', 'Pichilemu', 'Litueche', 'Navidad', 'Paredones', 'Marchigüe', 'La Estrella', 'San Fernando', 'Santa Cruz',
    'Santiago', 'Colina', 'Lampa', 'Melipilla', 'Curacaví', 'María Pinto', 'San Pedro', 'Alhué', 'Pirque', 'San José de Maipo', 'Buin', 'Paine',
    'Valparaíso', 'Viña del Mar', 'Concón', 'Quintero', 'Puchuncaví', 'Casablanca', 'Algarrobo', 'El Quisco', 'El Tabo', 'Cartagena', 'San Antonio', 'Santo Domingo',
    'La Serena', 'Coquimbo', 'Vicuña', 'Paihuano', 'Ovalle', 'Los Vilos', 'Illapel', 'Salamanca'
];`;

content = content.replace(regex, newArray);
fs.writeFileSync('scripts/master_bookmarklet_2.cjs', content, 'utf8');
console.log('Array actualizado');
