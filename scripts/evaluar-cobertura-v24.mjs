import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoverage() {
  const { data: props, error } = await supabase
    .from('tpl_propiedades')
    .select('id, comuna, superficie_m2, valor_tpl_total, distancia_centro_comuna_km, distancia_ciudad_km, metadata, geoint');

  if (error) {
    console.error('Error fetching properties:', error);
    return;
  }

  let total = props.length;
  let hasSuperficie = 0;
  let hasDistances = 0;
  let hasGeoint = 0;
  let readyForV24 = 0;
  
  let missingSuperficie = [];
  let missingDistances = [];

  for (const p of props) {
    const s = Number(p.superficie_m2);
    let dComuna = p.distancia_centro_comuna_km || p.metadata?.tasador_entrada?.communeDistanceKm || p.geoint?.commune_center_distance_km;
    let dCiudad = p.distancia_ciudad_km || p.metadata?.tasador_entrada?.distanceKm || p.geoint?.economic_hub_distance_km;
    
    let hasS = (s > 0);
    let hasD = (dComuna != null && dCiudad != null);
    let hasG = (p.geoint != null);

    if (hasS) hasSuperficie++;
    else missingSuperficie.push(p.id);

    if (hasD) hasDistances++;
    else missingDistances.push(p.id);

    if (hasG) hasGeoint++;

    if (hasS && hasD) readyForV24++;
  }

  console.log(`\n=== RESULTADOS DE COBERTURA V2.4 ===`);
  console.log(`Total parcelas evaluadas: ${total}`);
  console.log(`Con superficie válida: ${hasSuperficie} (${Math.round((hasSuperficie/total)*100)}%)`);
  console.log(`Con distancias válidas: ${hasDistances} (${Math.round((hasDistances/total)*100)}%)`);
  console.log(`Con datos CONIT (geoint): ${hasGeoint} (${Math.round((hasGeoint/total)*100)}%)`);
  console.log(`\n✅ LISTAS PARA RECALCULAR V2.4: ${readyForV24} (${Math.round((readyForV24/total)*100)}%)`);
  
  if (missingSuperficie.length > 0) console.log(`\nParcelas sin superficie: ${missingSuperficie.length}`);
  if (missingDistances.length > 0) console.log(`Parcelas sin distancias: ${missingDistances.length}`);
}

checkCoverage();
