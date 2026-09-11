/**
 * Constantes de SEO — Fase 3.7. `SITE_URL` NO se hardcodea a
 * `www.parcelalista.cl` (ese dominio sigue siendo de `frontend-v2`
 * durante la coexistencia — ver `TPL-FASE-3-COEXISTENCIA-AUDITORIA.md`;
 * el mecanismo de corte de tráfico no se ha ejecutado). Se lee de
 * `NEXT_PUBLIC_SITE_URL`, con `localhost:3000` como respaldo de
 * desarrollo — cuando se decida el dominio real de coexistencia
 * (subdominio de prueba u otro), solo hace falta definir esa variable,
 * sin tocar código.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const SITE_NAME = "Tu Parcela Lista";
