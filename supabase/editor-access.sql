create table if not exists public.editor_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor')),
  reader text check (reader in ('Ewan', 'Isaac', 'Ethan', 'Tony')),
  created_at timestamptz not null default now(),
  constraint editor_accounts_reader_required
    check (
      (role = 'admin' and reader is null)
      or (role = 'editor' and reader is not null)
    )
);

alter table public.editor_accounts enable row level security;
alter table public.books enable row level security;
alter table public.books force row level security;

drop policy if exists "editor_accounts_self_select" on public.editor_accounts;
create policy "editor_accounts_self_select"
on public.editor_accounts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "books_public_read" on public.books;
create policy "books_public_read"
on public.books
for select
to anon, authenticated
using (true);

drop policy if exists "books_admin_insert" on public.books;
create policy "books_admin_insert"
on public.books
for insert
to authenticated
with check (
  exists (
    select 1
    from public.editor_accounts ea
    where ea.user_id = auth.uid()
      and ea.role = 'admin'
  )
);

drop policy if exists "books_editor_insert_own_reader" on public.books;
create policy "books_editor_insert_own_reader"
on public.books
for insert
to authenticated
with check (
  exists (
    select 1
    from public.editor_accounts ea
    where ea.user_id = auth.uid()
      and ea.role = 'editor'
      and ea.reader = reader
  )
);

drop policy if exists "books_admin_update" on public.books;
create policy "books_admin_update"
on public.books
for update
to authenticated
using (
  exists (
    select 1
    from public.editor_accounts ea
    where ea.user_id = auth.uid()
      and ea.role = 'admin'
  )
)
with check (true);

drop policy if exists "books_editor_update_own_reader" on public.books;
create policy "books_editor_update_own_reader"
on public.books
for update
to authenticated
using (
  exists (
    select 1
    from public.editor_accounts ea
    where ea.user_id = auth.uid()
      and ea.role = 'editor'
      and ea.reader = reader
  )
)
with check (
  exists (
    select 1
    from public.editor_accounts ea
    where ea.user_id = auth.uid()
      and ea.role = 'editor'
      and ea.reader = reader
  )
);

drop policy if exists "books_admin_delete" on public.books;
create policy "books_admin_delete"
on public.books
for delete
to authenticated
using (
  exists (
    select 1
    from public.editor_accounts ea
    where ea.user_id = auth.uid()
      and ea.role = 'admin'
  )
);

drop policy if exists "books_editor_delete_own_reader" on public.books;
create policy "books_editor_delete_own_reader"
on public.books
for delete
to authenticated
using (
  exists (
    select 1
    from public.editor_accounts ea
    where ea.user_id = auth.uid()
      and ea.role = 'editor'
      and ea.reader = reader
  )
);

-- Important:
-- Remove any older insert/update/delete policies on public.books that allowed broad writes.
-- If an older permissive policy still exists, it can override the restrictions above.

-- Run these after you create the Auth users in Supabase.
-- Replace the UUIDs with the real auth.users IDs from your project.
insert into public.editor_accounts (user_id, role, reader)
values
  ('00000000-0000-0000-0000-000000000001', 'admin', null),
  ('00000000-0000-0000-0000-000000000002', 'editor', 'Ewan'),
  ('00000000-0000-0000-0000-000000000003', 'editor', 'Isaac'),
  ('00000000-0000-0000-0000-000000000004', 'editor', 'Tony')
on conflict (user_id) do update
set role = excluded.role,
    reader = excluded.reader;
