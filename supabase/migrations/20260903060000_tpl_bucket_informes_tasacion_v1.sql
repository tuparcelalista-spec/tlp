-- Tu Parcela Lista
-- Bucket privado para los PDFs del Informe Premium
-- Fecha: 2026-09-03
-- generar-informe-premium ya no simula el envío: genera un PDF real y lo
-- guarda aquí. estado-informe firma URLs temporales para descargarlo.

insert into storage.buckets (id, name, public)
values ('tpl-informes-tasacion', 'tpl-informes-tasacion', false)
on conflict (id) do update set public = false;

-- Sin políticas adicionales: el bucket es privado y solo la service role
-- (generar-informe-premium, estado-informe) lo lee/escribe. La service role
-- ignora RLS de storage, así que no se requieren policies para que funcione.
