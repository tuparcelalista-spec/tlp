# Informe inicial de mercado observado — Región del Biobío

## Alcance

Fuentes recibidas: PortalTerreno, PortalInmobiliario y Yapo. En la revisión inicial fue posible leer resultados estructurados de las páginas principales de PortalTerreno y PortalInmobiliario. Yapo no entregó contenido utilizable en esta captura, por lo que queda registrado como fuente pendiente y no se inventaron datos.

## Inventario visible de las fuentes

| Fuente | Resultados informados | Datos útiles visibles |
|---|---:|---|
| PortalTerreno | 256 | precio, superficie, comuna, tipo, URL |
| PortalInmobiliario | 481 | precio, comuna, superficie total/útil, dormitorios, baños, piscina y otros filtros |
| Yapo | No verificable en esta captura | Fuente registrada para revisión posterior |

## Comunas con mayor inventario visible en PortalInmobiliario

| Comuna | Avisos visibles en el filtro regional |
|---|---:|
| Los Ángeles | 189 |
| Florida | 46 |
| Yumbel | 44 |
| Cabrero | 31 |
| Hualqui | 21 |
| Santa Juana | 20 |
| Concepción | 17 |
| Tomé | 15 |
| Laja | 14 |

## Reglas aplicadas al Tasador

1. Mercado observado nunca reemplaza el motor técnico TPL.
2. Parcela: menos de 10.000 m²; campo: 10.000–39.999 m²; predio: 40.000 m² o más.
3. No se mezclan parcelas, campos y predios.
4. Una propiedad con casa se compara solo con propiedades con casa.
5. Para una casa de 120 m² se priorizan casas de 100–140 m², misma comuna y dormitorios ±1.
6. El terreno comparable debe estar entre 70% y 130% de la superficie analizada.
7. Menos de 5 comparables: referencia informativa sin influencia en el valor.
8. 5–9: peso máximo 10%; 10–14: 20%; 15 o más: 25%.
9. Se usan medianas y percentiles, no promedio simple, para reducir el efecto de avisos extremos.
10. Los avisos repetidos se deduplican por URL y hash.

## Observaciones de calidad

- Los precios son de oferta, no precios de cierre.
- Algunas publicaciones etiquetadas como “parcela” contienen casas, campos o predios; la clasificación debe basarse en superficie y atributos reales.
- En algunos avisos la superficie útil corresponde a la vivienda y en otros al terreno. Por eso se conservan ambos campos por separado.
- Los precios en UF deben convertirse usando la UF de la fecha de captura y conservar el valor original.
