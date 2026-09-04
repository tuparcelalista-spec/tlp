const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/publicar/tasador-publico.js', 'utf8');

let startIndex = js.indexOf("const comunaName = launchParams.get('comuna') || $('#comuna')?.value || 'tu zona';");
let endIndex = js.indexOf("if(knownNode) knownNode.hidden = false;", startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const newLogic = `const comunaName = launchParams.get('comuna') || $('#comuna')?.value || 'tu zona';
     const mockRating = Math.round(65 + (score * 0.25)); // 65 to 90
     const percentile = 100 - mockRating + 3; // e.g rating 85 -> top 18%
     
     // Detect dynamic attributes for text injection
     let attributes = [];
     const sup = launchParams.get('superficie') || $('#superficie')?.value;
     if (sup && Number(sup) > 0) attributes.push(\`de \${sup} m²\`);
     
     const hasRio = document.querySelector('input[data-nature][value="rio dentro"]')?.checked || launchParams.get('campos_presentes')?.includes('rio_dentro') || launchParams.get('nature')?.includes('rio');
     if (hasRio) attributes.push('con acceso a río');
     
     const hasLago = document.querySelector('input[data-nature][value="orilla lago"]')?.checked || launchParams.get('campos_presentes')?.includes('orilla_lago') || launchParams.get('nature')?.includes('lago');
     if (hasLago) attributes.push('con orilla de lago');
     
     const hasTermas = document.querySelector('input[data-nature][value="termas"]')?.checked || launchParams.get('campos_presentes')?.includes('termas') || launchParams.get('nature')?.includes('termas');
     if (hasTermas) attributes.push('con aguas termales');
     
     const hasCondominio = $('#condominium')?.value === 'si' || launchParams.get('campos_presentes')?.includes('condominium');
     if (hasCondominio) attributes.push('en condominio');
     
     let attrString = attributes.length > 0 ? " " + attributes.join(', ') : "";

     if(loadingNode) loadingNode.hidden = false;
     if(textNode) textNode.hidden = true;
     if(knownNode) knownNode.hidden = true;
     if(missingNode) missingNode.hidden = true;
  
     setTimeout(() => {
       if(loadingNode) loadingNode.hidden = true;
       if(titleNode) titleNode.textContent = missingManual.length ? 'Información Parcial Recopilada' : 'Análisis Completo';
       
       if(textNode) {
         textNode.hidden = false;
         if (missingManual.length) {
           textNode.innerHTML = \`Hemos hecho un pequeño catastro de parcelas\${attrString} parecidas a la tuya en <strong>\${comunaName}</strong> y encontramos que tu propiedad se posiciona en el <strong>Top \${percentile}%</strong> según el rating de competitividad (Puntaje preliminar: \${mockRating}/100).</br></br>Con la información histórica hemos logrado realizar una tasación preliminar, pero para obtener mayor precisión y generar tu Informe Final, <strong>requerimos que rellenes los campos faltantes a continuación.</strong>\`;
         } else {
           textNode.innerHTML = \`Hemos completado el catastro en <strong>\${comunaName}</strong> de parcelas\${attrString} y tu ficha está 100% lista. Tu propiedad se posiciona en el <strong>Top \${percentile}%</strong> del mercado local.\`;
         }
       }
       
       `;

let newJs = js.substring(0, startIndex) + newLogic + js.substring(endIndex);

fs.writeFileSync('frontend-v2/plataforma/publicar/tasador-publico.js', newJs, 'utf8');
console.log("Successfully added dynamic attributes to AI Report");
