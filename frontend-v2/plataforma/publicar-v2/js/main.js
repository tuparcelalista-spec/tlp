import { TerritoryManager } from './modules/territory.js?v=20260903-tasador';
import { WizardManager } from './modules/wizard.js?v=20260903-fotos2';

// Ciudades de referencia para estimar la distancia que exige el motor tasador.
const CIUDADES_REFERENCIA = [
  { nombre: 'Concepción',   lat: -36.8201, lng: -73.0444 },
  { nombre: 'Chillán',      lat: -36.6066, lng: -72.1034 },
  { nombre: 'Los Ángeles',  lat: -37.4697, lng: -72.3536 },
  { nombre: 'Temuco',       lat: -38.7397, lng: -72.5901 },
  { nombre: 'Valdivia',     lat: -39.8142, lng: -73.2459 },
  { nombre: 'Puerto Montt', lat: -41.4693, lng: -72.9424 },
  { nombre: 'Santiago',     lat: -33.4489, lng: -70.6693 },
];

// ---------------------------------------------------------------------------
// TARIFAS DE VIVIENDA Y OBRAS — ÚNICO LUGAR DONDE SE DEFINEN
// ---------------------------------------------------------------------------
// Tarifas aprobadas el 2026-09-03 tras analizar el catastro de mercado y el
// catálogo propio de prefabricadas. De dónde sale cada una:
//
//   ligera   $125.000/m²  mediana de los 11 modelos prefabricados básicos del
//                         catálogo TPL, precio cotizado real ($109.524-$139.583).
//   estándar $270.000/m²  tarifa de madera del motor de casas. Queda entre el
//                         kit prefabricado y la obra sólida, que es donde
//                         corresponde a la madera construida en sitio.
//   sólida   $350.000/m²  corroborada por dos vías independientes: la mediana
//                         de la gama alta del catálogo ($350.000 exacto) y la
//                         mediana residual del catastro ($355.200 sobre 18 casos).
//
// `premium` sigue sin tarifa a propósito: no hay dato que la sostenga. El techo
// del catálogo es $388.889/m² y los valores altos del catastro son artefactos
// del método residual. Una tarifa inventada en una pantalla de tasación es peor
// que no mostrar cifra: la persona publica creyendo que TPL la valorizó.
const TARIFAS_VIVIENDA = Object.freeze({
  ligera:   { materialMotor: 'ligera', aprobada: true,  etiqueta: 'Construcción ligera' },
  estandar: { materialMotor: 'madera', aprobada: true,  etiqueta: 'Construcción estándar' },
  solida:   { materialMotor: 'solida', aprobada: true,  etiqueta: 'Construcción sólida' },
  premium:  { materialMotor: null,     aprobada: false, etiqueta: 'Construcción premium' },
});

// Obras adicionales: qué clave del motor usa cada casilla del formulario.
//
// El riego automático sigue sin tarifa: no hay ni una sola referencia de precio
// en el catastro ni en el catálogo, y su costo depende del caudal, la superficie
// regada y el tipo de bomba. Se declara en pantalla en vez de callarlo.
const OBRAS_DECLARABLES = Object.freeze({
  quincho: { obraMotor: 'quincho_abierto', campoM2: 'quinchoM2', etiqueta: 'Quincho techado' },
  cabana:  { obraMotor: 'cabana_visitas',  campoM2: 'cabanaM2',  etiqueta: 'Cabaña / casa de visitas' },
  riego:   { obraMotor: null,              campoM2: null,        etiqueta: 'Riego automático' },
});

const WHATSAPP_TPL = '56988508361';

/** Distancia aproximada por carretera: Haversine con factor 1.3 por curvas. */
function distanciaAproxKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3);
}

/**
 * El motor exige majorCityDistanceKm y devuelve {error} si falta; sin esto,
 * el tasador del publicador mostraba $0 en las tres cifras.
 */
function distanciaCiudadMasCercana(lat, lng) {
  const la = Number(lat), ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || (!la && !ln)) return null;
  let menor = null;
  for (const c of CIUDADES_REFERENCIA) {
    const d = distanciaAproxKm(la, ln, c.lat, c.lng);
    if (d !== null && (menor === null || d < menor)) menor = d;
  }
  return menor;
}

const clp = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(n) || 0);

/**
 * Traduce el bloque `casa` del formulario al vocabulario de TPLHouseEngine y
 * devuelve, aparte, la lista de items que la persona marcó pero que todavía no
 * tienen tarifa aprobada. Esa lista se muestra: marcar una casilla y que no
 * pase nada, sin explicación, es la peor de las dos opciones.
 */
function construirEntradaVivienda(casa = {}, landInput = {}) {
  const pendientes = [];
  const obras = {};

  const tarifa = TARIFAS_VIVIENDA[String(casa.materialidad || '').toLowerCase()];
  if (casa.superficieConstruida > 0 && (!tarifa || !tarifa.aprobada)) {
    pendientes.push(`${tarifa?.etiqueta || 'La materialidad declarada'} todavía no tiene valor por m² definido, así que la vivienda no está sumando.`);
  }

  // Piscina: es el único extra que ya pide superficie y material, y el motor
  // tiene tarifa para los dos materiales.
  if (casa.piscina === 'si') {
    const m2 = Number(casa.piscinaM2) || 0;
    if (m2 > 0) obras[casa.piscinaMaterial === 'hormigon' ? 'piscina_hormigon' : 'piscina_fibra'] = m2;
    else pendientes.push('Indica los m² de la piscina para poder valorizarla.');
  }

  for (const [campo, def] of Object.entries(OBRAS_DECLARABLES)) {
    if (casa[campo] !== 'si') continue;
    if (!def.obraMotor) {
      pendientes.push(`${def.etiqueta} aún no tiene tarifa definida, así que no está sumando.`);
      continue;
    }
    const m2 = Number(casa[def.campoM2]) || 0;
    if (m2 > 0) obras[def.obraMotor] = m2;
    else pendientes.push(`Indica los m² de ${def.etiqueta.toLowerCase()} para poder valorizarlo.`);
  }

  // Ojo: TPLHouseEngine hace `RULES.materials[mat] || RULES.materials.solida`,
  // así que una materialidad desconocida NO da cero: cobra $350.000/m² como si
  // fuera construcción sólida. Por eso, sin tarifa aprobada la vivienda se
  // excluye del cálculo en vez de mandarla con un material que el motor no
  // reconoce. Los extras que sí tienen tarifa siguen sumando.
  const puedeValorizarVivienda = Boolean(tarifa?.aprobada) && Number(casa.superficieConstruida) > 0;

  return {
    pendientes,
    entradaCasa: {
      incluyeVivienda: puedeValorizarVivienda,
      areaCasa: puedeValorizarVivienda ? Number(casa.superficieConstruida) : 0,
      materialCasa: puedeValorizarVivienda ? tarifa.materialMotor : '',
      antiguedadCasa: Number(casa.antiguedadAnios) || 0,
      recepcionFinal: casa.regularizada === 'si' ? 'con_recepcion' : 'sin_recepcion',
      // El formulario no pregunta por el radier. El motor asume "radier
      // terminado" ($20.000/m²) si no se le dice nada, o sea agregaría valor
      // por algo que nadie declaró.
      tipoFundacion: 'sin_fundacion',
      obrasAdicionales: obras,
      area: landInput.area,
    },
  };
}

/** Pinta de dónde sale el valor y qué quedó declarado pero sin valorizar. */
function pintarDesglose(result, pendientes = [], declaraVivienda = false) {
  const caja = document.getElementById('tasadorDesglose');
  const lista = document.getElementById('tasadorDesgloseLista');
  if (!caja || !lista) return;

  const d = result?.desglose;
  const filas = [];
  if (d) {
    filas.push(['Terreno', clp(d.valorTerreno)]);
    if (d.valorCasa) filas.push(['Vivienda', clp(d.valorCasa)]);
    if (d.sumaObrasAdicionales) filas.push(['Obras adicionales', clp(d.sumaObrasAdicionales)]);
    (result.obrasAdicionales || []).forEach((o) => filas.push([`· ${o.label} (${o.quantity} ${o.unit})`, clp(o.depreciatedValue)]));
  }

  if (!filas.length && !pendientes.length) { caja.hidden = true; return; }

  lista.innerHTML =
    filas.map(([k, v]) => `<li style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;"><span>${k}</span><strong>${v}</strong></li>`).join('') +
    (pendientes.length
      ? `<li style="margin-top:12px;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#9a3412;">
           <strong style="display:block;margin-bottom:6px;">Declarado, todavía sin valorizar</strong>
           ${pendientes.map((p) => `<span style="display:block;">· ${p}</span>`).join('')}
         </li>`
      : '');
  caja.hidden = false;
  if (!declaraVivienda && !pendientes.length) caja.hidden = true;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('TPL Publisher V2 - Booting...');

  const territory = new TerritoryManager();
  const wizard = new WizardManager(territory);
  setTimeout(() => territory.initMap(), 500);

  // --- DROPZONE HANDLER ---
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fotos');

  const resumenFotos = document.getElementById('fotosResumen');

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    // Se escribe en un elemento aparte, NUNCA sobre el dropzone: cuando este
    // manejador reescribía el propio dropzone se llevaba por delante el input
    // que vivía adentro, y los archivos elegidos desaparecían.
    const files = Array.from(fileInput.files || []);
    if (!resumenFotos) return;
    if (!files.length) { resumenFotos.hidden = true; return; }

    const total = files.reduce((s, f) => s + f.size, 0);
    const mb = (total / (1024 * 1024)).toFixed(1);
    resumenFotos.textContent = `${files.length} ${files.length === 1 ? 'foto lista' : 'fotos listas'} para subir · ${mb} MB · ${files.map((f) => f.name).join(', ')}`;
    resumenFotos.hidden = false;
    dropzone.style.borderColor = 'var(--success)';
    dropzone.style.background = 'rgba(34, 197, 94, 0.05)';
  });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--primary)'; });
  dropzone.addEventListener('dragleave', () => dropzone.style.borderColor = 'var(--border)');
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  // --- AI ASSISTANT ---
  const btnAiDraft = document.getElementById('btnAiDraft');
  if (btnAiDraft) {
    btnAiDraft.addEventListener('click', async () => {
      btnAiDraft.textContent = 'Generando...';
      btnAiDraft.disabled = true;
      const aviso = document.getElementById('aiAviso');
      if (aviso) aviso.hidden = true;

      try {
        const payload = wizard.buildPayload();
        const cfg = window.TPLDataService?.config;
        if (!cfg?.url) throw new Error('No se pudo conectar con el asistente.');

        // Antes, si no existía TPLAiAssistant (que nunca existió), rellenaba
        // una plantilla fija: el mismo texto para toda propiedad, con datos
        // que nadie había declarado ("factibilidad de luz y agua").
        const res = await fetch(`${cfg.url}/functions/v1/gemini-redactar-aviso`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': cfg.publishableKey,
            'Authorization': `Bearer ${cfg.publishableKey}`
          },
          body: JSON.stringify({ propiedad: payload })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'RESPUESTA_IA_INVALIDA');

        document.getElementById('titulo').value = data.titulo;
        document.getElementById('descripcion').value = data.descripcion;
      } catch (err) {
        console.error('No se pudo redactar el aviso', err);
        const mensajes = {
          DATOS_INSUFICIENTES: 'Completa al menos la comuna y la superficie para que podamos redactar.',
          DEMASIADAS_SOLICITUDES: 'Hiciste varias solicitudes seguidas. Espera un momento.',
          IA_NO_DISPONIBLE: 'El asistente no está disponible ahora. Escribe el aviso a mano o intenta en unos minutos.',
          RESPUESTA_IA_INVALIDA: 'No pudimos redactar con estos datos. Intenta de nuevo.',
        };
        if (aviso) {
          aviso.textContent = mensajes[err?.message] || 'No pudimos redactar el aviso. Puedes escribirlo tú.';
          aviso.hidden = false;
        }
      } finally {
        btnAiDraft.textContent = 'Redactar por mí';
        btnAiDraft.disabled = false;
      }
    });
  }

  // --- VALUATION ENGINE (TASADOR TPL) ---
  const btnTasador = document.getElementById('btnTasador');
  const tasadorResult = document.getElementById('tasadorResult');
  // Contexto de la última tasación, para que el botón de asesoría no abra una
  // conversación en blanco donde la persona tenga que repetirlo todo.
  let ultimaTasacion = null;

  const btnAsesoria = document.getElementById('btnAsesoria');
  if (btnAsesoria) {
    btnAsesoria.addEventListener('click', () => {
      const p = ultimaTasacion?.payload || {};
      const partes = [
        'Hola, acabo de tasar mi propiedad en el publicador de Tu Parcela Lista.',
        p.comuna ? `Está en ${p.comuna}${p.region ? ', ' + p.region : ''}.` : '',
        p.superficie ? `Terreno de ${Number(p.superficie).toLocaleString('es-CL')} m².` : '',
        Number(p.casa?.superficieConstruida) > 0 ? `Con casa de ${p.casa.superficieConstruida} m².` : '',
        ultimaTasacion?.valor ? `El valor TPL recomendado que me mostró fue ${clp(ultimaTasacion.valor)}.` : '',
        'Quiero recibir asesoría antes de publicar.',
      ].filter(Boolean);
      window.open(`https://wa.me/${WHATSAPP_TPL}?text=${encodeURIComponent(partes.join(' '))}`, '_blank', 'noopener');
    });
  }

  if (btnTasador) {
    btnTasador.addEventListener('click', async () => {
      btnTasador.textContent = 'Calculando...';
      btnTasador.disabled = true;

      const avisoPrevio = document.getElementById('tasadorAviso');
      if (avisoPrevio) avisoPrevio.hidden = true;

      const payload = wizard.buildPayload();
      
      try {
        const TPLLandEngine = window.TPLLandEngine;

        if (TPLLandEngine && typeof TPLLandEngine.calculate === 'function') {
          // Prepare input matching the Engine's expected format
          // buildPayload ahora entrega coords + terreno/casa anidados.
          const coords = payload.coords || {};
          const terreno = payload.terreno || {};
          const casa = payload.casa || {};
          const distanciaCiudad = distanciaCiudadMasCercana(coords.lat, coords.lng);

          // Ya hay un solo motor (js/core/valuation-engine.js) y lee los campos
          // en inglés. Se dejaron de mandar los duplicados en español, que
          // existían solo porque antes convivían dos motores distintos bajo el
          // mismo nombre global.
          const landInput = {
            superficie: Number(payload.superficie || 0),
            area: Number(payload.superficie || 0),
            region: payload.region,
            comuna: payload.comuna,
            rol: terreno.rol,
            water: terreno.agua,
            electricity: terreno.luz,
            topography: terreno.topografia,
            access: terreno.acceso,
            vegetation: terreno.vegetacion,
            fencing: terreno.cierre,
            gate: terreno.porton,
            condominium: terreno.condominio,
            routeDistanceKm: terreno.distanciaRutaPrincipalKm,
            // El motor espera un arreglo de atributos declarados. Enviarlo como
            // texto lo hacía reventar con "input.nature.map is not a function"
            // y el tasador no entregaba ningún valor.
            nature: Array.isArray(payload.atributosNaturales) ? payload.atributosNaturales : [],
            ubicacion: coords,
            // Sin esta distancia el motor aborta y las tres cifras salen en $0.
            majorCityDistanceKm: distanciaCiudad,
          };

          if (distanciaCiudad === null) {
            throw new Error('Marca la ubicación en el mapa para calcular el valor.');
          }

          // El motor de terreno no tiene ninguna entrada para la vivienda:
          // superficie_construida, materialidad y los extras se le mandaban y
          // los descartaba en silencio, así que una casa de 180 m² con piscina
          // sumaba exactamente $0. Cuando la propiedad declara vivienda el
          // cálculo pasa por TPLHouseEngine, que a su vez delega el suelo en
          // TPLLandEngine sin duplicar su fórmula.
          const declaraVivienda = Number(casa.superficieConstruida) > 0;
          const { entradaCasa, pendientes } = construirEntradaVivienda(casa, landInput);

          let result;
          if (declaraVivienda && window.TPLHouseEngine?.calculate) {
            result = window.TPLHouseEngine.calculate({ ...landInput, ...entradaCasa });
          } else {
            result = TPLLandEngine.calculate(landInput);
          }
          pintarDesglose(result, pendientes, declaraVivienda);

          // El motor informa sus problemas devolviendo {error}; antes se
          // ignoraba y se pintaban tres ceros como si fueran una tasación.
          if (result?.error) throw new Error(result.error);

          if (result) {
            const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
            
            // Las tres cifras son las mismas del informe premium, en el mismo
            // orden: venta ágil < valor TPL < mercado potencial. Antes la
            // tercera mostraba valorPromedioReferencia, que suele ser MENOR que
            // el valor recomendado: la columna "Mercado Potencial" quedaba por
            // debajo de la del medio y la escala no significaba nada.
            ultimaTasacion = { payload, valor: result.valorFinal || 0 };
            // Se expone para que buildPayload la adjunte a la publicación. El
            // RPC guarda estos campos; sin esto se perdía la tasación.
            // Con vivienda el resultado lo arma TPLHouseEngine, que devuelve
            // otra forma: los campos del terreno viven en `landResult`. Sin este
            // respaldo, `technical` y `market` salían en 0 y el RPC de
            // publicación no llegaba a guardar la tasación (solo inserta si uno
            // de los dos trae valor).
            const suelo = result.landResult || result;
            // El RPC guarda `technical` como `valor_tpl_total`. Con vivienda, el
            // técnico del suelo solo no representa la propiedad: se manda el
            // subtotal (terreno + mejoras), que es el total técnico real.
            const tecnico = result.subtotalPropiedad
              || suelo.valorTplTasadorAjustado || suelo.technicalPotential || result.valorFinal || 0;
            window.TPLUltimaTasacion = {
              valorFinal: result.valorFinal || 0,
              technical: Math.round(tecnico),
              market: suelo.valor_comunal || suelo.valorComunal || result.valorComunal || 0,
              quick: result.valor_venta_apuro || result.valorPorApuro || 0,
              marketReference: suelo.marketReference || null,
              priceAnalysis: suelo.priceAnalysis || null,
              classification: suelo.priceAnalysis?.classification || null,
              breakdown: suelo.adjustments || [],
              territorialIndex: suelo.territorialIndex || null,
              propertyIndex: suelo.propertyIndex || null,
              territory: suelo.territorialBlend || null,
              engineVersion: result.engineVersion || result.method || suelo.engineVersion || null,
              desglose: result.desglose || null,
            };
            document.getElementById('valuationMain').textContent = `Valor TPL Recomendado: ${formatter.format(result.valorFinal || 0)}`;
            document.getElementById('marketValue').textContent = formatter.format(result.valorFinal || 0);
            document.getElementById('quickValue').textContent = formatter.format(result.valor_venta_apuro || result.valorPorApuro || 0);
            document.getElementById('patientValue').textContent = formatter.format(result.technicalPotential || result.valorFinal || 0);
            
            tasadorResult.style.display = 'block';
          }
        } else {
          throw new Error('TPLLandEngine not found');
        }
      } catch (err) {
        // Antes se inventaba una cifra (superficie x 8.000) y se mostraba con
        // el mismo formato que una tasación real. Un número inventado en una
        // pantalla de tasación es peor que no mostrar ninguno: la persona
        // publica su parcela creyendo que TPL la valorizó.
        console.error('No se pudo calcular la tasación', err);
        document.getElementById('valuationMain').textContent = 'No pudimos calcular el valor todavía';
        document.getElementById('marketValue').textContent = '—';
        document.getElementById('quickValue').textContent = '—';
        document.getElementById('patientValue').textContent = '—';

        const aviso = document.getElementById('tasadorAviso');
        if (aviso) {
          aviso.textContent = err?.message || 'Revisa la superficie y la ubicación e intenta otra vez.';
          aviso.hidden = false;
        }
        tasadorResult.style.display = 'block';
      } finally {
        btnTasador.textContent = '✅ Valor Calculado';
        setTimeout(() => {
          btnTasador.textContent = '🔍 Recalcular Valor TPL';
          btnTasador.disabled = false;
        }, 2000);
      }
    });
  }

});
