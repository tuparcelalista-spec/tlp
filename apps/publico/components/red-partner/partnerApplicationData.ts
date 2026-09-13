/**
 * Taxonomía real de `frontend-v2/red-partner-v2/postular.js` (constantes
 * `ESPECIALIDADES_POR_TIPO`, `COMUNAS_POR_REGION`) y de los `<option>`/
 * checkboxes estáticos de `index.html` (`tipo_servicio`, `region`,
 * `disponibilidad`, `diferenciacion_checks`) — copiada literal, no
 * reinventada, para que la postulación nueva clasifique a la gente
 * exactamente igual que hoy.
 */

export const TIPO_SERVICIO_OPTIONS = [
  "Construcción",
  "Instalaciones (Pozos, Fosas, Cercos)",
  "Ingeniería y Topografía",
  "Arquitectura",
  "Servicios Profesionales (Abogados, etc)",
  "Mantenimiento (Eléctrico, Gasfitería)",
  "Otros",
] as const;

export const ESPECIALIDADES_POR_TIPO: Record<string, string[]> = {
  "Construcción": ["Radieres", "Fundaciones", "Albañilería", "Techumbres", "Casas completas", "Ampliaciones", "Terminaciones", "Galpones"],
  "Instalaciones (Pozos, Fosas, Cercos)": ["Pozos profundos", "Norias", "Fosas sépticas", "Cercos perimetrales", "Portones", "Cierres eléctricos", "Instalación de bombas"],
  "Ingeniería y Topografía": ["Topografía", "Subdivisión", "Estudio de suelos", "Cálculo estructural", "Planos regulares", "Permisos municipales"],
  "Arquitectura": ["Diseño de viviendas", "Planos de arquitectura", "Regularización", "Asesoría de diseño"],
  "Servicios Profesionales (Abogados, etc)": ["Estudios de título", "Escrituras", "Posesiones efectivas", "Asesoría legal rural"],
  "Mantenimiento (Eléctrico, Gasfitería)": ["Electricidad", "Gasfitería", "Pintura", "Carpintería", "Soldadura", "Mantención general"],
  "Otros": ["Transporte", "Maquinaria pesada", "Limpieza de terrenos", "Paisajismo", "Riego"],
};

export const REGION_OPTIONS = [
  "Metropolitana",
  "Valparaíso",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Otras Regiones",
] as const;

export const COMUNAS_POR_REGION: Record<string, string[]> = {
  "Metropolitana": ["Santiago", "Colina", "Lampa", "Melipilla", "Curacaví", "María Pinto", "Pirque", "San José de Maipo", "Buin", "Paine"],
  "Valparaíso": ["Valparaíso", "Viña del Mar", "Concón", "Quintero", "Casablanca", "San Antonio", "Algarrobo", "El Quisco"],
  "O'Higgins": ["Rancagua", "Machalí", "Pichilemu", "San Fernando", "Santa Cruz", "Litueche", "Navidad"],
  "Maule": ["Talca", "Curicó", "Linares", "Constitución", "Molina", "San Clemente", "Cauquenes", "Parral"],
  "Ñuble": ["Chillán", "Chillán Viejo", "Bulnes", "Quillón", "Coihueco", "San Carlos", "Pinto", "Yungay", "Cobquecura", "El Carmen", "San Nicolás"],
  "Biobío": ["Concepción", "Los Ángeles", "Coronel", "Yumbel", "Florida", "Cabrero", "Laja", "Santa Juana", "Hualqui", "Nacimiento", "Tomé", "San Pedro de la Paz", "Mulchén", "Negrete"],
  "Araucanía": ["Temuco", "Villarrica", "Pucón", "Lautaro", "Victoria", "Freire", "Cunco", "Gorbea", "Loncoche", "Pitrufquén", "Nueva Imperial"],
  "Los Ríos": ["Valdivia", "La Unión", "Panguipulli", "Río Bueno", "Lago Ranco", "Futrono", "Lanco", "Mariquina", "Paillaco"],
  "Los Lagos": ["Puerto Montt", "Puerto Varas", "Osorno", "Frutillar", "Ancud", "Castro", "Llanquihue", "Calbuco", "Purranque"],
  "Otras Regiones": ["La Serena", "Coquimbo", "Ovalle", "Los Vilos", "Illapel"],
};

export const DISPONIBILIDAD_OPTIONS = ["Inmediata", "En 1 semana", "En 1 mes o más"] as const;

export const DIFERENCIACION_OPTIONS = [
  "Visito el terreno antes de cotizar",
  "Entrego presupuesto detallado por escrito",
  "Envío evidencia fotográfica del avance",
  "Trabajo con contrato firmado",
  "Ofrezco garantía post-entrega",
  "Tengo equipo y maquinaria propia",
  "Más de 10 años de experiencia",
  "Disponibilidad inmediata",
  "Trabajo los fines de semana",
] as const;

/**
 * Legal específico de Red Partner (`terminos-red-partner.html` /
 * `privacidad-red-partner.html`) — todavía no portado a Next.js. Se enlaza
 * a la versión real en producción, no a las páginas genéricas `/terminos`
 * `/privacidad` del sitio nuevo, que son un documento distinto.
 */
export const RED_PARTNER_TERMINOS_HREF = "https://www.parcelalista.cl/red-partner-v2/terminos-red-partner.html";
export const RED_PARTNER_PRIVACIDAD_HREF = "https://www.parcelalista.cl/red-partner-v2/privacidad-red-partner.html";
