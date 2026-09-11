"use client";

import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Button, Input } from "@tpl/ui";
import { scheduleVisitDialogCss } from "./scheduleVisitDialog.css";

export interface ScheduleVisitDialogProps {
  propertyTitle: string;
  propertyCode: string;
  /** Solo dígitos, formato E.164 sin "+" (ej. "56988508361") — mismo número ya usado por el CTA de WhatsApp de esta ficha. */
  whatsappPhone: string;
}

/**
 * Captura Nombre + Teléfono ANTES de abrir WhatsApp — el mensaje que se
 * pre-llena ya incluye esos datos, así que si la persona no completa el
 * envío en WhatsApp (o no tiene WhatsApp Web configurado), el número de
 * contacto real ya quedó escrito, no se pierde en un CTA genérico.
 *
 * Nota de alcance: esto NO persiste el contacto en ningún backend/
 * Supabase — no hay tabla de leads ni escritura nueva (fuera del alcance
 * autorizado de este bloque, que no incluye tocar el esquema). Si se
 * quiere garantizar que el dato sobreviva aunque la persona abandone
 * WhatsApp a mitad de camino, el siguiente paso sería un endpoint/Server
 * Action que guarde el lead antes de redirigir — decisión de producto que
 * requiere aprobación explícita, no algo que se decidió acá.
 *
 * `<dialog>` nativo (sin librería nueva): foco atrapado, cierre con Esc y
 * clic en el backdrop ya vienen del navegador.
 */
export function ScheduleVisitDialog({ propertyTitle, propertyCode, whatsappPhone }: ScheduleVisitDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeDialog();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) return;

    const message = encodeURIComponent(
      `Hola, soy ${trimmedName} (${trimmedPhone}). Quiero coordinar una visita a "${propertyTitle}" (código ${propertyCode}).`,
    );
    window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank", "noopener,noreferrer");
    closeDialog();
    setName("");
    setPhone("");
  }

  return (
    <>
      <style>{scheduleVisitDialogCss}</style>
      <Button type="button" variant="secondary" onClick={openDialog}>
        Coordinar visita
      </Button>
      <dialog ref={dialogRef} className="tpl-visit-dialog" aria-labelledby="visit-dialog-title" onClick={handleBackdropClick}>
        <form className="tpl-visit-dialog__form" onSubmit={handleSubmit}>
          <h3 id="visit-dialog-title" className="tpl-visit-dialog__title">
            Coordinar visita
          </h3>
          <p className="tpl-visit-dialog__intro">
            Déjanos tu nombre y teléfono — te escribimos por WhatsApp para agendar la visita a "{propertyTitle}".
          </p>
          <div className="tpl-visit-dialog__field">
            <label htmlFor="visit-name">Nombre</label>
            <Input
              id="visit-name"
              name="name"
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <div className="tpl-visit-dialog__field">
            <label htmlFor="visit-phone">Teléfono</label>
            <Input
              id="visit-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div className="tpl-visit-dialog__actions">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button type="submit" variant="whatsapp">
              Continuar por WhatsApp
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
