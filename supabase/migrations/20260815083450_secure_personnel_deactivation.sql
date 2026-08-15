create or replace function private.current_user_is_active()
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.profiles
    where id=(select auth.uid()) and is_active=true
  )
$$;

drop policy "read own or reviewer profiles" on public.profiles;
create policy "active users read allowed profiles" on public.profiles for select to authenticated
using (
  (select private.current_user_is_active())
  and (
    id=(select auth.uid())
    or (select private.current_user_role()) in ('admin','approver')
    or (select private.current_user_is_executive())
  )
);

drop policy "update own profile or admin manages" on public.profiles;
create policy "active users update own or admin manages" on public.profiles for update to authenticated
using (
  (select private.current_user_is_active())
  and (id=(select auth.uid()) or (select private.current_user_role())='admin')
)
with check (
  (select private.current_user_is_active())
  and (id=(select auth.uid()) or (select private.current_user_role())='admin')
);

drop policy "staff read own or reviewer leaves" on public.leave_requests;
create policy "active staff read own or reviewer leaves" on public.leave_requests for select to authenticated
using (
  (select private.current_user_is_active())
  and (
    user_id=(select auth.uid())
    or (select private.current_user_role()) in ('admin','approver')
    or (select private.current_user_is_executive())
  )
);

drop policy "staff create own leaves" on public.leave_requests;
create policy "active staff create own leaves" on public.leave_requests for insert to authenticated
with check (
  (select private.current_user_is_active())
  and user_id=(select auth.uid()) and status in ('draft','pending')
);

drop policy "staff update own drafts" on public.leave_requests;
create policy "active staff update own drafts" on public.leave_requests for update to authenticated
using (
  (select private.current_user_is_active())
  and user_id=(select auth.uid()) and status='draft'
)
with check (
  (select private.current_user_is_active())
  and user_id=(select auth.uid()) and status in ('draft','pending')
);

revoke all on function private.current_user_is_active() from public, anon, authenticated;
grant execute on function private.current_user_is_active() to authenticated;
