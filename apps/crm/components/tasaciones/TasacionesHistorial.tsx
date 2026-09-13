import type { TasacionRow } from "../../lib/tasaciones/data";
import { formatCLP } from "../../lib/utils/format";

/**
 * Puerto 1:1 de `render()` en `modules/tasaciones/index.js`. Es una tabla de
 * solo lectura sin ningún estado ni interacción — el `init()` original está
 * vacío — así que a diferencia de Parcelas/Actores esto puede ser un
 * Server Component puro, sin `"use client"`.
 */
export function TasacionesHistorial({ tasaciones }: { tasaciones: TasacionRow[] }) {
  return (
    <div className="tasaciones-module">
      <h1 className="tasaciones-title">Historial de Tasaciones Global</h1>
      <div className="tasaciones-table-card">
        <div className="tasaciones-table-scroll">
          <table className="tasaciones-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Propiedad ID</th>
                <th>Motor</th>
                <th className="tasaciones-th-right">Superficie</th>
                <th className="tasaciones-th-right">Precio Publicado</th>
                <th className="tasaciones-th-right">Valor TPL M2</th>
                <th className="tasaciones-th-right">Valor Total Estimado</th>
                <th className="tasaciones-th-center">Oportunidad</th>
              </tr>
            </thead>
            <tbody>
              {tasaciones.length > 0 ? (
                tasaciones.map((t) => (
                  <tr key={t.id}>
                    <td className="tasaciones-td-nowrap">{new Date(t.created_at).toLocaleDateString("es-CL")}</td>
                    <td className="tasaciones-td-mono">{t.propiedad_id ? String(t.propiedad_id).substring(0, 8) + "..." : "-"}</td>
                    <td>
                      <span className="tasaciones-pill">{t.version_motor || "v1"}</span>
                    </td>
                    <td className="tasaciones-td-right">{t.superficie_m2} m²</td>
                    <td className="tasaciones-td-right">{formatCLP(t.precio_publicado)}</td>
                    <td className="tasaciones-td-right tasaciones-td-valor">{formatCLP(t.valor_tpl_m2)}</td>
                    <td className="tasaciones-td-right tasaciones-td-total">{formatCLP(t.valor_tpl_total)}</td>
                    <td className="tasaciones-td-center">
                      {t.es_oportunidad ? (
                        <span className="tasaciones-check tasaciones-check--si" title="Sí">
                          ✓
                        </span>
                      ) : (
                        <span className="tasaciones-check tasaciones-check--no" title="No">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="tasaciones-empty">
                    Sin registros de tasaciones en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
