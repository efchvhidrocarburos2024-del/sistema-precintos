-- ============================================================================
--  SIGMO · Repositorio Documental · Tipos de documento (Opción B)
--  Idempotente. No toca datos existentes.
-- ============================================================================
alter table documentos add column if not exists tipo_contenido text;
alter table documentos add column if not exists metadata jsonb not null default '{}';

create index if not exists idx_doc_tipo_contenido on documentos(tipo_contenido);

comment on column documentos.tipo_contenido is
  'Tipo de negocio del documento dentro de su categoría (ej. certificado_calidad). Catálogo en frontend: constantes.js TIPOS_DOCUMENTO.';
comment on column documentos.metadata is
  'Campos específicos del tipo de documento (n° de lote, emisor, fechas…).';