-- Step 3: Allow authenticated users to view own files
create policy "Authenticated users can view own files"
on storage.objects for select
using (
  bucket_id = 'files' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
