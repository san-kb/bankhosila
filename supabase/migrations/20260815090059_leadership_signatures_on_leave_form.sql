drop policy "active users read allowed profiles" on public.profiles;
create policy "active users read allowed profiles" on public.profiles for select to authenticated
using (
  (select private.current_user_is_active())
  and (
    id=(select auth.uid())
    or organization_role in ('subject_head','executive')
    or (select private.current_user_role()) in ('admin','approver')
    or (select private.current_user_is_executive())
  )
);

drop policy "users and approvers read signatures" on storage.objects;
create policy "active users read allowed signatures" on storage.objects for select to authenticated
using (
  bucket_id='signatures'
  and (select private.current_user_is_active())
  and (
    owner_id=(select auth.uid())::text
    or (select private.current_user_role()) in ('admin','approver')
    or exists (
      select 1 from public.profiles
      where profiles.id=storage.objects.owner_id::uuid
      and profiles.organization_role in ('subject_head','executive')
      and profiles.is_active=true
    )
  )
);
