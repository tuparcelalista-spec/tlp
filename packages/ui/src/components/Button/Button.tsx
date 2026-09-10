import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "navy" | "secondary" | "ghost" | "gold" | "whatsapp";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  block?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonAsLink = ButtonOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & { href: string };

type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { href?: undefined };

export type ButtonProps = ButtonAsLink | ButtonAsButton;

function buildClassName(props: Pick<ButtonOwnProps, "variant" | "size" | "pill" | "block" | "className">): string {
  const { variant = "primary", size = "md", pill, block, className } = props;
  const classes = ["tpl-btn", `tpl-btn--${variant}`];
  if (size !== "md") classes.push(`tpl-btn--${size}`);
  if (pill) classes.push("tpl-btn--pill");
  if (block) classes.push("tpl-btn--block");
  if (className) classes.push(className);
  return classes.join(" ");
}

/**
 * Primitivo de acción — portado de `.tpl-btn` (tpl-foundation.css §9), el
 * único sistema de variantes del CSS anterior que ya estaba bien diseñado.
 * Header lo usa para el CTA "Publicar"; Card/Modal/Alert lo reutilizarán
 * más adelante en vez de reinventar botones por componente.
 */
export function Button(props: ButtonProps) {
  const { variant, size, pill, block, children, className, ...rest } = props;
  const finalClassName = buildClassName({ variant, size, pill, block, className });

  if (props.href !== undefined) {
    const anchorRest = rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className">;
    return (
      <a className={finalClassName} {...anchorRest}>
        {children}
      </a>
    );
  }

  const buttonRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;
  return (
    <button className={finalClassName} type={buttonRest.type ?? "button"} {...buttonRest}>
      {children}
    </button>
  );
}
