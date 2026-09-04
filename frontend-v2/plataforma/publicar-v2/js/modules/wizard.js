export class WizardManager {
  constructor(territoryManager) {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.territoryManager = territoryManager;

    this.btnNext = document.getElementById('btnNext');
    this.btnPrev = document.getElementById('btnPrev');
    this.btnSubmit = document.getElementById('btnSubmit');

    this.initListeners();
    this.initAutoSave();
  }

  initListeners() {
    this.btnNext.addEventListener('click', () => this.nextStep());
    this.btnPrev.addEventListener('click', () => this.prevStep());
    
    document.getElementById('publicadorV2Form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitForm();
    });
  }

  nextStep() {
    if (this.validateStep(this.currentStep)) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.updateUI();
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateUI();
    }
  }

  updateUI() {
    document.querySelectorAll('.wizard-pane').forEach((pane, index) => {
      pane.classList.toggle('active', index + 1 === this.currentStep);
    });

    document.querySelectorAll('.step-item').forEach((item) => {
      const step = parseInt(item.dataset.step);
      item.classList.toggle('active', step === this.currentStep);
    });

    if (this.currentStep === 1) {
      setTimeout(() => this.territoryManager.initMap(), 100);
    }

    this.btnPrev.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
    
    if (this.currentStep === this.totalSteps) {
      this.btnNext.style.display = 'none';
      this.btnSubmit.style.display = 'inline-block';
    } else {
      this.btnNext.style.display = 'inline-block';
      this.btnSubmit.style.display = 'none';
    }
  }

  /**
   * Nombre visible de cada campo, para poder decir QUE falta. `lat` y `lng` son
   * inputs ocultos que se llenan al marcar el mapa: hacerles focus() no muestra
   * nada, asi que quien no marcaba el mapa veia el boton "Siguiente" sin
   * reaccion y sin ningun mensaje. El publicador parecia roto.
   */
  static ETIQUETAS = {
    lat: 'Marca la ubicación de tu propiedad en el mapa',
    lng: 'Marca la ubicación de tu propiedad en el mapa',
  };

  nombreDeCampo(input) {
    if (WizardManager.ETIQUETAS[input.id]) return WizardManager.ETIQUETAS[input.id];
    const etiqueta = input.closest('.form-group')?.querySelector('label');
    const texto = etiqueta?.textContent.trim();
    return texto ? `Completa "${texto}"` : 'Falta completar un campo obligatorio';
  }

  mostrarFalta(mensaje) {
    let aviso = document.getElementById('wizardAviso');
    if (!aviso) {
      aviso = document.createElement('p');
      aviso.id = 'wizardAviso';
      aviso.setAttribute('role', 'alert');
      aviso.style.cssText = 'margin:16px 0 0;padding:12px 14px;background:#fff5f5;border:1px solid #f3c9c9;border-radius:8px;color:#a33a3a;font-size:14px;';
      document.getElementById('btnNext')?.parentElement?.insertAdjacentElement('beforebegin', aviso);
    }
    aviso.textContent = mensaje;
    aviso.hidden = false;
    aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  ocultarFalta() {
    const aviso = document.getElementById('wizardAviso');
    if (aviso) aviso.hidden = true;
  }

  validateStep(step) {
    const pane = document.getElementById(`pane-${step}`);
    const requiredInputs = pane.querySelectorAll('[required]');
    for (const input of requiredInputs) {
      if (!input.value && !input.disabled) {
        this.mostrarFalta(this.nombreDeCampo(input));
        // Un input oculto no se puede enfocar: se enfoca lo visible más cercano.
        if (input.type !== 'hidden') input.focus();
        return false;
      }
    }
    this.ocultarFalta();
    return true;
  }

  buildPayload() {
    const val = (id) => {
      const el = document.getElementById(id);
      if (!el) return '';
      if (el.type === 'checkbox') return el.checked;
      return el.value;
    };
    const radioVal = (name) => {
      const el = document.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : '';
    };

    // La forma de este objeto NO es libre: tpl_publicar_propiedad_v3 lee
    // contacto.telefono / contacto.email, coords.lat/lng y el bloque terreno.*.
    // Antes se enviaba contacto.whatsapp, contacto.correo, coordenadas y los
    // campos de terreno sueltos en la raíz, así que el RPC no encontraba ningún
    // medio de contacto y TODA publicación fallaba con "Falta un medio de
    // contacto". Si cambias nombres aquí, revisa también esa función.
    const naturales = [
      ['rioDirecto', 'Río directo'],
      ['esteroNatural', 'Estero natural'],
      ['orillaLago', 'Orilla de lago'],
      ['termasNaturales', 'Termas naturales'],
    ].filter(([id]) => val(id) === true || val(id) === 'si' || val(id) === 'sí')
     .map(([, etiqueta]) => etiqueta);

    // El radio del paso 1 vale 'parcela' o 'parcela_casa'. Comparar contra
    // 'casa'/'casa_con_terreno' nunca daba true, así que el bloque casa se
    // enviaba vacío y el motor tasaba la vivienda en cero.
    const esCasa = ['parcela_casa', 'casa', 'casa_con_terreno'].includes(radioVal('tipo'));

    return {
      tipo: radioVal('tipo'),
      region: val('region'),
      comuna: val('comuna'),
      localidad: val('localidad'),
      ubicacionTexto: val('ubicacionTexto'),

      // El RPC lee 'coords'
      coords: { lat: val('lat'), lng: val('lng') },

      superficie: val('superficie'),
      suelo: val('suelo'),

      // El RPC lee todo el terreno desde este bloque
      terreno: {
        rol: val('rolDetalle'),
        agua: val('aguaDetalle'),
        luz: val('luzDetalle'),
        acceso: val('acceso'),
        topografia: val('topografia'),
        vegetacion: val('vegetacion'),
        condominio: val('condominio'),
        orientacion: val('orientacion'),
        vistaPrincipal: val('vistaPrincipal'),
        cierre: val('cierre'),
        porton: val('porton'),
        condicionSuelo: val('suelo'),
        distanciaRutaPrincipalKm: Number(val('distanciaRuta')) || null,
      },

      // Solo se guarda cuando el tipo es casa con terreno
      casa: esCasa ? {
        superficieConstruida: Number(val('supCasa')) || 0,
        materialidad: val('matCasa'),
        regularizada: val('regCasa'),
        antiguedadAnios: Number(val('antCasa')) || 0,
        piscina: val('piscinaCasa'),
        piscinaMaterial: val('piscinaMat'),
        piscinaM2: Number(val('piscinaM2')) || 0,
        quincho: val('quinchoCasa'),
        // Sin superficie no hay como valorizar el quincho ni la cabaña: el
        // motor de obras adicionales cobra por m², no por marcar la casilla.
        quinchoM2: Number(val('quinchoM2')) || 0,
        cabana: val('cabanaCasa'),
        cabanaM2: Number(val('cabanaM2')) || 0,
        riego: val('riegoCasa'),
      } : {},

      // El RPC espera un arreglo, no un objeto de banderas
      atributosNaturales: naturales,
      aceptaEvaluarMejoras: radioVal('aceptaEvaluarMejoras'),

      videoUrl: val('videoUrl'),
      titulo: val('titulo'),
      descripcion: val('descripcion'),

      // La tasacion que la persona acaba de ver. El RPC tpl_publicar_propiedad_v3
      // tiene todo el manejo listo (valor tecnico, referencia de mercado,
      // clasificacion, indices, version del motor) y hasta ahora recibia {}:
      // se tasaba, se publicaba, y la cifra se perdia. El publicador antiguo si
      // la enviaba; la v2 lo habia perdido.
      valuation: window.TPLUltimaTasacion || {},
      photoNames: Array.from(document.getElementById('fotos')?.files || []).map((f) => f.name),

      precio: val('precio'),
      urgencia: val('urgencia'),

      contacto: {
        nombre: val('nombre'),
        telefono: val('whatsapp'),
        email: val('correo'),
        rut: val('rut'),
        responsable: radioVal('responsable'),
      },
    };
  }

  initAutoSave() {
    this.autoSaveId = setInterval(() => {
      // Al publicar, la pantalla de éxito reemplaza todo el formulario y este
      // intervalo seguía corriendo: reventaba cada 15 segundos con
      // "Cannot read properties of null", llenando la consola.
      const status = document.getElementById('draftStatus');
      if (!status || !document.getElementById('publicadorV2Form')) {
        clearInterval(this.autoSaveId);
        return;
      }

      const payload = this.buildPayload();
      try { localStorage.setItem('tpl_publicador_v2_draft', JSON.stringify(payload)); } catch { /* sin espacio */ }

      status.style.opacity = 0;
      setTimeout(() => {
        const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        status.textContent = `Guardado automático a las ${time}`;
        status.style.opacity = 1;
      }, 300);
    }, 15000);
  }

  /**
   * Sube las fotos seleccionadas a Supabase Storage, una por una, informando el
   * avance. Se llama justo después de publicar porque la función de servidor
   * valida el par publicacion_id + propiedad_id, que solo existe desde entonces.
   *
   * Una foto que falla no bota la publicación: la propiedad ya quedó guardada y
   * las fotos se pueden reintentar. Se devuelve el resumen para decirlo en
   * pantalla en vez de callarlo.
   */
  async subirFotos(publicacion) {
    const input = document.getElementById('fotos');
    const archivos = Array.from(input?.files || []);
    if (!archivos.length) return { total: 0, subidas: 0, fallidas: [] };

    const cfg = window.TPLDataService?.config;
    if (!cfg?.url) return { total: archivos.length, subidas: 0, fallidas: archivos.map((f) => f.name) };

    const estado = document.getElementById('draftStatus');
    const decir = (t) => { if (estado) { estado.textContent = t; estado.style.opacity = 1; } };

    let subidas = 0;
    const fallidas = [];

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      decir(`Subiendo foto ${i + 1} de ${archivos.length}…`);
      try {
        const form = new FormData();
        form.append('file', archivo);
        form.append('publicacion_id', publicacion.publicacion_id);
        form.append('propiedad_id', publicacion.propiedad_id);

        const res = await fetch(`${cfg.url}/functions/v1/subir-foto-propietario`, {
          method: 'POST',
          headers: { apikey: cfg.publishableKey, Authorization: `Bearer ${cfg.publishableKey}` },
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        subidas++;
      } catch (error) {
        console.warn(`No se pudo subir la foto "${archivo.name}"`, error);
        fallidas.push(archivo.name);
      }
    }

    decir(subidas ? `${subidas} de ${archivos.length} fotos subidas` : 'No se pudieron subir las fotos');
    return { total: archivos.length, subidas, fallidas };
  }

  /** Qué pasó con las fotos, dicho tal cual: subidas, ninguna, o algunas. */
  mensajeDeFotos(r) {
    if (!r || !r.total) return '';
    const caja = (fondo, borde, color, texto) =>
      `<p style="max-width:550px;margin:-20px auto 32px;padding:12px 16px;background:${fondo};border:1px solid ${borde};border-radius:8px;color:${color};font-size:0.95rem;line-height:1.6;">${texto}</p>`;

    if (r.subidas === r.total) {
      return caja('#f0fdf4', '#bbf7d0', '#15803d',
        `Se subieron tus ${r.total} ${r.total === 1 ? 'foto' : 'fotos'}.`);
    }
    if (r.subidas === 0) {
      return caja('#fff5f5', '#f3c9c9', '#a33a3a',
        `Tu propiedad quedó guardada, pero <strong>no pudimos subir las fotos</strong>. Escríbenos y las cargamos nosotros: no hace falta que publiques de nuevo.`);
    }
    return caja('#fffbeb', '#fde68a', '#92400e',
      `Se subieron ${r.subidas} de ${r.total} fotos. Quedaron fuera: ${r.fallidas.join(', ')}. Escríbenos y las cargamos.`);
  }

  async submitForm() {
    if (!this.validateStep(this.currentStep)) return;
    
    this.btnSubmit.disabled = true;
    this.btnSubmit.textContent = 'Enviando a Revisi\u00F3n...';

    const payload = this.buildPayload();
    console.log('Final Payload ready for Supabase:', payload);
    
    try {
      // Sin servicio de datos NO hay publicaci\u00F3n: antes se mostraba igualmente
      // la pantalla de \u00E9xito y la propiedad se perd\u00EDa en silencio.
      if (!window.TPLDataService || !window.TPLDataService.publishProperty) {
        throw new Error('No se pudo conectar con el servicio de publicaci\u00F3n. Recarga la p\u00E1gina e intenta otra vez.');
      }

      const result = await window.TPLDataService.publishProperty(payload);
      if (!result?.ok) {
        throw new Error('La base de datos no confirm\u00F3 la publicaci\u00F3n.');
      }
      console.log('Publicaci\u00F3n registrada:', result.codigo_propiedad || result.codigo);

      // Las fotos se suben DESPU\u00C9S de publicar: reci\u00E9n ah\u00ED existe la propiedad
      // a la que pertenecen. Antes el formulario las ped\u00EDa, mostraba el conteo
      // y no las sub\u00EDa a ninguna parte.
      const resumenFotos = await this.subirFotos(result);

      localStorage.removeItem('tpl_publicador_v2_draft');

      const container = document.querySelector('.wizard-container') || document.body;
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 700px; margin: 40px auto;">
          <div style="width: 80px; height: 80px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto 24px auto;">
            ✓
          </div>
          <h2 style="font-size: 2.2rem; color: #0f172a; margin-bottom: 16px; font-weight: 800;">\u00A1Propiedad Registrada!</h2>
          <p style="color: #475569; font-size: 1.15rem; line-height: 1.7; margin-bottom: 40px; max-width: 550px; margin-left: auto; margin-right: auto;">
            Tu propiedad qued\u00F3 registrada con el estado <strong style="color: #ea580c; background: #fff7ed; padding: 4px 8px; border-radius: 6px;">En Revisi\u00F3n</strong>. Revisamos los antecedentes y activamos la publicaci\u00F3n, normalmente el mismo d\u00EDa.
          </p>
          ${this.mensajeDeFotos(resumenFotos)}
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <a href="../../index.html" style="background: #0f172a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background 0.2s;">Ir al Cat\u00E1logo</a>
            <a href="#" onclick="window.location.reload();" style="background: white; color: #0f172a; border: 1px solid #cbd5e1; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background 0.2s;">Publicar Otra Propiedad</a>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error('Error enviando a Supabase:', error);
      alert('Hubo un error al comunicar con la base de datos: ' + (error.message || 'Intente nuevamente'));
      this.btnSubmit.disabled = false;
      this.btnSubmit.textContent = 'Reintentar Publicaci\u00F3n';
    }
  }
}
