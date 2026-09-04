// Antes esto devolvia `window.supabase`, que es el NAMESPACE de la libreria del
// CDN, no un cliente: `client.rpc(...)` no existe ahi y toda la capa de datos
// fallaba en silencio. El proyecto ya tiene un cliente configurado y con sesion
// persistente en js/core/tpl-data-service.js; se usa ese.
export async function getClient() {
  if (!window.TPLDataService?.getClient) {
    throw new Error('El servicio de datos de TPL no está cargado en esta página.');
  }
  return window.TPLDataService.getClient();
}

export async function rpc(nombre, args = {}) {
  const client = await getClient();
  const { data, error } = await client.rpc(nombre, args);
  if (error) throw error;
  return data;
}
