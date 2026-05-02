create table documents (
  id           uuid primary key default gen_random_uuid(),
  sha256       text not null,
  gcs_path     text not null,
  filename     text not null,
  size_bytes   bigint not null,
  uploaded_at  timestamptz not null default now(),
  uploaded_by  uuid references auth.users(id) on delete set null
);
create index documents_sha256_idx      on documents (sha256);
create index documents_uploaded_by_idx on documents (uploaded_by);

create table pipeline_runs (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references documents(id) on delete cascade,
  llm_profile      text not null,
  verdict          text not null check (verdict in ('clean','minor','major')),
  extracted_fields jsonb not null,
  issues           jsonb not null default '[]'::jsonb,
  ran_at           timestamptz not null default now(),
  latency_ms       int not null,
  ground_truth     jsonb
);
create index pipeline_runs_doc_idx on pipeline_runs (document_id, ran_at desc);