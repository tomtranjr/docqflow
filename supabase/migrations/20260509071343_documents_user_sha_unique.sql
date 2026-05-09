-- Per-user dedupe: at most one documents row per (uploaded_by, sha256).
-- The pipeline endpoint relies on this unique index to drive ON CONFLICT
-- so re-uploads from the same user return the existing document_id and
-- only append a new pipeline_runs row.
create unique index if not exists documents_uploaded_by_sha256_uniq
  on documents (uploaded_by, sha256);
