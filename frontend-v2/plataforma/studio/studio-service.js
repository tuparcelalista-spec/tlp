(() => {
  'use strict';

  const CAMPAIGNS_KEY = 'tpl_studio_campaigns_v2_fallback';
  const OUTPUTS_KEY = 'tpl_studio_outputs_v2_fallback';

  const client = async () => {
    if (window.TPLDataService?.getClient) return window.TPLDataService.getClient();
    return window.tplCoreSupabase || window.tplSupabase || window.tplCrmSupabase || null;
  };
  const readFallback = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const writeFallback = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  async function getContext(entityType, entityId) {
    if (!entityType || !entityId) return null;
    const supabase = await client();
    if (!supabase?.rpc) return null;
    const { data, error } = await supabase.rpc('tpl_studio_contexto_v2', {
      p_tipo: entityType,
      p_id: entityId
    });
    if (error) throw error;
    return data || null;
  }

  async function listCampaigns() {
    const supabase = await client();
    if (supabase?.from) {
      const { data, error } = await supabase
        .from('studio_campaigns')
        .select('*, studio_outputs(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) return data || [];
      console.warn('TPL Studio: fallback local al listar campañas.', error);
    }
    return readFallback(CAMPAIGNS_KEY);
  }

  async function saveCampaign(campaign) {
    const supabase = await client();
    if (supabase?.rpc) {
      const { data, error } = await supabase.rpc('tpl_studio_crear_campana_v2', {
        p_nombre: campaign.name,
        p_tipo_objetivo: campaign.subjectType || 'propiedad',
        p_actor_id: campaign.actorId || null,
        p_propiedad_id: campaign.subjectType === 'propiedad' ? campaign.subjectId || null : campaign.propertyId || null,
        p_publicacion_id: campaign.subjectType === 'publicacion' ? campaign.subjectId || null : campaign.publicationId || null,
        p_proyecto_id: campaign.subjectType === 'proyecto' ? campaign.subjectId || null : campaign.projectId || null,
        p_objetivo_comercial: campaign.goal || null,
        p_canales: campaign.channels || [],
        p_configuracion: {
          tono: campaign.tone || null,
          audiencia: campaign.audience || null,
          datos_fuente: campaign.sourceData || {},
          estrategia: campaign.strategy || {},
          storyboard: campaign.storyboard || [],
          metadata: campaign.metadata || {}
        }
      });
      if (!error && data) {
        const outputs = (campaign.outputs || []).map((output) => ({
          campaign_id: data.id,
          tipo: output.type,
          canal: output.channel || null,
          estado: 'borrador',
          titulo: output.title || null,
          contenido: typeof output.content === 'string' ? output.content : JSON.stringify(output.content || {}),
          configuracion: output.configuration || {},
          metadata: output.metadata || {}
        }));
        if (outputs.length) {
          const result = await supabase.from('studio_outputs').insert(outputs).select('*');
          if (result.error) console.warn('TPL Studio: campaña creada, pero falló la cola.', result.error);
          data.studio_outputs = result.data || outputs;
        }
        return data;
      }
      console.warn('TPL Studio: fallback local al guardar campaña.', error);
    }

    const local = readFallback(CAMPAIGNS_KEY);
    const saved = { ...campaign, id: campaign.id || crypto.randomUUID(), created_at: new Date().toISOString() };
    local.unshift(saved);
    writeFallback(CAMPAIGNS_KEY, local);
    const queue = readFallback(OUTPUTS_KEY);
    queue.unshift(...(campaign.outputs || []).map((output) => ({ ...output, campaign_id: saved.id, estado: 'borrador' })));
    writeFallback(OUTPUTS_KEY, queue);
    return saved;
  }

  async function saveOutput(output) {
    const supabase = await client();
    if (supabase?.from) {
      const payload = {
        campaign_id: output.campaignId,
        tipo: output.type,
        canal: output.channel || null,
        estado: output.status || 'borrador',
        titulo: output.title || null,
        contenido: typeof output.content === 'string' ? output.content : JSON.stringify(output.content || {}),
        url_publica: output.publicUrl || null,
        archivo_url: output.fileUrl || null,
        miniatura_url: output.thumbnailUrl || null,
        configuracion: output.configuration || {},
        metadata: output.metadata || {}
      };
      const { data, error } = await supabase.from('studio_outputs').insert(payload).select('*').single();
      if (error) throw error;
      return data;
    }
    const rows = readFallback(OUTPUTS_KEY);
    const saved = { ...output, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    rows.unshift(saved);
    writeFallback(OUTPUTS_KEY, rows);
    return saved;
  }

  async function listOutputs() {
    const supabase = await client();
    if (supabase?.from) {
      const { data, error } = await supabase
        .from('studio_outputs')
        .select('*, studio_campaigns(nombre)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error) return data || [];
    }
    return readFallback(OUTPUTS_KEY);
  }

  async function getAnalytics() {
    const supabase = await client();
    if (supabase?.from) {
      const [campaigns, outputs, events] = await Promise.all([
        supabase.from('studio_campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('studio_outputs').select('id,estado', { count: 'exact' }),
        supabase.from('studio_events').select('evento')
      ]);
      if (!campaigns.error && !outputs.error && !events.error) {
        const eventRows = events.data || [];
        return {
          campaigns: campaigns.count || 0,
          outputs: outputs.count || 0,
          published: (outputs.data || []).filter((x) => x.estado === 'publicado').length,
          visits: eventRows.filter((x) => /visita|page_view/i.test(x.evento)).length,
          leads: eventRows.filter((x) => /lead|consulta|whatsapp|llamada/i.test(x.evento)).length,
          conversions: eventRows.filter((x) => /reserva|conversion|venta/i.test(x.evento)).length
        };
      }
    }
    return { campaigns: readFallback(CAMPAIGNS_KEY).length, outputs: readFallback(OUTPUTS_KEY).length, published: 0, leads: 0, visits: 0, conversions: 0 };
  }

  window.TPLStudioService = { getContext, listCampaigns, saveCampaign, saveOutput, listOutputs, getAnalytics };
})();
