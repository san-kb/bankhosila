alter table public.profiles
add column avatar_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;

create policy "active users upload own avatar or admin uploads" on storage.objects
for insert to authenticated
with check (
  bucket_id='avatars'
  and (select private.current_user_is_active())
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.current_user_role())='admin'
  )
);

create policy "active users update own avatar or admin updates" on storage.objects
for update to authenticated
using (
  bucket_id='avatars'
  and (select private.current_user_is_active())
  and (owner_id=(select auth.uid())::text or (select private.current_user_role())='admin')
)
with check (
  bucket_id='avatars'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.current_user_role())='admin'
  )
);

create policy "users read own avatar or admin reads avatars" on storage.objects
for select to authenticated
using (
  bucket_id='avatars'
  and (select private.current_user_is_active())
  and (owner_id=(select auth.uid())::text or (select private.current_user_role())='admin')
);

create policy "users delete own avatar or admin deletes" on storage.objects
for delete to authenticated
using (
  bucket_id='avatars'
  and (select private.current_user_is_active())
  and (owner_id=(select auth.uid())::text or (select private.current_user_role())='admin')
);
