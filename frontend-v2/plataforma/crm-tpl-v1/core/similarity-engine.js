export function calculateSimilarity(target, comparable) {
    let score = 0;
    
    // 30% Location (comuna match)
    if (target.comuna && comparable.comuna && target.comuna.toLowerCase() === comparable.comuna.toLowerCase()) {
        score += 30;
    }

    // 20% Superficie gap
    if (target.superficie && comparable.superficie) {
        const gap = Math.abs(target.superficie - comparable.superficie) / Math.max(target.superficie, comparable.superficie);
        if (gap <= 0.1) score += 20;
        else if (gap <= 0.2) score += 15;
        else if (gap <= 0.3) score += 10;
        else if (gap <= 0.5) score += 5;
    }

    // 15% Price/m2 gap
    if (target.precio && target.superficie && comparable.precio && comparable.superficie) {
        const targetPriceM2 = target.precio / target.superficie;
        const compPriceM2 = comparable.precio / comparable.superficie;
        const gap = Math.abs(targetPriceM2 - compPriceM2) / Math.max(targetPriceM2, compPriceM2);
        
        if (gap <= 0.1) score += 15;
        else if (gap <= 0.2) score += 10;
        else if (gap <= 0.3) score += 5;
    }

    // 35% Attribute match
    const attributes = ['tiene_luz', 'tiene_agua', 'es_plana', 'tiene_rio', 'tiene_bosque', 'tiene_lago', 'tiene_asfalto'];
    let attrScore = 0;
    let attrCount = 0;
    
    attributes.forEach(attr => {
        if (target[attr] !== undefined && target[attr] !== null) {
            attrCount++;
            if (target[attr] === comparable[attr]) {
                attrScore++;
            }
        }
    });

    if (attrCount > 0) {
        score += (attrScore / attrCount) * 35;
    } else {
        score += 35; // Default full points for attributes if none provided to compare
    }

    return Math.min(100, Math.round(score));
}
