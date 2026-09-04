const fs = require('fs');
let js = fs.readFileSync('frontend-v2/js/parcela.js', 'utf8');

const expertLogic = `
                    // EXPERT ANALYSIS GENERATION
                    const generateExpertAnalysis = (parcel, vData, pubPrice) => {
                        const comuna = parcel.comuna || 'la zona';
                        const base = money(vData.valorComunalBase);
                        const tasacion = money(vData.valorRecomendado);
                        const pub = money(pubPrice);
                        
                        let attrs = [];
                        const text = (parcel.naturaleza + " " + parcel.descripcion).toLowerCase();
                        const normalize = (v) => String(v || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
                        const positive = (v) => ["si","sí","true","1","disponible","incluido","con"].some(x => normalize(v) === normalize(x));
                        
                        if (positive(parcel.agua) || text.includes('agua')) attrs.push("factibilidad de agua");
                        if (positive(parcel.luz) || text.includes('luz') || text.includes('electr')) attrs.push("acceso a electricidad");
                        if (positive(parcel.rol) || text.includes('rol propio')) attrs.push("rol propio");
                        if (text.match(/\\brio\\b/) || text.match(/\\brío\\b/) || text.match(/\\blago\\b/) || text.match(/\\besteros?\\b/)) attrs.push("atractivo hidrológico natural");
                        if (text.includes("vista") || text.includes("mirador")) attrs.push("vista privilegiada");
                        if (text.includes("bosque") || text.includes("nativo")) attrs.push("bosque nativo");
                        
                        let attrsText = attrs.length > 0 ? (attrs.length === 1 ? attrs[0] : attrs.slice(0, -1).join(", ") + " y " + attrs[attrs.length - 1]) : "sus características actuales";

                        let conclusion = "";
                        const diff = (vData.valorRecomendado - pubPrice) / vData.valorRecomendado;
                        if (diff > 0.15) {
                            conclusion = ". Al cotizar un " + Math.round(diff * 100) + "% por debajo de nuestra tasación, <b>estamos frente a una clara oportunidad de inversión</b> y un excelente refugio de capital.";
                        } else if (diff >= -0.05 && diff <= 0.15) {
                            conclusion = ". El valor solicitado <b>se encuentra en perfecto equilibrio con el estándar justo de mercado</b>, garantizando una adquisición libre de sobreprecios.";
                        } else {
                            conclusion = ". El precio publicado se posiciona por sobre nuestra banda técnica estándar. Nuestro equipo recomienda auditar presencialmente la propiedad para evaluar si atributos de exclusividad (como desarrollos premium o vistas únicas) justifican este diferencial.";
                        }
                        
                        return "Como tasadores de Tu Parcela Lista, hemos cruzado los datos de catastro en " + comuna + ". Un terreno estándar en este sector ronda los " + base + ". No obstante, al auditar esta propiedad y sumar " + attrsText + ", nuestro dictamen técnico eleva su valor real a " + tasacion + conclusion;
                    };
                    
                    const expertHtml = "<div style='margin-top: 20px; padding: 20px; background: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 8px;'><h4 style='margin:0 0 10px 0; color: #0369a1; display:flex; align-items:center; gap:8px;'><svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'></path><polyline points='14 2 14 8 20 8'></polyline><line x1='16' y1='13' x2='8' y2='13'></line><line x1='16' y1='17' x2='8' y2='17'></line><polyline points='10 9 9 9 8 9'></polyline></svg> Análisis del Experto TPL</h4><p style='margin:0; font-size: 14px; color: #0f172a; line-height: 1.6; font-style: italic;'>" + generateExpertAnalysis(parcel, vData, pubPrice) + "</p></div>";
`;

// Insert after timelineHtml is assigned
js = js.replace(/(const timelineHtml = `[\s\S]*?`;)/, match => match + '\n' + expertLogic);
js = js.replace(/container\.innerHTML = timelineHtml;/, 'container.innerHTML = timelineHtml + expertHtml;');

fs.writeFileSync('frontend-v2/js/parcela.js', js);
console.log('Injected Expert Analysis section successfully.');
