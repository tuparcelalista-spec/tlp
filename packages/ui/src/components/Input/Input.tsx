import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/**
 * A diferencia de tpl-foundation.css (que estilaba el selector `input`
 * global), esto es una clase — un input de otra parte de la app que no use
 * `<Input>` no hereda nada de `@tpl/ui` sin pedirlo.
 */
export function Input({ invalid, className, ...rest }: InputProps) {
  const classes = ["tpl-input", className].filter(Boolean).join(" ");
  return <input className={classes} aria-invalid={invalid || undefined} {...rest} />;
}
