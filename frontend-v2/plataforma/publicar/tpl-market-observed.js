(function(global){
  "use strict";

  // Referencia estadística independiente del motor de tasación TPL.
  // Los valores corresponden a precios publicados observados en portales;
  // no representan precios de cierre ni reemplazan una tasación individual.
  const DATA = Object.freeze({
    pucon: Object.freeze({
      comuna: "Pucón",
      region: "La Araucanía",
      superficieObjetivoM2: 5000,
      toleranciaM2: 750,
      fechaCorte: "2026-07-29",
      metodologia: "Muestra inicial manual de avisos de parcelas cercanas a 5.000 m²; se excluyen propiedades con construcciones relevantes y valores manifiestamente atípicos.",
      fuentes: Object.freeze([
        "https://www.yapo.cl/searchresult/bienes-raices-venta-de-propiedades-fincas",
        "https://www.yapo.cl/searchresult/bienes-raices-venta-de-propiedades-fincas.2",
        "https://www.yapo.cl/searchresult/bienes-raices-venta-de-propiedades-fincas.3",
        "https://portalterreno.cl/parcelas-en-venta-en-pucon-cautin-la-araucania",
        "https://portalterreno.cl/parcelas/venta/pucon-cautin-la-araucania?page=2",
        "https://portalterreno.cl/parcelas/venta/pucon-cautin-la-araucania?page=3",
        "https://www.facebook.com/marketplace/458769724300787/search/?query=pucon%20parcela"
      ]),
      comparables: Object.freeze([
        Object.freeze({ sector:"Huife Alto", superficieM2:5000, precioClp:14900000, fuente:"Yapo" }),
        Object.freeze({ sector:"Carhuello", superficieM2:5000, precioClp:50000000, fuente:"Yapo" }),
        Object.freeze({ sector:"Los Calabozos", superficieM2:5000, precioClp:53000000, fuente:"Yapo" }),
        Object.freeze({ sector:"El Cerdúo", superficieM2:5000, precioClp:60000000, fuente:"PortalTerreno / Yapo" }),
        Object.freeze({ sector:"Reserva Quilaco", superficieM2:5000, precioClp:65000000, fuente:"PortalTerreno" }),
        Object.freeze({ sector:"Candelaria", superficieM2:5000, precioClp:85000000, fuente:"Yapo / PortalTerreno" }),
        Object.freeze({ sector:"Candelaria", superficieM2:5000, precioClp:110000000, fuente:"Yapo / PortalTerreno" })
      ])
    })
  });

  const normalize = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const round = n => Math.round(Number(n || 0) / 10000) * 10000;

  function getByComuna(comuna){
    const key = normalize(comuna);
    const cfg = Object.values(DATA).find(x => normalize(x.comuna) === key);
    if(!cfg) return null;
    const prices = cfg.comparables.map(x => Number(x.precioClp || 0)).filter(Boolean).sort((a,b)=>a-b);
    if(!prices.length) return null;
    const sum = prices.reduce((a,b)=>a+b,0);
    const mid = Math.floor(prices.length/2);
    const median = prices.length % 2 ? prices[mid] : (prices[mid-1]+prices[mid])/2;
    const avg = sum/prices.length;
    return Object.freeze({
      comuna: cfg.comuna, region: cfg.region, superficieObjetivoM2: cfg.superficieObjetivoM2,
      fechaCorte: cfg.fechaCorte, metodologia: cfg.metodologia, fuentes: cfg.fuentes,
      comparables: cfg.comparables, cantidad: prices.length,
      promedioClp: round(avg), medianaClp: round(median), minimoClp: prices[0], maximoClp: prices[prices.length-1],
      promedioM2Clp: round(avg / cfg.superficieObjetivoM2),
      tipo: "precio_publicado_observado", independienteTasador: true
    });
  }

  global.TPLMarketObserved = Object.freeze({ DATA, getByComuna });
})(window);
