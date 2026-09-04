-- ============================================================
-- TPL MARKET · CANONIZACION CONFIRMADA 001
-- 3 pares multifuente confirmados
-- 2026-08-08
-- Requiere V1.6
-- ============================================================

-- 1) LAS NIEVES · YUMBEL
-- Portal Inmobiliario 3211054280 <-> Yapo 32145704
select public.tpl_market_registrar_feedback_v14(
  '76511a0c-2624-4462-ada4-b35d46b621ed'::uuid,
  'b80d4159-aca4-4d80-9dd8-a62ccaf2e997'::uuid,
  'misma',
  'Confirmación multifuente: mismo precio $11.500.000, 5.000 m2, Las Nieves/Ruta O-630, descripción coincidente y anunciante Bafamax/Ibafamax.'
);

select public.tpl_market_canonizar_par_v16(
  '76511a0c-2624-4462-ada4-b35d46b621ed'::uuid,
  'b80d4159-aca4-4d80-9dd8-a62ccaf2e997'::uuid,
  'Las Nieves Yumbel: Portal Inmobiliario + Yapo.'
);

-- 2) L109 · PICHILEMU
-- Yapo 32142027 <-> Portal Inmobiliario 3176643338
select public.tpl_market_registrar_feedback_v14(
  '0a0f2de8-a067-4713-b453-eedcc995928f'::uuid,
  'ee701219-96bc-4e14-b49a-1b3a8dbc439a'::uuid,
  'misma',
  'Confirmación multifuente: L109 Alto Colorado, $28.000.000, 5.000 m2, descripción idéntica y publicación eXp.'
);

select public.tpl_market_canonizar_par_v16(
  '0a0f2de8-a067-4713-b453-eedcc995928f'::uuid,
  'ee701219-96bc-4e14-b49a-1b3a8dbc439a'::uuid,
  'L109 Pichilemu: Yapo + Portal Inmobiliario.'
);

-- 3) SAN JAVIER · VALDIVIA
-- Portal Inmobiliario 3776920968 <-> Yapo 32164555
select public.tpl_market_registrar_feedback_v14(
  '4dd15b40-1f74-48e1-855c-d1d7ac0bb184'::uuid,
  'bbe58582-9893-439a-9e94-8868efaf201a'::uuid,
  'misma',
  'Confirmación multifuente: San Javier Valdivia, $60.000.000, 5.000 m2, descripción idéntica y Daniel Carrasco Gestión Inmobiliaria.'
);

select public.tpl_market_canonizar_par_v16(
  '4dd15b40-1f74-48e1-855c-d1d7ac0bb184'::uuid,
  'bbe58582-9893-439a-9e94-8868efaf201a'::uuid,
  'San Javier Valdivia: Portal Inmobiliario + Yapo.'
);

-- 4) Nueva fotografía histórica posterior a canonización.
select public.tpl_market_snapshot_historial_v16();

-- 5) Validaciones.
select public.tpl_market_auditoria_canonizacion_v16();
select * from public.tpl_market_grupos_resumen_v16 order by canonizado_at desc;
