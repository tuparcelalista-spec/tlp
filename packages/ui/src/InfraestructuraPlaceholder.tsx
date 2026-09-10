// Componente de verificación de la Fase 1.
// Su único propósito es probar que @tpl/ui se resuelve correctamente desde
// una app del monorepo (pnpm workspace + Turborepo). No es un componente de
// diseño real — el design system (Header, Footer, PropertyCard, etc.)
// empieza a construirse recién en la Fase 2, según TPL-MASTER-MIGRATION-PLAN.md.
export function InfraestructuraPlaceholder({ app }: { app: string }) {
  return (
    <p style={{ fontFamily: "monospace", color: "#0a4d75" }}>
      @tpl/ui cargado correctamente en apps/{app}. (Fase 1 · infraestructura, sin diseño todavía)
    </p>
  );
}
