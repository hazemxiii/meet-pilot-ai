-- Create the files bucket for storing user uploads
insert into storage.buckets (id, name, public)
values ('files', 'files', true);

-- Set up RLS policies for the files bucket

-- Allow authenticated users to upload files
create policy "Authenticated users can upload files"
on storage.objects for insert
with check (
  bucket_id = 'files' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own files
create policy "Authenticated users can view own files"
on storage.objects for select
using (
  bucket_id = 'files' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
create policy "Authenticated users can delete own files"
on storage.objects for delete
using (
  bucket_id = 'files' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
