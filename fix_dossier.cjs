const fs = require('fs');

const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcela.html';
let content = fs.readFileSync(path, 'utf8');

const oldScript = `    function submitDossierRequest() {
      // Here you could send data to Zapier, Supabase or Mailchimp
      const btn = document.querySelector('#dossier-form-step button[type="submit"]');
      btn.innerHTML = 'Generando Informe...';
      btn.style.opacity = '0.7';
      
      setTimeout(() => {
        document.getElementById('dossier-form-step').style.display = 'none';
        document.getElementById('dossier-success-step').style.display = 'block';
        
        // Reset after a while just in case they open it again
        setTimeout(() => {
            document.getElementById('dossier-name').value = '';
            document.getElementById('dossier-email').value = '';
            document.getElementById('dossier-phone').value = '';
            document.getElementById('dossier-form-step').style.display = 'block';
            document.getElementById('dossier-success-step').style.display = 'none';
            btn.innerHTML = 'Enviar Dossier Ahora';
            btn.style.opacity = '1';
        }, 5000);
      }, 1500);
    }`;

const newScript = `    function submitDossierRequest() {
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

content = content.replace(oldScript, newScript);
fs.writeFileSync(path, content, 'utf8');
console.log('Dossier updated to route to WhatsApp');
