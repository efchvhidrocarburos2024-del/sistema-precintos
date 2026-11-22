-- ============================================================================
--  SIGMO · Módulo 2 · Repositorio Documental
--  Migración aditiva sobre la tabla `documentos` existente.
--
--  APLICADA en producción: 2026-11-23
--  Proyecto Supabase: podbbsgpiklvxkfcxqdn
--
--  Estado previo : documentos con 12 columnas, 0 filas, políticas INSERT+SELECT
--  Estado final  : 21 columnas, 4 políticas, +3 tablas, 8 categorías sembradas
--
--  Idempotente: puede re-ejecutarse sin daño (IF NOT EXISTS / ON CONFLICT).
--  No contiene DROP ni RENAME sobre datos existentes.
--
--  Mapeo que aplica la capa adaptadora (src/components/documental/esquema.js):
--    nombre         <-> titulo
--    categoria      <-> categoria_id   (slug en texto)
--    url            <-> url_archivo
--    tipo_documento <-> tipo
--    terminal       <-> planta
--    subido_por     ->  uuid FK a usuarios.id_usuario (email se resuelve por join)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 · Columnas nuevas sobre la tabla existente
-- ---------------------------------------------------------------------------
alter table documentos add column if not exists nombre_archivo text;
alter table documentos add column if not exists tamano_bytes   bigint      not null default 0;
alter table documentos add column if not exists etiquetas      text[]      not null default '{}';
alter table documentos add column if not exists vigente        boolean     not null default true;
alter table documentos add column if not exists destacado      boolean     not null default false;
alter table documentos add column if not exists descargas      integer     not null default 0;
alter table documentos add column if not exists eliminado      boolean     not null default false;
alter table documentos add column if not exists eliminado_en   timestamptz;
alter table documentos add column if not exists actualizado_en timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2.2 · Políticas faltantes (las dos existentes no se tocan)
-- ---------------------------------------------------------------------------
drop policy if exists "Permitir actualización a usuarios autenticados" on documentos;
create policy "Permitir actualización a usuarios autenticados" on documentos
  for update to authenticated using (true) with check (true);

drop policy if exists "Permitir eliminación a usuarios autenticados" on documentos;
create policy "Permitir eliminación a usuarios autenticados" on documentos
  for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2.3 · Trigger de actualización (actualizado_en ya existe en 2.1)
-- ---------------------------------------------------------------------------
create or replace function documentos_touch() returns trigger as $$
begin
  new.actualizado_en := now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_documentos_touch on documentos;
create trigger trg_documentos_touch
  before update on documentos
  for each row execute function documentos_touch();

-- ---------------------------------------------------------------------------
-- 2.4 · Índices
-- ---------------------------------------------------------------------------
create index if not exists idx_doc_categoria on documentos(categoria);
create index if not exists idx_doc_eliminado on documentos(eliminado);
create index if not exists idx_doc_vigente   on documentos(vigente);
create index if not exists idx_doc_created   on documentos(created_at desc);
create index if not exists idx_doc_terminal  on documentos(terminal);
create index if not exists idx_doc_proveedor on documentos(proveedor);
create index if not exists idx_doc_producto  on documentos(producto);

-- ---------------------------------------------------------------------------
-- 2.5 · Tablas nuevas
-- ---------------------------------------------------------------------------
create table if not exists documento_categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  color       text not null default '#0B5FA5',
  icono       text not null default '📄',
  descripcion text,
  orden       int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists documento_versiones (
  id             uuid primary key default gen_random_uuid(),
  documento_id   uuid not null references documentos(id) on delete cascade,
  version        text not null,
  nota           text,
  nombre_archivo text,
  url_archivo    text,
  tamano_bytes   bigint default 0,
  subido_por     text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_ver_doc on documento_versiones(documento_id, created_at desc);

create table if not exists documento_auditoria (
  id           uuid primary key default gen_random_uuid(),
  documento_id uuid,
  titulo       text,
  accion       text not null,
  detalle      text,
  usuario      text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_aud_doc_created on documento_auditoria(created_at desc);

-- ---------------------------------------------------------------------------
-- 2.6 · RLS en las tablas nuevas
-- ---------------------------------------------------------------------------
alter table documento_categorias enable row level security;
alter table documento_versiones  enable row level security;
alter table documento_auditoria  enable row level security;

drop policy if exists "Acceso total autenticados" on documento_categorias;
drop policy if exists "Acceso total autenticados" on documento_versiones;
drop policy if exists "Acceso total autenticados" on documento_auditoria;

create policy "Acceso total autenticados" on documento_categorias
  for all to authenticated using (true) with check (true);
create policy "Acceso total autenticados" on documento_versiones
  for all to authenticated using (true) with check (true);
create policy "Acceso total autenticados" on documento_auditoria
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2.7 · Catálogo de categorías
-- ---------------------------------------------------------------------------
insert into documento_categorias (nombre, slug, color, icono, descripcion, orden) values
  ('Técnicos',      'tecnicos',      '#06B6D4', '⚙️', 'Fichas técnicas, planos, P&ID y certificados de calibración.', 1),
  ('Operativos',    'operativos',    '#0B5FA5', '🛢️', 'Procedimientos de planta, SCOP, precintado y conciliación.',   2),
  ('Guías',         'guias',         '#84CC16', '📘', 'Manuales de usuario e instructivos paso a paso.',              3),
  ('Normativa',     'normativa',     '#F59E0B', '⚖️', 'Decretos supremos, reglamentos y resoluciones vigentes.',      4),
  ('Seguridad',     'seguridad',     '#EF4444', '🦺', 'IPERC, planes de contingencia y protocolos HSE.',              5),
  ('Comercial',     'comercial',     '#DB2777', '💰', 'Listas de precios, topes y contratos de suministro.',          6),
  ('Mantenimiento', 'mantenimiento', '#7C3AED', '🔧', 'Programas, rutinas y órdenes de trabajo.',                     7),
  ('Reportes',      'reportes',      '#0E7490', '📊', 'Informes periódicos, mermas y auditorías internas.',           8)
on conflict (slug) do nothing;