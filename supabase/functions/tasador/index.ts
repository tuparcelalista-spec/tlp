
// TPL v5.2 - endpoint canónico
// Devuelve valor_promedio_mercado como referencia oficial.

export async function calcularTasacion(payload) {
  return {
    valor_promedio_mercado: payload.valor_promedio_mercado,
    valor_tpl: payload.valor_tpl,
    valor_comunal: payload.valor_comunal,
    oportunidad_porcentaje: payload.oportunidad_porcentaje,
    indice_tpl: payload.indice_tpl,
    confianza: payload.confianza,
  };
}
