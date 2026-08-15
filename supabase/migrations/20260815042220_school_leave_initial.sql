-- ระบบการลา โรงเรียนบ้านคชศิลา
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9._-]+$'),
  full_name text not null,
  personnel_type text not null check (personnel_type in ('ครูข้าราชการ','ครูอัตราจ้าง','เจ้าหน้าที่','ลูกจ้าง')),
  position text not null,
  role text not null default 'staff' check (role in ('staff','approver','admin')),
  signature_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  leave_type text not null check (leave_type in ('sick','personal','maternity')),
  written_at text not null default 'โรงเรียนบ้านคชศิลา',
  subject text not null default 'ขอลา',
  recipient text not null,
  start_date date not null,
  end_date date not null,
  total_days numeric(5,1) not null check (total_days > 0),
  reason text not null,
  contact text not null,
  status text not null default 'pending' check (status in ('draft','pending','approved','rejected')),
  decided_by uuid references public.profiles(id),
  decision_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_leave_dates check (end_date >= start_date)
);

create table public.leave_attachments (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  storage_path text not null,
  original_name text not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index leave_requests_user_id_idx on public.leave_requests(user_id);
create index leave_requests_status_idx on public.leave_requests(status);
create index leave_requests_dates_idx on public.leave_requests(start_date,end_date);

create or replace function private.current_user_role()
returns text language sql stable security definer set search_path=''
as $$ select role from public.profiles where id=(select auth.uid()) and is_active=true $$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.profiles(id,username,full_name,personnel_type,position,role)
  values(new.id,
    coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'full_name','ผู้ใช้งานใหม่'),
    coalesce(new.raw_user_meta_data->>'personnel_type','เจ้าหน้าที่'),
    coalesce(new.raw_user_meta_data->>'position','ไม่ระบุ'),
    'staff');
  return new;
end $$;

create or replace function private.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid())=old.id and private.current_user_role()<>'admin' then
    new.role=old.role; new.is_active=old.is_active; new.username=old.username;
    new.full_name=old.full_name; new.personnel_type=old.personnel_type; new.position=old.position;
  end if;
  new.updated_at=now();
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure private.handle_new_user();
create trigger protect_profile_before_update before update on public.profiles
for each row execute procedure private.protect_profile_privileges();

create or replace function private.decide_leave(request_id uuid,decision text,decision_comment text default '')
returns void language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null or private.current_user_role() not in ('admin','approver') then raise exception 'ไม่มีสิทธิ์อนุมัติใบลา'; end if;
  if decision not in ('approved','rejected') then raise exception 'สถานะไม่ถูกต้อง'; end if;
  update public.leave_requests set status=decision,decided_by=(select auth.uid()),decided_at=now(),decision_comment=decide_leave.decision_comment,updated_at=now()
  where id=request_id and status='pending';
  if not found then raise exception 'ไม่พบใบลาที่รอพิจารณา'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values((select auth.uid()),decision,'leave_request',request_id,jsonb_build_object('comment',decision_comment));
end $$;

create or replace function public.decide_leave(request_id uuid,decision text,decision_comment text default '')
returns void language sql security invoker set search_path=''
as $$ select private.decide_leave(request_id,decision,decision_comment) $$;

alter table public.profiles enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_attachments enable row level security;
alter table public.audit_logs enable row level security;

create policy "read own or admin profiles" on public.profiles for select to authenticated
using (id=(select auth.uid()) or (select private.current_user_role()) in ('admin','approver'));
create policy "update own basic profile" on public.profiles for update to authenticated
using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy "admin manages profiles" on public.profiles for all to authenticated
using ((select private.current_user_role())='admin') with check ((select private.current_user_role())='admin');

create policy "staff read own leaves" on public.leave_requests for select to authenticated
using (user_id=(select auth.uid()) or (select private.current_user_role()) in ('admin','approver'));
create policy "staff create own leaves" on public.leave_requests for insert to authenticated
with check (user_id=(select auth.uid()) and status in ('draft','pending'));
create policy "staff update own drafts" on public.leave_requests for update to authenticated
using (user_id=(select auth.uid()) and status='draft') with check (user_id=(select auth.uid()) and status in ('draft','pending'));

create policy "read own attachments or approver" on public.leave_attachments for select to authenticated
using (owner_id=(select auth.uid()) or (select private.current_user_role()) in ('admin','approver'));
create policy "create own attachments" on public.leave_attachments for insert to authenticated
with check (owner_id=(select auth.uid()));

create policy "admins read audit logs" on public.audit_logs for select to authenticated
using ((select private.current_user_role())='admin');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('signatures','signatures',false,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('leave-attachments','leave-attachments',false,5242880,array['image/png','image/jpeg','application/pdf'])
on conflict(id) do nothing;

create policy "users upload own signature" on storage.objects for insert to authenticated
with check(bucket_id='signatures' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "users update own signature" on storage.objects for update to authenticated
using(bucket_id='signatures' and owner_id=(select auth.uid())::text)
with check(bucket_id='signatures' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "users and approvers read signatures" on storage.objects for select to authenticated
using(bucket_id='signatures' and (owner_id=(select auth.uid())::text or (select private.current_user_role()) in ('admin','approver')));
create policy "users upload own leave files" on storage.objects for insert to authenticated
with check(bucket_id='leave-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "users and approvers read leave files" on storage.objects for select to authenticated
using(bucket_id='leave-attachments' and (owner_id=(select auth.uid())::text or (select private.current_user_role()) in ('admin','approver')));

revoke all on function public.decide_leave(uuid,text,text) from public;
grant execute on function public.decide_leave(uuid,text,text) to authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.decide_leave(uuid,text,text) to authenticated;
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles, public.leave_requests, public.leave_attachments to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
