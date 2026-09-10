import type { ReactNode } from "react";
import { TplDesignSystemStyles } from "@tpl/ui";

export const metadata = {
  title: "TPL · apps/publico (Fase 2 — design system)",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <TplDesignSystemStyles />
      </head>
      <body>{children}</body>
    </html>
  );
}
