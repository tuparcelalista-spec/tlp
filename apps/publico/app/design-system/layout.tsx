import type { ReactNode } from "react";

export const metadata = {
  title: "TPL · @tpl/ui showcase (herramienta interna)",
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return children;
}
