alter table public.books enable row level security;

drop policy if exists "public read books" on public.books;
drop policy if exists "admin insert books" on public.books;
drop policy if exists "admin update books" on public.books;
drop policy if exists "admin delete books" on public.books;

create policy "public read books"
on public.books
for select
to anon, authenticated
using (true);

create policy "admin insert books"
on public.books
for insert
to authenticated
with check (
  coalesce(auth.jwt() ->> 'email', '') = 'replace-with-admin-email@example.com'
);

create policy "admin update books"
on public.books
for update
to authenticated
using (
  coalesce(auth.jwt() ->> 'email', '') = 'replace-with-admin-email@example.com'
)
with check (
  coalesce(auth.jwt() ->> 'email', '') = 'replace-with-admin-email@example.com'
);

create policy "admin delete books"
on public.books
for delete
to authenticated
using (
  coalesce(auth.jwt() ->> 'email', '') = 'replace-with-admin-email@example.com'
);
