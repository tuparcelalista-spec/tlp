/**
 * Puerto de `groups` en `crm-tpl-v1/core/router.js` — mismos 4 grupos,
 * mismo orden ("Hoy → En marcha → Inventario → Mercado", por momento del
 * trabajo, no por tipo de dato — ver el comentario original) y mismas
 * etiquetas. Diferencia deliberada de este piloto: cada item declara `href`
 * solo si su ruta ya existe en `apps/crm`. Migrados hasta ahora:
 * "Pipeline comercial", "Clientes, leads y partners", "Parcelas" y
 * "Tasaciones e informes" — el resto se muestra atenuado con una etiqueta
 * "Próximamente" en vez de un link roto, para no prometer módulos que
 * todavía no se construyeron.
 */
export interface SidebarItem {
  id: string;
  label: string;
  href?: string;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: "Hoy",
    items: [
      { id: "dashboard", label: "Resumen ejecutivo" },
      { id: "revision", label: "Bandeja de revisión" },
      { id: "pipeline", label: "Pipeline comercial", href: "/pipeline" },
      { id: "visitas", label: "Agenda de visitas" },
    ],
  },
  {
    label: "En marcha",
    items: [
      { id: "operaciones", label: "Proyectos y operaciones" },
      { id: "actores", label: "Clientes, leads y partners", href: "/actores" },
    ],
  },
  {
    label: "Inventario",
    items: [
      { id: "parcelas", label: "Parcelas", href: "/parcelas" },
      { id: "casas", label: "Casas y modelos" },
      { id: "tasaciones", label: "Tasaciones e informes", href: "/tasaciones" },
    ],
  },
  {
    label: "Mercado",
    items: [
      { id: "catastro", label: "Catastro de Mercado" },
      { id: "comparables", label: "Buscador de Comparables" },
      { id: "eventos", label: "Actividad y trazabilidad" },
    ],
  },
];
