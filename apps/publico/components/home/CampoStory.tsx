import Link from "next/link";
import { campoStoryCss } from "./campoStory.css";

/**
 * Sección editorial de la revista "El Campo Chileno".
 * Paridad con `frontend-v2/index.html` (líneas 468-480):
 * fondo panorámico con gradiente cinematográfico, titular serif,
 * y llamada a la acción hacia `/campo-chileno`.
 */
export function CampoStory() {
  return (
    <section className="tpl-campo-story" aria-labelledby="tpl-campo-story-title">
      <style>{campoStoryCss}</style>
      <div className="tpl-campo-story__inner">
        <div className="tpl-campo-story__content">
          <span className="tpl-campo-story__eyebrow">REVISTA TPL · HISTORIA &amp; VIDA RURAL</span>
          <h2 id="tpl-campo-story-title">El campo que nos hizo.</h2>
          <p>
            Dos siglos de cambios, trabajo, territorio y nuevas formas de habitar Chile. Una historia que llega hasta
            quienes hoy vuelven a imaginar una vida con más espacio, naturaleza y raíces.
          </p>
          <Link href="/campo-chileno" className="tpl-campo-story__action">
            Leer El Campo Chileno &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
