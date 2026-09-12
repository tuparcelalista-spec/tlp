drop policy if exists tpl_propiedad_videos_public_read on public.tpl_propiedad_videos;
drop policy if exists tpl_propiedad_videos_select_all on public.tpl_propiedad_videos;
create policy tpl_propiedad_videos_select_all on public.tpl_propiedad_videos for select to anon, authenticated using (true);

create or replace function public.tpl_studio_publicar_video_parcela_v1(p_video_id uuid, p_publicar boolean default true)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_video record;
begin
  select * into v_video from public.tpl_propiedad_videos where id = p_video_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'VIDEO_NO_ENCONTRADO'); end if;
  if p_publicar then
    update public.tpl_propiedad_videos set publicado_en_parcela = false where propiedad_id = v_video.propiedad_id and id <> p_video_id;
    update public.tpl_propiedad_videos set publicado_en_parcela = true where id = p_video_id;
  else
    update public.tpl_propiedad_videos set publicado_en_parcela = false where id = p_video_id;
  end if;
  return jsonb_build_object('ok', true, 'video_id', p_video_id, 'publicado_en_parcela', p_publicar, 'propiedad_id', v_video.propiedad_id);
end;
$$;
grant execute on function public.tpl_studio_publicar_video_parcela_v1(uuid, boolean) to anon, authenticated, service_role;
