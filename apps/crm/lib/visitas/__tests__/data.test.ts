import {
  ordenarPorFecha,
  filtrarVisibles,
  contarCanceladas,
  esCancelable,
  infoEstado,
  transicionesDisponibles,
  oportunidadesAgendables,
  staffAsignable,
  type VisitaRow,
} from "../data";
import type { ActorCrudo, OportunidadDeActor } from "../../actores/data";

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

function visita(overrides: Partial<VisitaRow>): VisitaRow {
  return {
    id: "v-1",
    oportunidad_id: "o-1",
    usuario_staff_id: null,
    fecha_hora: "2026-09-15T10:00:00.000Z",
    estado: "programada",
    resultado: null,
    notas: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    oportunidad_codigo: null,
    oportunidad_estado: null,
    actor_cliente_id: null,
    actor_nombre: null,
    actor_email: null,
    staff_nombre: null,
    proyecto_codigo: null,
    propiedad_id: null,
    propiedad_codigo: null,
    propiedad_titulo: null,
    propiedad_comuna: null,
    propiedad_region: null,
    ...overrides,
  };
}

// 1. ordenarPorFecha: ascendente por fecha_hora.
{
  const visitas = [visita({ id: "b", fecha_hora: "2026-09-20T10:00:00.000Z" }), visita({ id: "a", fecha_hora: "2026-09-10T10:00:00.000Z" })];
  assertEqual(
    ordenarPorFecha(visitas).map((v) => v.id),
    ["a", "b"],
    "ordena ascendente por fecha_hora, no por el orden de llegada",
  );
}

// 2. filtrarVisibles: oculta canceladas por defecto.
{
  const visitas = [visita({ id: "a", estado: "programada" }), visita({ id: "b", estado: "cancelada" })];
  assertEqual(
    filtrarVisibles(visitas, false).map((v) => v.id),
    ["a"],
    "con verCanceladas=false, las canceladas quedan fuera",
  );
  assertEqual(
    filtrarVisibles(visitas, true).map((v) => v.id),
    ["a", "b"],
    "con verCanceladas=true, se muestran todas",
  );
}

// 3. contarCanceladas.
{
  const visitas = [visita({ estado: "cancelada" }), visita({ estado: "cancelada" }), visita({ estado: "programada" })];
  assertEqual(contarCanceladas(visitas), 2, "cuenta solo las canceladas");
}

// 4. esCancelable: solo programada/confirmada.
{
  assertEqual(esCancelable("programada"), true, "programada es cancelable");
  assertEqual(esCancelable("confirmada"), true, "confirmada es cancelable");
  assertEqual(esCancelable("realizada"), false, "realizada ya no es cancelable");
  assertEqual(esCancelable("cancelada"), false, "cancelada ya no es cancelable");
  assertEqual(esCancelable("no_asistio"), false, "no_asistio ya no es cancelable");
}

// 5. infoEstado: los 5 estados reales + fallback para uno desconocido.
{
  assertEqual(infoEstado("programada").etiqueta, "Programada", "programada tiene su etiqueta");
  assertEqual(infoEstado("no_asistio").etiqueta, "No asistió", "no_asistio tiene su etiqueta con tilde");
  assertEqual(infoEstado("agendada").etiqueta, "agendada", "un estado que la tabla rechaza (CHECK) no revienta: usa el valor crudo como etiqueta");
  assertEqual(infoEstado("").etiqueta, "Sin estado", "estado vacío cae en 'Sin estado'");
}

// 6. transicionesDisponibles: respeta el guard de transiciones terminales de la RPC.
{
  assertEqual(transicionesDisponibles("programada"), ["confirmada", "realizada", "no_asistio"], "desde programada se puede ir a los 3 estados siguientes");
  assertEqual(transicionesDisponibles("confirmada"), ["realizada", "no_asistio"], "desde confirmada ya no se puede volver a programada");
  assertEqual(transicionesDisponibles("realizada"), [], "un estado terminal no ofrece transiciones (la RPC las rechazaría)");
  assertEqual(transicionesDisponibles("cancelada"), [], "cancelada tampoco ofrece transiciones");
}

function oportunidad(overrides: Partial<OportunidadDeActor>): OportunidadDeActor {
  return { id: "op-1", codigo: "OP-1", estado: "nueva", propiedad_titulo: null, actor_nombre: null, actor_id: null, actor_cliente_id: null, ...overrides };
}

// 7. oportunidadesAgendables: excluye los 3 estados terminales del embudo.
{
  const oportunidades = [
    oportunidad({ id: "a", estado: "nueva" }),
    oportunidad({ id: "b", estado: "negociacion" }),
    oportunidad({ id: "c", estado: "vendida" }),
    oportunidad({ id: "d", estado: "perdida" }),
    oportunidad({ id: "e", estado: "cancelada" }),
  ];
  assertEqual(
    oportunidadesAgendables(oportunidades).map((o) => o.id),
    ["a", "b"],
    "vendida/perdida/cancelada quedan fuera del selector, el resto del embudo sí aparece",
  );
}

// 8. oportunidadesAgendables: arma el label con código + propiedad + cliente, sin duplicar separadores si falta algo.
{
  const resultado = oportunidadesAgendables([oportunidad({ id: "a", codigo: "OP-9", propiedad_titulo: "Parcela Linda", actor_nombre: "Juan Pérez" })]);
  assertEqual(resultado[0].label, "OP-9 · Parcela Linda · Juan Pérez", "el label junta código, propiedad y cliente");

  const sinDatos = oportunidadesAgendables([oportunidad({ id: "b", codigo: null, propiedad_titulo: null, actor_nombre: null })]);
  assertEqual(sinDatos[0].label, "b", "sin ningún dato, cae al id en vez de dejar el label vacío o con separadores sueltos");
}

function actor(overrides: Partial<ActorCrudo>): ActorCrudo {
  return { id: "a-1", nombre: "Actor", rut: null, email: null, telefono: null, region: null, comuna: null, estado: "activo", roles: [], created_at: null, ...overrides };
}

// 9. staffAsignable: solo asesor_tpl / administrador, ordenados por nombre.
{
  const actores = [
    actor({ id: "1", nombre: "Zoe Asesora", roles: ["asesor_tpl"] }),
    actor({ id: "2", nombre: "Ana Admin", roles: ["administrador"] }),
    actor({ id: "3", nombre: "Carlos Comprador", roles: ["comprador"] }),
    actor({ id: "4", nombre: "Beto Corredor", roles: ["corredor", "asesor_tpl"] }),
  ];
  assertEqual(
    staffAsignable(actores).map((s) => s.nombre),
    ["Ana Admin", "Beto Corredor", "Zoe Asesora"],
    "solo entran quienes tienen rol asesor_tpl o administrador (aunque tengan otros roles también), ordenados alfabéticamente",
  );
}

// 10. staffAsignable: sin roles (null o array vacío) no revienta y queda fuera.
{
  const actores = [actor({ id: "1", nombre: "Sin roles", roles: null }), actor({ id: "2", nombre: "Roles vacíos", roles: [] })];
  assertEqual(staffAsignable(actores), [], "actores sin rol asesor_tpl/administrador quedan fuera, sin lanzar error por roles null");
}

console.log(`\n${passed} pasaron, ${failed} fallaron.`);
if (failed > 0) process.exit(1);
