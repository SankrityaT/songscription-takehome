-- Songscription take-home: a single learner's library.
-- Everything a learner sees in a row or the detail panel is a column, so the
-- catalogue can be filtered, sorted and searched in SQL without opening files.

create extension if not exists pgcrypto;

create table if not exists folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists songs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  composer        text not null default '',
  file_name       text not null,
  file_size       integer not null,
  storage_path    text,                       -- original .mid in the midi bucket
  added_at        timestamptz not null default now(),

  -- read from the file
  duration_sec    real not null,
  bpm             smallint not null,
  tempo_changes   smallint not null default 0,
  time_sig_num    smallint not null default 4,
  time_sig_den    smallint not null default 4,
  key_tonic       text not null,
  key_mode        text not null check (key_mode in ('major','minor')),
  key_declared    boolean not null default false,
  note_count      integer not null,
  pitch_low       smallint not null,
  pitch_high      smallint not null,
  hands           text not null check (hands in ('both','left','right')),
  level_score     smallint not null check (level_score between 1 and 5),
  level_label     text not null,
  fingerprint     text not null unique,        -- catches duplicate uploads

  -- derived artifacts, kept so the catalogue never reparses
  roll            jsonb not null,             -- thumbnail sprite (normalized)
  notes           jsonb not null,             -- [midi, start_ms, dur_ms, hand], capped

  -- learner state
  favorite        boolean not null default false,
  folder_id       uuid references folders(id) on delete set null,
  last_played_at  timestamptz,
  play_count      integer not null default 0,
  last_practiced_at timestamptz,
  generated       boolean not null default false
);

create index if not exists songs_added_at_idx     on songs (added_at desc);
create index if not exists songs_last_played_idx  on songs (last_played_at desc nulls last);
create index if not exists songs_level_idx        on songs (level_score);
create index if not exists songs_key_idx          on songs (key_tonic, key_mode);
create index if not exists songs_folder_idx       on songs (folder_id);
create index if not exists songs_favorite_idx     on songs (favorite) where favorite;
create index if not exists songs_title_trgm_idx   on songs using gin (to_tsvector('simple', title || ' ' || composer));

-- Single-user take-home: open policies. A real app scopes every row by user_id.
alter table songs enable row level security;
alter table folders enable row level security;
create policy "open songs"   on songs   for all using (true) with check (true);
create policy "open folders" on folders for all using (true) with check (true);

insert into storage.buckets (id, name, public) values ('midi', 'midi', false)
  on conflict (id) do nothing;
create policy "open midi read"  on storage.objects for select using (bucket_id = 'midi');
create policy "open midi write" on storage.objects for insert with check (bucket_id = 'midi');
create policy "open midi delete" on storage.objects for delete using (bucket_id = 'midi');
