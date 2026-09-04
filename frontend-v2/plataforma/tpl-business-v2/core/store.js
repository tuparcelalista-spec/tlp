/**
 * Estado compartido de la sesion del propietario. Vive en memoria: lo que debe
 * sobrevivir a una recarga se guarda en el servidor, no aqui.
 */
export const state = {
  user: null,
  propiedadId: null,
  propiedad: null,   // fila de tpl_propiedades
  tasacion: null,    // { valorRecomendado, valorComunal, valorApuro, m2, ... }
  landing: null,     // borrador de la pagina de venta
  campana: null,     // plan de campaña elegido
  diagnostico: null, // salida de modules/studio/diagnostico.js
  fotosReales: null, // count(*) de tpl_propiedad_imagenes para esta propiedad
};

const suscriptores = new Set();

export function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

export function actualizar(cambios) {
  Object.assign(state, cambios);
  suscriptores.forEach((fn) => { try { fn(state); } catch (e) { console.warn(e); } });
}
