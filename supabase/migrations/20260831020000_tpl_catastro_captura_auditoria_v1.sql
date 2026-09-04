-- Fase 3 (auditoría de seguridad): la extensión Chrome de captura de mercado
-- insertaba en tpl_catastro_mercado con la anon key, sin capture_id,
-- captured_at ni captured_by. Verificado en vivo: la política RLS de INSERT
-- ya exige auth.role()='authenticated', así que hoy la extensión falla
-- (42501) en cada intento -- está rota, no solo insegura.
--
-- Este cambio agrega un trigger que, cuando la extensión inserte con una
-- sesión de staff real (en vez de la anon key), completa capture_id,
-- captured_at y captured_by automáticamente en el servidor -- el cliente
-- ya no puede falsificar quién capturó el registro.
-- Reversible con: drop trigger + drop function.

begin;

create or replace function public.tpl_catastro_mercado_set_captura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.captured_by is null then
    new.captured_by := auth.uid();
  end if;
  if new.captured_at is null then
    new.captured_at := now();
  end if;
  if new.capture_id is null then
    new.capture_id := encode(gen_random_bytes(9), 'base64');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tpl_catastro_mercado_set_captura on public.tpl_catastro_mercado;
create trigger trg_tpl_catastro_mercado_set_captura
before insert on public.tpl_catastro_mercado
for each row execute function public.tpl_catastro_mercado_set_captura();

commit;
