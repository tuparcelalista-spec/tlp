import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url); const orden = url.searchParams.get('orden');
    if (!orden) return jsonResponse({ ok:false,error:'Falta la orden.' },400);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await supabase.from('tpl_ordenes_informe').select('id,codigo,estado,monto_clp,disponible_at').eq('id',orden).single();
    if(error||!data) return jsonResponse({ok:false,error:'Orden no encontrada.'},404);
    let download_url = null;
    if(data.estado==='disponible') { const {data:report}=await supabase.from('tpl_informes_tasacion').select('storage_bucket,storage_path').eq('orden_id',data.id).single(); if(report){ const {data:signed}=await supabase.storage.from(report.storage_bucket).createSignedUrl(report.storage_path,3600); download_url=signed?.signedUrl||null; } }
    return jsonResponse({ok:true,...data,download_url});
  } catch(error){ return jsonResponse({ok:false,error:error instanceof Error?error.message:'Error'},400); }
});
