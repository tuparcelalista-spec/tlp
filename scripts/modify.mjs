import fs from 'fs';

let content = fs.readFileSync('supabase/functions/_shared/tpl-land-engine.js', 'utf8');

content = content.replace(
  "const ENGINE_VERSION = 'tpl-land-engine-v2.3.1-recalibrated-20260810';",
  "const ENGINE_VERSION = 'tpl-land-engine-v2.4-sim';"
);

content = content.replace(
  /surfaceBands:\s*Object\.freeze\(\[([\s\S]*?)\]\),/,
  `surfaceBands: Object.freeze([
    Object.freeze({ upTo: 7000, rate: 2000 }),
    Object.freeze({ upTo: 10000, rate: 1500 }),
    Object.freeze({ upTo: 30000, rate: 1500 }),
    Object.freeze({ upTo: 50000, rate: 1200 }),
    Object.freeze({ upTo: 100000, rate: 950 }),
    Object.freeze({ upTo: Infinity, rate: 800 })
  ]),`
);

content = content.replace(
  /majorCityDistanceMultipliers:\s*Object\.freeze\(\[([\s\S]*?)\]\),/,
  `majorCityDistanceMultipliers: Object.freeze([
    Object.freeze({ maxKm: 10, multiplier: 3.0, label: '0 a 10 km' }),
    Object.freeze({ maxKm: 20, multiplier: 2.7, label: '10 a 20 km' }),
    Object.freeze({ maxKm: 30, multiplier: 2.4, label: '20 a 30 km' }),
    Object.freeze({ maxKm: 40, multiplier: 2.1, label: '30 a 40 km' }),
    Object.freeze({ maxKm: 50, multiplier: 1.8, label: '40 a 50 km' }),
    Object.freeze({ maxKm: 70, multiplier: 1.6, label: '50 a 70 km' }),
    Object.freeze({ maxKm: 100, multiplier: 1.4, label: '70 a 100 km' }),
    Object.freeze({ maxKm: 150, multiplier: 1.2, label: '100 a 150 km' }),
    Object.freeze({ maxKm: Infinity, multiplier: 1.0, label: 'Más de 150 km' })
  ]),`
);

content = content.replace(
  /seasonalAdjustmentFactor:\s*0\.83.*?\n/,
  `// seasonalAdjustmentFactor: 0.83 // Removed for V2.4\n`
);

content = content.replace(
  /const CALIBRATION_FACTOR = 1;[\s\S]*?const applyCanonicalCalibration[\s\S]*?;/,
  ``
);

// We need to carefully replace the end of `calculate` to output the correct 4 values.
const calculateEndRegex = /const routeKm=Math\.max[\s\S]*?valorTplTasadorBase=technicalPotential;[\s\S]*?return\s*\{/;
const newCalculateEnd = `const routeKm=Math.max(0,Number(input.routeDistanceKm)||0);
  const valorTplTasadorBase=technicalPotential;
  const valorFinal = technicalPotential; // no seasonal adjustment

  const promedio_m2_comunal = Number(input.promedio_m2_comunal) || (market?.medianM2 || 0);
  const valorComunal = roundPrice(promedio_m2_comunal * area);
  
  const valorPromedioReferencia = roundPrice((valorFinal + valorComunal) / 2);
  const valorPorApuro = roundPrice(valorFinal * 0.93);

  const valorVentaReal = roundPrice(area * 1590.48);
  const recommended = valorFinal;
  const agile = valorPorApuro;
  const patient = roundPrice(valorFinal * RULES.patientFactor);
  const immediateBase = roundPrice(area * RULES.ruralImmediateClosingM2);
  const immediateReference = normalize(input.tourism) === 'nacional' ? null : roundPrice((valorFinal * .90 + immediateBase) / 2);

  const propertyIndex = input.propertyIndex?.score !== undefined ? input.propertyIndex : calculatePropertyIndex(input);
  const territorialIndex = input.territorialIndex?.score !== undefined ? input.territorialIndex : calculateTerritorialIndex(input.nearbyContext || {}, { majorCityDistanceKm: majorKm, distanceKm: majorKm, tourism: input.tourism });
  const asking = Number(input.asking) || 0, publishedM2 = asking && area ? Math.round(asking / area) : null, tplM2 = area ? Math.round(valorFinal / area) : null, marketM2 = market?.medianM2 || null;
  const priceVsTplPct = publishedM2 && tplM2 ? ((publishedM2 - tplM2) / tplM2 * 100) : null;
  const classification = priceVsTplPct === null ? 'Sin precio publicado' : priceVsTplPct <= -20 ? 'Oportunidad destacada' : priceVsTplPct <= -10 ? 'Precio atractivo' : priceVsTplPct <= 10 ? 'Precio competitivo' : priceVsTplPct <= 20 ? 'Sobre estimación' : 'Precio elevado';

  return {
    valorFinal,
    valorComunal,
    valorPromedioReferencia,
    valorPorApuro,
    // compat
    quick: agile, ideal: recommended, patient,
    agile, recommended, technicalPotential: valorTplTasadorBase, patientPotential: patient, immediateReference,
    valorTplTasadorBase, valorVentaReal,
    valor_tpl_tasador_base: valorTplTasadorBase,
    valor_tpl_tasador: valorFinal,
    valor_comunal: valorComunal,
    valor_venta_real_tpl: valorVentaReal,
    valor_recomendado: recommended,
    valor_venta_apuro: valorPorApuro,
    reference: valorFinal, low: agile, high: valorTplTasadorBase,
    asking, area, location: input.location || '', region: input.region || '', comuna: input.comuna || '',
    base: surfacePricing.base, surfacePricing, territorialBase, commercialBase: territorialBase,
    territorialBlend, cityDistance: territorialBlend.major, distanceMultiplier: territorialBlend.multiplier,
    nearestCity: input.nearestCity ? { name: input.nearestCity.name, category: input.nearestCity.category || '', distanceKm: Number(majorKm.toFixed(1)) } : null,
    communeDistanceKm: Number.isFinite(Number(input.communeDistanceKm)) ? Number(input.communeDistanceKm) : null,
    marketReference: market, marketBlend: { technicalWeight: 1, marketWeight: 0, independent: true, isolationApplied: false },
    propertyIndex, territorialIndex, nearbyContext: input.nearbyContext || null,
    priceAnalysis: { publishedM2, tplM2, marketM2, priceVsTplPct, classification, opportunity: priceVsTplPct !== null && priceVsTplPct <= -15 },
    adjustments: adjustments.map(x => ({ ...x, amount: Math.round(territorialBase * x.pct) })), adjustmentGroups: groupedAdjustments.groups, adjustmentRationale: groupedAdjustments.rationale, totalPct, adjustmentFactor,
    score: Math.round(propertyIndex.score * .55 + territorialIndex.score * .45), coverage: 'motor_tpl_v2', source: 'tpl_land_engine_local', persisted: false, method: ENGINE_VERSION, engineVersion: ENGINE_VERSION,
    cautions: [...(area >= 10000 && !market ? ['No existe una referencia comunal validada del mismo rango de superficie; el Valor TPL sigue siendo técnico e independiente.'] : []), ...(immediateReference === null ? ['La referencia de venta inmediata rural no se muestra para turismo nacional.'] : [])]
  };`;

content = content.replace(/const routeKm=Math\.max[\s\S]*?return\s*\{[\s\S]*?cautions:.*?\n\s*\};/, newCalculateEnd);

content = content.replace(/CALIBRATION_FACTOR,/g, '');
content = content.replace(/applyCanonicalCalibration,/g, '');

fs.writeFileSync('scripts/tpl-land-engine-v24-sim.js', content);
