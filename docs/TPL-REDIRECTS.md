# Matriz de Redirecciones 301 — Tu Parcela Lista (TPL)

Este documento registra formalmente la tabla de redirecciones de rutas legacy (`frontend-v2`, archivos `.html` y URLs históricas) hacia la arquitectura moderna Next.js (`apps/publico`), implementada en cumplimiento del hito **P1-08** y del Plan Maestro §13.

---

## 1. Mapeo de Rutas Legacy → Moderno (HTTP 301 Permanent)

| Ruta Origen (Legacy) | Destino Canónico (Next.js) | Tipo | Motivo y Justificación |
|---|---|---|---|
| `/index.html` | `/` | 301 Permanente | Evita duplicidad de indexación de la Home |
| `/cotizador.html` | `/cotizador` | 301 Permanente | Migración del configurador de parcelas + vivienda |
| `/como-comprar.html` | `/como-comprar` | 301 Permanente | Página informativa de proceso de compra |
| `/campo-chileno.html` | `/campo-chileno` | 301 Permanente | Contenido editorial / regional |
| `/terminos.html` | `/terminos` | 301 Permanente | Términos y condiciones legales |
| `/politica-privacidad.html` | `/privacidad` | 301 Permanente | Unificación de nomenclatura legal |
| `/privacidad.html` | `/privacidad` | 301 Permanente | URL corta de política de privacidad |
| `/red-partner-v2.html` | `/red-partner` | 301 Permanente | Portal y landing de la red de partners comerciales |
| `/red-partner-v2/:path*` | `/red-partner` | 301 Permanente | Sub-rutas o links profundos de campañas anteriores |
| `/red-partner.html` | `/red-partner` | 301 Permanente | URL partner v1 |
| `/publicar.html` | `/publicar` | 301 Permanente | Flujo de captación de parcelas de propietarios |
| `/publicar-v2.html` | `/publicar` | 301 Permanente | Flujo v2 de captación de propietarios |
| `/tasador.html` | `/publicar` | 301 Permanente | Tasador online (integrado en el flujo de publicación) |
| `/propiedades.html` | `/propiedades` | 301 Permanente | Catálogo general de propiedades |
| `/parcela.html` | `/propiedades` | 301 Permanente | Fichas legacy; Next.js preserva los parámetros (`?id=...`) |

---

## 2. Exclusiones en `robots.txt`

Las siguientes rutas se encuentran explícitamente bloqueadas para rastreadores de motores de búsqueda:

1. `/search-demo`: Entorno interno de pruebas del motor de búsqueda.
2. `/mi-parcela`: Portal privado de propietario accesible exclusivamente por token UUID seguro (incluye adicionalmente `X-Robots-Tag: noindex, nofollow`).
3. `/design-system`: Catálogo interno de componentes de diseño `@tpl/ui`.

---

## 3. Implementación Técnica

- **Configuración de servidor**: declarada en `apps/publico/next.config.mjs` bajo `async redirects()`.
- **Preservación de parámetros**: En Next.js, las redirecciones estáticas mantienen automáticamente la query string (por ejemplo `/parcela.html?id=venega_nipas` redirige a `/propiedades?id=venega_nipas`).
