import sys

file_path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcela.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '          <div class="v3-price-block">\n            <div class="v3-price" id="v3-price"></div>\n            <div class="v3-price-note">Valor publicado</div>\n          </div>'
end_marker = '      <div style="max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">'

if start_marker in content and end_marker in content:
    idx_start = content.find(start_marker)
    idx_end = content.find(end_marker)
    
    if idx_start < idx_end:
        new_mid = """
          
          <!-- EVALUACIÓN TASADOR -->
          <div id="v3-price-evaluation" style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
            <div style="font-size: 0.85rem; color: #64748b; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: space-between;">
              <span>Inteligencia de Mercado TPL</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--c-primary);"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.9rem; color: #475569;">Valor Terreno Comunal:</span>
              <strong id="v3-eval-zona" style="color: #0f172a; font-size: 0.95rem;">--</strong>
            </div>

            <!-- Desglose de Atributos -->
            <div id="v3-eval-breakdown" style="padding: 8px 0; margin: 8px 0; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; font-size: 0.85rem; color: #64748b; display: flex; flex-direction: column; gap: 4px;">
              <!-- Se inyectan con JS -->
            </div>
            
            <div id="v3-eval-badge" style="margin-top: 12px; font-size: 0.85rem; font-weight: 700; padding: 8px 12px; border-radius: 6px; text-align: center; display: none;"></div>
          </div>

          <button id="btn-agendar-visita" class="v3-btn v3-btn-primary">Agendar Visita</button>
          <button id="btn-cotizar-casa" class="v3-btn v3-btn-secondary">Cotizar Proyecto de Casa</button>
          <button id="btn-hacer-oferta" class="v3-btn v3-btn-secondary" style="margin-bottom:0;">Hacer Oferta</button>

          <div class="v3-advisor-block" style="margin-top:24px; padding-top:24px; border-top:1px solid var(--v3-border); display:flex; align-items:center; gap:12px;">
            <div style="width:48px; height:48px; border-radius:24px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:700; color:#64748b;">
              TPL
            </div>
            <div>
              <div style="font-weight:600; color:#0f172a;">Asesoría Humana</div>
              <div style="font-size:0.85rem; color:#64748b;">Verificamos cada aspecto de tu compra.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Buscador Inteligente AI -->
    <section class="v3-ai-finder" style="margin-top: 60px; padding: 40px; background: #eef2ff; border-radius: 20px; border: 1px solid #c7d2fe; text-align: center;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 2rem; color: #1e3a8a; margin-bottom: 12px;">¿No es exactamente lo que buscas?</h2>
      <p style="color: #4f46e5; margin-bottom: 24px; font-size: 1.1rem; max-width: 600px; margin-left: auto; margin-right: auto;">Nuestro Asesor IA buscará entre todo el stock oculto y la oferta del mercado (portales inmobiliarios) para encontrar tu parcela ideal.</p>
      
"""
        new_content = content[:idx_start + len(start_marker)] + new_mid + content[idx_end:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Patch successful')
    else:
        print('Error: start marker after end marker')
else:
    print('Error: markers not found')
