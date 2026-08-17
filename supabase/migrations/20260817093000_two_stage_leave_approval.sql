-- ลำดับอนุมัติใบลา: หัวหน้ากลุ่มบริหารงานบุคคล -> ผู้บริหาร
alter table public.profiles drop constraint if exists profiles_organization_role_check;
update public.profiles
set organization_role='personnel_head', role=case when role='admin' then 'admin' else 'approver' end
where organization_role='subject_head';
alter table public.profiles add constraint profiles_organization_role_check
check (organization_role in ('staff','personnel_head','executive'));

alter table public.leave_requests drop constraint if exists leave_requests_status_check;
update public.leave_requests set status='pending_personnel' where status='pending';
alter table public.leave_requests add constraint leave_requests_status_check
check (status in ('draft','pending_personnel','pending_executive','approved','rejected'));
alter table public.leave_requests
add column if not exists personnel_reviewed_by uuid references public.profiles(id),
add column if not exists personnel_comment text,
add column if not exists personnel_reviewed_at timestamptz,
add column if not exists decision_stage text check (decision_stage in ('personnel','executive'));
create index if not exists leave_requests_personnel_reviewed_by_idx
on public.leave_requests(personnel_reviewed_by);

create or replace function private.route_new_leave()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.status='pending_personnel' and exists (
    select 1 from public.profiles
    where id=new.user_id and organization_role='personnel_head'
  ) then new.status='pending_executive'; end if;
  return new;
end $$;
drop trigger if exists route_new_leave_before_insert on public.leave_requests;
create trigger route_new_leave_before_insert before insert on public.leave_requests
for each row execute procedure private.route_new_leave();

create or replace function private.decide_leave(request_id uuid,decision text,decision_comment text default '')
returns void language plpgsql security definer set search_path=''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_organization_role text;
  current_status text;
  requester_id uuid;
begin
  select organization_role into actor_organization_role from public.profiles
  where id=actor_id and is_active=true;
  if actor_id is null or actor_organization_role is null then raise exception 'ไม่มีสิทธิ์พิจารณาใบลา'; end if;

  select status,user_id into current_status,requester_id from public.leave_requests
  where id=request_id for update;
  if current_status is null then raise exception 'ไม่พบใบลา'; end if;
  if requester_id=actor_id then raise exception 'ไม่สามารถพิจารณาใบลาของตนเองได้'; end if;

  if current_status='pending_personnel' then
    if actor_organization_role<>'personnel_head' then raise exception 'ใบลานี้ต้องผ่านหัวหน้ากลุ่มบริหารงานบุคคลก่อน'; end if;
    if decision not in ('forwarded','rejected') then raise exception 'คำสั่งของหัวหน้ากลุ่มบริหารงานบุคคลไม่ถูกต้อง'; end if;
    update public.leave_requests set
      status=case when decision='forwarded' then 'pending_executive' else 'rejected' end,
      personnel_reviewed_by=actor_id, personnel_comment=decision_comment,
      personnel_reviewed_at=now(),
      decided_by=case when decision='rejected' then actor_id else null end,
      decision_comment=case when decision='rejected' then decision_comment else null end,
      decided_at=case when decision='rejected' then now() else null end,
      decision_stage=case when decision='rejected' then 'personnel' else null end,
      updated_at=now()
    where id=request_id and status='pending_personnel';
  elsif current_status='pending_executive' then
    if actor_organization_role<>'executive' then raise exception 'ใบลานี้รอผู้บริหารพิจารณา'; end if;
    if decision not in ('approved','rejected') then raise exception 'คำสั่งผู้บริหารไม่ถูกต้อง'; end if;
    update public.leave_requests set status=decision,decided_by=actor_id,
      decision_comment=decision_comment,decided_at=now(),decision_stage='executive',updated_at=now()
    where id=request_id and status='pending_executive';
  else raise exception 'ใบลานี้ไม่ได้อยู่ในขั้นตอนที่คุณพิจารณาได้';
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(actor_id,decision,'leave_request',request_id,
    jsonb_build_object('comment',decision_comment,'from_status',current_status));
end $$;

drop policy if exists "active staff create own leaves" on public.leave_requests;
create policy "active staff create own leaves" on public.leave_requests for insert to authenticated
with check ((select private.current_user_is_active()) and user_id=(select auth.uid())
  and status in ('draft','pending_personnel','pending_executive'));
drop policy if exists "active staff update own drafts" on public.leave_requests;
create policy "active staff update own drafts" on public.leave_requests for update to authenticated
using ((select private.current_user_is_active()) and user_id=(select auth.uid()) and status='draft')
with check ((select private.current_user_is_active()) and user_id=(select auth.uid())
  and status in ('draft','pending_personnel','pending_executive'));

revoke all on function private.route_new_leave() from public,anon,authenticated;
revoke all on function private.decide_leave(uuid,text,text) from public,anon;
grant execute on function private.decide_leave(uuid,text,text) to authenticated;
