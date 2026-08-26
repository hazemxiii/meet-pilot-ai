-- Step 4: Allow authenticated users to delete own files
create policy "Authenticated users can delete own files"
on storage.objects for delete
using (
  bucket_id = 'files' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
