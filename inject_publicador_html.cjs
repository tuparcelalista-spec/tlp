const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/publicar-v2/index.html', 'utf8');

const anchor = /<label for="rolDetalle">Situación del Rol<\/label>[\s\S]*?<\/div>\s*<\/div>/;

const newHTML = `<label for="rolDetalle">Situación del Rol</label>
                <select id="rolDetalle">
                  <option value="">Selecciona</option><option>Rol propio</option><option>Rol compartido</option><option>En trámite</option>
                </select>
              </div>
              <div class="form-group">
                <label for="condominio">¿Está en condominio/loteo?</label>
                <select id="condominio">
                  <option value="">Selecciona</option><option>Sí</option><option>No</option>
                </select>
              </div>
            </div>

            <div style="background: #fdf4ff; border-left: 4px solid #d946ef; padding: 15px; border-radius: 4px; margin-bottom: 25px; margin-top: 15px;">
              <strong>Construcciones y Equipamiento (Opcional)</strong>
              <p style="font-size: 13px; margin-top: 5px; color: #a21caf;">Si la parcela tiene casa, llena estos datos para que el motor la tase correctamente.</p>
              
              <div class="form-grid dual" style="margin-top:15px;">
                <div class="form-group">
                  <label for="supCasa">Superficie Casa (m²)</label>
                  <input type="number" id="supCasa" placeholder="Ej. 120">
                </div>
                <div class="form-group">
                  <label for="matCasa">Materialidad Casa</label>
                  <select id="matCasa">
                    <option value="">Selecciona</option><option value="ligera">Madera / Ligera</option><option value="estandar">Estándar / Metalcon</option><option value="solida">Sólida / Albañilería</option><option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              <div class="form-grid dual" style="margin-top:15px;">
                <div class="form-group">
                  <label for="regCasa">Recepción Final (Regularizada)</label>
                  <select id="regCasa">
                    <option value="">Selecciona</option><option value="si">Sí, regularizada</option><option value="no">No regularizada</option><option value="tramite">En trámite</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="antCasa">Antigüedad (Años)</label>
                  <input type="number" id="antCasa" placeholder="Ej. 5">
                </div>
              </div>

              <div class="form-grid dual" style="margin-top:15px;">
                <div class="form-group">
                  <label for="piscinaCasa">Piscina</label>
                  <select id="piscinaCasa">
                    <option value="no">No</option><option value="si">Sí</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="quinchoCasa">Quincho Techado</label>
                  <select id="quinchoCasa">
                    <option value="no">No</option><option value="si">Sí</option>
                  </select>
                </div>
              </div>
              
              <div class="form-grid dual" style="margin-top:15px;">
                <div class="form-group">
                  <label for="cabanaCasa">Cabaña / Casa de Visitas</label>
                  <select id="cabanaCasa">
                    <option value="no">No</option><option value="si">Sí</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="riegoCasa">Riego Automático</label>
                  <select id="riegoCasa">
                    <option value="no">No</option><option value="si">Sí</option>
                  </select>
                </div>
              </div>
              
              <div class="form-grid dual" style="margin-top:15px; display:none;" id="piscinaSpecs">
                <div class="form-group">
                  <label for="piscinaMat">Material Piscina</label>
                  <select id="piscinaMat">
                    <option value="fibra">Fibra de Vidrio</option><option value="hormigon">Hormigón</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="piscinaM2">Tamaño Piscina (m²)</label>
                  <input type="number" id="piscinaM2" placeholder="Ej. 32">
                </div>
              </div>
              
              <script>
                document.getElementById('piscinaCasa').addEventListener('change', function(e) {
                   document.getElementById('piscinaSpecs').style.display = e.target.value === 'si' ? 'grid' : 'none';
                });
              </script>
            </div>`;

if (code.includes('Construcciones y Equipamiento')) {
    console.log('Already injected in publicador index.html');
} else {
    code = code.replace(anchor, newHTML);
    fs.writeFileSync('frontend-v2/plataforma/publicar-v2/index.html', code);
    console.log('Injected fields in publicador index.html');
}
