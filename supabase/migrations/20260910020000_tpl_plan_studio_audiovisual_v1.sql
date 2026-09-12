-- 20260910020000_tpl_plan_studio_audiovisual_v1.sql
-- Registrar Pack Audiovisual TPL Studio en el catalogo oficial de planes

insert into public.tpl_planes_servicio (
  codigo, nombre, descripcion, precio_clp, precio_glosa, condicion_glosa,
  badge, destacado, boton_texto, beneficios, etiqueta_crm, vigencia_dias,
  requiere_pago, orden, activo, metadata
) values (
  'pack_studio_veo',
  'TPL Studio · Pack Audiovisual IA',
  'Generacion de tomas cinematicas y videos con Inteligencia Artificial para tu parcela.',
  14990,
  '$14.990 pago unico',
  'Sin cobros mensuales recurrentes',
  'Videos IA 4K',
  true,
  'Desbloquear con Webpay',
  '["3 tomas cinematicas generadas con IA", "Formatos 16:9 y 9:16 vertical", "Sobrevuelo Dron FPV y Atardecer", "Publicacion automatica en ficha web", "Descarga en alta definicion para redes sociales"]'::jsonb,
  'Pack Audiovisual Studio',
  90,
  true,
  3,
  true,
  '{"tipo": "audiovisual_ia", "videos_incluidos": 3}'::jsonb
)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  precio_clp = excluded.precio_clp,
  precio_glosa = excluded.precio_glosa,
  boton_texto = excluded.boton_texto,
  beneficios = excluded.beneficios,
  activo = true;

-- RPC para verificar acceso audiovisual de una parcela
create or replace function public.tpl_studio_verificar_acceso_parcela_v1(
  p_propiedad_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_prop record;
  v_tiene_acceso boolean := false;
  v_plan_codigo text := 'gratis';
  v_es_admin boolean := false;
  v_contratacion_activa record;
begin
  select id, codigo, titulo, plan_codigo into v_prop
  from public.tpl_propiedades
  where id = p_propiedad_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'PROPIEDAD_NO_ENCONTRADA');
  end if;

  v_plan_codigo := coalesce(v_prop.plan_codigo, 'gratis');

  if auth.role() = 'service_role' or coalesce(public.tpl_es_staff(), false) then
    v_es_admin := true;
    v_tiene_acceso := true;
  end if;

  if v_plan_codigo in ('pack_studio_veo', 'audiovisual', 'marketing') then
    v_tiene_acceso := true;
  end if;

  if not v_tiene_acceso then
    select id, plan_codigo, estado_pago, estado_servicio
    into v_contratacion_activa
    from public.tpl_contrataciones_servicio
    where propiedad_id = p_propiedad_id
      and plan_codigo in ('pack_studio_veo', 'marketing')
      and estado_pago = 'pagado'
      and estado_servicio in ('activo', 'en_proceso', 'completado')
    order by created_at desc
    limit 1;

    if found then
      v_tiene_acceso := true;
      v_plan_codigo := v_contratacion_activa.plan_codigo;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'propiedad_id', p_propiedad_id,
    'tiene_acceso', v_tiene_acceso,
    'plan_codigo', v_plan_codigo,
    'es_admin', v_es_admin,
    'precio_pack_clp', 14990,
    'plan_nombre', case
      when v_plan_codigo = 'pack_studio_veo' then 'Pack Audiovisual IA'
      when v_plan_codigo = 'marketing' then 'Plan Marketing Inmobiliario'
      else 'Sin Plan Audiovisual'
    end
  );
end;
$$;

grant execute on function public.tpl_studio_verificar_acceso_parcela_v1(uuid) to anon, authenticated, service_role;
