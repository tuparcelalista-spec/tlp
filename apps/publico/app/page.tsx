import { InfraestructuraPlaceholder } from "@tpl/ui";

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 40, maxWidth: 640 }}>
      <h1>apps/publico</h1>
      <p>
        Infraestructura de la <strong>Fase 1</strong> del Plan Maestro de Migración. No sirve
        tráfico real, no reemplaza ninguna página de <code>frontend-v2/</code>, y no está
        conectada a Supabase.
      </p>
      <InfraestructuraPlaceholder app="publico" />
    </main>
  );
}
