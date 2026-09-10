import type { ReactNode } from "react";

export const metadata = {
  title: "TPL · apps/crm (Fase 1 — infraestructura)",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
