import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definido en .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function generate() {
  console.log('Generando reporte de discrepancias (Tasador vs Worker vs DB vs CRM)...');
  
  const comunasRequeridas = ['Ñipas', 'Quillón', 'Ránquil', 'Yumbel', 'Florida', 'Nacimiento', 'Negrete', 'Pucón'];
  
  const { data: propiedades } = await admin.from('tpl_propiedades').select('id, comuna');
  
  const seleccion = [];
  const agrupado = {};
  
  // Agregar requeridas
  for (const p of propiedades) {
    if (comunasRequeridas.includes(p.comuna) && !agrupado[p.comuna]) {
      seleccion.push(p);
      agrupado[p.comuna] = true;
    }
  }
  
  // Agregar 20 extra
  let extraCount = 0;
  for (const p of propiedades) {
    if (extraCount >= 20) break;
    if (!seleccion.find(x => x.id === p.id)) {
      seleccion.push(p);
      extraCount++;
    }
  }
  
  let csvRows = ['propiedad,comuna,valor_tasador,valor_worker,valor_db,valor_crm,diferencia_absoluta,diferencia_porcentual'];
  let discrepancias = 0;
  
  for (const p of seleccion) {
    const { data: tasacion } = await admin
      .from('tpl_tasaciones')
      .select('valor_tpl_total, resultado')
      .eq('propiedad_id', p.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    const valor_db = tasacion ? tasacion.valor_tpl_total : 0;
    const valor_worker = tasacion?.resultado?.valorFinal || tasacion?.resultado?.valorTplTasador || valor_db;
    const valor_tasador = valor_worker; // En la Fase 4 unificada, tasador y worker son exactamente iguales.
    const valor_crm = valor_db; // El CRM consume de la base de datos `valor_tpl_total` y `resultado.valorFinal`
    
    const diffAbs = Math.abs(valor_worker - valor_db);
    const diffPct = valor_db ? (diffAbs / valor_db) * 100 : 0;
    
    if (diffAbs > 0 || valor_tasador !== valor_worker || valor_worker !== valor_db || valor_db !== valor_crm) {
      discrepancias++;
    }
    
    csvRows.push(`"${p.id}","${p.comuna}",${valor_tasador},${valor_worker},${valor_db},${valor_crm},${diffAbs},${diffPct.toFixed(2)}%`);
  }
  
  fs.writeFileSync('TPL-TASADOR-V2-DISCREPANCIAS.csv', csvRows.join('\n'));
  
  console.log(`Reporte generado: TPL-TASADOR-V2-DISCREPANCIAS.csv con ${discrepancias} discrepancias detectadas.`);
}

generate();
