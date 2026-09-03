-- =============================================================
--  Datos de ejemplo para desarrollo / demo.
--  Requiere que YA exista un usuario en Supabase Auth.
--
--  Uso: reemplazar el UUID de abajo por el id de un usuario real
--  (Supabase Studio → Authentication → Users → copiar el UID) y
--  ejecutar en el SQL Editor.
--
--  La batería de datos de prueba "en serio" (perfiles TP-01 a TP-05)
--  la arma Matu (QA). Esto es solo un piso para ver el dashboard.
-- =============================================================

do $$
declare
  v_user_id     uuid := '00000000-0000-0000-0000-000000000000';  -- <-- CAMBIAR
  v_ws_id       uuid;
  v_analysis_id uuid;
begin
  if not exists (select 1 from public.users where id = v_user_id) then
    raise exception 'No existe public.users con id %. Registrá el usuario primero.', v_user_id;
  end if;

  -- Workspace (perfil tipo TP-01: producto físico, vende por Instagram)
  insert into public.workspaces (
    owner_user_id, name, country, city, category, stage,
    offer, target_audience, objective_90d, objective_90d_note,
    current_sales_value, current_sales_period, currency,
    instagram_handle, instagram_account_type, instagram_connection_status
  )
  values (
    v_user_id,
    'Alma Cerámica',
    'Argentina', 'Córdoba',
    'Productos físicos / artesanías',
    'ventas',
    'Vajilla y objetos de cerámica artesanal hechos a mano, venta por encargo y stock limitado.',
    'Personas de 25-45 que decoran su casa o buscan regalos con valor artesanal.',
    'consultas',
    'Aumentar las consultas por Instagram en 90 días.',
    12, '30 dias', 'ARS',
    'almaceramica', 'profesional', 'conectada'
  )
  returning id into v_ws_id;

  -- Métricas (declaradas + de Instagram), con período
  insert into public.metrics (workspace_id, metric_type, value, period_start, period_end, source, status) values
    (v_ws_id, 'seguidores',    1200, now() - interval '30 days', now(), 'instagram', 'ok'),
    (v_ws_id, 'alcance',       9000, now() - interval '30 days', now(), 'instagram', 'ok'),
    (v_ws_id, 'interacciones',  520, now() - interval '30 days', now(), 'instagram', 'ok'),
    (v_ws_id, 'consultas',       35, now() - interval '30 days', now(), 'manual',    'ok'),
    (v_ws_id, 'ventas',          12, now() - interval '30 days', now(), 'manual',    'ok'),
    (v_ws_id, 'visitas_perfil', null, now() - interval '30 days', now(), 'instagram', 'sin_datos');

  -- Análisis completo de ejemplo
  insert into public.analyses (
    workspace_id, requested_by, kind, objective, status, context_quality,
    input, result, projection, sources, model, prompt_version, completed_at
  )
  values (
    v_ws_id, v_user_id, 'completo', 'consultas', 'completada', 'parcial',
    '{"pregunta": "¿Cómo aumento las consultas en 90 días?"}'::jsonb,
    '{"resumen": "Emprendimiento de cerámica artesanal en etapa de ventas, con base chica pero fiel en Instagram.", "calidad_contexto": "parcial", "fortalezas": ["clientela recurrente", "producto diferenciado", "bajo costo de adquisición"], "riesgos": ["stock limitado", "dependencia de un solo canal", "estacionalidad"], "oportunidades": ["contenido de proceso", "packs para regalo", "alianzas con tiendas de barrio"]}'::jsonb,
    '{"objetivo": "consultas", "escenarios": [{"nivel": "bajo", "rango": [35, 42]}, {"nivel": "base", "rango": [42, 55]}, {"nivel": "alto", "rango": [55, 70]}], "confianza": "baja", "supuestos": ["publicar 3x/semana", "responder consultas < 2h"], "aclaracion": "Rangos estimados, no garantizados."}'::jsonb,
    '[{"titulo": "Instagram Insights", "url": "https://www.instagram.com", "fecha": "2026-09-01", "afirmacion": "alcance e interacciones del período"}]'::jsonb,
    'pendiente-de-definir', 'v0',
    now()
  )
  returning id into v_analysis_id;

  -- Acciones priorizadas surgidas del análisis
  insert into public.actions (workspace_id, analysis_id, title, reason, impact, effort, target_metric, position) values
    (v_ws_id, v_analysis_id, 'Publicar 3 veces por semana mostrando el proceso',
      'El contenido de proceso genera más guardados y consultas.', 'alto', 'medio', 'interacciones', 1),
    (v_ws_id, v_analysis_id, 'Responder consultas en menos de 2 horas',
      'La velocidad de respuesta es el mayor factor de conversión en venta por encargo.', 'alto', 'bajo', 'consultas', 2),
    (v_ws_id, v_analysis_id, 'Armar 2 packs de regalo con precio cerrado',
      'Baja la fricción de decisión y sube el ticket.', 'medio', 'medio', 'ventas', 3);

  raise notice 'Seed OK. workspace_id = %, analysis_id = %', v_ws_id, v_analysis_id;
end $$;
