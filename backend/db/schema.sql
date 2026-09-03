-- =============================================================
--  Modelo de datos del MVP · App para emprendedores
--  Motor: PostgreSQL (Supabase)
--  Cómo aplicar: Supabase Studio → SQL Editor → pegar y ejecutar.
--  Es idempotente: se puede correr varias veces sin romper nada.
--
--  Alineado con la especificación funcional de Semana 1 (Matu):
--  docs/semana_1_matu_producto_investigacion_qa.pdf
--  (planes Gratuito/Pro, campos del workspace FR-03/3.1, contrato
--   de IA sección 4, métricas sección 5, acciones priorizadas).
--
--  Regla de propiedad (aislamiento entre emprendimientos):
--  toda tabla de un emprendimiento se rastrea hasta el workspace y,
--  desde ahí, hasta el usuario propietario:
--    files/metrics/analyses/actions.workspace_id
--      → workspaces.owner_user_id → users.id
--
--  El backend accede con la SERVICE ROLE KEY (saltea RLS) y hace su
--  propia autorización en Express (valida user_id + workspace_id, no
--  confía en el id que manda la app). Las políticas RLS de acá son
--  una segunda barrera.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
--  Helper: mantener updated_at al día
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
--  plans · catálogo de planes y límites (Gratuito / Pro / Business)
--  Todos los knobs viven acá; la app solo los consulta, no los duplica
--  como constantes. NULL en un límite = sin tope.
--
--  Enforcement en el MVP (recorrido de demo): max_workspaces,
--  max_storage_mb (sumado entre todos los workspaces del usuario),
--  max_file_mb, tipos de archivo y el gate de análisis completo
--  (Gratuito no puede → aparece el paywall).
--  Backlog (no se valida todavía): colaboradores/multiusuario,
--  contadores mensuales de análisis/búsquedas, papelera con retención,
--  varias cuentas de Instagram, exportaciones, precios anuales, Founder.
-- =============================================================
create table if not exists public.plans (
  id                            text primary key,      -- 'free' | 'business' | 'pro'
  name                          text not null,
  price_cents                   integer not null default 0,   -- mensual, referencia paywall (pago simulado)
  price_annual_cents            integer,                       -- anual sugerido (NULL = no ofrecido)
  max_workspaces                integer,               -- NULL = sin tope
  max_collaborators_per_workspace integer not null default 0,  -- 0 = solo el propietario (multiusuario es backlog)
  max_storage_mb                integer,               -- total de la cuenta, repartido entre workspaces
  max_file_mb                   integer,               -- tamaño máximo por archivo
  max_analyses_preview_monthly  integer,               -- vistas previas de IA por mes (NULL = incluida)
  max_analyses_full_monthly     integer,               -- análisis completos por mes
  max_searches_monthly          integer,               -- búsquedas / investigaciones web por mes
  history_months                integer,               -- meses de historial visibles (1 = solo el último)
  max_instagram_accounts        integer,               -- cuentas de Instagram conectables
  features                      jsonb   not null default '{}'::jsonb,  -- dashboard, instagram, export, support (cualitativos)
  created_at                    timestamptz not null default now()
);

insert into public.plans
  (id, name, price_cents, price_annual_cents, max_workspaces, max_collaborators_per_workspace,
   max_storage_mb, max_file_mb, max_analyses_preview_monthly, max_analyses_full_monthly,
   max_searches_monthly, history_months, max_instagram_accounts, features)
values
  ('free', 'Gratuito', 0, null, 1, 0,
    500, 10, 1, 0,
    0, 1, 1,
    '{"dashboard": "resumen_limitado", "instagram": "muestra_basica", "search": "muestra", "export": [], "support": "centro_ayuda"}'::jsonb),
  ('business', 'Business', 999, 9900, 3, 2,
    5120, 25, null, 15,
    15, 6, 3,
    '{"dashboard": "completo", "instagram": "metricas_completas", "search": "completa", "export": ["pdf"], "support": "prioritario"}'::jsonb),
  ('pro', 'Pro', 1999, 19900, 10, 5,
    25600, 50, null, 50,
    50, 24, 10,
    '{"dashboard": "completo_comparativo", "instagram": "metricas_comparacion", "search": "completa", "export": ["pdf","csv","xlsx"], "support": "prioridad_alta"}'::jsonb)
on conflict (id) do update set
  name                            = excluded.name,
  price_cents                     = excluded.price_cents,
  price_annual_cents              = excluded.price_annual_cents,
  max_workspaces                  = excluded.max_workspaces,
  max_collaborators_per_workspace = excluded.max_collaborators_per_workspace,
  max_storage_mb                  = excluded.max_storage_mb,
  max_file_mb                     = excluded.max_file_mb,
  max_analyses_preview_monthly    = excluded.max_analyses_preview_monthly,
  max_analyses_full_monthly       = excluded.max_analyses_full_monthly,
  max_searches_monthly            = excluded.max_searches_monthly,
  history_months                  = excluded.history_months,
  max_instagram_accounts          = excluded.max_instagram_accounts,
  features                        = excluded.features;

-- =============================================================
--  users · perfil de la app, 1:1 con auth.users (Supabase Auth)
-- =============================================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- =============================================================
--  subscriptions · plan del usuario (fuente de verdad del plan activo)
--  En el MVP la activación es simulada (is_simulated = true).
--  Activación idempotente: índice único parcial de una sola activa.
-- =============================================================
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  plan_id             text not null references public.plans(id),
  status              text not null default 'active'
                        check (status in ('active','trialing','canceled','expired')),
  is_simulated        boolean not null default true,
  started_at          timestamptz not null default now(),
  current_period_end  timestamptz,
  created_at          timestamptz not null default now()
);

create unique index if not exists uq_subscriptions_active_per_user
  on public.subscriptions (user_id) where status = 'active';
create index if not exists ix_subscriptions_user on public.subscriptions (user_id);

-- =============================================================
--  workspaces · el emprendimiento / espacio de trabajo
--  Campos según FR-03 y 3.1 de la especificación.
-- =============================================================
create table if not exists public.workspaces (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null references public.users(id) on delete cascade,

  name             text not null check (char_length(name) between 2 and 80),
  country          text,                       -- país
  city             text,                       -- ciudad / área
  category         text,                       -- rubro (catálogo + "Otro")
  stage            text check (stage in ('idea','lanzamiento','ventas','crecimiento')),  -- etapa
  offer            text check (offer is null or char_length(offer) between 10 and 500),          -- oferta principal
  target_audience  text check (target_audience is null or char_length(target_audience) between 10 and 500),  -- cliente objetivo

  -- Objetivo a 90 días: alimenta la estimación (se elige uno).
  objective_90d       text check (objective_90d in ('ventas','alcance','consultas','validacion','otro')),
  objective_90d_note  text,

  -- Datos operativos declarados (opcionales).
  current_sales_value   numeric,
  current_sales_period  text,                  -- p. ej. 'mensual', '30 dias'
  currency              text,                  -- ISO 4217, p. ej. 'ARS', 'USD'

  website_url      text,
  instagram_handle text,
  instagram_account_type      text not null default 'desconocido'
                    check (instagram_account_type in ('personal','profesional','desconocido')),
  instagram_connection_status text not null default 'no_conectada'
                    check (instagram_connection_status in ('no_conectada','conectada','permiso_faltante','error')),

  deleted_at       timestamptz,                -- eliminación lógica (NULL = activo)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ix_workspaces_owner on public.workspaces (owner_user_id);
create index if not exists ix_workspaces_owner_active
  on public.workspaces (owner_user_id) where deleted_at is null;

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- =============================================================
--  files · archivos subidos, asociados a un workspace (Supabase Storage)
--  storage_path debe ser una clave no predecible (UUID), no el nombre.
-- =============================================================
create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  uploaded_by   uuid references public.users(id) on delete set null,
  name          text not null,                       -- nombre original mostrado al usuario
  mime_type     text,
  size_bytes    bigint not null default 0,
  storage_path  text not null,                       -- clave dentro del bucket (no predecible)
  process_status text not null default 'pendiente'
                  check (process_status in ('pendiente','procesando','procesado','fallido')),
  extracted_text text,                               -- texto extraído para el contexto de IA
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists ix_files_workspace on public.files (workspace_id);

-- =============================================================
--  metrics · métricas del emprendimiento para el dashboard (sección 5)
--  Distingue período y estado: "sin datos" NO es 0.
-- =============================================================
create table if not exists public.metrics (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  metric_type   text not null,   -- 'alcance'|'vistas'|'interacciones'|'tasa_interaccion'|'seguidores'|'visitas_perfil'|'consultas'|'ventas'|'conversion'
  value         numeric,         -- NULL permitido si status <> 'ok'
  period_start  timestamptz,
  period_end    timestamptz,
  recorded_at   timestamptz not null default now(),   -- cuándo se registró/actualizó
  source        text not null default 'manual'
                  check (source in ('manual','instagram','calculada','analysis','import','simulada')),
  status        text not null default 'ok'
                  check (status in ('ok','sin_datos','permiso_faltante','error')),
  created_at    timestamptz not null default now(),
  constraint metrics_value_presente check (status <> 'ok' or value is not null)
);

create index if not exists ix_metrics_workspace on public.metrics (workspace_id);
create index if not exists ix_metrics_workspace_type_date
  on public.metrics (workspace_id, metric_type, period_end desc nulls last, recorded_at desc);

-- =============================================================
--  analyses · historial de análisis con IA (contrato sección 4)
--  result: salida estructurada (resumen, calidad_contexto, fortalezas,
--    riesgos, oportunidades, acciones_30_dias, metricas, escenario_90_dias,
--    fuentes, advertencias). El backend valida ese esquema antes de guardar.
--  projection: escenario_90_dias (bajo/base/alto). NO es una garantía.
-- =============================================================
create table if not exists public.analyses (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  requested_by   uuid references public.users(id) on delete set null,
  kind           text not null default 'completo'
                   check (kind in ('vista_previa','completo')),
  objective      text,   -- objetivo_90d del workspace al momento de correr
  status         text not null default 'pendiente'
                   check (status in ('pendiente','procesando','completada','fallida')),
  context_quality text
                   check (context_quality in ('completo','parcial','insuficiente')),
  input          jsonb not null default '{}'::jsonb,  -- contexto enviado a la IA
  result         jsonb,                               -- salida estructurada (esquema sección 4.3)
  projection     jsonb,                               -- escenario_90_dias
  sources        jsonb not null default '[]'::jsonb,  -- fuentes: título, url, fecha, afirmación
  model          text,                                -- proveedor / modelo de IA
  prompt_version text,                                -- versión del prompt usada
  error          text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index if not exists ix_analyses_workspace
  on public.analyses (workspace_id, created_at desc);

-- =============================================================
--  actions · acciones priorizadas del dashboard (IA + usuario)
--  Cada acción: qué hacer, por qué, impacto, esfuerzo, qué métrica
--  observar y su estado editable por el usuario.
-- =============================================================
create table if not exists public.actions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  analysis_id   uuid references public.analyses(id) on delete set null,  -- análisis que la originó
  title         text not null,
  reason        text,                       -- por qué
  impact        text check (impact in ('alto','medio','bajo')),
  effort        text check (effort in ('alto','medio','bajo')),
  target_metric text,                       -- qué métrica observar
  status        text not null default 'pendiente'
                  check (status in ('pendiente','en_curso','hecha')),
  position      integer,                     -- orden sugerido (1 = más prioritaria)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ix_actions_workspace on public.actions (workspace_id, position);

drop trigger if exists trg_actions_updated_at on public.actions;
create trigger trg_actions_updated_at
  before update on public.actions
  for each row execute function public.set_updated_at();

-- =============================================================
--  Helper: ¿el workspace es del usuario actual? (para RLS)
-- =============================================================
create or replace function public.is_workspace_owner(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = ws and w.owner_user_id = auth.uid()
  );
$$;

-- =============================================================
--  Row Level Security
-- =============================================================
alter table public.plans         enable row level security;
alter table public.users         enable row level security;
alter table public.subscriptions enable row level security;
alter table public.workspaces    enable row level security;
alter table public.files         enable row level security;
alter table public.metrics       enable row level security;
alter table public.analyses      enable row level security;
alter table public.actions       enable row level security;

-- plans: lectura para cualquier usuario autenticado
drop policy if exists plans_read_all on public.plans;
create policy plans_read_all on public.plans
  for select to authenticated using (true);

-- users: cada quien ve y edita su propio perfil
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated using (id = auth.uid());
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- subscriptions: cada quien ve las suyas (las escribe el backend con service role)
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = auth.uid());

-- workspaces: acceso total solo al dueño
drop policy if exists workspaces_all_own on public.workspaces;
create policy workspaces_all_own on public.workspaces
  for all to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- files / metrics / analyses / actions: acceso vía propiedad del workspace
drop policy if exists files_all_via_workspace on public.files;
create policy files_all_via_workspace on public.files
  for all to authenticated
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists metrics_all_via_workspace on public.metrics;
create policy metrics_all_via_workspace on public.metrics
  for all to authenticated
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists analyses_all_via_workspace on public.analyses;
create policy analyses_all_via_workspace on public.analyses
  for all to authenticated
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists actions_all_via_workspace on public.actions;
create policy actions_all_via_workspace on public.actions
  for all to authenticated
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

-- =============================================================
--  Alta automática: al registrarse en Supabase Auth se crea el
--  perfil en public.users y una suscripción 'free' activa.
--  Nota: crear triggers sobre auth.users requiere rol admin
--  (funciona desde el SQL Editor de Supabase).
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan_id, status, is_simulated)
  select new.id, 'free', 'active', true
  where not exists (
    select 1 from public.subscriptions
    where user_id = new.id and status = 'active'
  );

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
--  Vista: plan efectivo de cada usuario (suscripción activa, o 'free')
-- =============================================================
create or replace view public.user_current_plan as
select
  u.id                                  as user_id,
  coalesce(s.plan_id, 'free')           as plan_id,
  p.name                                as plan_name,
  p.price_cents,
  p.max_workspaces,
  p.max_collaborators_per_workspace,
  p.max_storage_mb,
  p.max_file_mb,
  p.max_analyses_preview_monthly,
  p.max_analyses_full_monthly,
  p.max_searches_monthly,
  p.history_months,
  p.max_instagram_accounts,
  p.features
from public.users u
left join public.subscriptions s
  on s.user_id = u.id and s.status = 'active'
left join public.plans p
  on p.id = coalesce(s.plan_id, 'free');

-- =============================================================
--  Permisos
-- =============================================================
--  Supabase ya otorga por defecto los permisos DML sobre el schema
--  public a los roles anon / authenticated / service_role (vía ALTER
--  DEFAULT PRIVILEGES en la config del proyecto). Con eso + las
--  políticas RLS de arriba alcanza; no hace falta GRANT manual acá.
--
--  Si en algún entorno los objetos nuevos quedaran sin permisos:
--    grant usage on schema public to anon, authenticated, service_role;
--    grant select, insert, update, delete
--      on all tables in schema public to authenticated;
--    grant select on public.user_current_plan to authenticated;
