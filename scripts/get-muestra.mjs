import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwyscirbycojwndyzozn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k'; // fallback to anon if service missing
const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function getMuestra() {
  const reqComunas = ['Ñipas', 'Quillón', 'Ránquil', 'Yumbel', 'Florida', 'Nacimiento', 'Negrete', 'Pucón'];
  const { data: props, error } = await admin.from('tpl_propiedades').select('id, comuna, precio_publicado').order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching props:', error);
    return;
  }
  
  const muestra = [];
  const foundComunas = new Set();
  
  // Find required
  for (const c of reqComunas) {
    const p = props.find(x => x.comuna === c);
    if (p) {
      muestra.push(p);
      foundComunas.add(c);
    }
  }
  
  // Find extra 12
  for (const p of props) {
    if (muestra.length >= 20) break;
    if (!muestra.find(x => x.id === p.id)) {
      muestra.push(p);
    }
  }
  
  console.log('Muestra size:', muestra.length);
  
  // Check tasaciones
  for (const p of muestra) {
    const { data: tas } = await admin.from('tpl_tasaciones').select('valor_tpl_total').eq('propiedad_id', p.id).limit(1).maybeSingle();
    console.log(`${p.comuna} (${p.id}): tasacion=${tas ? tas.valor_tpl_total : 'NONE'}`);
  }
}

getMuestra();
