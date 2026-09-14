import { vacio, camposFaltantes, montoOGuion, previewDePublicacion, type PropiedadEnRevision, type FotoPublicacion, type PublicacionRevision } from "../data";

let passed = 0;
let failed = 0;

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`FALLÓ: ${message}\n  esperado: ${JSON.stringify(expected)}\n  obtenido: ${JSON.stringify(actual)}`);
  }
}

function propiedad(overrides: Partial<PropiedadEnRevision>): PropiedadEnRevision {
  return {
    id: "p-1",
    titulo: "Parcela El Boldo",
    tipo: "parcela",
    comuna: "Yumbel",
    region: "Biobío",
    sector: null,
    superficie_m2: 5000,
    precio_publicado: 45000000,
    descripcion: "Parcela con vista al río.",
    rol_situacion: "regularizado",
    agua: "pozo",
    electricidad: "empalme propio",
    acceso: "camino ripiado",
    topografia: "plana",
    suelo: null,
    cierre_perimetral: null,
    porton: null,
    atributos_naturales: null,
    casa_datos: null,
    metadata: null,
    lat: null,
    lng: null,
    ...overrides,
  };
}

function foto(id: string): FotoPublicacion {
  return { id, url: `https://cdn.example.com/${id}.jpg`, storage_path: `${id}.jpg`, orden: 0, metadata: null };
}

function publicacion(overrides: Partial<PublicacionRevision>): PublicacionRevision {
  return {
    id: "pub-1",
    codigo: "TPL-001",
    tipo: "parcela",
    estado: "enviada",
    origen: "publicador",
    datos: null,
    motivo_revision: null,
    enviada_at: "2026-09-10T12:00:00.000Z",
    revisada_at: null,
    aprobada_at: null,
    created_at: "2026-09-10T12:00:00.000Z",
    updated_at: "2026-09-10T12:00:00.000Z",
    ...overrides,
  };
}

// 1. vacio(): null, undefined y "" cuentan como vacío; 0 y false NO.
{
  assertEqual(vacio(null), true, "null es vacío");
  assertEqual(vacio(undefined), true, "undefined es vacío");
  assertEqual(vacio(""), true, "cadena vacía es vacía");
  assertEqual(vacio(0), false, "0 NO es vacío (es un valor real)");
  assertEqual(vacio(false), false, "false NO es vacío (es un valor real)");
  assertEqual(vacio("Yumbel"), false, "una cadena con contenido no es vacía");
}

// 2. camposFaltantes: propiedad completa + con fotos → sin faltantes.
{
  const p = propiedad({});
  assertEqual(camposFaltantes(p, [foto("f1")]), [], "propiedad completa y con fotos no reporta ningún campo faltante");
}

// 3. camposFaltantes: varios campos vacíos + sin fotos → todos listados, "Fotos" al final.
{
  const p = propiedad({ superficie_m2: null, comuna: null, agua: null });
  assertEqual(
    camposFaltantes(p, []),
    ["Superficie", "Comuna", "Agua", "Fotos"],
    "reporta cada campo requerido vacío en el orden de CAMPOS_REQUERIDOS, más 'Fotos' al final si no trae ninguna",
  );
}

// 4. camposFaltantes: fotos undefined/null se trata igual que arreglo vacío (no revienta).
{
  const p = propiedad({});
  assertEqual(camposFaltantes(p, undefined), ["Fotos"], "fotos undefined no revienta y cuenta como sin fotos");
  assertEqual(camposFaltantes(p, null), ["Fotos"], "fotos null no revienta y cuenta como sin fotos");
}

// 5. montoOGuion: valores no positivos (incluido 0, null, undefined, negativo) devuelven "—".
{
  assertEqual(montoOGuion(0), "—", "0 se trata como dato faltante, no como precio real");
  assertEqual(montoOGuion(null), "—", "null devuelve guión");
  assertEqual(montoOGuion(undefined), "—", "undefined devuelve guión");
  assertEqual(montoOGuion(-100), "—", "un negativo devuelve guión");
  assertEqual(montoOGuion("no es un número"), "—", "texto no numérico devuelve guión");
}

// 6. montoOGuion: un valor positivo se formatea como moneda CLP (mismo Intl que usa la función).
{
  const esperado = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(45000000);
  assertEqual(montoOGuion(45000000), esperado, "un precio positivo se formatea como CLP sin decimales");
  assertEqual(montoOGuion("45000000"), esperado, "un precio positivo en formato string también se formatea (Number() lo convierte)");
}

// 7. previewDePublicacion: con `datos` completo, arma la fila tal como la pintaba el legacy.
{
  const pub = publicacion({
    codigo: "TPL-002",
    datos: { titulo: "Parcela Los Aromos", comuna: "Chillán", superficie: 8000, precio: 60000000 },
  });
  const preview = previewDePublicacion(pub);
  assertEqual(preview.titulo, "Parcela Los Aromos", "usa datos.titulo cuando viene");
  assertEqual(preview.codigo, "TPL-002", "usa el código de la publicación");
  assertEqual(preview.comuna, "Chillán", "usa datos.comuna cuando viene");
  assertEqual(preview.superficieLabel, "8.000 m²", "formatea la superficie con separador de miles y unidad");
  assertEqual(
    preview.precioLabel,
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(60000000),
    "formatea el precio pedido como CLP",
  );
  assertEqual(preview.fechaIso, "2026-09-10T12:00:00.000Z", "usa enviada_at cuando está presente");
}

// 8. previewDePublicacion: sin `datos` (null) cae a los mismos valores por defecto que `const d = r.datos || {}`.
{
  const pub = publicacion({ codigo: "TPL-003", datos: null, enviada_at: null });
  const preview = previewDePublicacion(pub);
  assertEqual(preview.titulo, "TPL-003", "sin datos.titulo, usa el código como título");
  assertEqual(preview.comuna, "—", "sin datos.comuna, muestra guión");
  assertEqual(preview.superficieLabel, "—", "sin datos.superficie, muestra guión");
  assertEqual(preview.precioLabel, "—", "sin datos.precio, muestra guión");
  assertEqual(preview.fechaIso, "2026-09-10T12:00:00.000Z", "sin enviada_at, cae a created_at");
}

// 9. previewDePublicacion: ni datos.titulo ni código → "Sin título" (mismo fallback final del legacy).
{
  const pub = publicacion({ codigo: null, datos: null });
  assertEqual(previewDePublicacion(pub).titulo, "Sin título", "sin datos.titulo ni código, cae al texto fijo 'Sin título'");
}

console.log(`\n${passed} pasaron, ${failed} fallaron.`);
if (failed > 0) process.exit(1);
