import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Config explícita — `@tpl/core` no lee variables de entorno por su cuenta.
 * Cada consumidor (app Next.js, script de smoke test, etc.) decide de dónde
 * saca `url`/`anonKey` y se los pasa aquí. Esto mantiene el paquete
 * independiente de cualquier convención de nombres de variables de entorno
 * todavía no decidida para `apps/publico`.
 *
 * `anonKey` debe ser SIEMPRE la clave pública `anon` (sujeta a RLS). Esta
 * fábrica no valida el contenido de la clave — es responsabilidad de quien
 * la invoca nunca pasar `service_role`.
 */
export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

/**
 * Fábrica de cliente Supabase de solo lectura pública. NO es un singleton
 * forzado: cada llamada crea una instancia nueva e independiente — quien la
 * use decide si la reutiliza (ej. una sola instancia por request) o crea
 * una por llamada.
 */
export function createSupabasePublicClient(config: SupabasePublicConfig): SupabaseClient {
  if (!config.url || !config.anonKey) {
    throw new Error("createSupabasePublicClient: se requieren 'url' y 'anonKey' (clave pública anon).");
  }
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false },
  });
}
