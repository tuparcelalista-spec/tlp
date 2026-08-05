import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { consumeRateLimit, publicError, UUID_RE } from '../_shared/security.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  try {
    const url = new URL(req.url); const orden = url.searchParams.get('orden');
    if (!orden || !UUID_RE.test(orden)) return jsonResponse(req, { ok:false,error:'ORDEN_INVALIDA' },400);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'estado-informe', 30, 300, orden);
    const { data, error } = await supabase.from('tpl_ordenes_informe').select('id,codigo,estado,monto_clp,disponible_at').eq('id',orden).single();
    if(error||!data) return jsonResponse(req, {ok:false,error:'Orden no encontrada.'},404);
    let download_url = null;
    if(data.estado==='disponible') { const {data:report}=await supabase.from('tpl_informes_tasacion').select('storage_bucket,storage_path').eq('orden_id',data.id).single(); if(report){ const {data:signed}=await supabase.storage.from(report.storage_bucket).createSignedUrl(report.storage_path,3600); download_url=signed?.signedUrl||null; } }
    return jsonResponse(req, {ok:true,...data,download_url});
  } catch(error){ return jsonResponse(req, {ok:false,error:publicError(error)},400); }
});
