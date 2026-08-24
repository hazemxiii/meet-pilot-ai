-- Step 2: Allow authenticated users to upload files
create policy "Authenticated users can upload files"
on storage.objects for insert
with check (
  bucket_id = 'files' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
