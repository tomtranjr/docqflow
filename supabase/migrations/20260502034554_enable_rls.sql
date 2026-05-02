alter table documents enable row level security;
alter table pipeline_runs enable row level security;

create policy "documents_select_own"
  on documents for select
  using (auth.uid() = uploaded_by);

create policy "documents_insert_own"
  on documents for insert
  with check (auth.uid() = uploaded_by);

-- pipeline_runs: only SELECT policy is needed.
-- The API writes pipeline_runs with the service-role key, which bypasses RLS.
create policy "pipeline_runs_select_own"
  on pipeline_runs for select
  using (exists (
    select 1 from documents d
    where d.id = pipeline_runs.document_id
      and d.uploaded_by = auth.uid()
  ));
