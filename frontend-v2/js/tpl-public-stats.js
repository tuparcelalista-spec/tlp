
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const fmt = (n) => new Intl.NumberFormat("es-CL").format(Math.max(0, Number(n || 0)));

  function readArray(candidates){
    for(const key of candidates){
      const value = window[key];
      if(Array.isArray(value)) return value;
    }
    return [];
  }

  function localCounts(){
    const parcelCatalog =
      (typeof parcelas !== "undefined" && Array.isArray(parcelas))
        ? parcelas
        : readArray(["parcelas","parcelasPortal","parcelasDuenos"]);

    const houseCatalog =
      (typeof casas !== "undefined" && Array.isArray(casas))
        ? casas
        : readArray(["casas"]);

    const empresas = new Set(
      houseCatalog
        .map(c => c.empresa || c.proveedor || c.marca || c.fabricante)
        .filter(Boolean)
        .map(v => String(v).trim().toLowerCase())
    );

    return {
      parcelas: parcelCatalog.length,
      casas: houseCatalog.length,
      empresas: empresas.size,
      proyectos: 0,
      visitas: 0
    };
  }

  async function supabaseCounts(){
    const sb = window.tplSupabase || window.tplCrmSupabase || window.supabaseClient;
    if(!sb || typeof sb.from !== "function") return null;

    const queries = [
      ["parcelas","parcelas"],
      ["casas","casas"],
      ["contratistas","empresas"],
      ["proyectos","proyectos"],
      ["visitas","visitas"]
    ];

    const result = {};
    await Promise.all(queries.map(async ([table,key]) => {
      try{
        const { count, error } = await sb.from(table).select("*",{count:"exact",head:true});
        if(!error && Number.isFinite(count)) result[key] = count;
      }catch(_){}
    }));

    return Object.keys(result).length ? result : null;
  }

  function render(data){
    document.querySelectorAll("[data-tpl-stat]").forEach(el => {
      const key = el.getAttribute("data-tpl-stat");
      if(data[key] == null) return;
      const target = Number(data[key] || 0);
      const valueEl = el.querySelector(".tpl-public-stat__value");
      if(!valueEl) return;

      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if(reduced || target < 2){
        valueEl.textContent = fmt(target);
        return;
      }

      const duration = 650;
      const start = performance.now();
      const animate = now => {
        const p = Math.min(1,(now-start)/duration);
        const eased = 1 - Math.pow(1-p,3);
        valueEl.textContent = fmt(Math.round(target*eased));
        if(p < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    });
  }

  async function init(){
    const local = localCounts();
    render(local);

    const remote = await supabaseCounts();
    if(remote){
      render({...local,...remote});
      const note = $("[data-tpl-stats-note]");
      if(note) note.textContent = "Datos actualizados desde la plataforma.";
    }else{
      const note = $("[data-tpl-stats-note]");
      if(note) note.textContent = "Catálogo actual; proyectos y visitas se activarán al conectar la plataforma.";
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else{
    init();
  }
})();
