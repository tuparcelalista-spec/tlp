const fs = require('fs');

const htmlPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcela.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const oldForm = `<button type="submit" style="background: #005aa0; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 1.05rem; font-weight: 700; cursor: pointer; margin-top: 8px;">Enviar Dossier Ahora</button>`;

const newForm = `<div style="display: flex; gap: 12px; margin-top: 8px;">
            <button type="button" onclick="submitDossierWhatsApp()" style="flex: 1; background: #25D366; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <button type="submit" id="dossier-email-btn" style="flex: 1; background: #005aa0; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              Email Remoto
            </button>
          </div>`;

htmlContent = htmlContent.replace(oldForm, newForm);

const oldScript = `    function submitDossierRequest() {
      const btn = document.querySelector('#dossier-form-step button[type="submit"]');
      const name = document.getElementById('dossier-name').value;
      const email = document.getElementById('dossier-email').value;
      
      btn.innerHTML = 'Generando Solicitud...';
      btn.style.opacity = '0.7';
      
      setTimeout(() => {
        document.getElementById('dossier-form-step').style.display = 'none';
        document.getElementById('dossier-success-step').style.display = 'block';
        
        // Enviar la solicitud vía WhatsApp para que un asesor envíe el PDF
        const parcelaId = new URLSearchParams(window.location.search).get('id') || document.title;
        const msg = \`Hola, soy \${name}. Solicito el Dossier Premium de Inversión para la parcela \${parcelaId}. Por favor enviarlo a mi correo: \${email}\`;
        const encoded = encodeURIComponent(msg);
        window.open(\`https://wa.me/56988508361?text=\${encoded}\`, '_blank');
        
        setTimeout(() => {
            document.getElementById('dossier-name').value = '';
            document.getElementById('dossier-email').value = '';
            document.getElementById('dossier-phone').value = '';
            document.getElementById('dossier-form-step').style.display = 'block';
            document.getElementById('dossier-success-step').style.display = 'none';
            btn.innerHTML = 'Enviar Dossier Ahora';
            btn.style.opacity = '1';
        }, 3000);
      }, 1000);
    }`;

const newScript = `    function submitDossierWhatsApp() {
      const name = document.getElementById('dossier-name').value || 'Cliente';
      const email = document.getElementById('dossier-email').value || 'Sin correo';
      
      document.getElementById('dossier-form-step').style.display = 'none';
      document.getElementById('dossier-success-step').style.display = 'block';
      
      const parcelaId = new URLSearchParams(window.location.search).get('id') || document.title;
      const msg = \`Hola, soy \${name}. Solicito el Dossier Premium de Inversión para la parcela \${parcelaId}. Por favor enviarlo a mi correo: \${email}\`;
      const encoded = encodeURIComponent(msg);
      window.open(\`https://wa.me/56988508361?text=\${encoded}\`, '_blank');
      
      setTimeout(resetDossierForm, 4000);
    }

    async function submitDossierRequest() {
      const btn = document.getElementById('dossier-email-btn');
      const name = document.getElementById('dossier-name').value;
      const email = document.getElementById('dossier-email').value;
      const phone = document.getElementById('dossier-phone').value;
      const parcelaId = new URLSearchParams(window.location.search).get('id') || document.title;
      
      const originalHTML = btn.innerHTML;
      btn.innerHTML = 'Enviando...';
      btn.style.opacity = '0.7';
      btn.disabled = true;
      
      try {
        await fetch('https://hwyscirbycojwndyzozn.supabase.co/functions/v1/enviar-dossier-parcela', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, parcelId })
        });
        
        document.getElementById('dossier-form-step').style.display = 'none';
        document.getElementById('dossier-success-step').style.display = 'block';
        
        setTimeout(resetDossierForm, 4000);
      } catch (e) {
        alert('Hubo un error al enviar el correo. Por favor, intenta usar la opción de WhatsApp.');
        console.error(e);
      } finally {
        btn.innerHTML = originalHTML;
        btn.style.opacity = '1';
        btn.disabled = false;
      }
    }

    function resetDossierForm() {
        document.getElementById('dossier-name').value = '';
        document.getElementById('dossier-email').value = '';
        document.getElementById('dossier-phone').value = '';
        document.getElementById('dossier-form-step').style.display = 'block';
        document.getElementById('dossier-success-step').style.display = 'none';
    }`;

htmlContent = htmlContent.replace(oldScript, newScript);
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Dossier dual options added');
