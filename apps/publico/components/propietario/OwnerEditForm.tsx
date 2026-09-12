"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Card, Stack, Grid } from "@tpl/ui";
import { updateOwnerProperty } from "../../lib/propietario/actions";
import type { OwnerPropertySummary } from "../../lib/propietario/presentation";

interface OwnerEditFormProps {
  token: string;
  propiedad: OwnerPropertySummary;
}

export function OwnerEditForm({ token, propiedad }: OwnerEditFormProps) {
  const [titulo, setTitulo] = useState(propiedad.titulo || "");
  const [descripcion, setDescripcion] = useState(propiedad.descripcion || "");
  const [precio, setPrecio] = useState<number | string>(propiedad.precioPublicado ?? "");
  const [superficie, setSuperficie] = useState<number | string>(propiedad.superficieM2 ?? "");
  const [agua, setAgua] = useState(propiedad.agua || "");
  const [electricidad, setElectricidad] = useState(propiedad.electricidad || "");
  const [acceso, setAcceso] = useState(propiedad.acceso || "");
  const [topografia, setTopografia] = useState(propiedad.topografia || "");
  const [rolSituacion, setRolSituacion] = useState(propiedad.rolSituacion || "");
  const [cierrePerimetral, setCierrePerimetral] = useState(propiedad.cierrePerimetral || "");
  const [porton, setPorton] = useState(propiedad.porton || "");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      precio_publicado: precio !== "" ? Number(precio) : undefined,
      superficie_m2: superficie !== "" ? Number(superficie) : undefined,
      agua: agua.trim() || undefined,
      electricidad: electricidad.trim() || undefined,
      acceso: acceso.trim() || undefined,
      topografia: topografia.trim() || undefined,
      rol_situacion: rolSituacion.trim() || undefined,
      cierre_perimetral: cierrePerimetral.trim() || undefined,
      porton: porton.trim() || undefined,
    };

    try {
      const res = await updateOwnerProperty(token, payload);
      if (res.ok) {
        const count = res.campos_modificados?.length ?? 0;
        setFeedback({
          type: "success",
          message: `¡Propiedad actualizada con éxito! (${count} ${count === 1 ? "campo guardado" : "campos guardados"})`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "No se pudo actualizar la información. Intenta nuevamente.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Ocurrió un error inesperado al conectar con el servidor.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: "2rem", borderRadius: "16px", background: "#fff", border: "1px solid #e2e8f0" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h3 style={{ fontSize: "1.35rem", color: "#132437", margin: "0 0 6px" }}>
            Editar Información de tu Parcela
          </h3>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.92rem" }}>
            Actualiza los atributos publicados de tu anuncio. Los cambios se sincronizan en tiempo real con el portal.
          </p>
        </div>

        {feedback && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "0.92rem",
              background: feedback.type === "success" ? "#f0fdf4" : "#fef2f2",
              color: feedback.type === "success" ? "#166534" : "#991b1b",
              border: `1px solid ${feedback.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            {feedback.message}
          </div>
        )}

        <Grid columns={{ mobile: 1, tablet: 2, desktop: 2 }} gap={4}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-titulo" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Título del anuncio
            </label>
            <Input
              id="owner-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              disabled={saving}
              placeholder="Ej. Parcela con orilla de río y bosque nativo"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-precio" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Precio de venta publicado (CLP)
            </label>
            <Input
              id="owner-precio"
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
              disabled={saving}
              placeholder="Ej. 35000000"
            />
          </div>
        </Grid>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="owner-descripcion" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
            Descripción detallada
          </label>
          <textarea
            id="owner-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            disabled={saving}
            placeholder="Describe los aspectos destacados de tu propiedad..."
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.95rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <Grid columns={{ mobile: 1, tablet: 3, desktop: 3 }} gap={4}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-superficie" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Superficie (m²)
            </label>
            <Input
              id="owner-superficie"
              type="number"
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
              disabled={saving}
              placeholder="Ej. 5000"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-rol" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Situación de Rol
            </label>
            <select
              id="owner-rol"
              value={rolSituacion}
              onChange={(e) => setRolSituacion(e.target.value)}
              disabled={saving}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.95rem",
                background: "#fff",
              }}
            >
              <option value="">Seleccionar...</option>
              <option value="Rol propio individual">Rol propio individual</option>
              <option value="En trámite CBR / SAG">En trámite CBR / SAG</option>
              <option value="Cesión de derechos">Cesión de derechos</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-acceso" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Tipo de Acceso
            </label>
            <select
              id="owner-acceso"
              value={acceso}
              onChange={(e) => setAcceso(e.target.value)}
              disabled={saving}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.95rem",
                background: "#fff",
              }}
            >
              <option value="">Seleccionar...</option>
              <option value="Pavimentado">Pavimentado</option>
              <option value="Ripio en buen estado">Ripio en buen estado</option>
              <option value="Tierra todo el año">Tierra todo el año</option>
              <option value="Requiere 4x4">Requiere 4x4</option>
            </select>
          </div>
        </Grid>

        <Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap={4}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-agua" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Agua
            </label>
            <select
              id="owner-agua"
              value={agua}
              onChange={(e) => setAgua(e.target.value)}
              disabled={saving}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.95rem",
                background: "#fff",
              }}
            >
              <option value="">Seleccionar...</option>
              <option value="Agua potable rural (APR)">Agua potable rural (APR)</option>
              <option value="Pozo profundo">Pozo profundo</option>
              <option value="Vertiente natural">Vertiente natural</option>
              <option value="Factibilidad de agua">Factibilidad de agua</option>
              <option value="Sin agua">Sin agua</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-electricidad" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Electricidad
            </label>
            <select
              id="owner-electricidad"
              value={electricidad}
              onChange={(e) => setElectricidad(e.target.value)}
              disabled={saving}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.95rem",
                background: "#fff",
              }}
            >
              <option value="">Seleccionar...</option>
              <option value="Empalme instalado">Empalme instalado</option>
              <option value="Factibilidad de luz">Factibilidad de luz</option>
              <option value="Panel solar / Off-grid">Panel solar / Off-grid</option>
              <option value="Sin electricidad">Sin electricidad</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-topografia" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Topografía
            </label>
            <select
              id="owner-topografia"
              value={topografia}
              onChange={(e) => setTopografia(e.target.value)}
              disabled={saving}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.95rem",
                background: "#fff",
              }}
            >
              <option value="">Seleccionar...</option>
              <option value="Plana">Plana</option>
              <option value="Loma suave">Loma suave</option>
              <option value="Mixta">Mixta</option>
              <option value="Quebrada / Pendiente">Quebrada / Pendiente</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="owner-cierre" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
              Cierre y Portón
            </label>
            <select
              id="owner-cierre"
              value={cierrePerimetral}
              onChange={(e) => setCierrePerimetral(e.target.value)}
              disabled={saving}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.95rem",
                background: "#fff",
              }}
            >
              <option value="">Cierre...</option>
              <option value="Cierre perimetral completo">Cercado completo</option>
              <option value="Parcialmente cercado">Parcialmente cercado</option>
              <option value="Sin cercar">Sin cercar</option>
            </select>
          </div>
        </Grid>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando cambios…" : "Guardar cambios en el anuncio"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
