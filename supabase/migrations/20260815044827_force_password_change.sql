alter table public.profiles
add column must_change_password boolean not null default true;

-- บัญชีที่มีอยู่จะถูกขอให้เปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งถัดไป
update public.profiles set must_change_password=true;
