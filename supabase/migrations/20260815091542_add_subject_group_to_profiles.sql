alter table public.profiles
add column subject_group text;

comment on column public.profiles.subject_group is
'กลุ่มสาระการเรียนรู้หรือหน่วยงานที่บุคลากรสังกัด';
