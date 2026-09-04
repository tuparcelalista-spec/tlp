const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', 'utf8');

const injection = `
  const btnInformePremium = modalEl.querySelector('#ei-btn-informe-premium');
  if (btnInformePremium) {
      btnInformePremium.addEventListener('click', () => {
          const id = document.getElementById('ei-id').value;
          if (!id) {
              alert('Debes guardar la propiedad en la base de datos primero.');
              return;
          }
          window.open(\`../../informe/index.html?id=\${id}\`, '_blank');
      });
  }
`;

code = code.replace(/(\s*)(if \(btnSimular\) \{)/, '$1' + injection + '$1$2');

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', code, 'utf8');
console.log('Event listener added!');
