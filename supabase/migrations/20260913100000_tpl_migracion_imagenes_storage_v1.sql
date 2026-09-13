-- Migración generada automáticamente por scripts/migrate-images-to-storage.ts
-- Actualiza las filas de tpl_propiedad_imagenes para apuntar al bucket público de Supabase Storage
-- eliminando la dependencia del servidor legacy y normalizando nombres de archivo.

begin;

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/boton_combo_parcela_casa.webp',
      storage_path = 'legacy/boton_combo_parcela_casa.webp'
  where (url ilike '%boton_combo_parcela_casa.webp%' or storage_path ilike '%boton_combo_parcela_casa.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_foto.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_foto.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/82_caida_agua_foto.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/82_caida_agua_foto.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/82_caida_agua_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/82_caida_agua_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_foto.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_foto.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_foto.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_foto.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_foto.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_foto.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/42_caida_agua_foto.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/42_caida_agua_foto.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/42_caida_agua_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/42_caida_agua_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/48_caida_agua_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/48_caida_agua_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_foto.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_foto.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_foto.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_foto.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto_render.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto_render.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto_render.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto_render.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp',
      storage_path = 'legacy/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp'
  where (url ilike '%casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp%' or storage_path ilike '%casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pro/innova/innova_1_habitacion_foto.webp',
      storage_path = 'legacy/casas/pro/innova/innova_1_habitacion_foto.webp'
  where (url ilike '%casas/pro/innova/innova_1_habitacion_foto.webp%' or storage_path ilike '%casas/pro/innova/innova_1_habitacion_foto.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pro/innova/innova_1_habitacion_plano.webp',
      storage_path = 'legacy/casas/pro/innova/innova_1_habitacion_plano.webp'
  where (url ilike '%casas/pro/innova/innova_1_habitacion_plano.webp%' or storage_path ilike '%casas/pro/innova/innova_1_habitacion_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pro/innova/innova_3_habitaciones_foto_1.webp',
      storage_path = 'legacy/casas/pro/innova/innova_3_habitaciones_foto_1.webp'
  where (url ilike '%casas/pro/innova/innova_3_habitaciones_foto_1.webp%' or storage_path ilike '%casas/pro/innova/innova_3_habitaciones_foto_1.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pro/innova/innova_3_habitaciones_foto_2.webp',
      storage_path = 'legacy/casas/pro/innova/innova_3_habitaciones_foto_2.webp'
  where (url ilike '%casas/pro/innova/innova_3_habitaciones_foto_2.webp%' or storage_path ilike '%casas/pro/innova/innova_3_habitaciones_foto_2.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pro/nogales/alfa_72_mt2.webp',
      storage_path = 'legacy/casas/pro/nogales/alfa_72_mt2.webp'
  where (url ilike '%casas/pro/nogales/Alfa_72_mt2_.webp%' or storage_path ilike '%casas/pro/nogales/Alfa_72_mt2_.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/casas/pro/nogales/alfa_72_mt2_plano.webp',
      storage_path = 'legacy/casas/pro/nogales/alfa_72_mt2_plano.webp'
  where (url ilike '%casas/pro/nogales/Alfa_72_mt2_plano.webp%' or storage_path ilike '%casas/pro/nogales/Alfa_72_mt2_plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/cesar_caburgua/cesar_caburgua_2.webp',
      storage_path = 'legacy/cesar_caburgua/cesar_caburgua_2.webp'
  where (url ilike '%cesar_Caburgua/cesar_caburgua_ (2).webp%' or storage_path ilike '%cesar_Caburgua/cesar_caburgua_ (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/cesar_caburgua/cesar_caburgua_4.webp',
      storage_path = 'legacy/cesar_caburgua/cesar_caburgua_4.webp'
  where (url ilike '%cesar_Caburgua/cesar_caburgua_ (4).webp%' or storage_path ilike '%cesar_Caburgua/cesar_caburgua_ (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/cesar_caburgua/cesar_caburgua_1.webp',
      storage_path = 'legacy/cesar_caburgua/cesar_caburgua_1.webp'
  where (url ilike '%cesar_Caburgua/cesar_caburgua_(1).webp%' or storage_path ilike '%cesar_Caburgua/cesar_caburgua_(1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/cesar_caburgua/cesar_caburgua_3.webp',
      storage_path = 'legacy/cesar_caburgua/cesar_caburgua_3.webp'
  where (url ilike '%cesar_Caburgua/cesar_caburgua_(3).webp%' or storage_path ilike '%cesar_Caburgua/cesar_caburgua_(3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/cesar_caburgua/cesar_caburgua_5.webp',
      storage_path = 'legacy/cesar_caburgua/cesar_caburgua_5.webp'
  where (url ilike '%cesar_Caburgua/cesar_caburgua_(5).webp%' or storage_path ilike '%cesar_Caburgua/cesar_caburgua_(5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/cesar_caburgua/cesar_caburgua_6.gif',
      storage_path = 'legacy/cesar_caburgua/cesar_caburgua_6.gif'
  where (url ilike '%cesar_Caburgua/cesar_caburgua_(6).gif%' or storage_path ilike '%cesar_Caburgua/cesar_caburgua_(6).gif%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/cesar_caburgua/cesar_caburgua_7.webp',
      storage_path = 'legacy/cesar_caburgua/cesar_caburgua_7.webp'
  where (url ilike '%cesar_Caburgua/cesar_caburgua_(7).webp%' or storage_path ilike '%cesar_Caburgua/cesar_caburgua_(7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/22_04_-_proyecto_sag.pdf',
      storage_path = 'legacy/claudio_ruiz/22_04_-_proyecto_sag.pdf'
  where (url ilike '%claudio_ruiz/22.04.- PROYECTO SAG.pdf%' or storage_path ilike '%claudio_ruiz/22.04.- PROYECTO SAG.pdf%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/plano.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/plano.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/plano.webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/plano.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_1.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_1.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (1).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_2.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_2.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (2).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_3.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_3.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (3).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_4.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_4.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (4).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_5.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_5.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (5).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_plano_completo.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_plano_completo.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_plano_completo.webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_plano_completo.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_1.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_1.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (1).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_10.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_10.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (10).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (10).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_5.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_5.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (5).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_6.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_6.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (6).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_7.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_7.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (7).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_8.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_8.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (8).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (8).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_9.webp',
      storage_path = 'legacy/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000_9.webp'
  where (url ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (9).webp%' or storage_path ilike '%claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (9).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_1.webp',
      storage_path = 'legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_1.webp'
  where (url ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_1.webp%' or storage_path ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_1.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_2.webp',
      storage_path = 'legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_2.webp'
  where (url ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_2.webp%' or storage_path ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_2.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_3.webp',
      storage_path = 'legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_3.webp'
  where (url ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_3.webp%' or storage_path ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_3.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_4.webp',
      storage_path = 'legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_4.webp'
  where (url ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_4.webp%' or storage_path ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_4.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_5.webp',
      storage_path = 'legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_5.webp'
  where (url ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_5.webp%' or storage_path ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_5.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_6.webp',
      storage_path = 'legacy/duenos/bio_bio/los_angeles/virquenco/virquenco_sector_6.webp'
  where (url ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_6.webp%' or storage_path ilike '%duenos/bio bio/Los Angeles/Virquenco/virquenco_sector_6.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/yumbel/pirigallo/pirigallo_1.webp',
      storage_path = 'legacy/duenos/yumbel/pirigallo/pirigallo_1.webp'
  where (url ilike '%duenos/yumbel/pirigallo/pirigallo_(1).webp%' or storage_path ilike '%duenos/yumbel/pirigallo/pirigallo_(1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/yumbel/pirigallo/pirigallo_2.webp',
      storage_path = 'legacy/duenos/yumbel/pirigallo/pirigallo_2.webp'
  where (url ilike '%duenos/yumbel/pirigallo/pirigallo_(2).webp%' or storage_path ilike '%duenos/yumbel/pirigallo/pirigallo_(2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/yumbel/pirigallo/pirigallo_3.webp',
      storage_path = 'legacy/duenos/yumbel/pirigallo/pirigallo_3.webp'
  where (url ilike '%duenos/yumbel/pirigallo/pirigallo_(3).webp%' or storage_path ilike '%duenos/yumbel/pirigallo/pirigallo_(3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/yumbel/pirigallo/pirigallo_4.webp',
      storage_path = 'legacy/duenos/yumbel/pirigallo/pirigallo_4.webp'
  where (url ilike '%duenos/yumbel/pirigallo/pirigallo_(4).webp%' or storage_path ilike '%duenos/yumbel/pirigallo/pirigallo_(4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/yumbel/pirigallo/pirigallo_5.webp',
      storage_path = 'legacy/duenos/yumbel/pirigallo/pirigallo_5.webp'
  where (url ilike '%duenos/yumbel/pirigallo/pirigallo_(5).webp%' or storage_path ilike '%duenos/yumbel/pirigallo/pirigallo_(5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/duenos/yumbel/pirigallo/pirigallo_6.webp',
      storage_path = 'legacy/duenos/yumbel/pirigallo/pirigallo_6.webp'
  where (url ilike '%duenos/yumbel/pirigallo/pirigallo_(6).webp%' or storage_path ilike '%duenos/yumbel/pirigallo/pirigallo_(6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/altos_quillon/parcela_altos_de_quillon.pdf',
      storage_path = 'legacy/eric_arrepol/altos_quillon/parcela_altos_de_quillon.pdf'
  where (url ilike '%eric_arrepol/altos_quillon/Parcela Altos de Quillon.pdf%' or storage_path ilike '%eric_arrepol/altos_quillon/Parcela Altos de Quillon.pdf%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/altos_quillon/plano_gps.psd',
      storage_path = 'legacy/eric_arrepol/altos_quillon/plano_gps.psd'
  where (url ilike '%eric_arrepol/altos_quillon/PLANO gps.psd%' or storage_path ilike '%eric_arrepol/altos_quillon/PLANO gps.psd%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/altos_quillon/quillon_gps.webp',
      storage_path = 'legacy/eric_arrepol/altos_quillon/quillon_gps.webp'
  where (url ilike '%eric_arrepol/altos_quillon/quillon_gps.webp%' or storage_path ilike '%eric_arrepol/altos_quillon/quillon_gps.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/huacamala/fotos_arregladas_1.webp',
      storage_path = 'legacy/eric_arrepol/huacamala/fotos_arregladas_1.webp'
  where (url ilike '%eric_arrepol/huacamala/Fotos_arregladas_ (1).webp%' or storage_path ilike '%eric_arrepol/huacamala/Fotos_arregladas_ (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/huacamala/fotos_arregladas_2.webp',
      storage_path = 'legacy/eric_arrepol/huacamala/fotos_arregladas_2.webp'
  where (url ilike '%eric_arrepol/huacamala/Fotos_arregladas_ (2).webp%' or storage_path ilike '%eric_arrepol/huacamala/Fotos_arregladas_ (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/huacamala/fotos_arregladas_3.webp',
      storage_path = 'legacy/eric_arrepol/huacamala/fotos_arregladas_3.webp'
  where (url ilike '%eric_arrepol/huacamala/Fotos_arregladas_ (3).webp%' or storage_path ilike '%eric_arrepol/huacamala/Fotos_arregladas_ (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/huacamala/fotos_arregladas_4.webp',
      storage_path = 'legacy/eric_arrepol/huacamala/fotos_arregladas_4.webp'
  where (url ilike '%eric_arrepol/huacamala/Fotos_arregladas_ (4).webp%' or storage_path ilike '%eric_arrepol/huacamala/Fotos_arregladas_ (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/huacamala/gps_arreglado.webp',
      storage_path = 'legacy/eric_arrepol/huacamala/gps_arreglado.webp'
  where (url ilike '%eric_arrepol/huacamala/gps_arreglado.webp%' or storage_path ilike '%eric_arrepol/huacamala/gps_arreglado.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/huacamala/plano_de_subdivision_jorge_alarcon.pdf',
      storage_path = 'legacy/eric_arrepol/huacamala/plano_de_subdivision_jorge_alarcon.pdf'
  where (url ilike '%eric_arrepol/huacamala/PLANO DE SUBDIVISION JORGE ALARCON.pdf%' or storage_path ilike '%eric_arrepol/huacamala/PLANO DE SUBDIVISION JORGE ALARCON.pdf%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/huacamala/santa_ana.kmz',
      storage_path = 'legacy/eric_arrepol/huacamala/santa_ana.kmz'
  where (url ilike '%eric_arrepol/huacamala/santa ana .kmz%' or storage_path ilike '%eric_arrepol/huacamala/santa ana .kmz%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/huacamala/santa_ana_1.webp',
      storage_path = 'legacy/eric_arrepol/huacamala/santa_ana_1.webp'
  where (url ilike '%eric_arrepol/huacamala/santa_ana_1.webp%' or storage_path ilike '%eric_arrepol/huacamala/santa_ana_1.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/eric_arrepol/informacion_parcelas.txt',
      storage_path = 'legacy/eric_arrepol/informacion_parcelas.txt'
  where (url ilike '%eric_arrepol/INFORMACION PARCELAS.txt%' or storage_path ilike '%eric_arrepol/INFORMACION PARCELAS.txt%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/favicon-512.png',
      storage_path = 'legacy/favicon-512.png'
  where (url ilike '%favicon-512.png%' or storage_path ilike '%favicon-512.png%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/favicon.png',
      storage_path = 'legacy/favicon.png'
  where (url ilike '%favicon.png%' or storage_path ilike '%favicon.png%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/hero-family-field.jpg',
      storage_path = 'legacy/hero-family-field.jpg'
  where (url ilike '%hero-family-field.jpg%' or storage_path ilike '%hero-family-field.jpg%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/hero-partners-construction.jpg',
      storage_path = 'legacy/hero-partners-construction.jpg'
  where (url ilike '%hero-partners-construction.jpg%' or storage_path ilike '%hero-partners-construction.jpg%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/juan_fco_asesor.webp',
      storage_path = 'legacy/juan_fco_asesor.webp'
  where (url ilike '%juan_fco_asesor.webp%' or storage_path ilike '%juan_fco_asesor.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/logo-tu-parcela-lista.png',
      storage_path = 'legacy/logo-tu-parcela-lista.png'
  where (url ilike '%logo-tu-parcela-lista.png%' or storage_path ilike '%logo-tu-parcela-lista.png%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/logo_compartir.png',
      storage_path = 'legacy/logo_compartir.png'
  where (url ilike '%logo_compartir.png%' or storage_path ilike '%logo_compartir.png%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_1h_1.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_1h_1.webp'
  where (url ilike '%nacimiento/los_guindos/Los_guindos_1h (1).webp%' or storage_path ilike '%nacimiento/los_guindos/Los_guindos_1h (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_1h_2.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_1h_2.webp'
  where (url ilike '%nacimiento/los_guindos/Los_guindos_1h (2).webp%' or storage_path ilike '%nacimiento/los_guindos/Los_guindos_1h (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_1h_3.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_1h_3.webp'
  where (url ilike '%nacimiento/los_guindos/Los_guindos_1h (3).webp%' or storage_path ilike '%nacimiento/los_guindos/Los_guindos_1h (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_1h_4.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_1h_4.webp'
  where (url ilike '%nacimiento/los_guindos/Los_guindos_1h (4).webp%' or storage_path ilike '%nacimiento/los_guindos/Los_guindos_1h (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_1h_5.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_1h_5.webp'
  where (url ilike '%nacimiento/los_guindos/Los_guindos_1h (5).webp%' or storage_path ilike '%nacimiento/los_guindos/Los_guindos_1h (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_1h_6.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_1h_6.webp'
  where (url ilike '%nacimiento/los_guindos/Los_guindos_1h (6).webp%' or storage_path ilike '%nacimiento/los_guindos/Los_guindos_1h (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_89_arreglada.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_89_arreglada.webp'
  where (url ilike '%nacimiento/los_guindos/los_guindos_89 _arreglada_.webp%' or storage_path ilike '%nacimiento/los_guindos/los_guindos_89 _arreglada_.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_89_1_1.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_89_1_1.webp'
  where (url ilike '%nacimiento/los_guindos/los_guindos_89_1 (1).webp%' or storage_path ilike '%nacimiento/los_guindos/los_guindos_89_1 (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_89_1_2.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_89_1_2.webp'
  where (url ilike '%nacimiento/los_guindos/los_guindos_89_1 (2).webp%' or storage_path ilike '%nacimiento/los_guindos/los_guindos_89_1 (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_89_1_3.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_89_1_3.webp'
  where (url ilike '%nacimiento/los_guindos/los_guindos_89_1 (3).webp%' or storage_path ilike '%nacimiento/los_guindos/los_guindos_89_1 (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/los_guindos/los_guindos_89_gps.webp',
      storage_path = 'legacy/nacimiento/los_guindos/los_guindos_89_gps.webp'
  where (url ilike '%nacimiento/los_guindos/los_guindos_89_gps.webp%' or storage_path ilike '%nacimiento/los_guindos/los_guindos_89_gps.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_chequenal_12_2/chequenal_12.webp',
      storage_path = 'legacy/nacimiento/nac_chequenal_12_2/chequenal_12.webp'
  where (url ilike '%nacimiento/nac_chequenal_12_2/chequenal_12.webp%' or storage_path ilike '%nacimiento/nac_chequenal_12_2/chequenal_12.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_chequenal_12_2/chequenal_12_2_1.webp',
      storage_path = 'legacy/nacimiento/nac_chequenal_12_2/chequenal_12_2_1.webp'
  where (url ilike '%nacimiento/nac_chequenal_12_2/chequenal_12_2 (1).webp%' or storage_path ilike '%nacimiento/nac_chequenal_12_2/chequenal_12_2 (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_chequenal_12_2/chequenal_12_2_2.webp',
      storage_path = 'legacy/nacimiento/nac_chequenal_12_2/chequenal_12_2_2.webp'
  where (url ilike '%nacimiento/nac_chequenal_12_2/chequenal_12_2 (2).webp%' or storage_path ilike '%nacimiento/nac_chequenal_12_2/chequenal_12_2 (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_chequenal_12_2/chequenal_12_2_3.webp',
      storage_path = 'legacy/nacimiento/nac_chequenal_12_2/chequenal_12_2_3.webp'
  where (url ilike '%nacimiento/nac_chequenal_12_2/chequenal_12_2 (3).webp%' or storage_path ilike '%nacimiento/nac_chequenal_12_2/chequenal_12_2 (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_1.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_1.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (1).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_10.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_10.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (10).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (10).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_2.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_2.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (2).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_3.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_3.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (3).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_4.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_4.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (4).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_5.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_5.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (5).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_6.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_6.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (6).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_7.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_7.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (7).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_8.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_8.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (8).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (8).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_12/nac_chequenal_129_9.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_12/nac_chequenal_129_9.webp'
  where (url ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (9).webp%' or storage_path ilike '%nacimiento/nac_cheque_12/nac_chequenal_129_ (9).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_15/chequenal_44_1.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_15/chequenal_44_1.webp'
  where (url ilike '%nacimiento/nac_cheque_15/chequenal_44 (1).webp%' or storage_path ilike '%nacimiento/nac_cheque_15/chequenal_44 (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_15/chequenal_44_10.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_15/chequenal_44_10.webp'
  where (url ilike '%nacimiento/nac_cheque_15/chequenal_44 (10).webp%' or storage_path ilike '%nacimiento/nac_cheque_15/chequenal_44 (10).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_15/chequenal_44_6.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_15/chequenal_44_6.webp'
  where (url ilike '%nacimiento/nac_cheque_15/chequenal_44 (6).webp%' or storage_path ilike '%nacimiento/nac_cheque_15/chequenal_44 (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_15/chequenal_44_7.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_15/chequenal_44_7.webp'
  where (url ilike '%nacimiento/nac_cheque_15/chequenal_44 (7).webp%' or storage_path ilike '%nacimiento/nac_cheque_15/chequenal_44 (7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_15/chequenal_44_8.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_15/chequenal_44_8.webp'
  where (url ilike '%nacimiento/nac_cheque_15/chequenal_44 (8).webp%' or storage_path ilike '%nacimiento/nac_cheque_15/chequenal_44 (8).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_cheque_15/chequenal_44_9.webp',
      storage_path = 'legacy/nacimiento/nac_cheque_15/chequenal_44_9.webp'
  where (url ilike '%nacimiento/nac_cheque_15/chequenal_44 (9).webp%' or storage_path ilike '%nacimiento/nac_cheque_15/chequenal_44 (9).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_el_roble/el_roble_1.webp',
      storage_path = 'legacy/nacimiento/nac_el_roble/el_roble_1.webp'
  where (url ilike '%nacimiento/nac_el_roble/el_roble (1).webp%' or storage_path ilike '%nacimiento/nac_el_roble/el_roble (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_el_roble/el_roble_2.webp',
      storage_path = 'legacy/nacimiento/nac_el_roble/el_roble_2.webp'
  where (url ilike '%nacimiento/nac_el_roble/el_roble (2).webp%' or storage_path ilike '%nacimiento/nac_el_roble/el_roble (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_el_roble/el_roble_3.webp',
      storage_path = 'legacy/nacimiento/nac_el_roble/el_roble_3.webp'
  where (url ilike '%nacimiento/nac_el_roble/el_roble (3).webp%' or storage_path ilike '%nacimiento/nac_el_roble/el_roble (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_el_roble/el_roble_4.webp',
      storage_path = 'legacy/nacimiento/nac_el_roble/el_roble_4.webp'
  where (url ilike '%nacimiento/nac_el_roble/el_roble (4).webp%' or storage_path ilike '%nacimiento/nac_el_roble/el_roble (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_el_roble/el_roble_5.webp',
      storage_path = 'legacy/nacimiento/nac_el_roble/el_roble_5.webp'
  where (url ilike '%nacimiento/nac_el_roble/el_roble (5).webp%' or storage_path ilike '%nacimiento/nac_el_roble/el_roble (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_el_roble/el_roble_6.webp',
      storage_path = 'legacy/nacimiento/nac_el_roble/el_roble_6.webp'
  where (url ilike '%nacimiento/nac_el_roble/el_roble (6).webp%' or storage_path ilike '%nacimiento/nac_el_roble/el_roble (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nacimiento/nac_el_roble/el_roble_7.webp',
      storage_path = 'legacy/nacimiento/nac_el_roble/el_roble_7.webp'
  where (url ilike '%nacimiento/nac_el_roble/el_roble (7).webp%' or storage_path ilike '%nacimiento/nac_el_roble/el_roble (7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/negrete/negrete_con_rio_1.webp',
      storage_path = 'legacy/negrete/negrete_con_rio_1.webp'
  where (url ilike '%negrete/negrete_con_ _rio_ (1).webp%' or storage_path ilike '%negrete/negrete_con_ _rio_ (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/negrete/negrete_rio_2.webp',
      storage_path = 'legacy/negrete/negrete_rio_2.webp'
  where (url ilike '%negrete/negrete_rio_ (2).webp%' or storage_path ilike '%negrete/negrete_rio_ (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/negrete/negrete_rio_3.webp',
      storage_path = 'legacy/negrete/negrete_rio_3.webp'
  where (url ilike '%negrete/negrete_rio_ (3).webp%' or storage_path ilike '%negrete/negrete_rio_ (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/negrete/negrete_rio_4.webp',
      storage_path = 'legacy/negrete/negrete_rio_4.webp'
  where (url ilike '%negrete/negrete_rio_ (4).webp%' or storage_path ilike '%negrete/negrete_rio_ (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/negrete/negrete_rio_5.webp',
      storage_path = 'legacy/negrete/negrete_rio_5.webp'
  where (url ilike '%negrete/negrete_rio_ (5).webp%' or storage_path ilike '%negrete/negrete_rio_ (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/negrete/negrete_rio_6.webp',
      storage_path = 'legacy/negrete/negrete_rio_6.webp'
  where (url ilike '%negrete/negrete_rio_ (6).webp%' or storage_path ilike '%negrete/negrete_rio_ (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nipas_venega/nipas_1.png',
      storage_path = 'legacy/nipas_venega/nipas_1.png'
  where (url ilike '%nipas_venega/nipas (1).png%' or storage_path ilike '%nipas_venega/nipas (1).png%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nipas_venega/nipas_2.webp',
      storage_path = 'legacy/nipas_venega/nipas_2.webp'
  where (url ilike '%nipas_venega/nipas (2).webp%' or storage_path ilike '%nipas_venega/nipas (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nipas_venega/nipas_3.webp',
      storage_path = 'legacy/nipas_venega/nipas_3.webp'
  where (url ilike '%nipas_venega/nipas (3).webp%' or storage_path ilike '%nipas_venega/nipas (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nipas_venega/nipas_venegas_1.webp',
      storage_path = 'legacy/nipas_venega/nipas_venegas_1.webp'
  where (url ilike '%nipas_venega/nipas_venegas (1).webp%' or storage_path ilike '%nipas_venega/nipas_venegas (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nipas_venega/nipas_venegas_2.webp',
      storage_path = 'legacy/nipas_venega/nipas_venegas_2.webp'
  where (url ilike '%nipas_venega/nipas_venegas (2).webp%' or storage_path ilike '%nipas_venega/nipas_venegas (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/nipas_venega/nipas_venegas_3.webp',
      storage_path = 'legacy/nipas_venega/nipas_venegas_3.webp'
  where (url ilike '%nipas_venega/nipas_venegas (3).webp%' or storage_path ilike '%nipas_venega/nipas_venegas (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/placeholder-casa.jpg',
      storage_path = 'legacy/placeholder-casa.jpg'
  where (url ilike '%placeholder-casa.jpg%' or storage_path ilike '%placeholder-casa.jpg%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/placeholder-parcela.jpg',
      storage_path = 'legacy/placeholder-parcela.jpg'
  where (url ilike '%placeholder-parcela.jpg%' or storage_path ilike '%placeholder-parcela.jpg%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/publicar-parcela-fotografo-campo-v2.webp',
      storage_path = 'legacy/publicar-parcela-fotografo-campo-v2.webp'
  where (url ilike '%publicar-parcela-fotografo-campo-v2.webp%' or storage_path ilike '%publicar-parcela-fotografo-campo-v2.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/el_nogal/el_nogal_1.webp',
      storage_path = 'legacy/rio_claro_nery/el_nogal/el_nogal_1.webp'
  where (url ilike '%rio_claro_nery/el_nogal/el nogal (1).webp%' or storage_path ilike '%rio_claro_nery/el_nogal/el nogal (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/el_nogal/el_nogal_2.webp',
      storage_path = 'legacy/rio_claro_nery/el_nogal/el_nogal_2.webp'
  where (url ilike '%rio_claro_nery/el_nogal/el nogal (2).webp%' or storage_path ilike '%rio_claro_nery/el_nogal/el nogal (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/el_nogal/el_nogal_3.webp',
      storage_path = 'legacy/rio_claro_nery/el_nogal/el_nogal_3.webp'
  where (url ilike '%rio_claro_nery/el_nogal/el nogal (3).webp%' or storage_path ilike '%rio_claro_nery/el_nogal/el nogal (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/el_nogal/el_nogal_4.webp',
      storage_path = 'legacy/rio_claro_nery/el_nogal/el_nogal_4.webp'
  where (url ilike '%rio_claro_nery/el_nogal/el nogal (4).webp%' or storage_path ilike '%rio_claro_nery/el_nogal/el nogal (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/el_nogal/el_nogal_5.webp',
      storage_path = 'legacy/rio_claro_nery/el_nogal/el_nogal_5.webp'
  where (url ilike '%rio_claro_nery/el_nogal/el nogal (5).webp%' or storage_path ilike '%rio_claro_nery/el_nogal/el nogal (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/el_nogal/el_nogal_6.webp',
      storage_path = 'legacy/rio_claro_nery/el_nogal/el_nogal_6.webp'
  where (url ilike '%rio_claro_nery/el_nogal/el nogal (6).webp%' or storage_path ilike '%rio_claro_nery/el_nogal/el nogal (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/las_petacas/las_petacas_1.webp',
      storage_path = 'legacy/rio_claro_nery/las_petacas/las_petacas_1.webp'
  where (url ilike '%rio_claro_nery/las_petacas/las_petacas (1).webp%' or storage_path ilike '%rio_claro_nery/las_petacas/las_petacas (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/las_petacas/las_petacas_2.webp',
      storage_path = 'legacy/rio_claro_nery/las_petacas/las_petacas_2.webp'
  where (url ilike '%rio_claro_nery/las_petacas/las_petacas (2).webp%' or storage_path ilike '%rio_claro_nery/las_petacas/las_petacas (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/las_petacas/las_petacas_principal_2.webp',
      storage_path = 'legacy/rio_claro_nery/las_petacas/las_petacas_principal_2.webp'
  where (url ilike '%rio_claro_nery/las_petacas/las_petacas_principal_2.webp%' or storage_path ilike '%rio_claro_nery/las_petacas/las_petacas_principal_2.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/pano_largo/pano_largo_3.webp',
      storage_path = 'legacy/rio_claro_nery/pano_largo/pano_largo_3.webp'
  where (url ilike '%rio_claro_nery/pano_largo/pano_largo (3).webp%' or storage_path ilike '%rio_claro_nery/pano_largo/pano_largo (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/pano_largo/pano_largo_4.webp',
      storage_path = 'legacy/rio_claro_nery/pano_largo/pano_largo_4.webp'
  where (url ilike '%rio_claro_nery/pano_largo/pano_largo (4).webp%' or storage_path ilike '%rio_claro_nery/pano_largo/pano_largo (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/pano_largo/pano_largo_5.webp',
      storage_path = 'legacy/rio_claro_nery/pano_largo/pano_largo_5.webp'
  where (url ilike '%rio_claro_nery/pano_largo/pano_largo (5).webp%' or storage_path ilike '%rio_claro_nery/pano_largo/pano_largo (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/pano_largo/pano_largo_6.webp',
      storage_path = 'legacy/rio_claro_nery/pano_largo/pano_largo_6.webp'
  where (url ilike '%rio_claro_nery/pano_largo/pano_largo (6).webp%' or storage_path ilike '%rio_claro_nery/pano_largo/pano_largo (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/parcela_con_casa/rio_claro_con_casa_2.webp',
      storage_path = 'legacy/rio_claro_nery/parcela_con_casa/rio_claro_con_casa_2.webp'
  where (url ilike '%rio_claro_nery/parcela_con_casa/rio_claro_con_casa (2).webp%' or storage_path ilike '%rio_claro_nery/parcela_con_casa/rio_claro_con_casa (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/parcela_con_casa/rio_claro_con_casa_3.webp',
      storage_path = 'legacy/rio_claro_nery/parcela_con_casa/rio_claro_con_casa_3.webp'
  where (url ilike '%rio_claro_nery/parcela_con_casa/rio_claro_con_casa (3).webp%' or storage_path ilike '%rio_claro_nery/parcela_con_casa/rio_claro_con_casa (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/parcela_con_casa/rio_claro_con_casa_5.webp',
      storage_path = 'legacy/rio_claro_nery/parcela_con_casa/rio_claro_con_casa_5.webp'
  where (url ilike '%rio_claro_nery/parcela_con_casa/rio_claro_con_casa (5).webp%' or storage_path ilike '%rio_claro_nery/parcela_con_casa/rio_claro_con_casa (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/rio_claro_nery/parcela_con_casa/rio_claro_con_casa_6.webp',
      storage_path = 'legacy/rio_claro_nery/parcela_con_casa/rio_claro_con_casa_6.webp'
  where (url ilike '%rio_claro_nery/parcela_con_casa/rio_claro_con_casa (6).webp%' or storage_path ilike '%rio_claro_nery/parcela_con_casa/rio_claro_con_casa (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_a/a_florida_arreglada.webp',
      storage_path = 'legacy/samuel_florida/lote_a/a_florida_arreglada.webp'
  where (url ilike '%samuel_florida/lote_a/a_florida_arreglada.webp%' or storage_path ilike '%samuel_florida/lote_a/a_florida_arreglada.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_a/lote_a_1.webp',
      storage_path = 'legacy/samuel_florida/lote_a/lote_a_1.webp'
  where (url ilike '%samuel_florida/lote_a/lote_a (1).webp%' or storage_path ilike '%samuel_florida/lote_a/lote_a (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_a/lote_a_2.webp',
      storage_path = 'legacy/samuel_florida/lote_a/lote_a_2.webp'
  where (url ilike '%samuel_florida/lote_a/lote_a (2).webp%' or storage_path ilike '%samuel_florida/lote_a/lote_a (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_a/lote_a_3.webp',
      storage_path = 'legacy/samuel_florida/lote_a/lote_a_3.webp'
  where (url ilike '%samuel_florida/lote_a/lote_a (3).webp%' or storage_path ilike '%samuel_florida/lote_a/lote_a (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b2/b2_arreglada.webp',
      storage_path = 'legacy/samuel_florida/lote_b2/b2_arreglada.webp'
  where (url ilike '%samuel_florida/lote_b2/b2_arreglada_.webp%' or storage_path ilike '%samuel_florida/lote_b2/b2_arreglada_.webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b2/lote_b2_1.webp',
      storage_path = 'legacy/samuel_florida/lote_b2/lote_b2_1.webp'
  where (url ilike '%samuel_florida/lote_b2/lote_b2 (1).webp%' or storage_path ilike '%samuel_florida/lote_b2/lote_b2 (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b2/lote_b2_2.webp',
      storage_path = 'legacy/samuel_florida/lote_b2/lote_b2_2.webp'
  where (url ilike '%samuel_florida/lote_b2/lote_b2 (2).webp%' or storage_path ilike '%samuel_florida/lote_b2/lote_b2 (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b2/lote_b2_3.webp',
      storage_path = 'legacy/samuel_florida/lote_b2/lote_b2_3.webp'
  where (url ilike '%samuel_florida/lote_b2/lote_b2 (3).webp%' or storage_path ilike '%samuel_florida/lote_b2/lote_b2 (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b2/lote_b2_5.webp',
      storage_path = 'legacy/samuel_florida/lote_b2/lote_b2_5.webp'
  where (url ilike '%samuel_florida/lote_b2/lote_b2 (5).webp%' or storage_path ilike '%samuel_florida/lote_b2/lote_b2 (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_1.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_1.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (1).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_10.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_10.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (10).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (10).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_2.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_2.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (2).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_3.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_3.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (3).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_4.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_4.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (4).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_5.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_5.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (5).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_6.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_6.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (6).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_7.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_7.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (7).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_8.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_8.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (8).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (8).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_b3_casa/florida_b3_9.webp',
      storage_path = 'legacy/samuel_florida/lote_b3_casa/florida_b3_9.webp'
  where (url ilike '%samuel_florida/lote_b3_casa/florida_b3 (9).webp%' or storage_path ilike '%samuel_florida/lote_b3_casa/florida_b3 (9).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_c/lote_c_1.webp',
      storage_path = 'legacy/samuel_florida/lote_c/lote_c_1.webp'
  where (url ilike '%samuel_florida/lote_c/lote_c (1).webp%' or storage_path ilike '%samuel_florida/lote_c/lote_c (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_c/lote_c_2.webp',
      storage_path = 'legacy/samuel_florida/lote_c/lote_c_2.webp'
  where (url ilike '%samuel_florida/lote_c/lote_c (2).webp%' or storage_path ilike '%samuel_florida/lote_c/lote_c (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_c/lote_c_3.webp',
      storage_path = 'legacy/samuel_florida/lote_c/lote_c_3.webp'
  where (url ilike '%samuel_florida/lote_c/lote_c (3).webp%' or storage_path ilike '%samuel_florida/lote_c/lote_c (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_c/lote_c_4.webp',
      storage_path = 'legacy/samuel_florida/lote_c/lote_c_4.webp'
  where (url ilike '%samuel_florida/lote_c/lote_c (4).webp%' or storage_path ilike '%samuel_florida/lote_c/lote_c (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_c/lote_c_5.webp',
      storage_path = 'legacy/samuel_florida/lote_c/lote_c_5.webp'
  where (url ilike '%samuel_florida/lote_c/lote_c (5).webp%' or storage_path ilike '%samuel_florida/lote_c/lote_c (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_c/lote_c_6.webp',
      storage_path = 'legacy/samuel_florida/lote_c/lote_c_6.webp'
  where (url ilike '%samuel_florida/lote_c/lote_c (6).webp%' or storage_path ilike '%samuel_florida/lote_c/lote_c (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_c/lote_c_7.webp',
      storage_path = 'legacy/samuel_florida/lote_c/lote_c_7.webp'
  where (url ilike '%samuel_florida/lote_c/lote_c (7).webp%' or storage_path ilike '%samuel_florida/lote_c/lote_c (7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d1/florida_lote_d1_1.webp',
      storage_path = 'legacy/samuel_florida/lote_d1/florida_lote_d1_1.webp'
  where (url ilike '%samuel_florida/lote_d1/florida_lote_d1_ (1).webp%' or storage_path ilike '%samuel_florida/lote_d1/florida_lote_d1_ (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d1/florida_lote_d1_2.webp',
      storage_path = 'legacy/samuel_florida/lote_d1/florida_lote_d1_2.webp'
  where (url ilike '%samuel_florida/lote_d1/florida_lote_d1_ (2).webp%' or storage_path ilike '%samuel_florida/lote_d1/florida_lote_d1_ (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d1/florida_lote_d1_3.webp',
      storage_path = 'legacy/samuel_florida/lote_d1/florida_lote_d1_3.webp'
  where (url ilike '%samuel_florida/lote_d1/florida_lote_d1_ (3).webp%' or storage_path ilike '%samuel_florida/lote_d1/florida_lote_d1_ (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d1/florida_lote_d1_4.webp',
      storage_path = 'legacy/samuel_florida/lote_d1/florida_lote_d1_4.webp'
  where (url ilike '%samuel_florida/lote_d1/florida_lote_d1_ (4).webp%' or storage_path ilike '%samuel_florida/lote_d1/florida_lote_d1_ (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d1/florida_lote_d1_5.webp',
      storage_path = 'legacy/samuel_florida/lote_d1/florida_lote_d1_5.webp'
  where (url ilike '%samuel_florida/lote_d1/florida_lote_d1_ (5).webp%' or storage_path ilike '%samuel_florida/lote_d1/florida_lote_d1_ (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d1/florida_lote_d1_6.webp',
      storage_path = 'legacy/samuel_florida/lote_d1/florida_lote_d1_6.webp'
  where (url ilike '%samuel_florida/lote_d1/florida_lote_d1_ (6).webp%' or storage_path ilike '%samuel_florida/lote_d1/florida_lote_d1_ (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d1/florida_lote_d1_7.webp',
      storage_path = 'legacy/samuel_florida/lote_d1/florida_lote_d1_7.webp'
  where (url ilike '%samuel_florida/lote_d1/florida_lote_d1_ (7).webp%' or storage_path ilike '%samuel_florida/lote_d1/florida_lote_d1_ (7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d1/florida_lote_d1_8.webp',
      storage_path = 'legacy/samuel_florida/lote_d1/florida_lote_d1_8.webp'
  where (url ilike '%samuel_florida/lote_d1/florida_lote_d1_ (8).webp%' or storage_path ilike '%samuel_florida/lote_d1/florida_lote_d1_ (8).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d2/lote_d2_2.webp',
      storage_path = 'legacy/samuel_florida/lote_d2/lote_d2_2.webp'
  where (url ilike '%samuel_florida/lote_d2/lote_d2_ (2).webp%' or storage_path ilike '%samuel_florida/lote_d2/lote_d2_ (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d2/lote_d2_3.webp',
      storage_path = 'legacy/samuel_florida/lote_d2/lote_d2_3.webp'
  where (url ilike '%samuel_florida/lote_d2/lote_d2_ (3).webp%' or storage_path ilike '%samuel_florida/lote_d2/lote_d2_ (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d2/lote_d2_4.webp',
      storage_path = 'legacy/samuel_florida/lote_d2/lote_d2_4.webp'
  where (url ilike '%samuel_florida/lote_d2/lote_d2_ (4).webp%' or storage_path ilike '%samuel_florida/lote_d2/lote_d2_ (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d2/lote_d2_5.webp',
      storage_path = 'legacy/samuel_florida/lote_d2/lote_d2_5.webp'
  where (url ilike '%samuel_florida/lote_d2/lote_d2_ (5).webp%' or storage_path ilike '%samuel_florida/lote_d2/lote_d2_ (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d2/lote_d2_6.webp',
      storage_path = 'legacy/samuel_florida/lote_d2/lote_d2_6.webp'
  where (url ilike '%samuel_florida/lote_d2/lote_d2_ (6).webp%' or storage_path ilike '%samuel_florida/lote_d2/lote_d2_ (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d2/lote_d2_7.webp',
      storage_path = 'legacy/samuel_florida/lote_d2/lote_d2_7.webp'
  where (url ilike '%samuel_florida/lote_d2/lote_d2_ (7).webp%' or storage_path ilike '%samuel_florida/lote_d2/lote_d2_ (7).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d2/lote_d2_8.webp',
      storage_path = 'legacy/samuel_florida/lote_d2/lote_d2_8.webp'
  where (url ilike '%samuel_florida/lote_d2/lote_d2_ (8).webp%' or storage_path ilike '%samuel_florida/lote_d2/lote_d2_ (8).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/samuel_florida/lote_d2/lote_d2_9.webp',
      storage_path = 'legacy/samuel_florida/lote_d2/lote_d2_9.webp'
  where (url ilike '%samuel_florida/lote_d2/lote_d2_ (9).webp%' or storage_path ilike '%samuel_florida/lote_d2/lote_d2_ (9).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/wladimir_galaz/pemuco_1.webp',
      storage_path = 'legacy/wladimir_galaz/pemuco_1.webp'
  where (url ilike '%wladimir_galaz/pemuco_ (1).webp%' or storage_path ilike '%wladimir_galaz/pemuco_ (1).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/wladimir_galaz/pemuco_2.webp',
      storage_path = 'legacy/wladimir_galaz/pemuco_2.webp'
  where (url ilike '%wladimir_galaz/pemuco_ (2).webp%' or storage_path ilike '%wladimir_galaz/pemuco_ (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/wladimir_galaz/pemuco_3.webp',
      storage_path = 'legacy/wladimir_galaz/pemuco_3.webp'
  where (url ilike '%wladimir_galaz/pemuco_ (3).webp%' or storage_path ilike '%wladimir_galaz/pemuco_ (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/wladimir_galaz/pemuco_4.webp',
      storage_path = 'legacy/wladimir_galaz/pemuco_4.webp'
  where (url ilike '%wladimir_galaz/pemuco_ (4).webp%' or storage_path ilike '%wladimir_galaz/pemuco_ (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/wladimir_galaz/pemuco_5.webp',
      storage_path = 'legacy/wladimir_galaz/pemuco_5.webp'
  where (url ilike '%wladimir_galaz/pemuco_ (5).webp%' or storage_path ilike '%wladimir_galaz/pemuco_ (5).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/wladimir_galaz/pemuco_6.webp',
      storage_path = 'legacy/wladimir_galaz/pemuco_6.webp'
  where (url ilike '%wladimir_galaz/pemuco_ (6).webp%' or storage_path ilike '%wladimir_galaz/pemuco_ (6).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/wladimir_galaz/sd_dagnicalqui_last_20260406.pdf',
      storage_path = 'legacy/wladimir_galaz/sd_dagnicalqui_last_20260406.pdf'
  where (url ilike '%wladimir_galaz/SD_Dagnicalqui_Last_20260406.pdf%' or storage_path ilike '%wladimir_galaz/SD_Dagnicalqui_Last_20260406.pdf%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/yumbel/yumbel_5min_2.webp',
      storage_path = 'legacy/yumbel/yumbel_5min_2.webp'
  where (url ilike '%yumbel/yumbel_5min (2).webp%' or storage_path ilike '%yumbel/yumbel_5min (2).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/yumbel/yumbel_5min_3.webp',
      storage_path = 'legacy/yumbel/yumbel_5min_3.webp'
  where (url ilike '%yumbel/yumbel_5min (3).webp%' or storage_path ilike '%yumbel/yumbel_5min (3).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/yumbel/yumbel_5min_4.webp',
      storage_path = 'legacy/yumbel/yumbel_5min_4.webp'
  where (url ilike '%yumbel/yumbel_5min (4).webp%' or storage_path ilike '%yumbel/yumbel_5min (4).webp%');

update public.tpl_propiedad_imagenes
  set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/legacy/yumbel/yumbel_5min_5.webp',
      storage_path = 'legacy/yumbel/yumbel_5min_5.webp'
  where (url ilike '%yumbel/yumbel_5min (5).webp%' or storage_path ilike '%yumbel/yumbel_5min (5).webp%');

commit;
