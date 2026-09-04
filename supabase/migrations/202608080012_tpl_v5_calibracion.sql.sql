
alter table if exists propiedades
add column if not exists valor_promedio_mercado numeric,
add column if not exists oportunidad_porcentaje numeric,
add column if not exists oportunidad_monto numeric,
add column if not exists indice_tpl integer,
add column if not exists confianza_tasacion integer,
add column if not exists liquidez_comunal text,
add column if not exists referencia_comunal_m2 numeric;

create table if not exists tpl_referencias_comunales (
  comuna text not null,
  segmento text not null,
  mediana_m2 numeric not null,
  promedio_m2 numeric,
  p25 numeric,
  p75 numeric,
  cantidad_comparables integer default 0,
  confianza integer default 50,
  fecha_actualizacion timestamptz default now(),
  primary key (comuna, segmento)
);
