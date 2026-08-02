-- 北海道大学2026データサイエンス入門「最終課題提出」用セットアップ
-- Supabaseプロジェクトの SQL Editor でこのファイルの内容を丸ごと実行してください。

-- 1. 提出データを保存するテーブル
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text not null unique,
  submission_url text,
  file_path text,
  file_name text,
  comment text
);

alter table public.submissions enable row level security;

-- 2. 更新日時を自動更新するトリガー
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

-- 3. RLSポリシー: anon(受講生・匿名キー)は「新規提出」と「自分のメールでの再提出(上書き)」のみ可能。
--    閲覧・削除は不可(講師はSupabaseダッシュボードから閲覧します)。
drop policy if exists "allow insert for anon" on public.submissions;
create policy "allow insert for anon"
  on public.submissions for insert
  to anon
  with check (true);

drop policy if exists "allow update for anon" on public.submissions;
create policy "allow update for anon"
  on public.submissions for update
  to anon
  using (true)
  with check (true);

-- 4. ファイルアップロード用のストレージバケット(非公開)
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- 5. ストレージのRLSポリシー: anonはアップロード(新規/上書き)のみ可能。閲覧・削除は不可。
drop policy if exists "allow anon upload to submissions bucket" on storage.objects;
create policy "allow anon upload to submissions bucket"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'submissions');

drop policy if exists "allow anon overwrite in submissions bucket" on storage.objects;
create policy "allow anon overwrite in submissions bucket"
  on storage.objects for update
  to anon
  using (bucket_id = 'submissions')
  with check (bucket_id = 'submissions');
