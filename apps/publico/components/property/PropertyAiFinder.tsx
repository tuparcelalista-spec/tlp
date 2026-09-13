"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { propertyAiFinderCss } from "./propertyAiFinder.css";

const EXAMPLE_PROMPTS = [
  "Con agua y luz para construir",
  "Plana con rol propio",
  "Menos de $25M en Biobío",
  "Con bosque nativo o estero",
];

export function PropertyAiFinder() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    router.push(`/propiedades?q=${encodeURIComponent(clean)}`);
  }

  function handleQuickPrompt(text: string) {
    setQuery(text);
  }

  return (
    <section className="tpl-property-ai-finder" aria-labelledby="tpl-ai-finder-title">
      <style>{propertyAiFinderCss}</style>
      <div className="tpl-property-ai-finder__header">
        <span className="tpl-property-ai-finder__eyebrow">Asistente Inteligente TPL</span>
        <h2 id="tpl-ai-finder-title" className="tpl-property-ai-finder__title">
          ¿No es exactamente lo que buscas?
        </h2>
        <p className="tpl-property-ai-finder__subtitle">
          Descríbenos en tus propias palabras la parcela que tienes en mente y buscaremos las opciones más afines en el catálogo TPL.
        </p>
      </div>

      <form className="tpl-property-ai-finder__form" onSubmit={handleSubmit}>
        <div className="tpl-property-ai-finder__input-wrapper">
          <textarea
            className="tpl-property-ai-finder__textarea"
            rows={3}
            maxLength={500}
            placeholder="Ej: Busco una parcela con estero o bosque nativo, que tenga acceso expedito y cueste menos de 30 millones..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="tpl-property-ai-finder__actions">
          <div className="tpl-property-ai-finder__hints">
            <span>Sugerencias rápidas:</span>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="tpl-property-ai-finder__hint-chip"
                onClick={() => handleQuickPrompt(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <button type="submit" className="tpl-property-ai-finder__btn">
            Buscar en catálogo &rarr;
          </button>
        </div>
      </form>
    </section>
  );
}
