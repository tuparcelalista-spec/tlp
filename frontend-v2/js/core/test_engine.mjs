import { TPLLandEngine } from './valuation-engine.js';

const parcels = [
  {
    name: "Parcela User Test",
    superficie: 5000,
    comuna: "Nacimiento",
    region: "Biobío",
    electricity: "factibilidad", 
    water: "factibilidad",
    rol: "rol_vigente",
    topography: "suave_lomaje",
    condominio: "condominio",
    nature: "bosque nativo",
    majorCityDistanceKm: 120, // Concepción
    communeDistanceKm: 50     // Nacimiento
  }
];

const fmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

parcels.forEach((p, i) => {
    const res = TPLLandEngine.calculate(p);
    
    console.log(`\n--- [TEST] ${p.name} ---`);
    console.log(`Superficie: ${p.superficie} m2 | Comuna: ${p.comuna}`);
    if(res) {
        console.log(`- Valor Base Territorial: ${fmt.format(res.baseTerritorial)}`);
        console.log(`- Suma de Ajustes:     ${res.sumaAjustes * 100}%`);
        console.log(`- Valor TPL Tasador:   ${fmt.format(res.valor_tpl_tasador)}`);
        console.log(`- Valor Comunal Bruto: ${fmt.format(res.valor_comunal)}`);
        console.log(`- Valor Recomendado:   ${fmt.format(res.valor_recomendado)}`);
        console.log(`- Valor Venta Apuro:   ${fmt.format(res.valor_venta_apuro)}`);
        
        console.log(`\nDesglose de Ajustes:`);
        res.adjustments.forEach(adj => {
            console.log(`  * ${adj.label}: ${adj.pct > 0 ? '+' : ''}${adj.pct * 100}%`);
        });
    } else {
        console.log("Error en el cálculo.");
    }
});
