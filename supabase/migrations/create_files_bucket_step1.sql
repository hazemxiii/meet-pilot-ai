-- Step 1: Create the files bucket
insert into storage.buckets (id, name, public)
values ('files', 'files', true);
