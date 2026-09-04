const fs = require('fs');
const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/mi-parcela.html';
let content = fs.readFileSync(path, 'utf8');

const targetStr = '      <!-- Estrategia Recomendada -->';
const disclaimerBlock = `
    <!-- Disclaimer y Atributos -->
    <div style="background: white; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; margin-bottom: 30px; text-align: left; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
      <h3 style="color: #0f172a; margin-top: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        Valor Referencial
      </h3>
      <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">
        Este valor ha sido calculado de forma automatizada por nuestro motor estadístico y <strong>tiene un margen de error</strong>. Es una cifra <strong>netamente referencial</strong> para apoyarte en la toma de decisiones y no reemplaza el ojo clínico de una tasación comercial presencial.
      </p>
      
      <h4 style="color: #334155; font-size: 1rem; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">¿Qué atributos evalúa nuestro algoritmo para llegar a este valor?</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 10px; font-weight: 500;">📍 Ubicación y Comuna</div>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 10px; font-weight: 500;">📐 Superficie Total (m²)</div>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 10px; font-weight: 500;">💧 Factibilidad de Agua</div>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 10px; font-weight: 500;">⚡ Acceso a Electricidad</div>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 10px; font-weight: 500;">🛣️ Calidad de Caminos</div>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 10px; font-weight: 500;">🏔️ Topografía y Vistas</div>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 10px; font-weight: 500;">📜 Situación Legal (Rol)</div>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 10px; font-weight: 500;">📊 Oferta Local Activa</div>
      </div>
    </div>
    
      <!-- Estrategia Recomendada -->`;

content = content.replace(targetStr, disclaimerBlock);
fs.writeFileSync(path, content, 'utf8');
console.log('Disclaimer injected.');
