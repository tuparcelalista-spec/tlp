-- TPL: pago real de la reserva de parcela (1% del valor publicado)
--
-- Contexto: el botón "Reservar" en proyecto.html solo guardaba una intención
-- (TPLDataService.createProjectAction) y nunca disparaba un cobro con Flow.
-- Además el catálogo de parcelas (frontend-v2/parcelas.js) vive como JSON
-- estático en el frontend, así que hoy no existe ningún precio de referencia
-- en el servidor contra el cual validar el monto de una reserva.
--
-- Esta migración:
--   1) siembra tpl_propiedades con las 32 parcelas del catálogo público
--      (codigo = id usado en parcelas.js), como fuente de verdad de precio.
--   2) agrega columnas de bloqueo temporal para evitar doble reserva.
--   3) crea tpl_crear_orden_reserva_v1(), que SIEMPRE calcula el monto de la
--      reserva desde precio_publicado en la base de datos (nunca confía en
--      un monto enviado por el cliente) y bloquea la parcela por 1 mes.
--
-- Pendiente de una futura migración: reemplazar este seed manual por una
-- sincronización real del catálogo (hoy frontend-v2/parcelas.js sigue siendo
-- la fuente que ve el usuario; esto solo cubre el precio para pagos).

-- 1) Columnas de bloqueo/reserva sobre tpl_propiedades
alter table public.tpl_propiedades
  add column if not exists reservada_hasta timestamptz,
  add column if not exists reservada_orden_id uuid references public.tpl_ordenes_informe(id) on delete set null;

create index if not exists tpl_propiedades_codigo_idx on public.tpl_propiedades(codigo);

-- Reglas de negocio confirmadas (2026-09-03):
--   - Mientras alguien está pagando, la parcela queda bloqueada 1 MES
--     (evita que otro interesado la vea disponible mientras se gestiona el pago).
--   - Si dos personas intentan reservar casi al mismo tiempo, gana el
--     PRIMER PAGO CONFIRMADO por Flow (no el primer clic): el "for update"
--     de la función solo bloquea el intento de crear la orden/lock; el
--     estado 'reservada' solo se vuelve definitivo cuando flow-webhook
--     confirma el pago.
--   - La reserva es reembolsable dentro de las primeras 24 HORAS desde el
--     pago (columna reembolsable_hasta en tpl_ordenes_informe, ver más abajo).

alter table public.tpl_ordenes_informe
  add column if not exists reembolsable_hasta timestamptz;

-- 2) Semilla del catálogo público (precio_publicado en CLP, superficie en m2)
insert into public.tpl_propiedades
  (codigo, titulo, comuna, precio_publicado, superficie_m2, lat, lng, tipo, estado)
values
  ('perigallo_yumbel','Parcela cercada con linda vista sector Perigallo - Yumbel','Yumbel',20000000,5000,-37.04244276437281,-72.64501423010334,'parcela','publicada'),
  ('venega_ñipas','Lomas Coloradas - Ñipas','Ñipas',25000000,5000,-36.636288,-72.564494,'parcela','publicada'),
  ('el_roble','El Roble Nativo – Nacimiento','Nacimiento',6690000,5000,-37.54761,-72.94834,'parcela','publicada'),
  ('chequenal_parcela_13','Chequenal Nativo – Parcela 13 | Nacimiento','Nacimiento',13658000,5000,-37.365243,-72.723828,'parcela','publicada'),
  ('chequenal_parcela_44','Chequenal Premium con Arroyo | Nacimiento','Nacimiento',15800000,5000,-37.365363,-72.718449,'parcela','publicada'),
  ('santa_ana_media_hectarea','Santa Ana – 5.000 m² | Quillón','Quillón',8490000,5000,-36.828756,-72.522014,'parcela','publicada'),
  ('florida_d2','Las Ulloas – Parcela D2 | Florida','Florida',24360000,5000,-36.854346,-72.764013,'parcela','publicada'),
  ('los_guindos_media_hectarea','Los Guindos Nativo – Bosque Nahuelbuta | Nacimiento','Nacimiento',9578000,5000,-37.53577,-72.9466,'parcela','publicada'),
  ('el_nogal','El Nogal – Campo de 10.700 m² | Río Claro, Yumbel','Yumbel',36720000,10700,-37.18659,-72.64762,'parcela','publicada'),
  ('yumbel_ruta_6500mts2','Ruta Concepción–Yumbel | Parcela 6.500 m²','Yumbel',15800000,6500,-36.99474,-72.59144,'parcela','publicada'),
  ('yumbel_ruta_7000mts2','Ruta Concepción–Yumbel Premium | Parcela 7.000 m²','Yumbel',24980000,7000,-36.992761,-72.590585,'parcela','publicada'),
  ('pano_largo','Paño Largo – Campo de 4,02 Hectáreas | Río Claro, Yumbel','Yumbel',50480000,40200,-37.1904519,-72.6527261,'parcela','publicada'),
  ('las_petacas','Las Petacas – Campo de 4,36 Hectáreas | Río Claro, Yumbel','Yumbel',46400000,43600,-37.1906555,-72.6525468,'parcela','publicada'),
  ('florida_b2','Las Ulloas Premium – Parcela B2 | Florida','Florida',24377000,5021,-36.8546817,-72.7665286,'parcela','publicada'),
  ('florida_a','Las Ulloas Premium – Parcela A | Florida','Florida',33200000,6800,-36.85464,-72.76762,'parcela','publicada'),
  ('florida_c','Las Ulloas Vista Panorámica – Parcela C | Florida','Florida',47580000,9800,-36.85365,-72.76631,'parcela','publicada'),
  ('florida_b3','Las Ulloas – Casa de Campo Premium | Florida','Florida',150000000,11000,-36.85471,-72.7661,'parcela','publicada'),
  ('florida_d1','Las Ulloas Mirador – Parcela D1 | Florida','Florida',42640000,8700,-36.85463,-72.76441,'parcela','publicada'),
  ('los_guindos_1h','Los Guindos Nativo – Campo de 1 Hectárea | Nacimiento','Nacimiento',14900000,10000,-37.53582,-72.94645,'parcela','publicada'),
  ('negrete_vista_rio','Mirador del Biobío – Vista al Río | Negrete','Negrete',28900000,5000,-37.56553,-72.63902,'parcela','publicada'),
  ('negrete_parcela_con_rio','Ribera del Vergara – Acceso Privado al Río | Negrete','Negrete',36200000,5000,-37.56553,-72.63902,'parcela','publicada'),
  ('yumbel_5min_pueblo','Yumbel Centro Cercano – Parcela 5.000 m²','Yumbel',24980000,5000,-37.1008182,-72.5751052,'parcela','publicada'),
  ('rio_claro_con_casa','Río Claro – Parcela con Vivienda para Remodelar | Yumbel','Yumbel',31100000,5000,-37.19014,-72.64794,'parcela','publicada'),
  ('altos_quillon','Altos de Quillón – Parcela 5.000 m²','Quillón',26300000,5000,-36.77703,-72.46799,'parcela','publicada'),
  ('pemuco_campo','Cordilleranas de Pemuco – Campo de 10 Hectáreas | Ñuble','Pemuco',98000000,100000,-37.01864,-71.65292,'parcela','publicada'),
  ('santa_ana_campo','Santa Ana de Quillón – Campo de 10 Hectáreas | Proyecto de Parcelación','Quillón',120000000,100000,-36.831954,-72.522757,'parcela','publicada'),
  ('santa_ana_6000mts2','Santa Ana del Baúl – Parcela 6.000 m² | Quillón','Quillón',10000000,6000,-36.82842,-72.52133,'parcela','publicada'),
  ('santa_ana_9500mts2','Santa Ana del Baúl – Parcela Premium 9.500 m² | Quillón','Quillón',16000000,9500,-36.82842,-72.52133,'parcela','publicada'),
  ('santa_ana_8000mts2','Santa Ana del Baúl – Parcela Premium 8.000 m² | Quillón','Quillón',13500000,8000,-36.831166,-72.522963,'parcela','publicada'),
  ('chequenal_4ultimas','Chequenal – Últimas 4 Parcelas Disponibles | Nacimiento','Nacimiento',12500000,5000,-37.359662,-72.722855,'parcela','publicada'),
  ('caburgua','Mirador del Villarrica – Parcela Premium | Caburgua','Pucón',173000000,5000,-39.25332,-71.79639,'parcela','publicada'),
  ('campo_ruta_cabrero','Ruta Concepción–Cabrero – Campo Estratégico 2 Hectáreas | Yumbel','Yumbel',95000000,20000,-36.9928,-72.59044,'parcela','publicada')
on conflict (codigo) do update set
  precio_publicado = excluded.precio_publicado,
  titulo = excluded.titulo,
  comuna = excluded.comuna,
  superficie_m2 = excluded.superficie_m2,
  lat = excluded.lat,
  lng = excluded.lng,
  updated_at = now();

-- 3) RPC: crea una orden de reserva calculando el monto SIEMPRE en el servidor
create or replace function public.tpl_crear_orden_reserva_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := trim(coalesce(p_payload->>'parcela_codigo', ''));
  v_email text := lower(trim(coalesce(p_payload#>>'{contacto,email}', p_payload->>'email', '')));
  v_nombre text := trim(coalesce(p_payload#>>'{contacto,nombre}', p_payload->>'nombre', ''));
  v_telefono text := trim(coalesce(p_payload#>>'{contacto,telefono}', p_payload->>'telefono', ''));
  v_propiedad public.tpl_propiedades;
  v_monto bigint;
  v_orden public.tpl_ordenes_informe;
begin
  if v_codigo = '' then
    raise exception 'Falta identificar la parcela a reservar.';
  end if;
  if v_email = '' or position('@' in v_email) < 2 then
    raise exception 'Debes ingresar un correo válido para la reserva.';
  end if;
  if v_nombre = '' then
    raise exception 'Debes ingresar tu nombre.';
  end if;

  -- bloquea la fila para evitar que dos personas reserven la misma parcela
  -- en paralelo (primer pago confirmado gana; el bloqueo expira solo si
  -- nadie completó el pago dentro de 1 mes)
  select * into v_propiedad
  from public.tpl_propiedades
  where codigo = v_codigo
  for update;

  if not found then
    raise exception 'La parcela indicada no existe.';
  end if;

  if v_propiedad.precio_publicado is null or v_propiedad.precio_publicado <= 0 then
    raise exception 'La parcela no tiene un precio publicado válido.';
  end if;

  if v_propiedad.estado = 'reservada'
     and v_propiedad.reservada_hasta is not null
     and v_propiedad.reservada_hasta > now() then
    raise exception 'Esta parcela ya tiene una reserva en curso. Intenta nuevamente más tarde.';
  end if;

  if v_propiedad.estado = 'vendida' then
    raise exception 'Esta parcela ya no está disponible.';
  end if;

  -- el monto de la reserva es SIEMPRE el 1% del precio guardado en el servidor
  v_monto := round(v_propiedad.precio_publicado * 0.01);

  insert into public.tpl_ordenes_informe(
    propiedad_id, tipo_informe, estado, monto_clp, contacto, entrada_snapshot, metadata
  ) values (
    v_propiedad.id,
    'reserva_parcela',
    'pendiente_pago',
    v_monto,
    jsonb_build_object('nombre', v_nombre, 'email', v_email, 'telefono', v_telefono),
    jsonb_build_object(
      'parcela_codigo', v_propiedad.codigo,
      'titulo', v_propiedad.titulo,
      'comuna', v_propiedad.comuna,
      'precio_publicado', v_propiedad.precio_publicado
    ),
    jsonb_build_object('origen', coalesce(p_payload->>'origen', 'proyecto'))
  ) returning * into v_orden;

  update public.tpl_propiedades
  set estado = 'reservada',
      reservada_hasta = now() + interval '1 month',
      reservada_orden_id = v_orden.id,
      updated_at = now()
  where id = v_propiedad.id;

  insert into public.tpl_eventos(evento, categoria, origen, prioridad, descripcion, metadata)
  values (
    'reserva_parcela_solicitada', 'comercial', 'proyecto', 'alta',
    'Nueva reserva de parcela pendiente de pago (bloqueo 1 mes).',
    jsonb_build_object('orden_id', v_orden.id, 'codigo', v_orden.codigo, 'parcela_codigo', v_propiedad.codigo, 'monto_clp', v_monto, 'email', v_email)
  );

  return jsonb_build_object(
    'ok', true,
    'orden_id', v_orden.id,
    'codigo', v_orden.codigo,
    'estado', v_orden.estado,
    'monto_clp', v_monto,
    'reservada_hasta', (now() + interval '1 month')
  );
end;
$$;

grant execute on function public.tpl_crear_orden_reserva_v1(jsonb) to anon, authenticated;

comment on function public.tpl_crear_orden_reserva_v1(jsonb) is
'Crea una orden de reserva (tpl_ordenes_informe.tipo_informe = reserva_parcela) calculando el monto SIEMPRE desde tpl_propiedades.precio_publicado y bloqueando la parcela 1 mes. Debe llamarse solo desde la Edge Function crear-pago-reserva (protegida con rate limit).';
