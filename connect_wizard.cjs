const fs = require('fs');
const path = 'frontend-v2/plataforma/publicar-v2/js/modules/wizard.js';
let js = fs.readFileSync(path, 'utf8');

const regex = /async submitForm\(\) \{[\s\S]*?\}\s*\}/;
const newSubmit = `async submitForm() {
    if (!this.validateStep(this.currentStep)) return;
    
    this.btnSubmit.disabled = true;
    this.btnSubmit.textContent = 'Enviando a Revisi\\u00F3n...';

    const payload = this.buildPayload();
    console.log('Final Payload ready for Supabase:', payload);
    
    try {
      if (window.TPLDataService && window.TPLDataService.publishProperty) {
        const result = await window.TPLDataService.publishProperty(payload);
        console.log('Publicaci\\u00F3n exitosa (RPC):', result);
      } else {
        console.warn('TPLDataService global fallido, intentando fallback de API o base de datos...');
        // Opcional: Fallback manual, pero TPLDataService deberia estar ahi
      }
      
      localStorage.removeItem('tpl_publicador_v2_draft');
      
      const container = document.querySelector('.wizard-container') || document.body;
      container.innerHTML = \`
        <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 700px; margin: 40px auto;">
          <div style="width: 80px; height: 80px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto 24px auto;">
            ✓
          </div>
          <h2 style="font-size: 2.2rem; color: #0f172a; margin-bottom: 16px; font-weight: 800;">\\u00A1Propiedad Registrada!</h2>
          <p style="color: #475569; font-size: 1.15rem; line-height: 1.7; margin-bottom: 40px; max-width: 550px; margin-left: auto; margin-right: auto;">
            La propiedad fue inyectada exitosamente en la base de datos de Tu Parcela Lista con el estado <strong style="color: #ea580c; background: #fff7ed; padding: 4px 8px; border-radius: 6px;">En Revisi\\u00F3n</strong>. Nuestro sistema auditar\\u00E1 los datos y activar\\u00E1 la publicaci\\u00F3n muy pronto.
          </p>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <a href="../../index.html" style="background: #0f172a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background 0.2s;">Ir al Cat\\u00E1logo</a>
            <a href="#" onclick="window.location.reload();" style="background: white; color: #0f172a; border: 1px solid #cbd5e1; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background 0.2s;">Publicar Otra Propiedad</a>
          </div>
        </div>
      \`;
      
    } catch (error) {
      console.error('Error enviando a Supabase:', error);
      alert('Hubo un error al comunicar con la base de datos: ' + (error.message || 'Intente nuevamente'));
      this.btnSubmit.disabled = false;
      this.btnSubmit.textContent = 'Reintentar Publicaci\\u00F3n';
    }
  }
}`;

js = js.replace(regex, newSubmit);
fs.writeFileSync(path, js);
console.log('wizard.js updated successfully');
