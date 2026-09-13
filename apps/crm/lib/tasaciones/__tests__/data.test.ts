import { calcularSimilitud, derivarTargetSimilitud, mapearComparableCatastro, type MercadoComparable, type TargetSimilitud } from "../data";

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

function assertClose(actual: number, expected: number, message: string) {
  const ok = Math.abs(actual - expected) < 1e-9;
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`FALLÓ: ${message}\n  esperado: ${expected}\n  obtenido: ${actual}`);
  }
}

function comparable(overrides: Partial<MercadoComparable>): MercadoComparable {
  return {
    id: "c-1",
    name: "Comparable",
    comuna: "",
    superficie: 0,
    precio: 0,
    tiene_agua: false,
    tiene_luz: false,
    tiene_bosque: false,
    es_plana: false,
    tiene_rio: false,
    tiene_asfalto: false,
    tiene_lago: false,
    ...overrides,
  };
}

function objetivo(overrides: Partial<TargetSimilitud>): TargetSimilitud {
  return {
    comuna: "",
    superficie: 0,
    tiene_agua: false,
    tiene_luz: false,
    tiene_bosque: false,
    es_plana: false,
    tiene_rio: false,
    tiene_asfalto: false,
    tiene_lago: false,
    ...overrides,
  };
}

// 1. calcularSimilitud: coincidencia total da 1.
{
  const o = objetivo({ comuna: "Yumbel", superficie: 5000, tiene_agua: true, tiene_luz: true, es_plana: true, tiene_rio: true, tiene_asfalto: true, tiene_bosque: true });
  const c = comparable({ comuna: "Yumbel", superficie: 5000, tiene_agua: true, tiene_luz: true, es_plana: true, tiene_rio: true, tiene_asfalto: true, tiene_bosque: true });
  assertClose(calcularSimilitud(o, c), 1, "match total (misma comuna, misma superficie, todos los atributos) da similitud 1");
}

// 2. calcularSimilitud: sin ningún dato en común da 0.
{
  const o = objetivo({ comuna: "Yumbel", superficie: 5000 });
  const c = comparable({ comuna: "Quillón", superficie: 500 });
  const resultado = calcularSimilitud(o, c);
  assertEqual(resultado > 0, true, "aunque no matchee comuna/superficie, los 6 atributos booleanos en false==false igual pesan");
}

// 3. calcularSimilitud: superficie proporcional, no por diferencia absoluta.
{
  const o = objetivo({ superficie: 5000 });
  const cCercano = comparable({ superficie: 5500 }); // razón 5000/5500 ~ 0.909
  const oChico = objetivo({ superficie: 500 });
  const cChico = comparable({ superficie: 5500 }); // razón 500/5500 ~ 0.0909
  assertEqual(calcularSimilitud(o, cCercano) > calcularSimilitud(oChico, cChico), true, "5000 vs 5500 se parece más que 500 vs 5500 (razón, no diferencia absoluta)");
}

// 4. calcularSimilitud: sin superficie en ninguno de los dos lados, ese peso no cuenta.
{
  const o = objetivo({ comuna: "Yumbel" });
  const c = comparable({ comuna: "Yumbel", superficie: 0 });
  // peso total = 3 (comuna) + 6 (atributos) = 9; puntaje = 3 (comuna) + 6 (todos false==false) = 9
  assertClose(calcularSimilitud(o, c), 1, "sin superficie en ninguno de los dos, ese peso se excluye del cálculo (no penaliza)");
}

// 5. derivarTargetSimilitud: agua/luz/bosque/plana/rio/lago/asfalto desde columnas reales, no desde atributos_json.
{
  const t = derivarTargetSimilitud({
    comuna: "Frutillar",
    superficie_m2: 5000,
    agua: "apr_conectado, con vertiente propia",
    electricidad: "empalme_listo",
    topografia: "plano_100",
    acceso: "camino de asfalto",
    atributos_naturales: ["Bosque nativo", "Río", "Vista a volcanes"],
  });
  assertEqual(t.comuna, "Frutillar", "comuna se copia tal cual");
  assertEqual(t.superficie, 5000, "superficie se copia tal cual");
  assertEqual(t.tiene_agua, true, "detecta agua por la columna `agua`");
  assertEqual(t.tiene_luz, true, "detecta luz por 'empalme' en `electricidad`");
  assertEqual(t.tiene_bosque, true, "detecta bosque por 'bosque nativo' en atributos_naturales");
  assertEqual(t.es_plana, true, "detecta plana por 'plano_100' en `topografia`");
  assertEqual(t.tiene_rio, true, "detecta río por 'Río' en atributos_naturales");
  assertEqual(t.tiene_asfalto, true, "detecta asfalto por 'camino de asfalto' en `acceso`");
  assertEqual(t.tiene_lago, false, "no hay lago mencionado en ningún campo");
}

// 6. derivarTargetSimilitud: atributos_naturales como string (no array) también funciona.
{
  const t = derivarTargetSimilitud({ atributos_naturales: "Lago, vertiente" });
  assertEqual(t.tiene_lago, true, "atributos_naturales como string se procesa igual que array");
  assertEqual(t.tiene_agua, true, "'vertiente' en atributos_naturales cuenta como agua");
}

// 7. derivarTargetSimilitud: sin ningún dato, todo en false y superficie 0.
{
  const t = derivarTargetSimilitud({});
  assertEqual(t, { comuna: "", superficie: 0, tiene_agua: false, tiene_luz: false, tiene_bosque: false, es_plana: false, tiene_rio: false, tiene_lago: false, tiene_asfalto: false }, "registro vacío no inventa ningún atributo");
}

// 8. mapearComparableCatastro: precio_clp tiene prioridad sobre precio_uf.
{
  const c = mapearComparableCatastro({ id: "x1", titulo: "Aviso 1", comuna: "Ñuble", superficie_m2: 3000, precio_clp: 50000000, precio_uf: 1200, atributos: "Agua de pozo, terreno plano, bosque nativo" });
  assertEqual(c.precio, 50000000, "precio_clp gana sobre precio_uf cuando ambos existen");
  assertEqual(c.tiene_agua, true, "atributos detecta 'agua'");
  assertEqual(c.es_plana, true, "atributos detecta 'plano'");
  assertEqual(c.tiene_bosque, true, "atributos detecta 'bosque'");
}

// 9. mapearComparableCatastro: sin precio_clp, convierte precio_uf a CLP (UF fija en 38000, igual que el original).
{
  const c = mapearComparableCatastro({ id: "x2", precio_uf: 1000 });
  assertEqual(c.precio, 38000000, "sin precio_clp, precio_uf * 38000 (mismo valor fijo del original)");
}

// 10. mapearComparableCatastro: sin título, usa el nombre por defecto.
{
  const c = mapearComparableCatastro({ id: "x3" });
  assertEqual(c.name, "Propiedad de mercado", "sin titulo, cae al nombre genérico igual que el original");
}

console.log(`\n${passed} pasaron, ${failed} fallaron.`);
if (failed > 0) process.exit(1);
