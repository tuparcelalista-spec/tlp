import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, Button, Stack, Card, Grid } from "@tpl/ui";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const TITLE = "El Campo Chileno: Historia, Identidad y Nueva Ruralidad | Tu Parcela Lista";
const DESCRIPTION =
  "Dos siglos de tierra, trabajo y transformación. Recorre la evolución del mundo rural en Chile desde 1808 hasta la nueva ruralidad conectada de hoy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/campo-chileno` },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/campo-chileno`,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

const CHAPTERS = [
  {
    year: "1808",
    title: "La tierra era oficio, calendario y comunidad",
    period: "Capítulo I · Antes de la República",
    text: "Entre 1808 y 1817, la 'Cartilla de campo' en Chicureo dejó registro de faenas, saberes cotidianos y la administración comunitaria del agua. Arar, sembrar, cosechar y criar animales eran el eje que ordenaba la vida familiar en el valle central.",
    fact: "1808: Comienza la redacción de la 'Cartilla de campo', documento fundacional de la memoria agrícola chilena.",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/17/El_Huaso_-_Chile_Ilustrado.jpg",
    imageCaption: "Representación de costumbres rurales chilenas en Chile Ilustrado (1872).",
  },
  {
    year: "1830",
    title: "La hacienda y la expansión agrícola",
    period: "Capítulo II · República rural",
    text: "Durante el siglo XIX la agricultura chilena adoptó nuevas tecnologías y canales de exportación. En 1838 nace la Sociedad Chilena de Agricultura y Colonización (antecedente de la SNA), promoviendo la tecnificación de los valles del centro y sur.",
    fact: "1838: Se institucionaliza la investigación y tecnificación agraria en el país.",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Vi%C3%B1a_Casa_Silva_-_Vi%C3%B1edo_Angostura_Vineyard.jpg",
    imageCaption: "Valle central y viñedos históricos en la zona central de Chile.",
  },
  {
    year: "1880",
    title: "Tradición campesina y resistencia cultural",
    period: "Capítulo III · Un país rural",
    text: "La cultura rural nunca fue solo producción: fue arquitectura de adobe y madera, fiestas de la trilla, oficios de herrería, cocina con identidad territorial y una profunda solidaridad comunitaria que resistió el paso del tiempo.",
    fact: "La trilla a yegua suelta y las mingas del sur persisten hoy como patrimonio vivo en comunas campesinas.",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Trilla_a_yegua_suelta_en_Curanipe.JPG",
    imageCaption: "Tradición de trilla campesina en Curanipe, Región del Maule.",
  },
  {
    year: "1930",
    title: "Industrialización y el éxodo hacia la ciudad",
    period: "Capítulo IV · Migración y memoria",
    text: "A mediados del siglo XX las ciudades concentraron el empleo industrial. Millones de familias campesinas migraron, llevando consigo costumbres, recetas, huertas urbanas y una nostalgia por la tierra que aún vive en las generaciones actuales.",
    fact: "La identidad urbana chilena conserva raíces directamente provenientes del campo central y sureño.",
    image: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Farm_in_the_Malalcahuello_national_reserve.jpg",
    imageCaption: "Paisaje rural en Malalcahuello, Región de La Araucanía.",
  },
  {
    year: "1962",
    title: "La Reforma Agraria: la tierra cambia de manos",
    period: "Capítulo V · Transformación estructural",
    text: "Con las Leyes 15.020 y 16.640, el Estado redistribuyó más de 9 millones de hectáreas entre 1962 y 1973, permitiendo la sindicalización campesina y transformando radicalmente la tenencia de la tierra en Chile.",
    fact: "1967: Se promulga la Ley de Reforma Agraria 16.640 durante el gobierno de Eduardo Frei Montalva.",
    image: null,
    quote: "«La tierra para el que la trabaja»: una época que transformó la estructura social y económica del país.",
  },
  {
    year: "1973",
    title: "Apertura exportadora, tecnología y nuevos desafíos",
    period: "Capítulo VI · Reorganización productiva",
    text: "El agro se transformó en potencia exportadora en fruta, vino y madera con tecnología de punta. No obstante, surgieron desafíos críticos: acceso y preservación del agua, conectividad vial y protección de los ecosistemas nativos.",
    fact: "Chile se posicionó entre los principales exportadores agrícolas del hemisferio sur.",
    image: "https://upload.wikimedia.org/wikipedia/commons/2/20/Atardecer_localidad_rural%2C_cerca_del_rio_Quepe%2C_region_de_la_Araucan%C3%ADa%2C_Chile.jpg",
    imageCaption: "Río Quepe en La Araucanía: cuencas hídricas que sustentan el sur de Chile.",
  },
];

export default function CampoChilenoPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "El Campo Chileno: Historia, Identidad y Nueva Ruralidad",
    description: DESCRIPTION,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/campo-chileno`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero Editorial */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f2942 0%, #16362e 100%)",
          color: "#fff",
          padding: "5rem 1.5rem 4rem",
          textAlign: "center",
        }}
      >
        <Container>
          <span
            style={{
              display: "inline-block",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#d9aa34",
              marginBottom: "1rem",
            }}
          >
            Edición Especial · Cultura & Territorio Rural
          </span>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontFamily: "serif",
              fontWeight: 600,
              lineHeight: 1.15,
              margin: "0 auto 1.5rem",
              maxWidth: 800,
            }}
          >
            El campo que nos hizo, el campo que elegimos.
          </h1>
          <p
            style={{
              fontSize: "1.15rem",
              lineHeight: 1.7,
              maxWidth: 720,
              margin: "0 auto 2rem",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Dos siglos de tierra, trabajo, familia y transformación. Una historia profunda que hoy renace en la búsqueda
            de un habitar más conectado con la naturaleza, con aire limpio y con espacio real para vivir.
          </p>
          <Stack direction="row" gap={3} justify="center" wrap>
            <Button href="/propiedades" variant="gold">
              Ver parcelas disponibles
            </Button>
            <Button href="/cotizador" variant="secondary">
              Cotizar casa de campo
            </Button>
          </Stack>
        </Container>
      </section>

      {/* Declaración Editorial */}
      <Section tone="canvas">
        <Container>
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "1rem 0" }}>
            <span
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: "0.75rem",
                color: "#0b7d79",
                fontWeight: 700,
              }}
            >
              Carta editorial
            </span>
            <h2 style={{ fontSize: "2rem", fontFamily: "serif", margin: "0.5rem 0 1.25rem", color: "#132437" }}>
              No existe un solo campo chileno.
            </h2>
            <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "#334155", margin: "0 0 1rem" }}>
              Existe el campo del valle central, el de la precordillera, el del secano costero, el de los viñedos
              patrimoniales, el de los bosques del sur y el de familias que aprendieron a entender los ciclos del agua y
              el clima antes que el reloj de la ciudad.
            </p>
            <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "#334155", margin: "0 0 1.5rem" }}>
              Hoy la ruralidad no significa aislamiento: con electrificación, internet satelital de alta velocidad y
              caminos conectados, miles de chilenos están redescubriendo que tener su propia tierra no es un lujo
              lejano, sino una decisión consciente de salud, patrimonio y bienestar familiar.
            </p>
          </div>
        </Container>
      </Section>

      {/* Capítulos Históricos */}
      <Section tone="raised">
        <Container>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: "0.75rem",
                color: "#0b7d79",
                fontWeight: 700,
              }}
            >
              Línea de tiempo histórica
            </span>
            <h2 style={{ fontSize: "2.2rem", fontFamily: "serif", margin: "0.5rem 0", color: "#132437" }}>
              La evolución de nuestra tierra
            </h2>
          </div>

          <div style={{ display: "grid", gap: "2.5rem", maxWidth: 900, margin: "0 auto" }}>
            {CHAPTERS.map((ch, idx) => (
              <Card key={idx} style={{ borderRadius: "16px", padding: "2rem" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      fontFamily: "serif",
                      fontSize: "2.5rem",
                      fontWeight: 700,
                      color: "#d9aa34",
                      lineHeight: 1,
                    }}
                  >
                    {ch.year}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    {ch.period}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.4rem", fontFamily: "serif", color: "#132437", margin: "0.25rem 0 0.75rem" }}>
                  {ch.title}
                </h3>
                <p style={{ fontSize: "0.98rem", lineHeight: 1.7, color: "#475569", margin: "0 0 1rem" }}>
                  {ch.text}
                </p>

                {ch.fact ? (
                  <div
                    style={{
                      background: "#f1f5f9",
                      borderLeft: "3px solid #003f7a",
                      padding: "0.75rem 1rem",
                      fontSize: "0.88rem",
                      color: "#334155",
                      borderRadius: "0 8px 8px 0",
                    }}
                  >
                    <strong>Dato histórico:</strong> {ch.fact}
                  </div>
                ) : null}

                {ch.quote ? (
                  <div
                    style={{
                      background: "#fef9c3",
                      borderLeft: "3px solid #d9aa34",
                      padding: "1rem",
                      fontSize: "1.05rem",
                      fontFamily: "serif",
                      fontStyle: "italic",
                      color: "#713f12",
                      borderRadius: "0 8px 8px 0",
                    }}
                  >
                    {ch.quote}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Datos Estadísticos Chile Rural */}
      <Section tone="canvas">
        <Container>
          <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
            <span
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: "0.75rem",
                color: "#0b7d79",
                fontWeight: 700,
              }}
            >
              Cifras oficiales · INE & ODEPA
            </span>
            <h2 style={{ fontSize: "2.2rem", fontFamily: "serif", margin: "0.5rem 0 1.5rem", color: "#132437" }}>
              Chile se urbanizó, pero el campo sigue siendo el corazón del territorio
            </h2>
            <Grid columns={{ mobile: 1, tablet: 3, desktop: 3 }}>
              <Card style={{ textAlign: "center", borderRadius: "14px", padding: "1.75rem" }}>
                <strong style={{ display: "block", fontSize: "2.8rem", color: "#003f7a", fontFamily: "serif" }}>
                  25,5%
                </strong>
                <span style={{ fontSize: "0.9rem", color: "#475569", fontWeight: 600 }}>
                  de los chilenos vive en comunas rurales
                </span>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.5rem 0 0" }}>
                  Bajo la definición territorial de la PNDR (ODEPA).
                </p>
              </Card>
              <Card style={{ textAlign: "center", borderRadius: "14px", padding: "1.75rem" }}>
                <strong style={{ display: "block", fontSize: "2.8rem", color: "#003f7a", fontFamily: "serif" }}>
                  263
                </strong>
                <span style={{ fontSize: "0.9rem", color: "#475569", fontWeight: 600 }}>
                  de las 346 comunas de Chile son rurales
                </span>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.5rem 0 0" }}>
                  Comprenden cerca del 83% del territorio nacional continental.
                </p>
              </Card>
              <Card style={{ textAlign: "center", borderRadius: "14px", padding: "1.75rem" }}>
                <strong style={{ display: "block", fontSize: "2.8rem", color: "#003f7a", fontFamily: "serif" }}>
                  5.000 m²
                </strong>
                <span style={{ fontSize: "0.9rem", color: "#475569", fontWeight: 600 }}>
                  Superficie mínima legal de subdivisión rural (DL 3.516)
                </span>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.5rem 0 0" }}>
                  Garantía de espacio y preservación del entorno.
                </p>
              </Card>
            </Grid>
          </div>
        </Container>
      </Section>

      {/* Manifiesto y CTA */}
      <Section tone="inverse">
        <Container>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <span
              style={{
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "0.8rem",
                color: "#d9aa34",
                fontWeight: 700,
              }}
            >
              Tu proyecto de vida rural
            </span>
            <h2
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontFamily: "serif",
                margin: "0.75rem 0 1.25rem",
                lineHeight: 1.2,
              }}
            >
              Volver al campo no es volver atrás. Es elegir una vida distinta.
            </h2>
            <p
              style={{
                fontSize: "1.05rem",
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.85)",
                margin: "0 auto 2rem",
              }}
            >
              Tierra propia donde plantar lo que quieras ver crecer, aire limpio para tu familia y una casa diseñada a
              tu medida. En Tu Parcela Lista te acompañamos desde la selección del terreno hasta la entrega llave en
              mano.
            </p>
            <Stack direction="row" gap={3} justify="center" wrap>
              <Button href="/propiedades" variant="gold">
                Explorar parcelas con rol propio
              </Button>
              <Button href="/como-comprar" variant="secondary">
                Conocer la guía paso a paso
              </Button>
              <Button href="/cotizador" variant="ghost">
                Cotizador de casa y obras
              </Button>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Fuentes y Créditos */}
      <Section tone="canvas">
        <Container>
          <div style={{ maxWidth: 800, margin: "0 auto", fontSize: "0.85rem", color: "#64748b" }}>
            <strong style={{ display: "block", color: "#132437", marginBottom: "0.5rem" }}>
              Fuentes bibliográficas e institucionales:
            </strong>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
              <li>
                <a
                  href="https://www.memoriachilena.gob.cl/602/w3-article-3327.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#003f7a" }}
                >
                  Memoria Chilena (Biblioteca Nacional de Chile) — Cartilla de campo (1808–1817) y La Hacienda.
                </a>
              </li>
              <li>
                <a
                  href="https://www.odepa.gob.cl/dpto-desarrollo-rural/politica-nacional-de-desarrollo-rural"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#003f7a" }}
                >
                  ODEPA — Política Nacional de Desarrollo Rural (PNDR) y Atlas Rural de Chile.
                </a>
              </li>
              <li>
                <a
                  href="https://www.ine.gob.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#003f7a" }}
                >
                  INE — Síntesis de Resultados Censo de Población y Vivienda.
                </a>
              </li>
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}
