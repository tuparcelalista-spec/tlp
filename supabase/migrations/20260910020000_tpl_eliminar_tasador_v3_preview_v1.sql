-- ============================================================
-- ELIMINAR TPL TASADOR v3 (PREVIEW COMERCIAL, NUNCA DESPLEGADO)
-- 2026-09-10
--
-- POR QUÉ
--   Se instaló el 2026-08-07 (202608070001_tpl_tasador_v3_preview_comercial_v1.sql)
--   como motor alternativo en modo SOLO_PREVIEW_NO_MODIFICA_TASACIONES. El
--   motor oficial único es frontend-v2/js/core/valuation-engine.js (ver
--   docs/architecture/TPL-TASADOR-SINGLE-ENGINE-AUDIT-v1.0.md). Nada del
--   frontend, del CRM ni de las edge functions llama a
--   tpl_tasador_v3_preview_propiedad_v1/_cartera_v1/_auditoria_v1: quedaba
--   solo como un segundo motor que devuelve un valor distinto por RPC si
--   alguien lo invoca manualmente.
-- ============================================================

drop function if exists public.tpl_tasador_v3_auditoria_v1() cascade;
drop function if exists public.tpl_tasador_v3_preview_cartera_v1() cascade;
drop function if exists public.tpl_tasador_v3_preview_propiedad_v1(uuid) cascade;
drop function if exists public.tpl_tasador_v3_superficie_base_uf_v1(numeric) cascade;
drop function if exists public.tpl_tasador_v3_factor_hub_v1(numeric) cascade;
drop function if exists public.tpl_tasador_v3_param_v1(text) cascade;

drop table if exists public.tpl_tasador_valores_comunales_v3 cascade;
drop table if exists public.tpl_tasador_distancia_hub_v3 cascade;
drop table if exists public.tpl_tasador_parametros_v3 cascade;
