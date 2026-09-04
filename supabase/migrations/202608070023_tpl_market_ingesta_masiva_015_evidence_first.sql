-- ============================================================
-- TPL MARKET INTELLIGENCE · INGESTA MASIVA 015
-- CARGA CONSERVADORA / EVIDENCE-FIRST · 2026-08-08
-- 2 fichas exactas nuevas verificadas
-- ============================================================
-- IMPORTANTE:
-- No se fabrican registros para alcanzar un umbral estadístico.
-- Cuando la oferta pública nueva se agota, el siguiente salto debe venir
-- de nuevas fuentes o nuevas publicaciones reales.
-- ============================================================

select public.tpl_market_ingestar_lote_v1('[{"fuente_codigo":"portalterreno","fuente_publicacion_id":"PTV15-EFF30E6DCE545777E4","titulo":"Segunda Faja cerca de Candelaria Pucón UF2990","region_codigo":"CL-AR","region":"La Araucanía","comuna":"Pucón","zona":"Segunda Faja / Candelaria","tipo_tpl":"parcela","superficie_m2":5000,"estado":"activa","metadata":{"source_listing_url":"https://portalterreno.cl/propiedad/1168-cod36409-segunda-faja-cerca-de-sector-candelaria","captura_verificada":true,"lote":"MASS015"},"snapshot_metadata":{"captura":"ficha_publica_exacta","fecha":"2026-08-08","lote":"MASS015","source_listing_url":"https://portalterreno.cl/propiedad/1168-cod36409-segunda-faja-cerca-de-sector-candelaria"},"precio_uf":2990,"agua_estado":"factibilidad","electricidad_estado":"factibilidad","topografia":"plana","acceso_tipo":"camino asfaltado hasta loteo","atributos_naturales":["vista parcial lago","vista volcan"]},{"fuente_codigo":"portalterreno","fuente_publicacion_id":"PTV15-044BF8808582C14274","titulo":"Condominio Santa Emilia Cayumapu Valdivia UF3000","region_codigo":"CL-LR","region":"Los Ríos","comuna":"Valdivia","zona":"Cayumapu / Condominio Santa Emilia","tipo_tpl":"parcela","superficie_m2":5000,"estado":"activa","metadata":{"source_listing_url":"https://portalterreno.cl/propiedad/4245-condominio-santa-emilia","captura_verificada":true,"lote":"MASS015"},"snapshot_metadata":{"captura":"ficha_publica_exacta","fecha":"2026-08-08","lote":"MASS015","source_listing_url":"https://portalterreno.cl/propiedad/4245-condominio-santa-emilia"},"precio_uf":3000,"condominio":true}]'::jsonb);

insert into public.tpl_market_zonas(
  region_codigo,comuna,zona,microzona,nombre_normalizado,
  fuente_definicion,confianza,activo,metadata
)
select q.region_codigo,q.comuna,q.zona,null,q.nombre_normalizado,
       'market_ingesta_verificada',95,true,
       jsonb_build_object('origen','ficha_publica_exacta')
from (
  select distinct on (
    public.tpl_market_normalizar_texto_v1(p.comuna),
    public.tpl_market_normalizar_texto_v1(p.zona_texto)
  )
    p.region_codigo,p.comuna,p.zona_texto as zona,
    public.tpl_market_normalizar_texto_v1(p.zona_texto) as nombre_normalizado
  from public.tpl_market_propiedades p
  where coalesce(trim(p.comuna),'')<>'' and coalesce(trim(p.zona_texto),'')<>''
  order by public.tpl_market_normalizar_texto_v1(p.comuna),
           public.tpl_market_normalizar_texto_v1(p.zona_texto),
           p.updated_at desc nulls last,p.id
) q
on conflict(comuna,nombre_normalizado) do update
set activo=true,
    confianza=greatest(public.tpl_market_zonas.confianza,excluded.confianza),
    updated_at=now();

update public.tpl_market_propiedades p
set zona_id=z.id,updated_at=now()
from public.tpl_market_zonas z
where p.zona_id is null
  and public.tpl_market_normalizar_texto_v1(p.comuna)=public.tpl_market_normalizar_texto_v1(z.comuna)
  and public.tpl_market_normalizar_texto_v1(p.zona_texto)=z.nombre_normalizado;

select public.tpl_market_auditoria_v2();
select public.tpl_market_auditoria_uf_v1();
select public.tpl_market_auditoria_duplicados_v1();

select public.tpl_market_radar_v22('Pucón','parcela',65000000,5000,null,null,20,5);
select public.tpl_market_radar_v22('Valdivia','parcela',50000000,5000,null,null,20,5);
select public.tpl_market_radar_v22('Florida','parcela',25000000,5000,null,null,20,5);
select public.tpl_market_radar_v22('Yumbel','parcela',20000000,5000,null,null,20,5);
select public.tpl_market_radar_v22('Quillón','parcela',25000000,5000,null,null,20,5);
