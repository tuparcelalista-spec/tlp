"use client";

import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Button, Input, Select } from "@tpl/ui";
import { partnerApplicationDialogCss } from "./partnerApplicationDialog.css";

export interface PartnerApplicationDialogProps {
  /** Solo dígitos, formato E.164 sin "+" (ej. "56988508361"). */
  whatsappPhone: string;
}

/** Mismos rubros que la propuesta de valor de esta página — no una taxonomía inventada aparte. */
const OFICIOS = ["Pozos profundos", "Cercos y perimetrales", "Fosas sépticas", "Movimiento de tierra", "Paneles solares", "Otro"] as const;

/**
 * Postulación directa por WhatsApp — mismo patrón que
 * `components/property/ScheduleVisitDialog.tsx`: captura los datos
 * principales ANTES de abrir WhatsApp, así el mensaje ya trae oficio y
 * comuna de cobertura en vez de un genérico "hola, quiero postular".
 *
 * A propósito NO es el formulario completo de `frontend-v2/red-partner-v2`
 * (identidad, especialidades, método de trabajo por etapas, condiciones de
 * pago, borrador guardable, subida de archivos) — ese formulario depende
 * de un backend propio (`postular.js`) que esta misión no incluye. Este
 * diálogo cubre exactamente lo pedido: oficio/rubro + comuna de cobertura,
 * más nombre/teléfono para que el mensaje sea accionable de inmediato.
 */
export function PartnerApplicationDialog({ whatsappPhone }: PartnerApplicationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [oficio, setOficio] = useState<string>(OFICIOS[0]);
  const [oficioOtro, setOficioOtro] = useState("");
  const [comuna, setComuna] = useState("");

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeDialog();
  }

  function resetForm() {
    setName("");
    setPhone("");
    setOficio(OFICIOS[0]);
    setOficioOtro("");
    setComuna("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedComuna = comuna.trim();
    const isOtro = oficio === "Otro";
    const trimmedOtro = oficioOtro.trim();
    if (!trimmedName || !trimmedPhone || !trimmedComuna || (isOtro && !trimmedOtro)) return;

    const rubro = isOtro ? trimmedOtro : oficio;
    const message = encodeURIComponent(
      `Hola, soy ${trimmedName} (${trimmedPhone}). Quiero postular a la Red Partner TPL. Mi rubro es "${rubro}" y cubro la zona de ${trimmedComuna}.`,
    );
    window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank", "noopener,noreferrer");
    closeDialog();
    resetForm();
  }

  return (
    <>
      <style>{partnerApplicationDialogCss}</style>
      <Button type="button" variant="whatsapp" onClick={openDialog}>
        Postular ahora
      </Button>
      <dialog ref={dialogRef} className="tpl-partner-dialog" aria-labelledby="partner-dialog-title" onClick={handleBackdropClick}>
        <form className="tpl-partner-dialog__form" onSubmit={handleSubmit}>
          <h3 id="partner-dialog-title" className="tpl-partner-dialog__title">
            Postula a la Red Partner
          </h3>
          <p className="tpl-partner-dialog__intro">
            Cuéntanos tu oficio y dónde trabajas — te escribimos por WhatsApp para coordinar los próximos pasos.
          </p>
          <div className="tpl-partner-dialog__field">
            <label htmlFor="partner-name">Nombre</label>
            <Input
              id="partner-name"
              name="name"
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <div className="tpl-partner-dialog__field">
            <label htmlFor="partner-phone">Teléfono</label>
            <Input
              id="partner-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div className="tpl-partner-dialog__field">
            <label htmlFor="partner-oficio">Oficio / rubro</label>
            <Select id="partner-oficio" name="oficio" value={oficio} onChange={(event) => setOficio(event.target.value)}>
              {OFICIOS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          {oficio === "Otro" ? (
            <div className="tpl-partner-dialog__field">
              <label htmlFor="partner-oficio-otro">Especifica tu oficio</label>
              <Input
                id="partner-oficio-otro"
                name="oficioOtro"
                required
                value={oficioOtro}
                onChange={(event) => setOficioOtro(event.target.value)}
                placeholder="Ej: Instalación eléctrica rural"
              />
            </div>
          ) : null}
          <div className="tpl-partner-dialog__field">
            <label htmlFor="partner-comuna">Comuna de cobertura</label>
            <Input
              id="partner-comuna"
              name="comuna"
              required
              value={comuna}
              onChange={(event) => setComuna(event.target.value)}
              placeholder="Ej: Nacimiento, Yumbel y alrededores"
            />
          </div>
          <div className="tpl-partner-dialog__actions">
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
