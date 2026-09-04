const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/publicar/tpl-land-engine.js', 'utf8');

const nubleAndBiobio = `
      // Nuble
      cobquecura: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:6500, p25M2:5000, p75M2:8000, sampleSize:15, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      coelemu: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5200, p25M2:4000, p75M2:6500, sampleSize:10, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      ninhue: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4000, p25M2:3000, p75M2:5000, sampleSize:8, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      portezuelo: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:8, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      quirihue: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:10, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      treguaco: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4200, p25M2:3200, p75M2:5200, sampleSize:7, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      bulnes: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5000, p25M2:3800, p75M2:6200, sampleSize:12, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      chillan: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:8000, p25M2:6000, p75M2:10000, sampleSize:25, observedAt:'2026-08-17', confidence:'alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'chillan viejo': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:7000, p25M2:5500, p75M2:8500, sampleSize:18, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'el carmen': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:9, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      pemuco: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4200, p25M2:3200, p75M2:5200, sampleSize:7, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      pinto: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:8500, p25M2:6500, p75M2:10500, sampleSize:22, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'san ignacio': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:9, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      yungay: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4800, p25M2:3800, p75M2:5800, sampleSize:10, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      coihueco: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5500, p25M2:4500, p75M2:6500, sampleSize:14, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      niquen: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4000, p25M2:3000, p75M2:5000, sampleSize:6, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'san carlos': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5000, p25M2:4000, p75M2:6000, sampleSize:16, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'san fabian': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5500, p25M2:4500, p75M2:6500, sampleSize:11, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'san nicolas': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4800, p25M2:3800, p75M2:5800, sampleSize:10, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),

      // Biobio
      concepcion: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:12000, p25M2:9000, p75M2:15000, sampleSize:35, observedAt:'2026-08-17', confidence:'alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      coronel: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:7000, p25M2:5500, p75M2:8500, sampleSize:18, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      chiguayante: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:11000, p25M2:8000, p75M2:14000, sampleSize:25, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      hualqui: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:6500, p25M2:5000, p75M2:8000, sampleSize:20, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      lota: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5000, p25M2:3800, p75M2:6200, sampleSize:12, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      penco: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:6500, p25M2:5000, p75M2:8000, sampleSize:18, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'san pedro de la paz': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:11000, p25M2:8000, p75M2:14000, sampleSize:28, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'santa juana': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5500, p25M2:4200, p75M2:6800, sampleSize:15, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      talcahuano: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:9000, p25M2:7000, p75M2:11000, sampleSize:20, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      tome: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:6500, p25M2:5000, p75M2:8000, sampleSize:19, observedAt:'2026-08-17', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      hualpen: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:9000, p25M2:7000, p75M2:11000, sampleSize:15, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      lebu: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:8, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      arauco: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5000, p25M2:3800, p75M2:6200, sampleSize:10, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      canete: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:9, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      contulmo: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4800, p25M2:3800, p75M2:5800, sampleSize:10, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      curanilahue: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4000, p25M2:3000, p75M2:5000, sampleSize:7, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'los alamos': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4000, p25M2:3000, p75M2:5000, sampleSize:7, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      tirua: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:3800, p25M2:2800, p75M2:4800, sampleSize:5, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'los angeles': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:8500, p25M2:6500, p75M2:10500, sampleSize:25, observedAt:'2026-08-17', confidence:'alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      antuco: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5000, p25M2:3800, p75M2:6200, sampleSize:8, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      cabrero: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:6000, p25M2:4500, p75M2:7500, sampleSize:14, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      laja: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5000, p25M2:3800, p75M2:6200, sampleSize:10, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      mulchen: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:11, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      quilaco: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:8, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      quilleco: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4500, p25M2:3500, p75M2:5500, sampleSize:8, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'san rosendo': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4200, p25M2:3200, p75M2:5200, sampleSize:6, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'santa barbara': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5500, p25M2:4200, p75M2:6800, sampleSize:12, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      tucapel: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4800, p25M2:3800, p75M2:5800, sampleSize:10, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
      'alto biobio': Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4000, p25M2:3000, p75M2:5000, sampleSize:6, observedAt:'2026-08-17', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] })
`;

const targetRegex = /caburgua: Object\.freeze\(\{[\s\S]*?\}\)/;

if (js.match(targetRegex)) {
    js = js.replace(targetRegex, `caburgua: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:10300, p25M2:9625, p75M2:12385, sampleSize:8, observedAt:'2026-07-29', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'], aliasOf:'pucon' })${nubleAndBiobio}`);
    fs.writeFileSync('frontend-v2/plataforma/publicar/tpl-land-engine.js', js, 'utf8');
    console.log('Communes added to tpl-land-engine.js');
} else {
    console.log('Regex failed');
}
