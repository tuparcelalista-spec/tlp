const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar credenciales desde config o env (simulado para script)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'TU_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrateProperties() {
  console.log('--- Iniciando Migración a Base Maestra TPL V3 ---');
  
  // 1. Obtener todas las propiedades de la tabla plana antigua
  const { data: legacyProps, error } = await supabase
    .from('tpl_propiedades')
    .select('*');

  if (error) {
    console.error('Error obteniendo propiedades legacy:', error);
    return;
  }

  console.log(`Encontradas ${legacyProps.length} propiedades para migrar.`);

  for (const prop of legacyProps) {
    console.log(`Migrando propiedad ${prop.codigo}...`);
    
    // Asignación de TIPO
    let tipoV3 = 'parcela';
    const hasHouse = prop.casa_datos && Object.keys(prop.casa_datos).length > 0;
    if (hasHouse) {
      // Determinación básica: si está en RM o es netamente urbana, casa_urbana.
      // Por defecto, si tiene casa en el sur es parcela_casa.
      if (prop.region === 'Región Metropolitana de Santiago' || prop.superficie_m2 < 1000) {
        tipoV3 = 'casa_urbana';
      } else {
        tipoV3 = 'parcela_casa';
      }
    }

    // 2. Insertar en tpl_propiedad_core
    const coreData = {
      id: prop.id,
      codigo: prop.codigo,
      tipo: tipoV3,
      estado: prop.estado,
      titulo: prop.titulo,
      descripcion: prop.descripcion,
      region: prop.region,
      comuna: prop.comuna,
      sector: prop.sector,
      lat: prop.lat,
      lng: prop.lng,
      creado_en: prop.publicada_at || new Date().toISOString()
    };
    
    const { error: coreErr } = await supabase.from('tpl_propiedad_core').upsert(coreData);
    if (coreErr) { console.error('Error Core:', coreErr); continue; }

    // 3. Insertar en tpl_propiedad_comercial
    const comercialData = {
      propiedad_id: prop.id,
      moneda: prop.moneda || 'CLP',
      precio_publicado: prop.precio_publicado,
      precio_sugerido_tpl: prop.precio_publicado, // Placeholder hasta recalculo
      oportunidad_tpl: prop.oportunidad_tpl
    };
    await supabase.from('tpl_propiedad_comercial').upsert(comercialData);

    // 4. Módulo Terreno (Rural y Parcelas)
    if (tipoV3 === 'parcela' || tipoV3 === 'parcela_casa') {
      const terrenoData = {
        propiedad_id: prop.id,
        superficie_m2: prop.superficie_m2,
        topografia: prop.topografia,
        suelo: prop.suelo,
        exposicion: prop.exposicion,
        vista_principal: prop.vista_principal,
        vegetacion: prop.vegetacion,
        rol_situacion: prop.rol_situacion,
        electricidad: prop.electricidad,
        agua: prop.agua,
        acceso: prop.acceso,
        cierre_perimetral: prop.cierre_perimetral,
        porton: prop.porton,
        condominio: prop.condominio === 'Si' || prop.condominio === true
      };
      await supabase.from('tpl_expediente_terreno').upsert(terrenoData);
    }

    // 5. Módulo Construcción (Casas)
    if (hasHouse) {
      const cd = prop.casa_datos;
      const construccionData = {
        propiedad_id: prop.id,
        m2_construidos: cd.superficie_util || cd.metros_construidos || 0,
        m2_terrazas: cd.terrazas || 0,
        ano_construccion: cd.ano_construccion || null,
        material_estructural: cd.material_solido || cd.material || 'No informado',
        recepcion_final: cd.recepcion_final || 'Sin recepcion',
        habitaciones: cd.dormitorios || 0,
        banos: cd.banos || 0,
        estacionamientos: cd.estacionamientos || 0,
        calefaccion: cd.calefaccion || 'No',
        piscina: cd.piscina === 'Si' || cd.piscina === true
      };
      await supabase.from('tpl_expediente_construccion').upsert(construccionData);
    }

    // 6. Módulo Entorno
    const entornoData = {
      propiedad_id: prop.id,
      conit_indice: prop.diagnostico?.conit?.score || 50,
      ciudad_principal: prop.diagnostico?.conit?.nearestCity || 'No informada'
    };
    await supabase.from('tpl_propiedad_entorno').upsert(entornoData);
  }

  console.log('--- Migración completada exitosamente ---');
}

migrateProperties();
