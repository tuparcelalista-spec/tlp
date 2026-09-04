/**
 * TPL Land Valuation Engine - REGLAS ESTRICTAS DEL USUARIO
 */
(function(global) {
  
  const VALOR_BASE_COMUNAL = Object.freeze({
    "pucon": { "medianM2": 13011 },
    "villarrica": { "medianM2": 6950 },
    "coihueco": { "medianM2": 5026 },
    "chillan viejo": { "medianM2": 4611 },
    "yumbel": { "medianM2": 3964 },
    "bulnes": { "medianM2": 5906 },
    "chillan": { "medianM2": 7308 },
    "san ignacio": { "medianM2": 7275 },
    "ninhue": { "medianM2": 2333 },
    "san fabian": { "medianM2": 11414 },
    "niquen": { "medianM2": 4175 },
    "yungay": { "medianM2": 4940 },
    "cobquecura": { "medianM2": 7519 },
    "san carlos": { "medianM2": 5271 },
    "quillon": { "medianM2": 5523 },
    "florida": { "medianM2": 6000 },
    "nacimiento": { "medianM2": 4294 },
    "cauquenes": { "medianM2": 2500 }
  });

  function calculate(parcela) {
      
      let comunaStr = String(parcela.comuna || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      let baseData = VALOR_BASE_COMUNAL[comunaStr] || { medianM2: 5000 };
      let precio_m2 = baseData.medianM2;

      let superficie = Number(parcela.superficie_m2 || parcela.tamano || 5000);
      
      // 2. Depreciacion por Superficie (Tamano)
      if (superficie > 5000 && superficie <= 6000) {
          precio_m2 = precio_m2 * 1.00;
      } else if (superficie > 6000 && superficie <= 8000) {
          precio_m2 = precio_m2 * 0.95;
      } else if (superficie > 8000 && superficie <= 10000) {
          precio_m2 = precio_m2 * 0.85;
      } else if (superficie > 10000 && superficie <= 20000) {
          precio_m2 = precio_m2 * 0.75;
      } else if (superficie > 20000 && superficie <= 40000) {
          precio_m2 = precio_m2 * 0.65;
      } else if (superficie > 40000 && superficie <= 80000) {
          precio_m2 = precio_m2 * 0.40; // 60% discount for > 4 hectares
      } else if (superficie > 80000) {
          precio_m2 = precio_m2 * 0.30; // 70% discount for > 8 hectares
      }

      let valor_terreno = precio_m2 * superficie;

      let local_km = Number(parcela.distanciaComuna || parcela.communeDistanceKm || 0);
      let hub_km = Number(parcela.distanceKm || 0); // Distancia a la ciudad grande (Hub)

      if (local_km === 0 && parcela.distanciaConcepcion) {
            local_km = Number(String(parcela.distanciaConcepcion).replace(/\D/g, '')) * 0.2;
      }
      
      // Excepción para comunas turísticas que actúan como "Ciudad Grande"
      const comunasTuristicas = ['pucon', 'puerto varas', 'panguipulli', 'vicuña', 'vicuna', 'cobquecura', 'pinto'];
      if (comunasTuristicas.includes(comunaStr)) {
          hub_km = local_km; // La distancia a la ciudad grande es la misma que la distancia local
      }

      // 1% por km para distancia comunal, 0.7% por km para ciudad grande
      let penalty_local = local_km * 0.01;
      let penalty_hub = hub_km * 0.007;
      
      // Ponderación (80% comunal, 20% ciudad grande)
      let descuento_distancia = (penalty_local * 0.8) + (penalty_hub * 0.2);
      if (descuento_distancia > 0.8) descuento_distancia = 0.8;
      valor_terreno = valor_terreno * (1 - descuento_distancia);

      let premios = 0;
      let text = ((parcela.naturaleza || '') + ' ' + (parcela.descripcion || '')).toLowerCase();
      let isRol = String(parcela.rol).toLowerCase().includes('propio') || String(parcela.rol).toLowerCase().includes('si');
      let isAgua = String(parcela.agua).toLowerCase().includes('fact') || String(parcela.agua).toLowerCase().includes('si');
      let isPlana = String(parcela.topografia).toLowerCase().includes('plana');

      // Atributos de agua natural, graduados.
      //
      // Antes esto era una sola regla: /rio|río|vertiente/ sumaba +45% a todos
      // por igual, y "estero" no sumaba nada. El otro motor del sitio
      // (plataforma/publicar/tpl-land-engine.js) ya usaba esta escala graduada;
      // se replica aquí para que ambos motores tasen igual la misma parcela.
      const AGUA_NATURAL = [
        { clave: 'lago',      etiqueta: 'Orilla / acceso a lago', re: /\blagos?\b/,        premio: 0.50 },
        { clave: 'rio',       etiqueta: 'Río',                    re: /\br[íi]os?\b/,      premio: 0.30 },
        { clave: 'termas',    etiqueta: 'Aguas termales',         re: /\btermas?\b/,       premio: 0.30 },
        { clave: 'vertiente', etiqueta: 'Vertiente natural',      re: /\bvertientes?\b/,   premio: 0.20 },
        { clave: 'estero',    etiqueta: 'Estero',                 re: /\besteros?\b/,      premio: 0.10 },
      ];
      const aguaNaturalDetectada = AGUA_NATURAL.filter((a) => a.re.test(text));

      if (isRol) premios += 0.05;
      if (isAgua) premios += 0.10;
      if (isPlana) premios += 0.15;
      for (const a of aguaNaturalDetectada) premios += a.premio;

      let valorFinal = Math.round(valor_terreno * (1 + premios));
      
      // CALCULO DE CASA / VIVIENDA (Basado en UF/m2 real de catastro)
      let valor_casa = 0;
      let dorms = Number(parcela.dormitorios || parcela.metadata?.dormitorios || 0);
      let sup_casa = Number(parcela.superficie_casa_m2 || parcela.superficie_construida_m2 || parcela.superficie_construida || parcela.metadata?.superficie_construida_m2 || parcela.metadata?.superficie_construida || 0);
      let houseDetails = [];
      
      if (dorms > 0 || sup_casa > 0) {
          // Si no hay sup_casa, aproximamos a 25m2 por dormitorio
          let effectiveSup = sup_casa > 0 ? sup_casa : (dorms * 25);
          
          // UF por m2 de construccion estandar sin extras (11.1 descontando piscina/quincho, base conservadora 10 UF)
          let uf_base = 10; 
          let mat = (parcela.materialidad || parcela.metadata?.materialidad || 'estandar').toLowerCase();
          
          if (mat === 'ligera' || mat === 'madera') uf_base = 6.5;
          else if (mat === 'solida' || mat === 'albañileria' || mat === 'hormigon') uf_base = 15.0;
          else if (mat === 'premium') uf_base = 18.0;
          
          let valor_casa_uf = effectiveSup * uf_base;
          houseDetails.push({ nombre: "Construcción (" + mat + " " + effectiveSup + "m2)", valor: "+" + (effectiveSup * uf_base) + " UF" });
          
          // Depreciacion por antiguedad (1% anual hasta max 40%)
          let anti = String(parcela.antiguedad || parcela.metadata?.antiguedad || parcela.metadata?.estado || '').toLowerCase();
          let antiMatch = anti.match(/(?:hace|antiguedad)s+(d+)s+a[ñn]os?/);
          let antiguedad_anios = antiMatch ? Number(antiMatch[1]) : 0; 
          
          // Si no tenemos años exactos pero dice "usada"
          if (antiguedad_anios === 0 && anti.includes('usada')) antiguedad_anios = 5;
          
          if (parcela.antiguedad_anios) antiguedad_anios = Number(parcela.antiguedad_anios);
          
          if (antiguedad_anios > 0) {
              let descuento = Math.min(0.40, antiguedad_anios * 0.015); // 1.5% por año, max 40%
              let dec = Math.round(valor_casa_uf * descuento);
              valor_casa_uf = valor_casa_uf - dec;
              houseDetails.push({ nombre: "Depreciación (" + antiguedad_anios + " años)", valor: "-" + dec + " UF" });
          }

          // Atributos Extras
          let atr = (parcela.atributos_naturales || parcela.metadata?.atributos_texto || parcela.atributos || '').toLowerCase();
          
          // Equipamiento Extra (Desde CRM)
          let hasPiscina = (parcela.metadata?.piscina === 'si') || atr.includes('piscina');
          if (hasPiscina) { 
              let p_m2 = Number(parcela.metadata?.piscina_m2) || 24; // Asume 6x4 = 24m2 por defecto
              let p_mat = parcela.metadata?.piscina_mat === 'hormigon' ? 8 : 4; 
              if (atr.includes('hormigon')) p_mat = 8;
              let uf_piscina = p_m2 * p_mat;
              valor_casa_uf += uf_piscina; 
              houseDetails.push({ nombre: `Piscina (${p_m2}m2 ${p_mat === 8 ? 'Hormigón' : 'Fibra'})`, valor: "+" + uf_piscina + " UF" }); 
          }
          
          let hasQuincho = (parcela.metadata?.quincho === 'si') || atr.includes('quincho');
          if (hasQuincho) { 
              valor_casa_uf += 150; 
              houseDetails.push({ nombre: "Quincho Techado", valor: "+150 UF" }); 
          }
          
          let hasCabana = (parcela.metadata?.cabana === 'si') || atr.includes('cabaña') || atr.includes('visita');
          if (hasCabana) { 
              valor_casa_uf += 300; 
              houseDetails.push({ nombre: "Cabaña/Visitas", valor: "+300 UF" }); 
          }
          
          let hasRiego = (parcela.metadata?.riego === 'si') || atr.includes('riego') || atr.includes('regadores');
          if (hasRiego) { 
              valor_casa_uf += 70; 
              houseDetails.push({ nombre: "Riego Automático", valor: "+70 UF" }); 
          }
          
          // Premio o Castigo por Regularización Legal
          let regStatus = parcela.metadata?.regularizada || '';
          let textReg = atr.includes('regularizada') || atr.includes('recepción');
          
          if (regStatus === 'si' || textReg) {
              let premioReg = Math.round(valor_casa_uf * 0.10); // 10% premio
              valor_casa_uf += premioReg;
              houseDetails.push({ nombre: "Recepción Final (+10%)", valor: "+" + premioReg + " UF" });
          } else if (regStatus === 'no') {
              let castigoReg = Math.round(valor_casa_uf * 0.15); // 15% castigo
              valor_casa_uf -= castigoReg;
              houseDetails.push({ nombre: "Sin Regularizar (-15%)", valor: "-" + castigoReg + " UF" });
          }
          
          
          
          const UF_VALUE = 38000;
          valor_casa = Math.round(valor_casa_uf * UF_VALUE);
          
          valorFinal += valor_casa;
      }

      
        let desglose = [];
        const sizeDesc = Math.round((1 - (precio_m2 / baseData.medianM2)) * 100); desglose.push({ nombre: "Tamaño", valor: "-" + sizeDesc + "%" });
        if (descuento_distancia > 0) desglose.push({ nombre: "Lejanía (Comuna/Ciudad)", valor: "-" + Math.round(descuento_distancia * 100) + "%" });
        if (isRol) desglose.push({ nombre: "Rol Propio", valor: "+5%" });
        if (isAgua) desglose.push({ nombre: "Agua", valor: "+10%" });
        if (isPlana) desglose.push({ nombre: "Topografía", valor: "+15%" });
        // Cada atributo de agua se muestra por separado y con su propio peso,
        // para que el informe explique de dónde sale el premio.
        for (const a of aguaNaturalDetectada) {
          desglose.push({ nombre: a.etiqueta, valor: "+" + Math.round(a.premio * 100) + "%" });
        }
          if (dorms > 0 || sup_casa > 0) {
            let label = dorms > 0 ? `Casa Construida (${dorms} Dormitorios)` : `Casa Construida (${sup_casa} m2)`;
            desglose.push({ nombre: label, valor: "+" + new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(valor_casa) });
            // Add sub details for the house
            for (let d of houseDetails) {
                desglose.push({ nombre: " ↳ " + d.nombre, valor: d.valor });
            }
          }
        
        return {
            valorRecomendado: valorFinal,
            valor_recomendado: valorFinal,
            valorComunalBase: baseData.medianM2 * superficie,
            valorMarginal: (precio_m2 * superficie),
            baseDepreciada: valor_terreno,
            ajustesPorcentajeTotal: premios,
            ajustesDesglose: desglose
        };

  }

  global.TPLLandEngine = {
    calculate,
    MARKET_REFERENCES: VALOR_BASE_COMUNAL,
    calculateRaw: calculate
  };
})(typeof window !== 'undefined' ? window : global);
