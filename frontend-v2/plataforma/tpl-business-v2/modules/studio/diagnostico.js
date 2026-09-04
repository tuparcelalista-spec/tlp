/**
 * DIAGNÓSTICO DE LA PARCELA
 *
 * Es lo que decide qué plan se recomienda. Sin esto el Studio sería un
 * catálogo de productos: se le vendería una campaña a quien tiene el precio
 * 76% sobre la tasación, y el presupuesto se quemaría contra un aviso que
 * nadie va a llamar. Primero se arregla lo que impide vender; recién después
 * se paga por tráfico.
 *
 * Cada hallazgo trae `bloquea: true` cuando gastar en publicidad antes de
 * resolverlo es tirar el dinero.
 */

const BRECHA_TOLERADA = 0.10;  // 10% sobre la tasación se considera negociable
const BRECHA_GRAVE = 0.25;     // sobre esto, la campaña no compensa
const FOTOS_MINIMAS = 5;

export function diagnosticar(propiedad, tasacion, fotosReales = null) {
  let meta = propiedad?.metadata;
  if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = null; } }
  const m = meta || {};

  const hallazgos = [];
  // Fuente de verdad: tpl_propiedad_imagenes (fotosReales, contado en
  // boot.js). Antes solo se contaba metadata.imagenes — el patrón viejo de
  // URLs sueltas — así que una propiedad con fotos subidas por el gestor de
  // fotos del CRM o del portal del propietario aparecía como "sin fotos".
  // Se mantiene metadata.imagenes como respaldo para las 32 parcelas
  // sembradas que aún dependen de ese patrón.
  const fotosMetadata = Array.isArray(m.imagenes) ? m.imagenes.filter(Boolean).length : 0;
  const fotos = typeof fotosReales === 'number' ? fotosReales : fotosMetadata;
  const tieneVideo = Boolean(m.videoUrl);
  const publicado = Number(propiedad?.precio_publicado) || 0;
  const descripcion = String(propiedad?.descripcion || '').trim();

  // --- Precio contra la tasación -------------------------------------------
  if (tasacion && publicado) {
    const brecha = (publicado - tasacion.valorRecomendado) / tasacion.valorRecomendado;
    if (brecha > BRECHA_GRAVE) {
      hallazgos.push({
        clave: 'precio_alto',
        bloquea: true,
        titulo: `Tu precio está ${Math.round(brecha * 100)}% sobre la tasación`,
        detalle: `Publicas en ${fmt(publicado)} y la tasación TPL es ${fmt(tasacion.valorRecomendado)}. ` +
                 `Una campaña traería visitas que se van al ver el precio: pagarías por clics que no llaman.`,
        accion: 'Ajusta el precio o declara los atributos que lo justifican antes de invertir en publicidad.',
      });
    } else if (brecha > BRECHA_TOLERADA) {
      hallazgos.push({
        clave: 'precio_sobre',
        bloquea: false,
        titulo: `Tu precio está ${Math.round(brecha * 100)}% sobre la tasación`,
        detalle: `Es un margen de negociación razonable, pero acorta el número de interesados.`,
        accion: `Si tienes prisa, ${fmt(tasacion.valorRecomendado)} es el precio que el mercado valida.`,
      });
    } else if (brecha < -0.15) {
      hallazgos.push({
        clave: 'precio_bajo',
        bloquea: false,
        titulo: 'Tu precio está bajo la tasación',
        detalle: `Publicas en ${fmt(publicado)} y la tasación es ${fmt(tasacion.valorRecomendado)}. ` +
                 `Es una posición fuerte para vender rápido.`,
        accion: 'Con este precio, la publicidad rinde: hay margen real frente a la competencia.',
      });
    }
  }

  if (!publicado) {
    hallazgos.push({
      clave: 'sin_precio',
      bloquea: true,
      titulo: 'Tu ficha no tiene precio publicado',
      detalle: 'Un aviso sin precio recibe muchas menos consultas, y las que llegan preguntan solo eso.',
      accion: 'Publica un precio antes de invertir en campañas.',
    });
  }

  // --- Material de venta ----------------------------------------------------
  if (fotos < FOTOS_MINIMAS) {
    hallazgos.push({
      clave: 'pocas_fotos',
      bloquea: fotos < 3,
      titulo: fotos === 0 ? 'Tu ficha no tiene fotos' : `Tienes ${fotos} ${fotos === 1 ? 'foto' : 'fotos'}`,
      detalle: 'En una parcela el entorno es el producto. Bajo cinco fotos la gente no se hace una idea del lugar.',
      accion: 'Súmale fotos del terreno, el acceso, la vista y el entorno.',
    });
  }

  if (!tieneVideo) {
    hallazgos.push({
      clave: 'sin_video',
      bloquea: false,
      titulo: 'Tu ficha no tiene video',
      detalle: 'Un recorrido grabado con el teléfono muestra la pendiente, el acceso y el silencio del lugar. Las fotos no.',
      accion: 'Graba un recorrido de un minuto caminando el terreno.',
    });
  }

  if (descripcion.length < 200) {
    hallazgos.push({
      clave: 'descripcion_corta',
      bloquea: false,
      titulo: 'Tu descripción es breve',
      detalle: 'Google necesita texto para entender qué vendes, y el comprador para decidir si vale el viaje.',
      accion: 'Podemos redactarla con la IA de TPL usando los datos que ya tienes.',
    });
  }

  // --- Antecedentes que el motor no pudo aplicar ---------------------------
  const faltantes = [
    ['rol_situacion', 'situación del rol'],
    ['agua', 'solución de agua'],
    ['electricidad', 'electricidad'],
    ['acceso', 'tipo de acceso'],
    ['topografia', 'topografía'],
  ].filter(([campo]) => !String(propiedad?.[campo] || '').trim());

  if (faltantes.length) {
    hallazgos.push({
      clave: 'antecedentes',
      bloquea: false,
      titulo: `Faltan ${faltantes.length} ${faltantes.length === 1 ? 'antecedente' : 'antecedentes'} por declarar`,
      detalle: `Sin ${faltantes.map(([, n]) => n).join(', ')}, la tasación no pudo aplicar esos ajustes: ` +
               'es valor que tu propiedad quizá tiene y no se le está reconociendo.',
      accion: 'Completarlos puede subir tu Valor TPL sin cambiar nada en el terreno.',
    });
  }

  const bloqueantes = hallazgos.filter((h) => h.bloquea);
  const listaParaCampana = bloqueantes.length === 0;

  return {
    hallazgos,
    bloqueantes,
    listaParaCampana,
    fotos,
    tieneVideo,
    // Puntaje de preparación: cuánto del material de venta está resuelto.
    preparacion: Math.max(0, Math.round(100 - (hallazgos.length * 12) - (bloqueantes.length * 18))),
  };
}

const fmt = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(n) || 0);
