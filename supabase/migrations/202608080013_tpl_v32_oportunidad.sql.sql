
alter table if exists propiedades
add column if not exists valor_promedio_mercado numeric,
add column if not exists oportunidad_porcentaje numeric,
add column if not exists oportunidad_monto numeric,
add column if not exists confianza_tasacion integer,
add column if not exists fecha_recalculo timestamptz;
