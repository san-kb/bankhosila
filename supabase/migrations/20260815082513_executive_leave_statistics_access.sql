create or replace function private.current_user_is_executive()
returns boolean language sql stable security definer set search_path=''
as $$
  select coalesce(
    (select role='admin' or organization_role='executive'
     from public.profiles
     where id=(select auth.uid()) and is_active=true),
    false
  )
$$;

drop policy "read own or admin profiles" on public.profiles;
create policy "read own or reviewer profiles" on public.profiles for select to authenticated
using (
  id=(select auth.uid())
  or (select private.current_user_role()) in ('admin','approver')
  or (select private.current_user_is_executive())
);

drop policy "staff read own leaves" on public.leave_requests;
create policy "staff read own or reviewer leaves" on public.leave_requests for select to authenticated
using (
  user_id=(select auth.uid())
  or (select private.current_user_role()) in ('admin','approver')
  or (select private.current_user_is_executive())
);

revoke all on function private.current_user_is_executive() from public, anon, authenticated;
grant execute on function private.current_user_is_executive() to authenticated;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
