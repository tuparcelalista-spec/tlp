export function parseSearchQuery(query) {
    if (!query) return { keyword: '' };
    
    let keyword = query.toLowerCase();
    const result = {};
    
    // Parse superficie (e.g., 5000 m2, 5.000m², 5000 mt2)
    const surfaceRegex = /(\d+(?:\.\d+)?)\s*(?:m2|mt2|m²)/i;
    const match = keyword.match(surfaceRegex);
    if (match) {
        const value = parseFloat(match[1].replace(/\./g, ''));
        result.superficie_min = value * 0.85;
        result.superficie_max = value * 1.15;
        keyword = keyword.replace(match[0], '');
    }

    // Parse attributes
    const attributes = [
        { key: 'tiene_rio', words: ['río', 'rio'] },
        { key: 'es_plana', words: ['plana', 'plano'] },
        { key: 'tiene_bosque', words: ['bosque', 'arboles'] },
        { key: 'tiene_agua', words: ['agua'] },
        { key: 'tiene_luz', words: ['luz', 'electricidad'] },
        { key: 'tiene_lago', words: ['lago', 'laguna'] },
        { key: 'tiene_asfalto', words: ['asfalto', 'pavimento'] }
    ];

    attributes.forEach(attr => {
        attr.words.forEach(word => {
            const regexWithSin = new RegExp(`sin\\s+${word}`, 'i');
            const regexCon = new RegExp(`(?:con\\s+)?${word}`, 'i');
            
            if (regexWithSin.test(keyword)) {
                result[attr.key] = false;
                keyword = keyword.replace(regexWithSin, '');
            } else if (regexCon.test(keyword)) {
                result[attr.key] = true;
                keyword = keyword.replace(regexCon, '');
            }
        });
    });

    result.keyword = keyword.replace(/\s+/g, ' ').trim();
    return result;
}
