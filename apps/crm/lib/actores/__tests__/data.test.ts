import { splitActivosArchivados, oportunidadesDeActor, parcelasDeActor, type ActorCrudo, type OportunidadDeActor, type ParcelaDeActor } from "../data";

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

function actor(overrides: Partial<ActorCrudo>): ActorCrudo {
  return { id: "a-1", nombre: "Actor", rut: null, email: null, telefono: null, region: null, comuna: null, estado: "activo", roles: [], created_at: null, ...overrides };
}

// 1. splitActivosArchivados separa correctamente por estado.
{
  const actores = [actor({ id: "a1", estado: "activo" }), actor({ id: "a2", estado: "archivado" }), actor({ id: "a3", estado: "inactivo" })];
  const { activos, archivados } = splitActivosArchivados(actores);
  assertEqual(
    activos.map((a) => a.id),
    ["a1", "a3"],
    "activos incluye todo lo que no es 'archivado' (no solo 'activo')",
  );
  assertEqual(
    archivados.map((a) => a.id),
    ["a2"],
    "archivados incluye solo estado === 'archivado'",
  );
}

// 2. Sin archivados, la lista de archivados queda vacía.
{
  const actores = [actor({ id: "a1", estado: "activo" })];
  const { archivados } = splitActivosArchivados(actores);
  assertEqual(archivados, [], "sin actores archivados devuelve []");
}

// 3. oportunidadesDeActor acepta tanto actor_id como actor_cliente_id (compatibilidad legacy).
{
  const oportunidades: OportunidadDeActor[] = [
    { id: "o1", actor_id: "a1" },
    { id: "o2", actor_cliente_id: "a1" },
    { id: "o3", actor_id: "a2" },
    { id: "o4" },
  ];
  const resultado = oportunidadesDeActor(oportunidades, "a1");
  assertEqual(
    resultado.map((o) => o.id),
    ["o1", "o2"],
    "oportunidadesDeActor matchea por actor_id o actor_cliente_id",
  );
}

// 4. parcelasDeActor filtra por propietario_id.
{
  const parcelas: ParcelaDeActor[] = [
    { id: "p1", propietario_id: "a1" },
    { id: "p2", propietario_id: "a2" },
    { id: "p3", propietario_id: "a1" },
  ];
  const resultado = parcelasDeActor(parcelas, "a1");
  assertEqual(
    resultado.map((p) => p.id),
    ["p1", "p3"],
    "parcelasDeActor filtra por propietario_id",
  );
}

// 5. Actor sin oportunidades ni parcelas asociadas devuelve listas vacías, no undefined.
{
  assertEqual(oportunidadesDeActor([], "a1"), [], "oportunidadesDeActor sobre lista vacía devuelve []");
  assertEqual(parcelasDeActor([], "a1"), [], "parcelasDeActor sobre lista vacía devuelve []");
}

console.log(`\n${passed} pasaron, ${failed} fallaron.`);
if (failed > 0) process.exit(1);
