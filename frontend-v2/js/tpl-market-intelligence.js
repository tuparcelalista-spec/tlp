(function(global){
  'use strict';

  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const numberFrom = value => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
  const positive = value => {
    const text = normalize(value);
    return ['si','sí','true','1','disponible','incluido','con','rol propio','factibilidad'].some(token => text === normalize(token) || text.includes(normalize(token)));
  };
  const haversineKm = (a,b) => {
    const toRad = n => n * Math.PI / 180;
    const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
    const h = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  };
  const areaOf = p => Number(p?.tamano || p?.metros || p?.superficie || 0);
  const priceOf = p => { const v=p?.precio ?? p?.valor ?? p?.precio_publicado; return typeof v==='number'?v:(Number(String(v||'').replace(/[^0-9]/g,''))||0); };
  const textOf = p => normalize([p?.nombre,p?.descripcion,p?.detalle,p?.entorno,p?.servicios,p?.sector].join(' '));

  // Referencias geográficas para poder aplicar el mismo motor territorial a parcelas ya publicadas.
  // Se usan solamente para calcular distancia; no agregan valor por el nombre del sector/localidad.
  const REFERENCE_POINTS = Object.freeze({
    quillon: { major:{name:'Chillán',category:'capital regional',lat:-36.6066,lng:-72.1034}, local:{name:'Quillón',lat:-36.7385,lng:-72.4597}, tourism:'local' },
    florida: { major:{name:'Gran Concepción',category:'área metropolitana',lat:-36.8201,lng:-73.0444}, local:{name:'Florida',lat:-36.8204,lng:-72.6629}, tourism:'' },
    nacimiento: { major:{name:'Los Ángeles',category:'polo provincial',lat:-37.4697,lng:-72.3537}, local:{name:'Nacimiento',lat:-37.5010,lng:-72.6735}, tourism:'' },
    yumbel: { major:{name:'Los Ángeles',category:'polo provincial',lat:-37.4697,lng:-72.3537}, local:{name:'Yumbel',lat:-37.0988,lng:-72.5608}, tourism:'local' },
    negrete: { major:{name:'Los Ángeles',category:'polo provincial',lat:-37.4697,lng:-72.3537}, local:{name:'Negrete',lat:-37.5857,lng:-72.5293}, tourism:'' },
    ranquil: { major:{name:'Chillán',category:'capital regional',lat:-36.6066,lng:-72.1034}, local:{name:'Ñipas',lat:-36.6247,lng:-72.5385}, tourism:'local' },
    nipas: { major:{name:'Chillán',category:'capital regional',lat:-36.6066,lng:-72.1034}, local:{name:'Ñipas',lat:-36.6247,lng:-72.5385}, tourism:'local' },
    pucon: { major:{name:'Temuco',category:'capital regional',lat:-38.7359,lng:-72.5904}, local:{name:'Pucón',lat:-39.2820,lng:-71.9543}, tourism:'nacional' },
    caburgua: { major:{name:'Temuco',category:'capital regional',lat:-38.7359,lng:-72.5904}, local:{name:'Pucón',lat:-39.2820,lng:-71.9543}, tourism:'nacional' }
  });

  function explicitDistance(p){
    const direct = Number(p?.distanciaCiudadKm || p?.distancia_ciudad_km || p?.distanciaCentroKm || p?.distancia_centro_km || p?.distanciaKm || 0);
    if(Number.isFinite(direct) && direct > 0) return direct;
    const fields = [p?.distanciaConcepcion,p?.distanciaChillan,p?.distanciaLosAngeles,p?.distanciaTemuco,p?.distanciaCentro];
    for(const value of fields){
      const parsed = numberFrom(value);
      if(parsed > 0) return parsed;
    }
    return 0;
  }

  function referencePoint(p){
    return REFERENCE_POINTS[normalize(p?.comuna)] || null;
  }

  function distanceContext(p){
    const point = referencePoint(p); if(!point) return null;
    const lat=Number(p?.lat||p?.latitude||p?.latitud),lng=Number(p?.lng||p?.lon||p?.longitude||p?.longitud);
    if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat&&lng){
      const here={lat,lng};
      return {majorCityDistanceKm:haversineKm(here,point.major),communeDistanceKm:haversineKm(here,point.local),distanceKm:haversineKm(here,point.major),nearestCity:point.major,tourism:point.tourism};
    }
    const explicit=explicitDistance(p); if(explicit)return {majorCityDistanceKm:explicit,communeDistanceKm:0,distanceKm:explicit,nearestCity:point.major,tourism:point.tourism};
    return null;
  }

  function natureAttributes(p){
    const text = textOf(p), list=[];
    if(/\br[ií]o\b|\bestero\b|\barroyo\b/.test(text)) list.push('Río dentro');
    if(/vertiente/.test(text)) list.push('Vertiente');
    if(/orilla.{0,15}(lago|laguna)|acceso.{0,15}(lago|laguna)/.test(text)) list.push('Orilla lago');
    if(/terma|aguas termales/.test(text)) list.push('Termas');
    if(/bosque nativo|nativas|araucaria/.test(text)) list.push('Bosque nativo');
    return list;
  }
  function viewOf(p){
    const text=textOf(p);
    if(/vista.{0,20}mar|mar.{0,20}vista/.test(text)) return 'Vista al mar';
    if(/vista.{0,20}(lago|laguna)|(lago|laguna).{0,20}vista/.test(text)) return 'Vista a lago';
    if(/vista.{0,20}cordillera|cordillera.{0,20}vista/.test(text)) return 'Vista cordillera';
    return String(p?.vista || p?.vistaPrincipal || '');
  }
  function topographyOf(p){
    const raw = normalize(p?.topografia || p?.terreno || p?.tipoSuelo || p?.tipo_suelo || p?.suelo);
    const text = `${raw} ${textOf(p)}`;
    if(/completamente plana|terreno plano|mayormente plana|plano/.test(text)) return 'Mayormente plana';
    return raw;
  }
  function electricityOf(p){
    const raw = normalize(p?.luz || p?.electricidad || '');
    if(/empalme|conectad|instalad/.test(raw) || /poste.{0,20}(interior|parcela)|energ[ií]a el[eé]ctrica instalada/.test(textOf(p))) return 'Empalme instalado';
    if(positive(raw) || /factibilidad.{0,20}(luz|energ[ií]a|el[eé]ctr)/.test(textOf(p))) return 'Factibilidad eléctrica';
    return raw;
  }
  function waterOf(p){
    const raw=normalize(p?.agua||''); const text=textOf(p);
    if(/apr/.test(raw)||/apr/.test(text))return 'APR';
    if(/puntera/.test(raw)||/puntera/.test(text))return 'Puntera';
    if(/pozo/.test(raw)||/pozo/.test(text))return 'Pozo';
    if(positive(raw)||/agua disponible|disponibilidad de agua/.test(text))return 'Agua disponible';
    if(/factibilidad.{0,15}agua/.test(text))return 'Factibilidad';
    return raw;
  }
  function fencingOf(p){
    const t=textOf(p);
    if(/completamente cercad|cierre perimetral|cerco perimetral/.test(t)) return 'Completamente cercada';
    if(/sin cierre|sin cerco/.test(t)) return 'Sin cierre';
    return '';
  }
  function gateOf(p){ return /port[oó]n|acceso controlado/.test(textOf(p)) ? 'Portón instalado' : ''; }
  function condominiumOf(p){ return /condominio|loteo/.test(textOf(p)) ? 'si' : ''; }
  function vegetationOf(p){ return /bosque nativo|nativas|araucaria/.test(textOf(p)) ? 'Bosque nativo' : String(p?.vegetacion || ''); }

  function qualitySignals(p){
    const signals=[];
    if(positive(p?.rol) || /rol propio/.test(textOf(p))) signals.push('Rol propio');
    if(positive(p?.luz) || positive(p?.electricidad) || /factibilidad.{0,20}(luz|energ[ií]a|el[eé]ctr)/.test(textOf(p))) signals.push('Electricidad');
    if(positive(p?.agua) || /pozo|puntera|apr|vertiente|agua/.test(textOf(p))) signals.push('Agua');
    if(/acceso|camino|ruta|locomoci[oó]n/.test(textOf(p))) signals.push('Buen acceso');
    if(/\br[ií]o\b|\bestero\b|\barroyo\b|\blaguna\b|\blago\b|bosque nativo|\bvista\b|cordillera/.test(textOf(p))) signals.push('Atributo natural');
    if(positive(p?.servicios) || positive(p?.servicios_cerca) || /supermercado|centro de salud|colegio|servicios/.test(textOf(p))) signals.push('Servicios cercanos');
    return [...new Set(signals)];
  }

  function calculateTpl(p){
    const engine=global.TPLLandEngine;
    const area=areaOf(p), asking=priceOf(p), ctx=distanceContext(p);
    if(!engine || !area || !ctx) return null;
    const point=ctx.nearestCity;
    const result=engine.calculate({
      area,
      asking,
      distanceKm:ctx.majorCityDistanceKm,majorCityDistanceKm:ctx.majorCityDistanceKm,communeDistanceKm:ctx.communeDistanceKm,
      nearestCity:{name:point.name,category:point.category},
      comuna:p?.comuna || '', region:p?.region || '', sector:p?.sector || '',
      rol:(positive(p?.rol)||/rol propio/.test(textOf(p)))?'Rol propio':'',
      electricity:electricityOf(p),
      water:waterOf(p),
      topography:topographyOf(p),
      nature:natureAttributes(p),
      tourism:ctx.tourism || '',
      view:viewOf(p),
      routeDistanceKm:Number(p?.distanciaRutaKm || p?.distancia_ruta_km || 0),
      fencing:fencingOf(p), condominium:condominiumOf(p), gate:gateOf(p), vegetation:vegetationOf(p), soil:p?.tipoSuelo || p?.tipo_suelo || p?.suelo || ''
    });
    if(result?.error) return null;
    return result;
  }

  function classify(p, tpl, market){
    const area=areaOf(p), price=priceOf(p), publishedM2=area&&price?Math.round(price/area):0;
    const tplM2=tpl?.ideal&&area?Math.round(tpl.ideal/area):0;
    const marketM2=market?.medianM2 || 0;
    const diffTpl=tplM2&&publishedM2?((publishedM2-tplM2)/tplM2)*100:null;
    const diffMarket=marketM2&&publishedM2?((publishedM2-marketM2)/marketM2)*100:null;
    const signals=qualitySignals(p);
    const roleOk=signals.includes('Rol propio');
    const supporting=signals.filter(x=>x!=='Rol propio').length;
    const opportunity=Boolean(publishedM2 && tplM2 && roleOk && supporting>=1 && diffTpl<=-15 && (diffMarket===null || diffMarket<=-5));
    let label='Sin lectura suficiente', tone='neutral', summary='Aún faltan antecedentes para comparar el precio con la estimación TPL.';
    if(publishedM2 && tplM2){
      if(opportunity){ label='Oportunidad TPL'; tone='opportunity'; summary=`El precio publicado está ${Math.abs(Math.round(diffTpl))}% bajo nuestra estimación TPL${diffMarket!==null?` y ${Math.abs(Math.round(diffMarket))}% ${diffMarket<=0?'bajo':'sobre'} la referencia comunal`:''}.`; }
      else if(diffTpl<=-10){ label='Precio atractivo'; tone='good'; summary=`El precio publicado está ${Math.abs(Math.round(diffTpl))}% bajo la estimación TPL.`; }
      else if(diffTpl<10){ label='Precio competitivo'; tone='mid'; summary='El precio publicado se encuentra cerca de la estimación TPL.'; }
      else if(diffTpl<20){ label='Sobre estimación'; tone='high'; summary=`El precio publicado está ${Math.round(diffTpl)}% sobre la estimación TPL.`; }
      else { label='Precio elevado'; tone='high'; summary=`El precio publicado está ${Math.round(diffTpl)}% sobre la estimación TPL y requiere atributos que justifiquen la diferencia.`; }
    }
    return {opportunity,label,tone,summary,diffTpl,diffMarket,signals};
  }

  function analyze(p){
    const area=areaOf(p), price=priceOf(p), publishedM2=area&&price?Math.round(price/area):0;
    const tpl=calculateTpl(p);
    const engine=global.TPLLandEngine;
    // Las referencias levantadas hasta ahora corresponden a parcelas rurales estándar; los campos >= 1 ha se mantienen separados hasta tener muestra propia.
    const market=area>=10000?null:(engine?.marketReference?.(p?.comuna,area) || null);
    const tplM2=tpl?.ideal&&area?Math.round(tpl.ideal/area):0;
    const classification=classify(p,tpl,market);
    return {
      area, price, publishedM2, tpl, tplM2, market, marketM2:market?.medianM2 || 0,
      ...classification,
      hasValidatedMarket:Boolean(market)
    };
  }

  global.TPLMarketIntelligence=Object.freeze({ analyze, areaOf, priceOf, qualitySignals, REFERENCE_POINTS });
})(typeof window!=='undefined'?window:globalThis);
