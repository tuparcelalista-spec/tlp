import { mapOportunidadesACards, type OportunidadCruda } from "../data";

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

function base(overrides: Partial<OportunidadCruda>): OportunidadCruda {
  return { id: "op-1", estado: "nueva", ...overrides };
}

// 1. Estado conocido: cae en su propia columna, meta = solo el código.
{
  const [card] = mapOportunidadesACards([base({ estado: "negociacion", codigo: "OP-001" })]);
  assertEqual(card.columnId, "negociacion", "estado conocido → columnId propio");
  assertEqual(card.meta, "OP-001", "estado conocido → meta es solo el código");
}

// 2. Estado desconocido pero real (aceptada/rechazada, que la RPC sí acepta
//    pero el tablero no tiene como columna): cae en 'nueva' con nota.
{
  const [card] = mapOportunidadesACards([base({ estado: "aceptada", codigo: "OP-002" })]);
  assertEqual(card.columnId, "nueva", "estado 'aceptada' (sin columna) → cae en nueva");
  assertEqual(card.meta, "OP-002 · estado real: aceptada", "estado 'aceptada' → meta incluye el estado real");
}

// 3. Sin estado en absoluto.
{
  const [card] = mapOportunidadesACards([base({ estado: null, codigo: null })]);
  assertEqual(card.columnId, "nueva", "sin estado → cae en nueva");
  assertEqual(card.meta, "estado real: sin estado", "sin estado ni código → meta dice 'sin estado'");
}

// 4. Título: prioridad propiedad_titulo > codigo > 'Oportunidad'.
{
  const [c1] = mapOportunidadesACards([base({ propiedad_titulo: "Parcela El Roble", codigo: "OP-003" })]);
  assertEqual(c1.title, "Parcela El Roble", "título usa propiedad_titulo cuando existe");

  const [c2] = mapOportunidadesACards([base({ codigo: "OP-004" })]);
  assertEqual(c2.title, "OP-004", "título cae a codigo si no hay propiedad_titulo");

  const [c3] = mapOportunidadesACards([base({})]);
  assertEqual(c3.title, "Oportunidad", "título cae a 'Oportunidad' si no hay ni título ni código");
}

// 5. Subtítulo: actor_nombre o el texto por defecto.
{
  const [c1] = mapOportunidadesACards([base({ actor_nombre: "Juan Pérez" })]);
  assertEqual(c1.subtitle, "Juan Pérez", "subtítulo usa actor_nombre");

  const [c2] = mapOportunidadesACards([base({})]);
  assertEqual(c2.subtitle, "Sin cliente asignado", "subtítulo por defecto sin actor_nombre");
}

// 6. Badge: solo si presupuesto > 0, formateado en CLP.
{
  const [c1] = mapOportunidadesACards([base({ presupuesto: 45000000 })]);
  assertEqual(c1.badge, "$45.000.000", "badge formatea presupuesto positivo en CLP");

  const [c2] = mapOportunidadesACards([base({ presupuesto: 0 })]);
  assertEqual(c2.badge, "", "badge vacío si presupuesto es 0");

  const [c3] = mapOportunidadesACards([base({})]);
  assertEqual(c3.badge, "", "badge vacío si no hay presupuesto");
}

// 7. dismissable siempre true (todas las tarjetas se pueden descartar).
{
  const [card] = mapOportunidadesACards([base({})]);
  assertEqual(card.dismissable, true, "toda tarjeta es dismissable");
}

console.log(`\n${passed} pasaron, ${failed} fallaron.`);
if (failed > 0) process.exit(1);
