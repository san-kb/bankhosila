alter table public.profiles
add column organization_role text not null default 'staff'
check (organization_role in ('staff','subject_head','executive'));

update public.profiles
set organization_role='subject_head'
where username='demo.approver';

update public.profiles
set organization_role='executive', position='รองผู้อำนวยการโรงเรียน', role='approver'
where username='demo.teacher04';

create or replace function private.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid())=old.id and private.current_user_role()<>'admin' then
    new.role=old.role; new.is_active=old.is_active; new.username=old.username;
    new.full_name=old.full_name; new.personnel_type=old.personnel_type; new.position=old.position;
    new.organization_role=old.organization_role;
  end if;
  new.updated_at=now();
  return new;
end $$;
