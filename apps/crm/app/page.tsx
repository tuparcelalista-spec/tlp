import { InfraestructuraPlaceholder } from "@tpl/ui";

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 40, maxWidth: 640 }}>
      <h1>apps/crm</h1>
      <p>
        Infraestructura de la <strong>Fase 1</strong> del Plan Maestro de Migración. No sirve
        tráfico real, no reemplaza ningún módulo del CRM actual (<code>plataforma/crm-tpl-v1/</code>),
        y no está conectada a Supabase.
      </p>
      <InfraestructuraPlaceholder app="crm" />
    </main>
  );
}
