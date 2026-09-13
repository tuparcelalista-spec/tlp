"use client";

import { useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Button, Input, Select } from "@tpl/ui";
import { registrarPostulacionPartnerAction } from "../../lib/red-partner/actions";
import { partnerApplicationDialogCss } from "./partnerApplicationDialog.css";
import {
  TIPO_SERVICIO_OPTIONS,
  ESPECIALIDADES_POR_TIPO,
  REGION_OPTIONS,
  COMUNAS_POR_REGION,
  DISPONIBILIDAD_OPTIONS,
  DIFERENCIACION_OPTIONS,
  RED_PARTNER_TERMINOS_HREF,
  RED_PARTNER_PRIVACIDAD_HREF,
} from "./partnerApplicationData";

/** Techo de espera antes de abrir WhatsApp — mismo valor y misma razón que `ScheduleVisitDialog`. */
const TIMEOUT_PERSISTENCIA_MS = 2500;

export interface PartnerApplicationDialogProps {
  /** Solo dígitos, formato E.164 sin "+" (ej. "56988508361"). */
  whatsappPhone: string;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/**
 * Postulación a la Red Partner — versión reducida (ver
 * `lib/red-partner/actions.ts` para la razón completa de por qué NO es el
 * porte 1:1 de `frontend-v2/red-partner-v2`). Cubre identidad, rubro +
 * especialidades reales, cobertura por región/comuna, experiencia,
 * diferenciadores y condiciones comerciales — mismo patrón que
 * `ScheduleVisitDialog`: se intenta persistir en Supabase ANTES de abrir
 * WhatsApp, con un techo de espera para que un problema de backend nunca
 * bloquee al postulante.
 */
export function PartnerApplicationDialog({ whatsappPhone }: PartnerApplicationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [enviando, setEnviando] = useState(false);

  const [nombreComercial, setNombreComercial] = useState("");
  const [nombreResponsable, setNombreResponsable] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsappMismo, setWhatsappMismo] = useState(true);
  const [whatsappPropio, setWhatsappPropio] = useState("");
  const [correo, setCorreo] = useState("");

  const [tipoServicio, setTipoServicio] = useState<string>("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [especialidadOtra, setEspecialidadOtra] = useState("");

  const [region, setRegion] = useState<string>("");
  const [comunas, setComunas] = useState<string[]>([]);

  const [anosExperiencia, setAnosExperiencia] = useState("");
  const [disponibilidad, setDisponibilidad] = useState<string>(DISPONIBILIDAD_OPTIONS[0]);

  const [diferenciacion, setDiferenciacion] = useState<string[]>([]);
  const [diferenciacionOtra, setDiferenciacionOtra] = useState("");

  const [porcentajeAnticipo, setPorcentajeAnticipo] = useState("");
  const [garantiaServicio, setGarantiaServicio] = useState("");
  const [emiteFactura, setEmiteFactura] = useState(false);
  const [trabajaBajoMarcaTpl, setTrabajaBajoMarcaTpl] = useState(false);

  const [aceptaProyectosTpl, setAceptaProyectosTpl] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [autorizaContacto, setAutorizaContacto] = useState(false);

  const especialidadesDisponibles = useMemo(
    () => (tipoServicio ? ESPECIALIDADES_POR_TIPO[tipoServicio] ?? [] : []),
    [tipoServicio],
  );
  const comunasDisponibles = useMemo(() => (region ? COMUNAS_POR_REGION[region] ?? [] : []), [region]);

  const whatsappFinal = whatsappMismo ? telefono : whatsappPropio;

  const camposBasicosCompletos =
    nombreComercial.trim().length >= 2 &&
    nombreResponsable.trim().length >= 2 &&
    telefono.trim().replace(/\D/g, "").length >= 8 &&
    Boolean(tipoServicio) &&
    Boolean(region) &&
    comunas.length > 0 &&
    anosExperiencia.trim().length > 0 &&
    aceptaProyectosTpl &&
    aceptaTerminos &&
    aceptaPrivacidad &&
    autorizaContacto;

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeDialog();
  }

  function handleTipoServicioChange(value: string) {
    setTipoServicio(value);
    setEspecialidades([]);
  }

  function handleRegionChange(value: string) {
    setRegion(value);
    setComunas([]);
  }

  function resetForm() {
    setNombreComercial("");
    setNombreResponsable("");
    setTelefono("");
    setWhatsappMismo(true);
    setWhatsappPropio("");
    setCorreo("");
    setTipoServicio("");
    setEspecialidades([]);
    setEspecialidadOtra("");
    setRegion("");
    setComunas([]);
    setAnosExperiencia("");
    setDisponibilidad(DISPONIBILIDAD_OPTIONS[0]);
    setDiferenciacion([]);
    setDiferenciacionOtra("");
    setPorcentajeAnticipo("");
    setGarantiaServicio("");
    setEmiteFactura(false);
    setTrabajaBajoMarcaTpl(false);
    setAceptaProyectosTpl(false);
    setAceptaTerminos(false);
    setAceptaPrivacidad(false);
    setAutorizaContacto(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!camposBasicosCompletos || enviando) return;

    const especialidadesFinal = especialidadOtra.trim()
      ? [...especialidades, especialidadOtra.trim()]
      : especialidades;
    const resumenEspecialidades = especialidadesFinal.slice(0, 3).join(", ") || tipoServicio;

    const message = encodeURIComponent(
      `Hola, soy ${nombreResponsable} de "${nombreComercial}" (${telefono}). Quiero postular a la Red Partner TPL. ` +
        `Rubro: ${tipoServicio} (${resumenEspecialidades}). Cubro ${comunas.length} comuna(s) en ${region}. ` +
        `${anosExperiencia} años de experiencia, disponibilidad: ${disponibilidad}.`,
    );
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${message}`;

    // Se abre DENTRO del gesto del clic — mismo motivo que en `ScheduleVisitDialog`:
    // un `window.open` después de un `await` pierde el gesto y los bloqueadores
    // de popups lo descartan.
    const ventana = window.open("", "_blank");

    setEnviando(true);
    try {
      await Promise.race([
        registrarPostulacionPartnerAction({
          nombreComercial: nombreComercial.trim(),
          nombreResponsable: nombreResponsable.trim(),
          telefono: telefono.trim(),
          whatsapp: whatsappFinal.trim(),
          correo: correo.trim() || undefined,
          tipoServicio,
          especialidades,
          especialidadOtra: especialidadOtra.trim() || undefined,
          region,
          comunas,
          anosExperiencia: Number(anosExperiencia) || 0,
          disponibilidad,
          diferenciacion,
          diferenciacionOtra: diferenciacionOtra.trim() || undefined,
          porcentajeAnticipo: porcentajeAnticipo.trim() || undefined,
          garantiaServicio: garantiaServicio.trim() || undefined,
          emiteFactura,
          trabajaBajoMarcaTpl,
        }),
        new Promise((resolve) => setTimeout(resolve, TIMEOUT_PERSISTENCIA_MS)),
      ]);
    } catch {
      // Silencio deliberado — igual que en `ScheduleVisitDialog`: el resultado
      // de la persistencia no cambia nada para quien postula.
    } finally {
      setEnviando(false);
      if (ventana && !ventana.closed) {
        try {
          ventana.opener = null;
        } catch {
          // Algunos navegadores no permiten reasignar `opener`; no es crítico.
        }
        ventana.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }
      closeDialog();
      resetForm();
    }
  }

  return (
    <>
      <style>{partnerApplicationDialogCss}</style>
      <Button type="button" variant="whatsapp" onClick={openDialog}>
        Postular ahora
      </Button>
      <dialog
        ref={dialogRef}
        className="tpl-partner-dialog"
        aria-labelledby="partner-dialog-title"
        onClick={handleBackdropClick}
      >
        <form className="tpl-partner-dialog__form" onSubmit={handleSubmit}>
          <h3 id="partner-dialog-title" className="tpl-partner-dialog__title">
            Postula a la Red Partner
          </h3>
          <p className="tpl-partner-dialog__intro">
            Cuéntanos quién eres, tu rubro y dónde trabajas — te escribimos por WhatsApp para coordinar los próximos
            pasos.
          </p>

          <h4 className="tpl-partner-dialog__section-title">1. Tu identidad</h4>
          <div className="tpl-partner-dialog__field">
            <label htmlFor="partner-nombre-comercial">Nombre comercial / empresa</label>
            <Input
              id="partner-nombre-comercial"
              required
              value={nombreComercial}
              onChange={(event) => setNombreComercial(event.target.value)}
              placeholder="Ej: Constructora Nogales"
            />
          </div>
          <div className="tpl-partner-dialog__field">
            <label htmlFor="partner-nombre-responsable">Nombre del responsable</label>
            <Input
              id="partner-nombre-responsable"
              required
              value={nombreResponsable}
              onChange={(event) => setNombreResponsable(event.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div className="tpl-partner-dialog__row">
            <div className="tpl-partner-dialog__field">
              <label htmlFor="partner-telefono">Teléfono</label>
              <Input
                id="partner-telefono"
                type="tel"
                required
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div className="tpl-partner-dialog__field">
              <label htmlFor="partner-correo">Correo (opcional)</label>
              <Input
                id="partner-correo"
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="tu@correo.cl"
              />
            </div>
          </div>
          <label className="tpl-partner-dialog__checkbox">
            <input
              type="checkbox"
              checked={whatsappMismo}
              onChange={(event) => setWhatsappMismo(event.target.checked)}
            />
            Mi WhatsApp es el mismo teléfono
          </label>
          {!whatsappMismo ? (
            <div className="tpl-partner-dialog__field">
              <label htmlFor="partner-whatsapp">WhatsApp</label>
              <Input
                id="partner-whatsapp"
                type="tel"
                value={whatsappPropio}
                onChange={(event) => setWhatsappPropio(event.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </div>
          ) : null}

          <h4 className="tpl-partner-dialog__section-title">2. Rubro y especialidades</h4>
          <div className="tpl-partner-dialog__field">
            <label htmlFor="partner-tipo-servicio">Tipo de servicio principal</label>
            <Select
              id="partner-tipo-servicio"
              required
              value={tipoServicio}
              onChange={(event) => handleTipoServicioChange(event.target.value)}
            >
              <option value="" disabled>
                Selecciona tu rubro general…
              </option>
              {TIPO_SERVICIO_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          {especialidadesDisponibles.length > 0 ? (
            <div className="tpl-partner-dialog__field">
              <span>Especialidades</span>
              <div className="tpl-partner-dialog__chips">
                {especialidadesDisponibles.map((item) => (
                  <label key={item} className="tpl-partner-dialog__chip">
                    <input
                      type="checkbox"
                      checked={especialidades.includes(item)}
                      onChange={() => setEspecialidades((current) => toggle(current, item))}
                    />
                    {item}
                  </label>
                ))}
              </div>
              <Input
                value={especialidadOtra}
                onChange={(event) => setEspecialidadOtra(event.target.value)}
                placeholder="Otra especialidad (opcional)"
              />
            </div>
          ) : null}

          <h4 className="tpl-partner-dialog__section-title">3. Cobertura</h4>
          <div className="tpl-partner-dialog__field">
            <label htmlFor="partner-region">Región base</label>
            <Select id="partner-region" required value={region} onChange={(event) => handleRegionChange(event.target.value)}>
              <option value="" disabled>
                Selecciona una región…
              </option>
              {REGION_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          {comunasDisponibles.length > 0 ? (
            <div className="tpl-partner-dialog__field">
              <span>Comunas atendidas</span>
              <div className="tpl-partner-dialog__comunas">
                {comunasDisponibles.map((item) => (
                  <label key={item} className="tpl-partner-dialog__comuna">
                    <input
                      type="checkbox"
                      checked={comunas.includes(item)}
                      onChange={() => setComunas((current) => toggle(current, item))}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <h4 className="tpl-partner-dialog__section-title">4. Experiencia y disponibilidad</h4>
          <div className="tpl-partner-dialog__row">
            <div className="tpl-partner-dialog__field">
              <label htmlFor="partner-experiencia">Años de experiencia</label>
              <Input
                id="partner-experiencia"
                type="number"
                min={0}
                required
                value={anosExperiencia}
                onChange={(event) => setAnosExperiencia(event.target.value)}
                placeholder="Ej: 8"
              />
            </div>
            <div className="tpl-partner-dialog__field">
              <label htmlFor="partner-disponibilidad">Disponibilidad actual</label>
              <Select
                id="partner-disponibilidad"
                value={disponibilidad}
                onChange={(event) => setDisponibilidad(event.target.value)}
              >
                {DISPONIBILIDAD_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <h4 className="tpl-partner-dialog__section-title">5. ¿Qué te diferencia?</h4>
          <div className="tpl-partner-dialog__field">
            <div className="tpl-partner-dialog__chips">
              {DIFERENCIACION_OPTIONS.map((item) => (
                <label key={item} className="tpl-partner-dialog__chip">
                  <input
                    type="checkbox"
                    checked={diferenciacion.includes(item)}
                    onChange={() => setDiferenciacion((current) => toggle(current, item))}
                  />
                  {item}
                </label>
              ))}
            </div>
            <Input
              value={diferenciacionOtra}
              onChange={(event) => setDiferenciacionOtra(event.target.value)}
              placeholder="Otro diferenciador (opcional)"
            />
          </div>

          <h4 className="tpl-partner-dialog__section-title">6. Condiciones comerciales</h4>
          <div className="tpl-partner-dialog__row">
            <div className="tpl-partner-dialog__field">
              <label htmlFor="partner-anticipo">Anticipo habitual</label>
              <Input
                id="partner-anticipo"
                value={porcentajeAnticipo}
                onChange={(event) => setPorcentajeAnticipo(event.target.value)}
                placeholder="Ej: 30%"
              />
            </div>
            <div className="tpl-partner-dialog__field">
              <label htmlFor="partner-garantia">Garantía ofrecida</label>
              <Input
                id="partner-garantia"
                value={garantiaServicio}
                onChange={(event) => setGarantiaServicio(event.target.value)}
                placeholder="Ej: 6 meses"
              />
            </div>
          </div>
          <label className="tpl-partner-dialog__checkbox">
            <input type="checkbox" checked={emiteFactura} onChange={(event) => setEmiteFactura(event.target.checked)} />
            Emito boleta de honorarios o factura
          </label>
          <label className="tpl-partner-dialog__checkbox">
            <input
              type="checkbox"
              checked={trabajaBajoMarcaTpl}
              onChange={(event) => setTrabajaBajoMarcaTpl(event.target.checked)}
            />
            Me interesa trabajar temporalmente bajo la marca &ldquo;Tu Parcela Lista&rdquo; (marca blanca)
          </label>

          <h4 className="tpl-partner-dialog__section-title">7. Consentimientos</h4>
          <label className="tpl-partner-dialog__checkbox">
            <input
              type="checkbox"
              required
              checked={aceptaProyectosTpl}
              onChange={(event) => setAceptaProyectosTpl(event.target.checked)}
            />
            Acepto recibir proyectos y oportunidades derivadas por TPL
          </label>
          <label className="tpl-partner-dialog__checkbox">
            <input
              type="checkbox"
              required
              checked={aceptaTerminos}
              onChange={(event) => setAceptaTerminos(event.target.checked)}
            />
            Acepto los{" "}
            <a href={RED_PARTNER_TERMINOS_HREF} target="_blank" rel="noopener noreferrer">
              términos de la Red Partner
            </a>
          </label>
          <label className="tpl-partner-dialog__checkbox">
            <input
              type="checkbox"
              required
              checked={aceptaPrivacidad}
              onChange={(event) => setAceptaPrivacidad(event.target.checked)}
            />
            Acepto la{" "}
            <a href={RED_PARTNER_PRIVACIDAD_HREF} target="_blank" rel="noopener noreferrer">
              política de privacidad
            </a>
          </label>
          <label className="tpl-partner-dialog__checkbox">
            <input
              type="checkbox"
              required
              checked={autorizaContacto}
              onChange={(event) => setAutorizaContacto(event.target.checked)}
            />
            Autorizo a Tu Parcela Lista a contactarme para revisar esta postulación
          </label>

          <div className="tpl-partner-dialog__actions">
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" variant="whatsapp" disabled={enviando || !camposBasicosCompletos}>
              {enviando ? "Enviando…" : "Continuar por WhatsApp"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
