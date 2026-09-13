import type { ReactNode } from "react";
import { CrmDesignSystemStyles } from "../styles/crmDesignSystemStyles";

export const metadata = {
  title: "CRM TPL",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <CrmDesignSystemStyles />
      </head>
      <body>{children}</body>
    </html>
  );
}
