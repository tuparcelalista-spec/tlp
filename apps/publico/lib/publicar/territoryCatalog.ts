/**
 * Catálogo territorial real de Chile — 16 regiones, 346 comunas, extraído
 * de `frontend-v2/plataforma/publicar/tpl-national-catalog.mjs` (fuente
 * única de verdad geográfica ya usada por el publicador legacy real, ver
 * auditoría de `publicar-v2`). Solo se conservan región/comuna/lat/lng —
 * el archivo original también trae provincia, código CUT y clasificaciones
 * urbanas que este wizard no usa. Datos reales, no inventados: cada comuna
 * referencia una región real (verificado: 0 comunas huérfanas al extraer).
 */
export interface RegionEntry {
  code: string;
  name: string;
}

export interface ComuneEntry {
  name: string;
  regionCode: string;
  lat: number;
  lng: number;
}

export const REGIONS: RegionEntry[] = [
  {
    "code": "CL-AP",
    "name": "Región de Arica y Parinacota"
  },
  {
    "code": "CL-TA",
    "name": "Región de Tarapacá"
  },
  {
    "code": "CL-AN",
    "name": "Región de Antofagasta"
  },
  {
    "code": "CL-AT",
    "name": "Región de Atacama"
  },
  {
    "code": "CL-CO",
    "name": "Región de Coquimbo"
  },
  {
    "code": "CL-VS",
    "name": "Región de Valparaíso"
  },
  {
    "code": "CL-RM",
    "name": "Región Metropolitana de Santiago"
  },
  {
    "code": "CL-LI",
    "name": "Región del Libertador General Bernardo O'Higgins"
  },
  {
    "code": "CL-ML",
    "name": "Región del Maule"
  },
  {
    "code": "CL-NB",
    "name": "Región de Ñuble"
  },
  {
    "code": "CL-BI",
    "name": "Región del Biobío"
  },
  {
    "code": "CL-AR",
    "name": "Región de La Araucanía"
  },
  {
    "code": "CL-LR",
    "name": "Región de Los Ríos"
  },
  {
    "code": "CL-LL",
    "name": "Región de Los Lagos"
  },
  {
    "code": "CL-AI",
    "name": "Región de Aysén del General Carlos Ibáñez del Campo"
  },
  {
    "code": "CL-MA",
    "name": "Región de Magallanes y de la Antártica Chilena"
  }
];

export const COMMUNES: ComuneEntry[] = [
  {
    "name": "Arica",
    "regionCode": "CL-AP",
    "lat": -18.4783,
    "lng": -70.3126
  },
  {
    "name": "Camarones",
    "regionCode": "CL-AP",
    "lat": -19.0061,
    "lng": -69.8681
  },
  {
    "name": "Putre",
    "regionCode": "CL-AP",
    "lat": -18.1958,
    "lng": -69.5597
  },
  {
    "name": "General Lagos",
    "regionCode": "CL-AP",
    "lat": -17.8425,
    "lng": -69.5811
  },
  {
    "name": "Iquique",
    "regionCode": "CL-TA",
    "lat": -20.2307,
    "lng": -70.1357
  },
  {
    "name": "Alto Hospicio",
    "regionCode": "CL-TA",
    "lat": -20.2694,
    "lng": -70.0989
  },
  {
    "name": "Pozo Almonte",
    "regionCode": "CL-TA",
    "lat": -20.2589,
    "lng": -69.7858
  },
  {
    "name": "Camiña",
    "regionCode": "CL-TA",
    "lat": -19.3114,
    "lng": -69.4244
  },
  {
    "name": "Colchane",
    "regionCode": "CL-TA",
    "lat": -19.2764,
    "lng": -68.6386
  },
  {
    "name": "Huara",
    "regionCode": "CL-TA",
    "lat": -19.9964,
    "lng": -69.7719
  },
  {
    "name": "Pica",
    "regionCode": "CL-TA",
    "lat": -20.4889,
    "lng": -69.3294
  },
  {
    "name": "Antofagasta",
    "regionCode": "CL-AN",
    "lat": -23.6509,
    "lng": -70.3975
  },
  {
    "name": "Mejillones",
    "regionCode": "CL-AN",
    "lat": -23.1022,
    "lng": -70.4497
  },
  {
    "name": "Sierra Gorda",
    "regionCode": "CL-AN",
    "lat": -22.8889,
    "lng": -69.3197
  },
  {
    "name": "Taltal",
    "regionCode": "CL-AN",
    "lat": -25.4056,
    "lng": -70.4839
  },
  {
    "name": "Calama",
    "regionCode": "CL-AN",
    "lat": -22.4544,
    "lng": -68.9294
  },
  {
    "name": "Ollagüe",
    "regionCode": "CL-AN",
    "lat": -21.2253,
    "lng": -68.2522
  },
  {
    "name": "San Pedro de Atacama",
    "regionCode": "CL-AN",
    "lat": -22.9119,
    "lng": -68.2
  },
  {
    "name": "Tocopilla",
    "regionCode": "CL-AN",
    "lat": -22.0919,
    "lng": -70.1978
  },
  {
    "name": "María Elena",
    "regionCode": "CL-AN",
    "lat": -22.3422,
    "lng": -69.6631
  },
  {
    "name": "Copiapó",
    "regionCode": "CL-AT",
    "lat": -27.3668,
    "lng": -70.3323
  },
  {
    "name": "Caldera",
    "regionCode": "CL-AT",
    "lat": -27.0683,
    "lng": -70.8239
  },
  {
    "name": "Tierra Amarilla",
    "regionCode": "CL-AT",
    "lat": -27.4819,
    "lng": -70.265
  },
  {
    "name": "Chañaral",
    "regionCode": "CL-AT",
    "lat": -26.3475,
    "lng": -70.6222
  },
  {
    "name": "Diego de Almagro",
    "regionCode": "CL-AT",
    "lat": -26.3917,
    "lng": -70.0467
  },
  {
    "name": "Vallenar",
    "regionCode": "CL-AT",
    "lat": -28.575,
    "lng": -70.7581
  },
  {
    "name": "Alto del Carmen",
    "regionCode": "CL-AT",
    "lat": -28.7597,
    "lng": -70.4858
  },
  {
    "name": "Freirina",
    "regionCode": "CL-AT",
    "lat": -28.5081,
    "lng": -71.0792
  },
  {
    "name": "Huasco",
    "regionCode": "CL-AT",
    "lat": -28.4678,
    "lng": -71.2217
  },
  {
    "name": "La Serena",
    "regionCode": "CL-CO",
    "lat": -29.9027,
    "lng": -71.252
  },
  {
    "name": "Coquimbo",
    "regionCode": "CL-CO",
    "lat": -29.9533,
    "lng": -71.3395
  },
  {
    "name": "Andacollo",
    "regionCode": "CL-CO",
    "lat": -30.2289,
    "lng": -71.085
  },
  {
    "name": "La Higuera",
    "regionCode": "CL-CO",
    "lat": -29.5086,
    "lng": -71.2675
  },
  {
    "name": "Paihuano",
    "regionCode": "CL-CO",
    "lat": -30.0275,
    "lng": -70.5186
  },
  {
    "name": "Vicuña",
    "regionCode": "CL-CO",
    "lat": -30.0319,
    "lng": -70.7081
  },
  {
    "name": "Illapel",
    "regionCode": "CL-CO",
    "lat": -31.6308,
    "lng": -71.1653
  },
  {
    "name": "Canela",
    "regionCode": "CL-CO",
    "lat": -31.3986,
    "lng": -71.455
  },
  {
    "name": "Los Vilos",
    "regionCode": "CL-CO",
    "lat": -31.9125,
    "lng": -71.5122
  },
  {
    "name": "Salamanca",
    "regionCode": "CL-CO",
    "lat": -31.7792,
    "lng": -70.965
  },
  {
    "name": "Ovalle",
    "regionCode": "CL-CO",
    "lat": -30.6011,
    "lng": -71.2003
  },
  {
    "name": "Combarbalá",
    "regionCode": "CL-CO",
    "lat": -31.1833,
    "lng": -71
  },
  {
    "name": "Monte Patria",
    "regionCode": "CL-CO",
    "lat": -30.6936,
    "lng": -70.9472
  },
  {
    "name": "Punitaqui",
    "regionCode": "CL-CO",
    "lat": -30.8267,
    "lng": -71.2583
  },
  {
    "name": "Río Hurtado",
    "regionCode": "CL-CO",
    "lat": -30.2667,
    "lng": -70.6667
  },
  {
    "name": "Valparaíso",
    "regionCode": "CL-VS",
    "lat": -33.0472,
    "lng": -71.6127
  },
  {
    "name": "Casablanca",
    "regionCode": "CL-VS",
    "lat": -33.3211,
    "lng": -71.4081
  },
  {
    "name": "Concón",
    "regionCode": "CL-VS",
    "lat": -32.9228,
    "lng": -71.5194
  },
  {
    "name": "Juan Fernández",
    "regionCode": "CL-VS",
    "lat": -33.6425,
    "lng": -78.8317
  },
  {
    "name": "Puchuncaví",
    "regionCode": "CL-VS",
    "lat": -32.7233,
    "lng": -71.4136
  },
  {
    "name": "Quintero",
    "regionCode": "CL-VS",
    "lat": -32.7817,
    "lng": -71.5303
  },
  {
    "name": "Viña del Mar",
    "regionCode": "CL-VS",
    "lat": -33.0245,
    "lng": -71.5518
  },
  {
    "name": "Isla de Pascua",
    "regionCode": "CL-VS",
    "lat": -27.15,
    "lng": -109.4333
  },
  {
    "name": "Los Andes",
    "regionCode": "CL-VS",
    "lat": -32.8337,
    "lng": -70.598
  },
  {
    "name": "Calle Larga",
    "regionCode": "CL-VS",
    "lat": -32.8542,
    "lng": -70.6231
  },
  {
    "name": "Rinconada",
    "regionCode": "CL-VS",
    "lat": -32.8681,
    "lng": -70.6869
  },
  {
    "name": "San Esteban",
    "regionCode": "CL-VS",
    "lat": -32.8,
    "lng": -70.5833
  },
  {
    "name": "La Ligua",
    "regionCode": "CL-VS",
    "lat": -32.4497,
    "lng": -71.2319
  },
  {
    "name": "Cabildo",
    "regionCode": "CL-VS",
    "lat": -32.4278,
    "lng": -71.0708
  },
  {
    "name": "Papudo",
    "regionCode": "CL-VS",
    "lat": -32.5078,
    "lng": -71.4475
  },
  {
    "name": "Petorca",
    "regionCode": "CL-VS",
    "lat": -32.2536,
    "lng": -70.9328
  },
  {
    "name": "Zapallar",
    "regionCode": "CL-VS",
    "lat": -32.5539,
    "lng": -71.4597
  },
  {
    "name": "Quillota",
    "regionCode": "CL-VS",
    "lat": -32.8803,
    "lng": -71.2474
  },
  {
    "name": "Calera",
    "regionCode": "CL-VS",
    "lat": -32.7869,
    "lng": -71.1925
  },
  {
    "name": "Hijuelas",
    "regionCode": "CL-VS",
    "lat": -32.8,
    "lng": -71.1333
  },
  {
    "name": "La Cruz",
    "regionCode": "CL-VS",
    "lat": -32.8258,
    "lng": -71.2294
  },
  {
    "name": "Nogales",
    "regionCode": "CL-VS",
    "lat": -32.735,
    "lng": -71.2069
  },
  {
    "name": "San Antonio",
    "regionCode": "CL-VS",
    "lat": -33.5931,
    "lng": -71.6067
  },
  {
    "name": "Algarrobo",
    "regionCode": "CL-VS",
    "lat": -33.3678,
    "lng": -71.6697
  },
  {
    "name": "Cartagena",
    "regionCode": "CL-VS",
    "lat": -33.5531,
    "lng": -71.6083
  },
  {
    "name": "El Quisco",
    "regionCode": "CL-VS",
    "lat": -33.3956,
    "lng": -71.6978
  },
  {
    "name": "El Tabo",
    "regionCode": "CL-VS",
    "lat": -33.4561,
    "lng": -71.6644
  },
  {
    "name": "Santo Domingo",
    "regionCode": "CL-VS",
    "lat": -33.6367,
    "lng": -71.6264
  },
  {
    "name": "San Felipe",
    "regionCode": "CL-VS",
    "lat": -32.7503,
    "lng": -70.725
  },
  {
    "name": "Catemu",
    "regionCode": "CL-VS",
    "lat": -32.7833,
    "lng": -70.95
  },
  {
    "name": "Llaillay",
    "regionCode": "CL-VS",
    "lat": -32.8425,
    "lng": -70.9542
  },
  {
    "name": "Panquehue",
    "regionCode": "CL-VS",
    "lat": -32.7667,
    "lng": -70.8333
  },
  {
    "name": "Putaendo",
    "regionCode": "CL-VS",
    "lat": -32.6289,
    "lng": -70.7161
  },
  {
    "name": "Santa María",
    "regionCode": "CL-VS",
    "lat": -32.7481,
    "lng": -70.6583
  },
  {
    "name": "Quilpué",
    "regionCode": "CL-VS",
    "lat": -33.0483,
    "lng": -71.4425
  },
  {
    "name": "Limache",
    "regionCode": "CL-VS",
    "lat": -33.0036,
    "lng": -71.2681
  },
  {
    "name": "Olmué",
    "regionCode": "CL-VS",
    "lat": -32.9972,
    "lng": -71.1856
  },
  {
    "name": "Villa Alemana",
    "regionCode": "CL-VS",
    "lat": -33.0425,
    "lng": -71.3733
  },
  {
    "name": "Santiago",
    "regionCode": "CL-RM",
    "lat": -33.4489,
    "lng": -70.6693
  },
  {
    "name": "Cerrillos",
    "regionCode": "CL-RM",
    "lat": -33.5,
    "lng": -70.7167
  },
  {
    "name": "Cerro Navia",
    "regionCode": "CL-RM",
    "lat": -33.4225,
    "lng": -70.7333
  },
  {
    "name": "Conchalí",
    "regionCode": "CL-RM",
    "lat": -33.3833,
    "lng": -70.6833
  },
  {
    "name": "El Bosque",
    "regionCode": "CL-RM",
    "lat": -33.5667,
    "lng": -70.6667
  },
  {
    "name": "Estación Central",
    "regionCode": "CL-RM",
    "lat": -33.4667,
    "lng": -70.7
  },
  {
    "name": "Huechuraba",
    "regionCode": "CL-RM",
    "lat": -33.3667,
    "lng": -70.6333
  },
  {
    "name": "Independencia",
    "regionCode": "CL-RM",
    "lat": -33.4167,
    "lng": -70.6667
  },
  {
    "name": "La Cisterna",
    "regionCode": "CL-RM",
    "lat": -33.5333,
    "lng": -70.6667
  },
  {
    "name": "La Florida",
    "regionCode": "CL-RM",
    "lat": -33.5228,
    "lng": -70.5986
  },
  {
    "name": "La Granja",
    "regionCode": "CL-RM",
    "lat": -33.5333,
    "lng": -70.6167
  },
  {
    "name": "La Pintana",
    "regionCode": "CL-RM",
    "lat": -33.5833,
    "lng": -70.6333
  },
  {
    "name": "La Reina",
    "regionCode": "CL-RM",
    "lat": -33.45,
    "lng": -70.5333
  },
  {
    "name": "Las Condes",
    "regionCode": "CL-RM",
    "lat": -33.4167,
    "lng": -70.5833
  },
  {
    "name": "Lo Barnechea",
    "regionCode": "CL-RM",
    "lat": -33.35,
    "lng": -70.5167
  },
  {
    "name": "Lo Espejo",
    "regionCode": "CL-RM",
    "lat": -33.5167,
    "lng": -70.6833
  },
  {
    "name": "Lo Prado",
    "regionCode": "CL-RM",
    "lat": -33.45,
    "lng": -70.7333
  },
  {
    "name": "Macul",
    "regionCode": "CL-RM",
    "lat": -33.4833,
    "lng": -70.6
  },
  {
    "name": "Maipú",
    "regionCode": "CL-RM",
    "lat": -33.5167,
    "lng": -70.7667
  },
  {
    "name": "Ñuñoa",
    "regionCode": "CL-RM",
    "lat": -33.45,
    "lng": -70.6
  },
  {
    "name": "Pedro Aguirre Cerda",
    "regionCode": "CL-RM",
    "lat": -33.4833,
    "lng": -70.6833
  },
  {
    "name": "Peñalolén",
    "regionCode": "CL-RM",
    "lat": -33.4833,
    "lng": -70.55
  },
  {
    "name": "Providencia",
    "regionCode": "CL-RM",
    "lat": -33.4333,
    "lng": -70.6167
  },
  {
    "name": "Pudahuel",
    "regionCode": "CL-RM",
    "lat": -33.4333,
    "lng": -70.7667
  },
  {
    "name": "Quilicura",
    "regionCode": "CL-RM",
    "lat": -33.3667,
    "lng": -70.7333
  },
  {
    "name": "Quinta Normal",
    "regionCode": "CL-RM",
    "lat": -33.4333,
    "lng": -70.7
  },
  {
    "name": "Recoleta",
    "regionCode": "CL-RM",
    "lat": -33.4,
    "lng": -70.6333
  },
  {
    "name": "Renca",
    "regionCode": "CL-RM",
    "lat": -33.4,
    "lng": -70.7167
  },
  {
    "name": "San Joaquín",
    "regionCode": "CL-RM",
    "lat": -33.4833,
    "lng": -70.6333
  },
  {
    "name": "San Miguel",
    "regionCode": "CL-RM",
    "lat": -33.5,
    "lng": -70.65
  },
  {
    "name": "San Ramón",
    "regionCode": "CL-RM",
    "lat": -33.5333,
    "lng": -70.6333
  },
  {
    "name": "Vitacura",
    "regionCode": "CL-RM",
    "lat": -33.4,
    "lng": -70.6
  },
  {
    "name": "Puente Alto",
    "regionCode": "CL-RM",
    "lat": -33.6167,
    "lng": -70.5833
  },
  {
    "name": "Pirque",
    "regionCode": "CL-RM",
    "lat": -33.6333,
    "lng": -70.55
  },
  {
    "name": "San José de Maipo",
    "regionCode": "CL-RM",
    "lat": -33.6333,
    "lng": -70.35
  },
  {
    "name": "Colina",
    "regionCode": "CL-RM",
    "lat": -33.2,
    "lng": -70.6833
  },
  {
    "name": "Lampa",
    "regionCode": "CL-RM",
    "lat": -33.2833,
    "lng": -70.8833
  },
  {
    "name": "Tiltil",
    "regionCode": "CL-RM",
    "lat": -33.0833,
    "lng": -70.9333
  },
  {
    "name": "San Bernardo",
    "regionCode": "CL-RM",
    "lat": -33.5833,
    "lng": -70.7
  },
  {
    "name": "Buin",
    "regionCode": "CL-RM",
    "lat": -33.7333,
    "lng": -70.7333
  },
  {
    "name": "Calera de Tango",
    "regionCode": "CL-RM",
    "lat": -33.6333,
    "lng": -70.7833
  },
  {
    "name": "Paine",
    "regionCode": "CL-RM",
    "lat": -33.8167,
    "lng": -70.75
  },
  {
    "name": "Melipilla",
    "regionCode": "CL-RM",
    "lat": -33.6891,
    "lng": -71.2158
  },
  {
    "name": "Alhué",
    "regionCode": "CL-RM",
    "lat": -34.0333,
    "lng": -71.1
  },
  {
    "name": "Curacaví",
    "regionCode": "CL-RM",
    "lat": -33.4,
    "lng": -71.1333
  },
  {
    "name": "María Pinto",
    "regionCode": "CL-RM",
    "lat": -33.5167,
    "lng": -71.1167
  },
  {
    "name": "San Pedro",
    "regionCode": "CL-RM",
    "lat": -33.8967,
    "lng": -71.4633
  },
  {
    "name": "Talagante",
    "regionCode": "CL-RM",
    "lat": -33.6667,
    "lng": -70.9333
  },
  {
    "name": "El Monte",
    "regionCode": "CL-RM",
    "lat": -33.6833,
    "lng": -71.0167
  },
  {
    "name": "Isla de Maipo",
    "regionCode": "CL-RM",
    "lat": -33.75,
    "lng": -70.9
  },
  {
    "name": "Padre Hurtado",
    "regionCode": "CL-RM",
    "lat": -33.5667,
    "lng": -70.8167
  },
  {
    "name": "Peñaflor",
    "regionCode": "CL-RM",
    "lat": -33.6167,
    "lng": -70.8833
  },
  {
    "name": "Rancagua",
    "regionCode": "CL-LI",
    "lat": -34.1701,
    "lng": -70.7406
  },
  {
    "name": "Codegua",
    "regionCode": "CL-LI",
    "lat": -34.0333,
    "lng": -70.6667
  },
  {
    "name": "Coinco",
    "regionCode": "CL-LI",
    "lat": -34.2667,
    "lng": -70.95
  },
  {
    "name": "Coltauco",
    "regionCode": "CL-LI",
    "lat": -34.3,
    "lng": -71.0833
  },
  {
    "name": "Doñihue",
    "regionCode": "CL-LI",
    "lat": -34.2167,
    "lng": -70.9667
  },
  {
    "name": "Graneros",
    "regionCode": "CL-LI",
    "lat": -34.0667,
    "lng": -70.7333
  },
  {
    "name": "Las Cabras",
    "regionCode": "CL-LI",
    "lat": -34.2833,
    "lng": -71.4667
  },
  {
    "name": "Machalí",
    "regionCode": "CL-LI",
    "lat": -34.1833,
    "lng": -70.65
  },
  {
    "name": "Malloa",
    "regionCode": "CL-LI",
    "lat": -34.45,
    "lng": -70.95
  },
  {
    "name": "Mostazal",
    "regionCode": "CL-LI",
    "lat": -34,
    "lng": -70.6833
  },
  {
    "name": "Olivar",
    "regionCode": "CL-LI",
    "lat": -34.2333,
    "lng": -70.8
  },
  {
    "name": "Peumo",
    "regionCode": "CL-LI",
    "lat": -34.3967,
    "lng": -71.1689
  },
  {
    "name": "Pichidegua",
    "regionCode": "CL-LI",
    "lat": -34.35,
    "lng": -71.35
  },
  {
    "name": "Quinta de Tilcoco",
    "regionCode": "CL-LI",
    "lat": -34.35,
    "lng": -70.9667
  },
  {
    "name": "Rengo",
    "regionCode": "CL-LI",
    "lat": -34.4167,
    "lng": -70.8667
  },
  {
    "name": "Requínoa",
    "regionCode": "CL-LI",
    "lat": -34.2833,
    "lng": -70.8167
  },
  {
    "name": "San Vicente",
    "regionCode": "CL-LI",
    "lat": -34.4333,
    "lng": -71.0833
  },
  {
    "name": "Pichilemu",
    "regionCode": "CL-LI",
    "lat": -34.385,
    "lng": -72.0047
  },
  {
    "name": "La Estrella",
    "regionCode": "CL-LI",
    "lat": -34.2,
    "lng": -71.65
  },
  {
    "name": "Litueche",
    "regionCode": "CL-LI",
    "lat": -34.1167,
    "lng": -71.7333
  },
  {
    "name": "Marchihue",
    "regionCode": "CL-LI",
    "lat": -34.4,
    "lng": -71.6167
  },
  {
    "name": "Navidad",
    "regionCode": "CL-LI",
    "lat": -33.95,
    "lng": -71.8333
  },
  {
    "name": "Paredones",
    "regionCode": "CL-LI",
    "lat": -34.65,
    "lng": -71.9
  },
  {
    "name": "San Fernando",
    "regionCode": "CL-LI",
    "lat": -34.5839,
    "lng": -70.9892
  },
  {
    "name": "Chépica",
    "regionCode": "CL-LI",
    "lat": -34.7333,
    "lng": -71.2833
  },
  {
    "name": "Chimbarongo",
    "regionCode": "CL-LI",
    "lat": -34.7,
    "lng": -71.05
  },
  {
    "name": "Lolol",
    "regionCode": "CL-LI",
    "lat": -34.7333,
    "lng": -71.65
  },
  {
    "name": "Nancagua",
    "regionCode": "CL-LI",
    "lat": -34.6667,
    "lng": -71.2167
  },
  {
    "name": "Palmilla",
    "regionCode": "CL-LI",
    "lat": -34.6,
    "lng": -71.3667
  },
  {
    "name": "Peralillo",
    "regionCode": "CL-LI",
    "lat": -34.4833,
    "lng": -71.4833
  },
  {
    "name": "Placilla",
    "regionCode": "CL-LI",
    "lat": -34.6333,
    "lng": -71.1167
  },
  {
    "name": "Pumanque",
    "regionCode": "CL-LI",
    "lat": -34.6,
    "lng": -71.6667
  },
  {
    "name": "Santa Cruz",
    "regionCode": "CL-LI",
    "lat": -34.6333,
    "lng": -71.3667
  },
  {
    "name": "Talca",
    "regionCode": "CL-ML",
    "lat": -35.4264,
    "lng": -71.6554
  },
  {
    "name": "Constitución",
    "regionCode": "CL-ML",
    "lat": -35.3333,
    "lng": -72.4167
  },
  {
    "name": "Curepto",
    "regionCode": "CL-ML",
    "lat": -35.0833,
    "lng": -72.0333
  },
  {
    "name": "Empedrado",
    "regionCode": "CL-ML",
    "lat": -35.6,
    "lng": -72.2833
  },
  {
    "name": "Maule",
    "regionCode": "CL-ML",
    "lat": -35.5167,
    "lng": -71.7
  },
  {
    "name": "Pelarco",
    "regionCode": "CL-ML",
    "lat": -35.3833,
    "lng": -71.45
  },
  {
    "name": "Pencahue",
    "regionCode": "CL-ML",
    "lat": -35.4,
    "lng": -71.8
  },
  {
    "name": "Río Claro",
    "regionCode": "CL-ML",
    "lat": -35.1833,
    "lng": -71.2667
  },
  {
    "name": "San Clemente",
    "regionCode": "CL-ML",
    "lat": -35.5333,
    "lng": -71.4833
  },
  {
    "name": "San Rafael",
    "regionCode": "CL-ML",
    "lat": -35.3167,
    "lng": -71.5333
  },
  {
    "name": "Cauquenes",
    "regionCode": "CL-ML",
    "lat": -35.9671,
    "lng": -72.3149
  },
  {
    "name": "Chanco",
    "regionCode": "CL-ML",
    "lat": -35.7333,
    "lng": -72.5333
  },
  {
    "name": "Pelluhue",
    "regionCode": "CL-ML",
    "lat": -35.8167,
    "lng": -72.5667
  },
  {
    "name": "Curicó",
    "regionCode": "CL-ML",
    "lat": -34.9828,
    "lng": -71.2394
  },
  {
    "name": "Hualañé",
    "regionCode": "CL-ML",
    "lat": -34.9833,
    "lng": -71.8
  },
  {
    "name": "Licantén",
    "regionCode": "CL-ML",
    "lat": -35,
    "lng": -72.0167
  },
  {
    "name": "Molina",
    "regionCode": "CL-ML",
    "lat": -35.1167,
    "lng": -71.2833
  },
  {
    "name": "Rauco",
    "regionCode": "CL-ML",
    "lat": -34.9333,
    "lng": -71.3167
  },
  {
    "name": "Romeral",
    "regionCode": "CL-ML",
    "lat": -34.9667,
    "lng": -71.1333
  },
  {
    "name": "Sagrada Familia",
    "regionCode": "CL-ML",
    "lat": -35,
    "lng": -71.3833
  },
  {
    "name": "Teno",
    "regionCode": "CL-ML",
    "lat": -34.8667,
    "lng": -71.1833
  },
  {
    "name": "Vichuquén",
    "regionCode": "CL-ML",
    "lat": -34.8833,
    "lng": -72
  },
  {
    "name": "Linares",
    "regionCode": "CL-ML",
    "lat": -35.8454,
    "lng": -71.5979
  },
  {
    "name": "Colbún",
    "regionCode": "CL-ML",
    "lat": -35.7,
    "lng": -71.4167
  },
  {
    "name": "Longaví",
    "regionCode": "CL-ML",
    "lat": -35.9667,
    "lng": -71.6833
  },
  {
    "name": "Parral",
    "regionCode": "CL-ML",
    "lat": -36.15,
    "lng": -71.8333
  },
  {
    "name": "Retiro",
    "regionCode": "CL-ML",
    "lat": -36.05,
    "lng": -71.7667
  },
  {
    "name": "San Javier",
    "regionCode": "CL-ML",
    "lat": -35.5833,
    "lng": -71.7333
  },
  {
    "name": "Villa Alegre",
    "regionCode": "CL-ML",
    "lat": -35.6667,
    "lng": -71.75
  },
  {
    "name": "Yerbas Buenas",
    "regionCode": "CL-ML",
    "lat": -35.75,
    "lng": -71.5667
  },
  {
    "name": "Chillán",
    "regionCode": "CL-NB",
    "lat": -36.6066,
    "lng": -72.1034
  },
  {
    "name": "Bulnes",
    "regionCode": "CL-NB",
    "lat": -36.7333,
    "lng": -72.3
  },
  {
    "name": "Chillán Viejo",
    "regionCode": "CL-NB",
    "lat": -36.6333,
    "lng": -72.1333
  },
  {
    "name": "El Carmen",
    "regionCode": "CL-NB",
    "lat": -36.8833,
    "lng": -72.0333
  },
  {
    "name": "Pemuco",
    "regionCode": "CL-NB",
    "lat": -36.9833,
    "lng": -72.1
  },
  {
    "name": "Pinto",
    "regionCode": "CL-NB",
    "lat": -36.85,
    "lng": -71.9
  },
  {
    "name": "Quillón",
    "regionCode": "CL-NB",
    "lat": -36.75,
    "lng": -72.4667
  },
  {
    "name": "San Ignacio",
    "regionCode": "CL-NB",
    "lat": -36.8333,
    "lng": -72.05
  },
  {
    "name": "Yungay",
    "regionCode": "CL-NB",
    "lat": -37.1167,
    "lng": -72.0167
  },
  {
    "name": "Quirihue",
    "regionCode": "CL-NB",
    "lat": -36.2833,
    "lng": -72.5333
  },
  {
    "name": "Cobquecura",
    "regionCode": "CL-NB",
    "lat": -36.1333,
    "lng": -72.7833
  },
  {
    "name": "Coelemu",
    "regionCode": "CL-NB",
    "lat": -36.4833,
    "lng": -72.7
  },
  {
    "name": "Ninhue",
    "regionCode": "CL-NB",
    "lat": -36.4,
    "lng": -72.4
  },
  {
    "name": "Portezuelo",
    "regionCode": "CL-NB",
    "lat": -36.5333,
    "lng": -72.4333
  },
  {
    "name": "Ránquil",
    "regionCode": "CL-NB",
    "lat": -36.65,
    "lng": -72.55
  },
  {
    "name": "Treguaco",
    "regionCode": "CL-NB",
    "lat": -36.4333,
    "lng": -72.6667
  },
  {
    "name": "San Carlos",
    "regionCode": "CL-NB",
    "lat": -36.4333,
    "lng": -71.95
  },
  {
    "name": "Coihueco",
    "regionCode": "CL-NB",
    "lat": -36.6167,
    "lng": -71.8333
  },
  {
    "name": "Ñiquén",
    "regionCode": "CL-NB",
    "lat": -36.2833,
    "lng": -71.9
  },
  {
    "name": "San Fabián",
    "regionCode": "CL-NB",
    "lat": -36.55,
    "lng": -71.55
  },
  {
    "name": "San Nicolás",
    "regionCode": "CL-NB",
    "lat": -36.5,
    "lng": -72.2167
  },
  {
    "name": "Concepción",
    "regionCode": "CL-BI",
    "lat": -36.8269,
    "lng": -73.0503
  },
  {
    "name": "Coronel",
    "regionCode": "CL-BI",
    "lat": -37.0167,
    "lng": -73.1333
  },
  {
    "name": "Chiguayante",
    "regionCode": "CL-BI",
    "lat": -36.9167,
    "lng": -73.0167
  },
  {
    "name": "Florida",
    "regionCode": "CL-BI",
    "lat": -36.8167,
    "lng": -72.6667
  },
  {
    "name": "Hualpén",
    "regionCode": "CL-BI",
    "lat": -36.8,
    "lng": -73.0833
  },
  {
    "name": "Hualqui",
    "regionCode": "CL-BI",
    "lat": -36.9833,
    "lng": -72.9333
  },
  {
    "name": "Lota",
    "regionCode": "CL-BI",
    "lat": -37.0833,
    "lng": -73.15
  },
  {
    "name": "Penco",
    "regionCode": "CL-BI",
    "lat": -36.7333,
    "lng": -72.9833
  },
  {
    "name": "San Pedro de la Paz",
    "regionCode": "CL-BI",
    "lat": -36.8422,
    "lng": -73.1042
  },
  {
    "name": "Santa Juana",
    "regionCode": "CL-BI",
    "lat": -37.1667,
    "lng": -72.9333
  },
  {
    "name": "Talcahuano",
    "regionCode": "CL-BI",
    "lat": -36.7167,
    "lng": -73.1167
  },
  {
    "name": "Tomé",
    "regionCode": "CL-BI",
    "lat": -36.6167,
    "lng": -72.95
  },
  {
    "name": "Lebu",
    "regionCode": "CL-BI",
    "lat": -37.6074,
    "lng": -73.6558
  },
  {
    "name": "Arauco",
    "regionCode": "CL-BI",
    "lat": -37.25,
    "lng": -73.3167
  },
  {
    "name": "Cañete",
    "regionCode": "CL-BI",
    "lat": -37.8,
    "lng": -73.4
  },
  {
    "name": "Contulmo",
    "regionCode": "CL-BI",
    "lat": -38.0167,
    "lng": -73.2333
  },
  {
    "name": "Curanilahue",
    "regionCode": "CL-BI",
    "lat": -37.4833,
    "lng": -73.35
  },
  {
    "name": "Los Álamos",
    "regionCode": "CL-BI",
    "lat": -37.6333,
    "lng": -73.45
  },
  {
    "name": "Tirúa",
    "regionCode": "CL-BI",
    "lat": -38.3333,
    "lng": -73.5
  },
  {
    "name": "Los Ángeles",
    "regionCode": "CL-BI",
    "lat": -37.4697,
    "lng": -72.3537
  },
  {
    "name": "Antuco",
    "regionCode": "CL-BI",
    "lat": -37.3333,
    "lng": -71.6833
  },
  {
    "name": "Cabrero",
    "regionCode": "CL-BI",
    "lat": -37.0333,
    "lng": -72.4
  },
  {
    "name": "Laja",
    "regionCode": "CL-BI",
    "lat": -37.2667,
    "lng": -72.7
  },
  {
    "name": "Mulchén",
    "regionCode": "CL-BI",
    "lat": -37.7167,
    "lng": -72.2333
  },
  {
    "name": "Nacimiento",
    "regionCode": "CL-BI",
    "lat": -37.5,
    "lng": -72.6667
  },
  {
    "name": "Negrete",
    "regionCode": "CL-BI",
    "lat": -37.5833,
    "lng": -72.5333
  },
  {
    "name": "Quilaco",
    "regionCode": "CL-BI",
    "lat": -37.6667,
    "lng": -71.9833
  },
  {
    "name": "Quilleco",
    "regionCode": "CL-BI",
    "lat": -37.4667,
    "lng": -71.9667
  },
  {
    "name": "San Rosendo",
    "regionCode": "CL-BI",
    "lat": -37.2667,
    "lng": -72.7333
  },
  {
    "name": "Santa Bárbara",
    "regionCode": "CL-BI",
    "lat": -37.6667,
    "lng": -72.0167
  },
  {
    "name": "Tucapel",
    "regionCode": "CL-BI",
    "lat": -37.2833,
    "lng": -71.95
  },
  {
    "name": "Yumbel",
    "regionCode": "CL-BI",
    "lat": -37.0833,
    "lng": -72.5667
  },
  {
    "name": "Alto Biobío",
    "regionCode": "CL-BI",
    "lat": -37.8833,
    "lng": -71.3667
  },
  {
    "name": "Temuco",
    "regionCode": "CL-AR",
    "lat": -38.7359,
    "lng": -72.5904
  },
  {
    "name": "Carahue",
    "regionCode": "CL-AR",
    "lat": -38.7167,
    "lng": -73.1667
  },
  {
    "name": "Cunco",
    "regionCode": "CL-AR",
    "lat": -38.9167,
    "lng": -72.0333
  },
  {
    "name": "Curarrehue",
    "regionCode": "CL-AR",
    "lat": -39.35,
    "lng": -71.5833
  },
  {
    "name": "Freire",
    "regionCode": "CL-AR",
    "lat": -38.95,
    "lng": -72.6333
  },
  {
    "name": "Galvarino",
    "regionCode": "CL-AR",
    "lat": -38.4167,
    "lng": -72.7833
  },
  {
    "name": "Gorbea",
    "regionCode": "CL-AR",
    "lat": -39.1,
    "lng": -72.6833
  },
  {
    "name": "Lautaro",
    "regionCode": "CL-AR",
    "lat": -38.5333,
    "lng": -72.45
  },
  {
    "name": "Loncoche",
    "regionCode": "CL-AR",
    "lat": -39.3667,
    "lng": -72.6333
  },
  {
    "name": "Melipeuco",
    "regionCode": "CL-AR",
    "lat": -38.85,
    "lng": -71.7
  },
  {
    "name": "Nueva Imperial",
    "regionCode": "CL-AR",
    "lat": -38.7333,
    "lng": -72.95
  },
  {
    "name": "Padre Las Casas",
    "regionCode": "CL-AR",
    "lat": -38.7667,
    "lng": -72.5833
  },
  {
    "name": "Perquenco",
    "regionCode": "CL-AR",
    "lat": -38.4167,
    "lng": -72.4333
  },
  {
    "name": "Pitrufquén",
    "regionCode": "CL-AR",
    "lat": -38.9833,
    "lng": -72.6333
  },
  {
    "name": "Pucón",
    "regionCode": "CL-AR",
    "lat": -39.2833,
    "lng": -71.9667
  },
  {
    "name": "Saavedra",
    "regionCode": "CL-AR",
    "lat": -38.7833,
    "lng": -73.3833
  },
  {
    "name": "Teodoro Schmidt",
    "regionCode": "CL-AR",
    "lat": -38.9667,
    "lng": -73.05
  },
  {
    "name": "Toltén",
    "regionCode": "CL-AR",
    "lat": -39.2167,
    "lng": -73.2333
  },
  {
    "name": "Vilcún",
    "regionCode": "CL-AR",
    "lat": -38.65,
    "lng": -72.2333
  },
  {
    "name": "Villarrica",
    "regionCode": "CL-AR",
    "lat": -39.2854,
    "lng": -72.2279
  },
  {
    "name": "Cholchol",
    "regionCode": "CL-AR",
    "lat": -38.6,
    "lng": -72.85
  },
  {
    "name": "Angol",
    "regionCode": "CL-AR",
    "lat": -37.7952,
    "lng": -72.7161
  },
  {
    "name": "Collipulli",
    "regionCode": "CL-AR",
    "lat": -37.95,
    "lng": -72.4333
  },
  {
    "name": "Curacautín",
    "regionCode": "CL-AR",
    "lat": -38.4333,
    "lng": -71.8833
  },
  {
    "name": "Ercilla",
    "regionCode": "CL-AR",
    "lat": -38.05,
    "lng": -72.45
  },
  {
    "name": "Lonquimay",
    "regionCode": "CL-AR",
    "lat": -38.4333,
    "lng": -71.35
  },
  {
    "name": "Los Sauces",
    "regionCode": "CL-AR",
    "lat": -37.9833,
    "lng": -72.8333
  },
  {
    "name": "Lumaco",
    "regionCode": "CL-AR",
    "lat": -38.1667,
    "lng": -72.9167
  },
  {
    "name": "Purén",
    "regionCode": "CL-AR",
    "lat": -38.0333,
    "lng": -73.0833
  },
  {
    "name": "Renaico",
    "regionCode": "CL-AR",
    "lat": -37.6667,
    "lng": -72.5833
  },
  {
    "name": "Traiguén",
    "regionCode": "CL-AR",
    "lat": -38.25,
    "lng": -72.6667
  },
  {
    "name": "Victoria",
    "regionCode": "CL-AR",
    "lat": -38.2333,
    "lng": -72.3333
  },
  {
    "name": "Valdivia",
    "regionCode": "CL-LR",
    "lat": -39.8142,
    "lng": -73.2459
  },
  {
    "name": "Corral",
    "regionCode": "CL-LR",
    "lat": -39.8833,
    "lng": -73.4333
  },
  {
    "name": "Lanco",
    "regionCode": "CL-LR",
    "lat": -39.45,
    "lng": -72.7833
  },
  {
    "name": "Los Lagos",
    "regionCode": "CL-LR",
    "lat": -39.85,
    "lng": -72.8333
  },
  {
    "name": "Máfil",
    "regionCode": "CL-LR",
    "lat": -39.65,
    "lng": -72.95
  },
  {
    "name": "Mariquina",
    "regionCode": "CL-LR",
    "lat": -39.5167,
    "lng": -72.9833
  },
  {
    "name": "Paillaco",
    "regionCode": "CL-LR",
    "lat": -40.0333,
    "lng": -72.8833
  },
  {
    "name": "Panguipulli",
    "regionCode": "CL-LR",
    "lat": -39.6333,
    "lng": -72.3333
  },
  {
    "name": "La Unión",
    "regionCode": "CL-LR",
    "lat": -40.2947,
    "lng": -73.0825
  },
  {
    "name": "Futrono",
    "regionCode": "CL-LR",
    "lat": -40.1333,
    "lng": -72.4
  },
  {
    "name": "Lago Ranco",
    "regionCode": "CL-LR",
    "lat": -40.3167,
    "lng": -72.4833
  },
  {
    "name": "Río Bueno",
    "regionCode": "CL-LR",
    "lat": -40.3333,
    "lng": -72.95
  },
  {
    "name": "Puerto Montt",
    "regionCode": "CL-LL",
    "lat": -41.4689,
    "lng": -72.9411
  },
  {
    "name": "Calbuco",
    "regionCode": "CL-LL",
    "lat": -41.7667,
    "lng": -73.1333
  },
  {
    "name": "Cochamó",
    "regionCode": "CL-LL",
    "lat": -41.4833,
    "lng": -72.3
  },
  {
    "name": "Fresia",
    "regionCode": "CL-LL",
    "lat": -41.15,
    "lng": -73.4333
  },
  {
    "name": "Frutillar",
    "regionCode": "CL-LL",
    "lat": -41.1167,
    "lng": -73.05
  },
  {
    "name": "Los Muermos",
    "regionCode": "CL-LL",
    "lat": -41.4,
    "lng": -73.4833
  },
  {
    "name": "Llanquihue",
    "regionCode": "CL-LL",
    "lat": -41.2667,
    "lng": -73.0167
  },
  {
    "name": "Maullín",
    "regionCode": "CL-LL",
    "lat": -41.6167,
    "lng": -73.6
  },
  {
    "name": "Puerto Varas",
    "regionCode": "CL-LL",
    "lat": -41.3167,
    "lng": -72.9833
  },
  {
    "name": "Castro",
    "regionCode": "CL-LL",
    "lat": -42.4721,
    "lng": -73.7732
  },
  {
    "name": "Ancud",
    "regionCode": "CL-LL",
    "lat": -41.8667,
    "lng": -73.8333
  },
  {
    "name": "Chonchi",
    "regionCode": "CL-LL",
    "lat": -42.6167,
    "lng": -73.7833
  },
  {
    "name": "Curaco de Vélez",
    "regionCode": "CL-LL",
    "lat": -42.4333,
    "lng": -73.6
  },
  {
    "name": "Dalcahue",
    "regionCode": "CL-LL",
    "lat": -42.3833,
    "lng": -73.65
  },
  {
    "name": "Puqueldón",
    "regionCode": "CL-LL",
    "lat": -42.5833,
    "lng": -73.6667
  },
  {
    "name": "Queilén",
    "regionCode": "CL-LL",
    "lat": -42.8833,
    "lng": -73.4667
  },
  {
    "name": "Quellón",
    "regionCode": "CL-LL",
    "lat": -43.1167,
    "lng": -73.6167
  },
  {
    "name": "Quemchi",
    "regionCode": "CL-LL",
    "lat": -42.15,
    "lng": -73.4833
  },
  {
    "name": "Quinchao",
    "regionCode": "CL-LL",
    "lat": -42.4667,
    "lng": -73.5
  },
  {
    "name": "Osorno",
    "regionCode": "CL-LL",
    "lat": -40.5739,
    "lng": -73.1335
  },
  {
    "name": "Puerto Octay",
    "regionCode": "CL-LL",
    "lat": -40.9667,
    "lng": -72.8833
  },
  {
    "name": "Purranque",
    "regionCode": "CL-LL",
    "lat": -40.9167,
    "lng": -73.1667
  },
  {
    "name": "Puyehue",
    "regionCode": "CL-LL",
    "lat": -40.65,
    "lng": -72.6
  },
  {
    "name": "Río Negro",
    "regionCode": "CL-LL",
    "lat": -40.8,
    "lng": -73.2167
  },
  {
    "name": "San Juan de la Costa",
    "regionCode": "CL-LL",
    "lat": -40.5167,
    "lng": -73.3833
  },
  {
    "name": "San Pablo",
    "regionCode": "CL-LL",
    "lat": -40.4,
    "lng": -73.0167
  },
  {
    "name": "Chaitén",
    "regionCode": "CL-LL",
    "lat": -42.9167,
    "lng": -72.7167
  },
  {
    "name": "Futaleufú",
    "regionCode": "CL-LL",
    "lat": -43.1833,
    "lng": -71.8667
  },
  {
    "name": "Hualaihué",
    "regionCode": "CL-LL",
    "lat": -41.9667,
    "lng": -72.6833
  },
  {
    "name": "Palena",
    "regionCode": "CL-LL",
    "lat": -43.6167,
    "lng": -71.8
  },
  {
    "name": "Coyhaique",
    "regionCode": "CL-AI",
    "lat": -45.5712,
    "lng": -72.0683
  },
  {
    "name": "Lago Verde",
    "regionCode": "CL-AI",
    "lat": -44.2333,
    "lng": -71.85
  },
  {
    "name": "Aysén",
    "regionCode": "CL-AI",
    "lat": -45.4,
    "lng": -72.7
  },
  {
    "name": "Cisnes",
    "regionCode": "CL-AI",
    "lat": -44.75,
    "lng": -72.7
  },
  {
    "name": "Guaitecas",
    "regionCode": "CL-AI",
    "lat": -43.8833,
    "lng": -73.75
  },
  {
    "name": "Cochrane",
    "regionCode": "CL-AI",
    "lat": -47.25,
    "lng": -72.5667
  },
  {
    "name": "O'Higgins",
    "regionCode": "CL-AI",
    "lat": -48.4667,
    "lng": -72.5667
  },
  {
    "name": "Tortel",
    "regionCode": "CL-AI",
    "lat": -47.7967,
    "lng": -73.5317
  },
  {
    "name": "Chile Chico",
    "regionCode": "CL-AI",
    "lat": -46.5333,
    "lng": -71.7333
  },
  {
    "name": "Río Ibáñez",
    "regionCode": "CL-AI",
    "lat": -46.2667,
    "lng": -71.9333
  },
  {
    "name": "Punta Arenas",
    "regionCode": "CL-MA",
    "lat": -53.1638,
    "lng": -70.9171
  },
  {
    "name": "Laguna Blanca",
    "regionCode": "CL-MA",
    "lat": -52.25,
    "lng": -71.9167
  },
  {
    "name": "Río Verde",
    "regionCode": "CL-MA",
    "lat": -52.55,
    "lng": -71.5
  },
  {
    "name": "San Gregorio",
    "regionCode": "CL-MA",
    "lat": -52.3333,
    "lng": -70.0833
  },
  {
    "name": "Cabo de Hornos",
    "regionCode": "CL-MA",
    "lat": -54.9333,
    "lng": -67.6167
  },
  {
    "name": "Antártica",
    "regionCode": "CL-MA",
    "lat": -69,
    "lng": -63
  },
  {
    "name": "Porvenir",
    "regionCode": "CL-MA",
    "lat": -53.295,
    "lng": -70.3678
  },
  {
    "name": "Primavera",
    "regionCode": "CL-MA",
    "lat": -52.75,
    "lng": -69.25
  },
  {
    "name": "Timaukel",
    "regionCode": "CL-MA",
    "lat": -54,
    "lng": -68.8333
  },
  {
    "name": "Natales",
    "regionCode": "CL-MA",
    "lat": -51.7236,
    "lng": -72.5061
  },
  {
    "name": "Torres del Paine",
    "regionCode": "CL-MA",
    "lat": -51.25,
    "lng": -72.8833
  }
];
