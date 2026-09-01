-- ============================================================
-- 2026B - Supabase schema + secure-ish RPC for class PJ flow
-- ============================================================
-- CATATAN:
-- Flow 3-digit NIM mengikuti spesifikasi kelas, tetapi tidak setara
-- dengan autentikasi production-grade. Untuk deployment sungguhan,
-- pertimbangkan migrasi ke Supabase Auth + role-based access.

create extension if not exists pgcrypto;

create table if not exists public.pj (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  nim text not null,
  role text not null default 'admin' check (role='admin'),
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id text primary key,
  name text not null,
  code text,
  original_day smallint not null check (original_day between 0 and 4),
  original_start time not null,
  original_end time not null,
  room text,
  mode text not null check (mode in ('Virtual','Tatap Muka')),
  lecturer text,
  status text not null default 'Tetap' check (status in ('Tetap','Dipindahkan')),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_changes (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  week_key date not null,
  original_date date,
  new_date date not null,
  new_start time,
  new_end time,
  status text not null check (status in ('Tetap','Dipindahkan')),
  mode text check (mode in ('Virtual','Tatap Muka')),
  room text,
  note text,
  edited_by uuid references public.pj(id),
  updated_at timestamptz not null default now(),
  unique(course_id, week_key)
);

create index if not exists idx_meeting_changes_week on public.meeting_changes(week_key);
create index if not exists idx_meeting_changes_course on public.meeting_changes(course_id);

-- View agar nama PJ bisa ditampilkan di history tanpa exposing seluruh pj table.
create or replace view public.meeting_changes_view as
select
  mc.id,
  mc.course_id,
  mc.week_key,
  mc.original_date,
  mc.new_date,
  mc.new_start,
  mc.new_end,
  mc.status,
  mc.mode,
  mc.room,
  mc.note,
  p.name as edited_by_name,
  mc.updated_at
from public.meeting_changes mc
left join public.pj p on p.id=mc.edited_by;

-- ============================================================
-- Seed data 8 PJ + 10 kelas
-- ============================================================
insert into public.pj (name,nim,role) values
('Husna Nafi''ah Zulfa','26112224076','admin'),
('David Antoni','26112224044','admin'),
('Nova Risqy Fatur Fadillah','26112224057','admin'),
('Zhevira Threevia Nur Wardiny','26112224104','admin'),
('Atha Bagus Arifianto','26112224084','admin'),
('Adelia Putri Maharani','26112224051','admin'),
('Fairus Eva Ghanesa','26112224007','admin'),
('Ayank Naura Tita','26112224077','admin')
on conflict (name) do update set nim=excluded.nim, role='admin';

insert into public.courses (id,name,code,original_day,original_start,original_end,room,mode,lecturer,status) values
('pancasila-067','Pancasila','067',0,'08:40','10:20','', 'Virtual','', 'Tetap'),
('pancasila-068','Pancasila','068',0,'08:40','10:20','', 'Virtual','', 'Tetap'),
('etika-bisnis-profesi','Etika Bisnis & Profesi','',1,'09:30','12:00','MG1.02.07','Tatap Muka','', 'Tetap'),
('hukum-bisnis','Hukum Bisnis','',1,'13:00','15:30','', 'Virtual','', 'Tetap'),
('literasi-050','Literasi Digital','050',2,'07:00','08:40','', 'Virtual','', 'Tetap'),
('literasi-051','Literasi Digital','051',2,'07:00','08:40','', 'Virtual','', 'Tetap'),
('akuntansi-pengantar','Akuntansi Pengantar','',2,'13:00','15:30','MG1.02.07','Tatap Muka','', 'Tetap'),
('hukum-pajak','Hukum Pajak','',3,'13:00','15:30','MG1.04.03','Tatap Muka','', 'Tetap'),
('sistem-informasi-akuntansi','Sistem Informasi Akuntansi','',3,'15:30','18:00','MG1.02.07','Tatap Muka','', 'Tetap'),
('statistik','Statistik','',4,'18:00','20:30','MG1.02.07','Tatap Muka','', 'Tetap')
on conflict (id) do nothing;

-- ============================================================
-- RLS: public read, writes only through SECURITY DEFINER RPC.
-- ============================================================
alter table public.pj enable row level security;
alter table public.courses enable row level security;
alter table public.meeting_changes enable row level security;

-- Drop old policies if re-running this file.
drop policy if exists "public read courses" on public.courses;
drop policy if exists "public read meeting changes" on public.meeting_changes;
drop policy if exists "public read meeting changes view" on public.meeting_changes_view;
drop policy if exists "deny direct write courses" on public.courses;
drop policy if exists "deny direct write meeting_changes" on public.meeting_changes;

create policy "public read courses" on public.courses
for select to anon, authenticated using (true);

create policy "public read meeting changes" on public.meeting_changes
for select to anon, authenticated using (true);

-- No INSERT/UPDATE/DELETE policies are granted to anon/authenticated.
-- The RPC functions below are SECURITY DEFINER and validate PJ credentials.

-- ============================================================
-- PJ verification
-- ============================================================
create or replace function public.verify_pj(p_name text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r public.pj%rowtype;
begin
  select * into r from public.pj
  where name=p_name and right(nim,3)=p_code and role='admin'
  limit 1;
  if not found then
    return jsonb_build_object('valid',false);
  end if;
  return jsonb_build_object('valid',true,'id',r.id,'name',r.name);
end;
$$;

grant execute on function public.verify_pj(text,text) to anon, authenticated;

-- ============================================================
-- Update BASE/ORIGINAL schedule
-- ============================================================
create or replace function public.update_course_by_pj(
  p_name text, p_code text, p_course_id text,
  p_course_name text, p_code_value text, p_day smallint,
  p_start time, p_end time, p_room text, p_mode text,
  p_lecturer text, p_status text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare ok boolean;
begin
  select exists(select 1 from public.pj where name=p_name and right(nim,3)=p_code and role='admin') into ok;
  if not ok then raise exception 'PJ tidak terverifikasi'; end if;
  if p_day < 0 or p_day > 4 then raise exception 'Hari tidak valid'; end if;
  if p_mode not in ('Virtual','Tatap Muka') then raise exception 'Mode tidak valid'; end if;
  if p_status not in ('Tetap','Dipindahkan') then raise exception 'Status tidak valid'; end if;

  update public.courses set
    name=trim(p_course_name),
    code=trim(coalesce(p_code_value,'')),
    original_day=p_day,
    original_start=p_start,
    original_end=p_end,
    room=trim(coalesce(p_room,'')),
    mode=p_mode,
    lecturer=trim(coalesce(p_lecturer,'')),
    status=p_status,
    updated_at=now()
  where id=p_course_id;

  if not found then raise exception 'Kelas tidak ditemukan'; end if;
  return true;
end;
$$;

grant execute on function public.update_course_by_pj(text,text,text,text,text,smallint,time,time,text,text,text,text) to anon, authenticated;

-- ============================================================
-- Upsert weekly meeting override
-- ============================================================
create or replace function public.upsert_meeting_change_by_pj(
  p_name text, p_code text, p_course_id text, p_week_key date,
  p_original_date date, p_new_date date, p_new_start time, p_new_end time,
  p_status text, p_mode text, p_room text, p_note text, p_existing_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare pj_id uuid; new_id uuid;
begin
  select id into pj_id from public.pj where name=p_name and right(nim,3)=p_code and role='admin' limit 1;
  if pj_id is null then raise exception 'PJ tidak terverifikasi'; end if;
  if not exists(select 1 from public.courses where id=p_course_id) then raise exception 'Kelas tidak ditemukan'; end if;
  if p_status not in ('Tetap','Dipindahkan') then raise exception 'Status tidak valid'; end if;
  if p_mode not in ('Virtual','Tatap Muka') then raise exception 'Mode tidak valid'; end if;

  insert into public.meeting_changes(
    id,course_id,week_key,original_date,new_date,new_start,new_end,status,mode,room,note,edited_by,updated_at
  ) values (
    coalesce(p_existing_id,gen_random_uuid()),p_course_id,p_week_key,p_original_date,p_new_date,p_new_start,p_new_end,p_status,p_mode,trim(coalesce(p_room,'')),trim(coalesce(p_note,'')),pj_id,now()
  )
  on conflict (course_id,week_key) do update set
    original_date=excluded.original_date,
    new_date=excluded.new_date,
    new_start=excluded.new_start,
    new_end=excluded.new_end,
    status=excluded.status,
    mode=excluded.mode,
    room=excluded.room,
    note=excluded.note,
    edited_by=excluded.edited_by,
    updated_at=now()
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.upsert_meeting_change_by_pj(text,text,text,date,date,date,time,time,text,text,text,text,uuid) to anon, authenticated;

-- ============================================================
-- Delete weekly meeting override
-- ============================================================
create or replace function public.delete_meeting_change_by_pj(
  p_name text, p_code text, p_course_id text, p_week_key date
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare ok boolean;
begin
  select exists(select 1 from public.pj where name=p_name and right(nim,3)=p_code and role='admin') into ok;
  if not ok then raise exception 'PJ tidak terverifikasi'; end if;
  delete from public.meeting_changes where course_id=p_course_id and week_key=p_week_key;
  return true;
end;
$$;

grant execute on function public.delete_meeting_change_by_pj(text,text,text,date) to anon, authenticated;

-- ============================================================
-- View access
-- ============================================================
revoke all on public.meeting_changes_view from anon, authenticated;
grant select on public.meeting_changes_view to anon, authenticated;

-- ============================================================
-- Realtime
-- ============================================================
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='courses') then
    alter publication supabase_realtime add table public.courses;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='meeting_changes') then
    alter publication supabase_realtime add table public.meeting_changes;
  end if;
exception when undefined_object then
  null;
end $$;
