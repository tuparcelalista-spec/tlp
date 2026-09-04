import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { TPLLandEngine } from '../_shared/tpl-land-engine.js';

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const text = (v: unknown) => String(v ?? '').trim();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

  const internalSecret = Deno.env.get('TPL_INTERNAL_FUNCTIONS_SECRET') || '';
  const suppliedSecret = req.headers.get('x-tpl-internal-secret') || '';
  if (!internalSecret || suppliedSecret !== internalSecret) {
    return json({ ok: false, error: 'NO_AUTORIZADO' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ ok: false, error: 'CONFIGURACION_INCOMPLETA' }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(50, n(body.limit) || 20));

  await admin.rpc('tpl_recuperar_recalculos_trabados_v1', { p_minutos: 20 });
  const { data: jobs, error: claimError } = await admin.rpc('tpl_claim_recalculos_tasador_v1', { p_limit: limit });
  if (claimError) return json({ ok: false, error: claimError.message }, 500);

  const results: unknown[] = [];
  for (const job of jobs || []) {
    try {
      const { data: p, error: pError } = await admin
        .from('tpl_propiedades')
        .select('*')
        .eq('id', job.propiedad_id)
        .single();
      if (pError || !p) throw new Error(pError?.message || 'PROPIEDAD_NO_EXISTE');

      const meta = p.metadata || {};
      const s = meta.tasador_entrada || {};
      const area = n(p.superficie_m2);
      let distanceMeta: any = null;
      let majorDistance = 0;
      let communeDistance = 0;
      let tourismLevel = text(s.tourism);
      let nearestCity: any = null;

      if (p.lat != null && p.lng != null) {
        const { data: geoint, error: geointError } = await admin.rpc('tpl_geoint_resolver_propiedad_v1', {
          p_propiedad_id: p.id,
          p_forzar: true,
        });
        if (!geointError && geoint?.ok) {
          distanceMeta = geoint;
          majorDistance = n(geoint.hub_efectivo?.distance_km);
          communeDistance = n(geoint.centro_comunal?.distance_km);
          tourismLevel = text(geoint.destino_turistico?.nivel || tourismLevel);
          nearestCity = geoint.hub_efectivo ? {
            name: geoint.hub_efectivo.nombre,
            category: geoint.hub_efectivo.tipo,
          } : null;
        }
      }

      if (!majorDistance) {
        majorDistance = n(s.major_city_distance ?? s.distanceKm);
        communeDistance = communeDistance || n(s.commune_distance);
      }

      if (!majorDistance && p.lat != null && p.lng != null) {
        const { data: resolved, error: distanceError } = await admin.rpc('tpl_resolver_distancia_territorial_v1', {
          p_propiedad_id: p.id,
        });
        if (!distanceError && resolved?.ok) {
          majorDistance = n(resolved.distance_km);
          distanceMeta = distanceMeta || resolved;
        }
      }

      if (!area || !majorDistance || !text(p.region) || !text(p.comuna)) {
        const missing = [
          !area ? 'superficie_m2' : '',
          !majorDistance ? 'distancia_hub_principal' : '',
          !text(p.region) ? 'region' : '',
          !text(p.comuna) ? 'comuna' : '',
        ].filter(Boolean);
        await admin.rpc('tpl_finalizar_recalculo_tasador_v1', {
          p_cola_id: job.cola_id,
          p_estado: 'requiere_revision',
          p_resultado: { missing },
          p_error: `Faltan antecedentes: ${missing.join(', ')}`,
          p_tasacion_id: null,
        });
        results.push({ cola_id: job.cola_id, propiedad_id: p.id, estado: 'requiere_revision', missing, distance_resolution: distanceMeta });
        continue;
      }

      const input = {
        area,
        asking: n(p.precio_publicado),
        region: text(p.region),
        comuna: text(p.comuna),
        location: [p.sector, p.comuna].filter(Boolean).join(', '),
        distanceKm: majorDistance,
        majorCityDistanceKm: majorDistance,
        communeDistanceKm: communeDistance || null,
        nearestCity,
        routeDistanceKm: n(s.route_distance ?? p.distancia_ruta_principal_km),
        electricityPoleDistanceM: n(s.electricity_pole_distance),
        access: text(s.access || p.acceso),
        topography: text(s.topography || p.topografia),
        soil: text(s.soil || p.suelo),
        exposure: text(s.exposure || p.exposicion),
        view: text(s.view || p.vista_principal),
        tourism: tourismLevel,
        fireRisk: text(s.fire_risk || s.fireRisk || distanceMeta?.riesgos?.incendio?.nivel),
        floodRisk: text(s.flood_risk || s.floodRisk || distanceMeta?.riesgos?.inundacion?.nivel),
        water: text(s.water || p.agua),
        electricity: text(s.electricity || p.electricidad),
        fencing: text(s.fencing || p.cierre_perimetral),
        gate: text(s.gate || p.porton),
        condominium: text(s.condominium ?? (p.condominio ? 'si' : 'no')),
        vegetation: text(s.vegetation || p.vegetacion),
        nature: Array.isArray(s.nature) ? s.nature : (Array.isArray(p.atributos_naturales) ? p.atributos_naturales : []),
        rol: text(p.rol_situacion),
      };

      const result = TPLLandEngine.calculate(input);
      if (result?.error) throw new Error(result.error);
      // TPL Tasador V2: valorFinal es la fuente única
      const total = Math.round(n(result.valorFinal || result.valorTplTasador));
      if (!total) throw new Error('MOTOR_SIN_VALOR');

      const refM2 = n(result.marketReference?.medianM2) || null;
      const row = {
        propiedad_id: p.id,
        tipo: 'precisa',
        superficie_m2: area,
        precio_publicado: n(p.precio_publicado) || null,
        valor_tpl_total: total,
        valor_tpl_m2: Math.round(total / area),
        referencia_comunal_m2: refM2,
        diferencia_publicado_vs_tpl_pct: result.priceAnalysis?.priceVsTplPct ?? null,
        clasificacion: result.priceAnalysis?.classification || null,
        es_oportunidad: Boolean(result.priceAnalysis?.opportunity),
        factores: result.adjustments || [],
        entrada: input,
        resultado: result,
        version_motor: result.engineVersion || 'tpl-land-engine-v2.3-unified',
      };

      const { data: tas, error: tasError } = await admin
        .from('tpl_tasaciones')
        .insert(row)
        .select('id,valor_tpl_total,created_at')
        .single();
      if (tasError) throw tasError;

      await admin.rpc('tpl_finalizar_recalculo_tasador_v1', {
        p_cola_id: job.cola_id,
        p_estado: 'completado',
        p_resultado: { tasacion_id: tas.id, valor_tpl_total: tas.valor_tpl_total },
        p_error: null,
        p_tasacion_id: tas.id,
      });
      results.push({ cola_id: job.cola_id, propiedad_id: p.id, estado: 'completado', tasacion_id: tas.id, valor_tpl_total: tas.valor_tpl_total });
  
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? [
              'message' in error ? String((error as any).message || '') : '',
              'details' in error ? String((error as any).details || '') : '',
              'hint' in error ? String((error as any).hint || '') : '',
              'code' in error ? `code=${String((error as any).code || '')}` : '',
            ]
              .filter(Boolean)
              .join(' | ')
          : String(error || 'ERROR_INTERNO');

    console.error('Error procesando recálculo TPL', {
      cola_id: job.cola_id,
      propiedad_id: job.propiedad_id,
      error,
    });

    await admin.rpc('tpl_finalizar_recalculo_tasador_v1', {
      p_cola_id: job.cola_id,
      p_estado: 'error',
      p_resultado: {},
      p_error: message || 'ERROR_INTERNO',
      p_tasacion_id: null,
    });

    results.push({
      cola_id: job.cola_id,
      propiedad_id: job.propiedad_id,
      estado: 'error',
      error: message || 'ERROR_INTERNO',
    });
  }
}

return json({
  ok: true,
  solicitados: limit,
  procesados: results.length,
  completados: results.filter((x: any) => x.estado === 'completado').length,
  requieren_revision: results.filter((x: any) => x.estado === 'requiere_revision').length,
  errores: results.filter((x: any) => x.estado === 'error').length,
  results,
});
});