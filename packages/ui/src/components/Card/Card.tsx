import type { HTMLAttributes } from "react";

export type CardTone = "default" | "featured";
export type CardPadding = "none" | "sm" | "md";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
}

export interface CardSlotProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

/**
 * Base composable de tarjetas — NO hay un componente por tipo de card.
 * `PropertyCard` (y las futuras Card de proyecto/casa/partner) se arman
 * componiendo `Card` + `Card.Media` + `Card.Body` + `Card.Footer`, más los
 * primitivos de `PropertyData`. Ver README §Cards antes de crear una nueva
 * variante — la mayoría de los casos deberían resolverse componiendo esto,
 * no heredando ni copiando.
 */
export function Card({ tone = "default", className, children, ...rest }: CardProps) {
  const classes = ["tpl-card", tone === "featured" && "tpl-card--featured", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

function CardMedia({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const classes = ["tpl-card__media", className].filter(Boolean).join(" ");
  return <div className={classes} {...rest} />;
}

function CardBody({ padding = "md", className, ...rest }: CardSlotProps) {
  const classes = ["tpl-card__body", padding !== "md" && `tpl-card__body--padding-${padding}`, className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes} {...rest} />;
}

function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const classes = ["tpl-card__footer", className].filter(Boolean).join(" ");
  return <div className={classes} {...rest} />;
}

Card.Media = CardMedia;
Card.Body = CardBody;
Card.Footer = CardFooter;
