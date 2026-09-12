"use client";

import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Button, Input } from "@tpl/ui";
import { registrarSolicitudVisita } from "../../lib/leads/actions";
import { scheduleVisitDialogCss } from "./scheduleVisitDialog.css";

/**
 * Techo de espera antes de abrir WhatsApp. Si Supabase tarda más que esto,
 * la persona NO se queda esperando: se abre WhatsApp igual y la escritura
 * termina (o falla) por su cuenta en el servidor. Nunca se bloquea al
 * visitante por una razón de backend.
 */
const TIMEOUT_PERSISTENCIA_MS = 2500;

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
 * P1-01 (2026-09-12): el contacto AHORA SÍ se persiste antes de abrir
 * WhatsApp, vía `registrarSolicitudVisita()` (Server Action →
 * `tpl_registrar_oportunidad_publica_v1` → `tpl_oportunidades`). Hasta
 * ahora, si la persona llenaba el formulario y cerraba WhatsApp sin enviar
 * el mensaje, el contacto se perdía por completo.
 *
 * Dos reglas de UX que esta implementación respeta de forma estricta:
 *
 *  1. **La persistencia nunca bloquea al visitante.** Si Supabase falla,
 *     tarda demasiado o la RPC rechaza el payload, WhatsApp se abre igual.
 *     No se le muestra ningún error de backend: su objetivo es contactar,
 *     y ese camino no puede depender de que la base responda.
 *  2. **La pestaña de WhatsApp se abre dentro del gesto del usuario.** Un
 *     `window.open()` ejecutado DESPUÉS de un `await` pierde el vínculo con
 *     el clic y los bloqueadores de popups lo descartan — el fallo clásico
 *     al añadir una llamada asíncrona a un handler que abría una pestaña.
 *     Por eso la pestaña se abre en blanco de inmediato y solo se le asigna
 *     la URL cuando termina (o expira) la escritura; si el navegador la
 *     bloqueó igual, se cae a navegar en la misma pestaña.
 *
 * `<dialog>` nativo (sin librería nueva): foco atrapado, cierre con Esc y
 * clic en el backdrop ya vienen del navegador.
 */
export function ScheduleVisitDialog({ propertyTitle, propertyCode, whatsappPhone }: ScheduleVisitDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [enviando, setEnviando] = useState(false);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeDialog();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone || enviando) return;

    const message = encodeURIComponent(
      `Hola, soy ${trimmedName} (${trimmedPhone}). Quiero coordinar una visita a "${propertyTitle}" (código ${propertyCode}).`,
    );
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${message}`;

    // Se abre DENTRO del gesto del clic (ver regla 2 del bloque de arriba).
    // Sin `noopener` a propósito: con esa opción el navegador devuelve
    // `null` y se pierde la referencia necesaria para navegarla después —
    // la protección se restituye anulando `opener` antes de asignar la URL.
    const ventanaWhatsApp = window.open("", "_blank");

    setEnviando(true);
    try {
      await Promise.race([
        registrarSolicitudVisita({
          nombre: trimmedName,
          telefono: trimmedPhone,
          propertyCode,
          propertyTitle,
        }),
        new Promise((resolve) => setTimeout(resolve, TIMEOUT_PERSISTENCIA_MS)),
      ]);
    } catch {
      // Silencio deliberado: el resultado de la persistencia no cambia nada
      // para el visitante. `registrarSolicitudVisita` ya registra el detalle
      // en el log del servidor.
    } finally {
      setEnviando(false);
      if (ventanaWhatsApp && !ventanaWhatsApp.closed) {
        try {
          ventanaWhatsApp.opener = null;
        } catch {
          // Algunos navegadores no permiten reasignar `opener`; no es crítico.
        }
        ventanaWhatsApp.location.href = whatsappUrl;
      } else {
        // El navegador bloqueó la pestaña (o la persona la cerró): se navega
        // en la actual antes que dejarla sin camino a WhatsApp.
        window.location.href = whatsappUrl;
      }
      closeDialog();
      setName("");
      setPhone("");
    }
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
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" variant="whatsapp" disabled={enviando}>
              {enviando ? "Enviando…" : "Continuar por WhatsApp"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
