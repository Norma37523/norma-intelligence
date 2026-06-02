-- =============================================================================
-- Norma Intelligence — Storage bucket para uploads
--
-- Cria o bucket privado 'uploads' e as policies de RLS em storage.objects.
-- Layout de path: <company_id>/<upload_id>/<filename>
-- O primeiro segmento do path é o company_id — usado para isolar por empresa.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Bucket privado 'uploads'
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  false,
  10485760,  -- 10 MB
  array[
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain'
  ]
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- RLS policies em storage.objects
--
-- O primeiro segmento do path (storage.foldername(name))[1] é o company_id.
-- public.is_member_of_company() garante que só membros da org da empresa
-- conseguem inserir / ler / deletar arquivos daquela empresa.
-- ---------------------------------------------------------------------------

-- INSERT
drop policy if exists "uploads_insert_members" on storage.objects;
create policy "uploads_insert_members" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and public.is_member_of_company( (storage.foldername(name))[1]::uuid )
  );

-- SELECT (download)
drop policy if exists "uploads_select_members" on storage.objects;
create policy "uploads_select_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'uploads'
    and public.is_member_of_company( (storage.foldername(name))[1]::uuid )
  );

-- DELETE
drop policy if exists "uploads_delete_members" on storage.objects;
create policy "uploads_delete_members" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'uploads'
    and public.is_member_of_company( (storage.foldername(name))[1]::uuid )
  );
