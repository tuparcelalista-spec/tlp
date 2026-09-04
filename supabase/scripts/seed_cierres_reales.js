const { createClient } = require('@supabase/supabase-js');

// Configuración simulada para el script
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'TU_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Seed de "Golden Records": Ventas reales confirmadas (Precios de Cierre).
 * Estos datos son fundamentales para calibrar el algoritmo TPL V2.4 frente a la realidad del mercado.
 */
const VENTAS_REALES = [
  {
    codigo: 'REAL-CONCE-001',
    region: 'Región del Biobío',
    comuna: 'Concepción',
    sector: 'Periurbano (10km centro)',
    superficie_m2: 2500,
    precio_cierre: 58000000,
    distancia_ciudad_km: 10,
    agua: 'No informada',
    electricidad: 'No informada'
  },
  {
    codigo: 'REAL-LAJA-001',
    region: 'Región del Biobío',
    comuna: 'Laja',
    sector: 'Rural',
    superficie_m2: 5000,
    precio_cierre: 85000000, // Corrección: El usuario dijo 8.500.000, es decir 8,5M
    precio_cierre: 8500000, 
    distancia_ciudad_km: null,
    agua: 'No informada',
    electricidad: 'No informada'
  },
  {
    codigo: 'REAL-ANTUCO-001',
    region: 'Región del Biobío',
    comuna: 'Antuco',
    sector: 'Rural',
    superficie_m2: 7000,
    precio_cierre: 11000000,
    distancia_ciudad_km: null,
    agua: 'No informada',
    electricidad: 'No informada'
  },
  {
    codigo: 'REAL-QUILLON-001',
    region: 'Región de Ñuble',
    comuna: 'Quillón',
    sector: 'Rural (8km centro)',
    superficie_m2: 5000,
    precio_cierre: 27000000,
    distancia_ciudad_km: 8,
    agua: 'Empalme instalado',
    electricidad: 'Empalme instalado'
  }
];

async function seedRealSales() {
  console.log('--- Inyectando Cierres Reales (Golden Records) ---');

  for (const venta of VENTAS_REALES) {
    // 1. Crear propiedad core
    const { data: coreData, error: coreErr } = await supabase.from('tpl_propiedad_core').insert({
      codigo: venta.codigo,
      tipo: 'parcela',
      estado: 'vendida', // ESTADO CLAVE PARA MACHINE LEARNING
      titulo: `Venta Real Confirmada - ${venta.comuna}`,
      region: venta.region,
      comuna: venta.comuna,
      sector: venta.sector
    }).select('id').single();

    if (coreErr) {
      console.error(`Error insertando ${venta.codigo}:`, coreErr);
      continue;
    }

    const propId = coreData.id;

    // 2. Insertar en Comercial (Acá va el precio de cierre que es el oro puro)
    await supabase.from('tpl_propiedad_comercial').insert({
      propiedad_id: propId,
      moneda: 'CLP',
      precio_cierre: venta.precio_cierre,
      fecha_cierre: new Date().toISOString()
    });

    // 3. Insertar en Terreno
    await supabase.from('tpl_expediente_terreno').insert({
      propiedad_id: propId,
      superficie_m2: venta.superficie_m2,
      agua: venta.agua,
      electricidad: venta.electricidad
    });

    // 4. Insertar en Entorno
    await supabase.from('tpl_propiedad_entorno').insert({
      propiedad_id: propId,
      distancia_ciudad_km: venta.distancia_ciudad_km,
      ciudad_principal: venta.comuna
    });

    console.log(`✅ Inyectado: ${venta.comuna} (${venta.superficie_m2}m2) -> $${venta.precio_cierre.toLocaleString('es-CL')}`);
  }

  console.log('--- Seed completado exitosamente ---');
}

seedRealSales();
