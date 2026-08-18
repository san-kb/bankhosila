drop policy if exists "users upload own signature" on storage.objects;
create policy "active users upload own signature or admin uploads"
on storage.objects for insert to authenticated
with check (
  bucket_id='signatures'
  and (select private.current_user_is_active())
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.current_user_role())='admin'
  )
);

drop policy if exists "users update own signature" on storage.objects;
create policy "active users update own signature or admin updates"
on storage.objects for update to authenticated
using (
  bucket_id='signatures'
  and (select private.current_user_is_active())
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.current_user_role())='admin'
  )
)
with check (
  bucket_id='signatures'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.current_user_role())='admin'
  )
);

drop policy if exists "active users read allowed signatures" on storage.objects;
create policy "active users read allowed signatures"
on storage.objects for select to authenticated
using (
  bucket_id='signatures'
  and (select private.current_user_is_active())
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.current_user_role()) in ('admin','approver')
    or exists (
      select 1 from public.profiles
      where profiles.id=(storage.foldername(storage.objects.name))[1]::uuid
      and profiles.organization_role in ('personnel_head','executive')
      and profiles.is_active=true
    )
  )
);

drop policy if exists "users read own avatar or admin reads avatars" on storage.objects;
create policy "users read own avatar or admin reads avatars"
on storage.objects for select to authenticated
using (
  bucket_id='avatars'
  and (select private.current_user_is_active())
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.current_user_role())='admin'
  )
);
