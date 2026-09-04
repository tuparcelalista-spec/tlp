/**
 * modules/tasaciones/premium-report.js — Premium Report logic
 */
import state from '../../core/state.js';
import { escapeHtml as esc } from '../../core/utils.js';
import { showModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { openIntegralEditor } from '../parcelas/editor-integral.js';
import { getClient } from '../../core/supabase.js';
/**
 * Semejanza entre la parcela y un aviso del catastro, de 0 a 1.
 *
 * Antes esto era `(a, b) => 0.85`: devolvía la misma constante para todos, así
 * que el `sort` posterior no reordenaba nada y los "5 comparables más
 * parecidos" eran en realidad los 5 avisos más recientes de toda la tabla,
 * sin relación con la propiedad.
 */
function calculateSimilarity(objetivo, candidato) {
  let puntaje = 0;
  let peso = 0;

  // Misma comuna: es el factor que más pesa en suelo rural.
  peso += 3;
  const c1 = String(objetivo.comuna || '').trim().toLowerCase();
  const c2 = String(candidato.comuna || '').trim().toLowerCase();
  if (c1 && c2 && c1 === c2) puntaje += 3;

  // Superficie: se compara por razón, no por diferencia absoluta, porque
  // 5.000 y 10.000 m² se parecen mucho más que 500 y 5.500 m².
  const s1 = Number(objetivo.superficie) || 0;
  const s2 = Number(candidato.superficie) || 0;
  if (s1 > 0 && s2 > 0) {
    peso += 3;
    const razon = Math.min(s1, s2) / Math.max(s1, s2);
    puntaje += 3 * razon;
  }

  // Atributos que mueven precio.
  for (const attr of ['tiene_agua', 'tiene_luz', 'es_plana', 'tiene_rio', 'tiene_asfalto', 'tiene_bosque']) {
    peso += 1;
    if (Boolean(objetivo[attr]) === Boolean(candidato[attr])) puntaje += 1;
  }

  return peso > 0 ? puntaje / peso : 0;
}

function getOwner(record) {
  const duenos = state.duenos || state.collections?.duenos || [];
  return duenos.find((x) => x.id === record.propietario_actor_id || x.actor_id === record.propietario_actor_id) || {};
}

function toolsDialogHtml(record) {
  return `
    <div class="premium-report-head" style="text-align:center; padding: 1.5rem 0 1rem;">
      <div style="font-size: 3rem; margin-bottom: 0.5rem;">💎</div>
      <small style="color: var(--c-primary); font-weight: bold; letter-spacing: 1.5px;">HERRAMIENTAS DE PROPIEDAD</small>
      <h2 style="font-size: 1.5rem; margin-top: 0.5rem; color: var(--c-text);">${esc(record.titulo || 'Parcela')}</h2>
      <p style="color: var(--c-text-secondary);">${esc([record.codigo, record.comuna].filter(Boolean).join(' · '))}</p>
    </div>
    
    <div class="tools-grid" style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
      
      <!-- INFORME PREMIUM -->
      <div style="border: 1px solid var(--c-border); border-radius: var(--radius-md); padding: 1rem;">
        <h3 style="font-size: 1rem; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
          📑 Informe TPL Premium
        </h3>
        <p style="font-size: 0.85rem; color: var(--c-text-secondary); margin: 0 0 1rem;">Formato web interactivo para enviar a clientes por WhatsApp.</p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary btn--sm" data-tool-action="report-open" style="flex:1;">Abrir Web</button>
          <button type="button" class="btn btn-secondary btn--sm" data-tool-action="report-copy" style="flex:1;">📋 Link</button>
          <button type="button" class="btn btn-secondary btn--sm" data-tool-action="report-whatsapp" style="flex:1; color: #16a34a; border-color: #16a34a;">💬 WhatsApp</button>
        </div>
      </div>

      <!-- TASADOR TPL -->
      <div style="border: 1px solid var(--c-border); border-radius: var(--radius-md); padding: 1rem; background: rgba(7, 58, 90, 0.03);">
        <h3 style="font-size: 1rem; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--c-primary);">
          ⚖️ Tasador TPL
        </h3>
        <p style="font-size: 0.85rem; color: var(--c-text-secondary); margin: 0 0 1rem;">Calcula el valor técnico y los atributos que justifican el precio recomendado.</p>
        <button type="button" class="btn btn-primary btn--full" data-tool-action="tasador">Ir al Tasador Técnico</button>
      </div>

      <!-- COMPARABLES -->
      <div style="border: 1px solid var(--c-border); border-radius: var(--radius-md); padding: 1rem;">
        <h3 style="font-size: 1rem; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
          📊 Comparables de Mercado
        </h3>
        <p style="font-size: 0.85rem; color: var(--c-text-secondary); margin: 0 0 1rem;">Busca parcelas similares en el mercado para ajustar el precio de publicación.</p>
        <button type="button" class="btn btn-secondary btn--full" data-tool-action="comparables">Ir al Buscador de Comparables</button>
      </div>
      
      <!-- INTELIGENCIA ARTIFICIAL -->
      <div style="border: 1px solid var(--c-border); border-radius: var(--radius-md); padding: 1rem; background: linear-gradient(145deg, #f3f4f6 0%, #e5e7eb 100%);">
        <h3 style="font-size: 1rem; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem; color: #4b5563;">
          🤖 Análisis de Mercado IA
        </h3>
        <p style="font-size: 0.85rem; color: var(--c-text-secondary); margin: 0 0 1rem;">Genera un resumen comercial usando Inteligencia Artificial cruzando la data con el Catastro.</p>
        <div id="ai-status-${record.id}" style="font-size: 0.8rem; margin-bottom: 0.5rem; color: #16a34a; font-weight: bold;">
            ${record.ai_analisis ? '✓ Análisis ya generado (puedes regenerarlo)' : ''}
        </div>
        <button type="button" class="btn btn-primary btn--full" data-tool-action="ai-generate" style="background: #2563eb; border-color: #2563eb;">✨ Generar con Google Gemini</button>
      </div>

    </div>
  `;
}

export async function openPremiumReport(parcelaId, options = {}) {
  // `window.state` no existe en este proyecto (ver actores/detail.js): esa rama
  // era un fallback que nunca podia devolver nada.
  const parcelas = state.parcelas || state.snapshot?.parcelas || [];
  const record = options.record || parcelas.find(p => p.id === parcelaId) || (window.TPLDataService ? await window.TPLDataService.getRecord('parcelas', parcelaId) : null);
  
  if (!record) {
    toast('No se encontró la parcela seleccionada.', 'error');
    return;
  }
  
  const baseUrl = window.location.origin + window.location.pathname.replace('/crm-tpl-v1/', '/informe-valores/');
  const reportUrl = `${baseUrl}?id=${record.id}`;

  showModal({
    title: 'Herramientas TPL',
    body: toolsDialogHtml(record),
    size: 'md'
  });
  
  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) {
      backdrop.addEventListener('click', async (event) => {
        const action = event.target.closest('[data-tool-action]');
        if (!action) return;
        
        const type = action.dataset.toolAction;
        
        if (type === 'report-open') {
            window.open(reportUrl, '_blank', 'noopener,noreferrer');
        } else if (type === 'report-copy') {
            navigator.clipboard.writeText(reportUrl).then(() => {
                toast('Link del informe copiado al portapapeles', 'success');
            });
        } else if (type === 'report-whatsapp') {
            const msg = `¡Hola! Aquí tienes el Informe Premium de tu propiedad: ${reportUrl}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        } else if (type === 'tasador') {
            document.querySelector('.modal-backdrop')?.remove();
            openIntegralEditor(record.id);
        } else if (type === 'comparables') {
            document.querySelector('.modal-backdrop')?.remove();
            window.location.hash = '#comparables';
            // Opcional: pre-rellenar el buscador
            setTimeout(() => {
                const searchInput = document.querySelector('#nlp-search-input');
                if (searchInput) {
                    searchInput.value = record.comuna || '';
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, 300);
        } else if (type === 'ai-generate') {
            const btn = action;
            const originalText = btn.innerHTML;
            btn.innerHTML = '⏳ Analizando mercado...';
            btn.disabled = true;
            
            try {
                // 1. Fetch Market Data (Catastro)
                const client = getClient();
                const { data: catastroData, error: catError } = await client.from('tpl_catastro_mercado').select('*').order('created_at', { ascending: false }).limit(300);
                if (catError) throw catError;
                
                // 2. Map & calculate similarity
                let mappedMarket = catastroData.map(d => {
                    const attr = (d.atributos || '').toLowerCase();
                    return {
                        id: d.id,
                        name: d.titulo || 'Propiedad de mercado',
                        comuna: d.comuna || '',
                        superficie: d.superficie_m2 || 0,
                        precio: d.precio_clp || (d.precio_uf ? d.precio_uf * 38000 : 0),
                        tiene_agua: attr.includes('agua') || attr.includes('vertiente'),
                        tiene_luz: attr.includes('luz') || attr.includes('empalme'),
                        tiene_bosque: attr.includes('bosque') || attr.includes('nativo'),
                        es_plana: attr.includes('plano') || attr.includes('plana'),
                        tiene_rio: attr.includes('río') || attr.includes('rio'),
                        tiene_lago: attr.includes('lago'),
                        tiene_asfalto: attr.includes('asfalto') || attr.includes('pavimento')
                    };
                });
                
                // Formatear parcela actual para similarity engine
                const targetForSim = {
                    comuna: record.comuna,
                    superficie: record.superficie_m2 || record.superficie_terreno,
                    precio: record.precio_clp,
                    tiene_agua: !!record.atributos_json?.agua,
                    tiene_luz: !!record.atributos_json?.luz,
                    tiene_bosque: !!record.atributos_json?.bosque,
                    es_plana: !!record.atributos_json?.topografia?.includes('plana'),
                    tiene_rio: !!record.atributos_json?.rio,
                    tiene_lago: !!record.atributos_json?.lago,
                    tiene_asfalto: !!record.atributos_json?.acceso?.includes('asfalto')
                };
                
                mappedMarket.forEach(item => {
                    item.similarity = calculateSimilarity(targetForSim, item);
                });
                mappedMarket.sort((a, b) => b.similarity - a.similarity);
                
                // Tomar los top 5
                const top5 = mappedMarket.slice(0, 5);
                
                // 3. Análisis real con Gemini. Antes esto llamaba a un stub que
                //    devolvía siempre "Análisis IA simulado (Falta ai.js)",
                //    guardaba esa cadena en la base y avisaba "generado con
                //    éxito". Quedó una propiedad con ese texto guardado.
                const { data: sesion } = await client.auth.getSession();
                const accessToken = sesion?.session?.access_token;
                if (!accessToken) throw new Error('Tu sesión expiró. Vuelve a entrar al CRM.');

                const cfg = window.TPLDataService?.config || {};
                const res = await fetch(`${cfg.url}/functions/v1/gemini-analisis-mercado`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': cfg.publishableKey,
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        propiedad: {
                            comuna: record.comuna,
                            superficie: targetForSim.superficie,
                            precio: record.precio_publicado || record.precio_clp,
                            agua: record.agua,
                            luz: record.electricidad,
                            topografia: record.topografia,
                            rol: record.rol_situacion,
                        },
                        comparables: top5,
                    }),
                });
                const data = await res.json();
                if (!data.ok) {
                    const motivos = {
                        NO_AUTORIZADO: 'Tu usuario no tiene permisos de staff para generar el análisis.',
                        SESION_REQUERIDA: 'Tu sesión expiró. Vuelve a entrar al CRM.',
                        DATOS_INSUFICIENTES: 'Falta comuna o superficie en la ficha de la parcela.',
                        DEMASIADAS_SOLICITUDES: 'Demasiadas solicitudes seguidas. Espera unos minutos.',
                        IA_NO_DISPONIBLE: 'El servicio de IA no responde ahora. Inténtalo en unos minutos.',
                    };
                    throw new Error(motivos[data.error] || 'No se pudo generar el análisis.');
                }

                const aiResult = data.analisis;

                const { error: saveError } = await client
                    .from('tpl_propiedades')
                    .update({ ai_analisis: aiResult })
                    .eq('id', record.id);
                if (saveError) {
                    const msg = saveError.message.toLowerCase();
                    if (msg.includes("could not find the 'ai_analisis' column")) {
                        throw new Error("Falta la columna 'ai_analisis' en la tabla tpl_propiedades.");
                    }
                    // Antes un fallo de permisos se tragaba en silencio y el
                    // usuario veía "generado con éxito" sin que se guardara nada.
                    throw new Error('El análisis se generó pero no se pudo guardar: ' + saveError.message);
                }

                record.ai_analisis = aiResult;
                const statusDiv = document.getElementById(`ai-status-${record.id}`);
                if (statusDiv) {
                    statusDiv.innerHTML = `✓ Análisis generado con ${data.comparables_usados} comparables y guardado`;
                }
                toast('Análisis de mercado generado', 'success');
            } catch (err) {
                console.error('No se pudo generar el análisis de mercado', err);
                toast(err.message || 'No se pudo generar el análisis.', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
      });
  }
}
