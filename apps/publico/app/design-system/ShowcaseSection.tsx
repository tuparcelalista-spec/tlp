import type { ReactNode } from "react";

/** Envoltorio visual solo de esta página de inspección — no es parte de @tpl/ui. */
export function ShowcaseSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section style={{ padding: "40px 0", borderBottom: "1px solid var(--tpl-border-default)" }}>
      <h2 style={{ fontFamily: "var(--tpl-font-display)", fontSize: "var(--tpl-text-2xl)", margin: "0 0 8px" }}>{title}</h2>
      {description ? (
        <p style={{ fontFamily: "var(--tpl-font-sans)", color: "var(--tpl-content-muted)", maxWidth: 640, margin: "0 0 24px" }}>
          {description}
        </p>
      ) : (
        <div style={{ marginBottom: 24 }} />
      )}
      {children}
    </section>
  );
}

export function ColorSwatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 140 }}>
      <div
        style={{
          height: 56,
          borderRadius: "var(--tpl-radius-sm)",
          border: "1px solid var(--tpl-border-default)",
          background: `var(${varName})`,
        }}
      />
      <span style={{ fontFamily: "var(--tpl-font-sans)", fontSize: "var(--tpl-text-sm)", fontWeight: 600 }}>{name}</span>
      <code style={{ fontSize: 11, color: "var(--tpl-content-muted)" }}>{varName}</code>
    </div>
  );
}
