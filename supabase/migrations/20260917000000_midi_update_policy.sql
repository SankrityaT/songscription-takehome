-- uploadMidi() upserts, and an upsert onto an existing path is an UPDATE.
-- Without this policy a retried upload is rejected by row level security.
create policy "open midi update" on storage.objects for update
  using (bucket_id = 'midi') with check (bucket_id = 'midi');
