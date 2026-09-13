import { calcularCompletionScore, calcularExpiracion, filtrarParcelas, regionesDisponibles, comunasDisponibles, type ParcelaResumen } from "../data";

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

function parcela(overrides: Partial<ParcelaResumen>): ParcelaResumen {
  return {
    id: "p-1",
    codigo: "COD-1",
    titulo: "Parcela",
    comuna: null,
    region: null,
    superficie_m2: null,
    precio_publicado: null,
    estado: "publicada",
    publicada_at: null,
    dias_publicada: 0,
    foto_principal: null,
    total_fotos: 0,
    plan_nombre: null,
    expiracion_plan: null,
    ...overrides,
  };
}

// 1. calcularCompletionScore: parcela vacía da 0%.
{
  const { score, color } = calcularCompletionScore(parcela({}));
  assertEqual(score, 0, "parcela sin ningún dato completa 0%");
  assertEqual(color, "#f44336", "0% usa el color rojo (<60)");
}

// 2. calcularCompletionScore: parcela completa da 100%.
{
  const { score, color } = calcularCompletionScore(
    parcela({
      precio_publicado: 100000000,
      superficie_m2: 5000,
      comuna: "Frutillar",
      lat: -41.1,
      lng: -73.0,
      agua: "apr_conectado",
      electricidad: "empalme_listo",
      acceso: "ripio_buen_estado",
      topografia: "plano_100",
      total_fotos: 8,
      metadata: { videoUrl: "https://youtube.com/x" },
    } as Partial<ParcelaResumen>),
  );
  assertEqual(score, 100, "parcela con los 10 checks completa 100%");
  assertEqual(color, "#4caf50", "100% usa el color verde (>=85)");
}

// 3. calcularCompletionScore: metadata como string JSON también cuenta el video.
{
  const { score } = calcularCompletionScore(parcela({ metadata: JSON.stringify({ videoUrl: "x" }) } as Partial<ParcelaResumen>));
  assertEqual(score, 10, "metadata en formato string se parsea igual que objeto");
}

// 4. calcularExpiracion: sin fecha.
{
  const { text, colorClass } = calcularExpiracion(null);
  assertEqual(text, "Sin fecha de expiración", "sin fecha muestra el texto por defecto");
  assertEqual(colorClass, "exp-normal", "sin fecha usa el color normal");
}

// 5. calcularExpiracion: fecha pasada -> expirado.
{
  const ayer = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { colorClass } = calcularExpiracion(ayer);
  assertEqual(colorClass, "exp-danger", "fecha pasada usa el color de peligro");
}

// 6. filtrarParcelas: búsqueda por código o título, insensible a mayúsculas.
{
  const parcelas = [parcela({ id: "a", codigo: "ABC-1", titulo: "Vista al lago" }), parcela({ id: "b", codigo: "XYZ-2", titulo: "Bosque nativo" })];
  const resultado = filtrarParcelas(parcelas, { query: "lago", region: "", comuna: "" });
  assertEqual(
    resultado.map((p) => p.id),
    ["a"],
    "el filtro de búsqueda matchea por título sin importar mayúsculas",
  );
}

// 7. filtrarParcelas: filtro por región y comuna combinados.
{
  const parcelas = [parcela({ id: "a", region: "Ñuble", comuna: "Quillón" }), parcela({ id: "b", region: "Ñuble", comuna: "Yumbel" }), parcela({ id: "c", region: "Biobío", comuna: "Yumbel" })];
  const resultado = filtrarParcelas(parcelas, { query: "", region: "Ñuble", comuna: "Yumbel" });
  assertEqual(
    resultado.map((p) => p.id),
    ["b"],
    "región y comuna se aplican como AND, no OR",
  );
}

// 8. regionesDisponibles / comunasDisponibles: únicas, ordenadas, sin nulos.
{
  const parcelas = [parcela({ id: "a", region: "Ñuble", comuna: "Quillón" }), parcela({ id: "b", region: "Biobío", comuna: null }), parcela({ id: "c", region: "Ñuble", comuna: "Quillón" })];
  assertEqual(regionesDisponibles(parcelas), ["Biobío", "Ñuble"], "regiones vienen únicas y ordenadas");
  assertEqual(comunasDisponibles(parcelas), ["Quillón"], "comunas descarta nulos y duplicados");
}

console.log(`\n${passed} pasaron, ${failed} fallaron.`);
if (failed > 0) process.exit(1);
