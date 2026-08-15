create index audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index leave_attachments_request_id_idx on public.leave_attachments(leave_request_id);
create index leave_attachments_owner_id_idx on public.leave_attachments(owner_id);
create index leave_requests_decided_by_idx on public.leave_requests(decided_by);

drop policy "update own basic profile" on public.profiles;
drop policy "admin manages profiles" on public.profiles;

create policy "update own profile or admin manages" on public.profiles for update to authenticated
using (id=(select auth.uid()) or (select private.current_user_role())='admin')
with check (id=(select auth.uid()) or (select private.current_user_role())='admin');
create policy "admin inserts profiles" on public.profiles for insert to authenticated
with check ((select private.current_user_role())='admin');
create policy "admin deletes profiles" on public.profiles for delete to authenticated
using ((select private.current_user_role())='admin');
