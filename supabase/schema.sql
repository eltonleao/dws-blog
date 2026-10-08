-- Comments of the DWS Blog explorer version.
--
-- Setting up the Supabase project, once, in the dashboard:
--   1. Create the project.
--   2. Authentication > Sign In / Providers: turn on "Allow anonymous sign-ins".
--      Every visitor who comments gets an anonymous user of their own.
--   3. SQL Editor: paste this whole file and run it. Running it again is safe.
--   4. Project Settings > API: copy the project URL and the public anon key
--      into VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
--
-- This file holds no key, token or password. The anon key is public by design,
-- since it ships in the browser bundle; what protects the table is the row
-- level security and the grants below.
--
-- What each role of the API may do:
--   anon           read
--   authenticated  read; insert as itself, at most 3 comments a minute;
--                  delete its own comments
--   nobody         update

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  -- The post lives in the blog API, outside this database: no foreign key.
  post_id uuid not null,
  -- The user of the session, anonymous visitors included. Always the default:
  -- the client has no insert grant on this column.
  user_id uuid not null default auth.uid(),
  display_name text not null
    constraint comments_display_name_length
    check (char_length(display_name) between 1 and 40 and display_name ~ '\S'),
  -- The limit is on the text as stored, so trailing blanks cannot pad a
  -- comment past it, and a body of only blanks (spaces, tabs, line breaks)
  -- is refused.
  body text not null
    constraint comments_body_length
    check (char_length(body) <= 500 and body ~ '\S'),
  created_at timestamptz not null default now()
);

-- The post page reads the newest comments of one post.
create index if not exists comments_post_id_created_at_idx
  on public.comments (post_id, created_at desc);

-- The insert policy counts the recent comments of one user.
create index if not exists comments_user_id_created_at_idx
  on public.comments (user_id, created_at desc);

-- How many comments the requesting user wrote in the last minute, for the
-- insert policy. Two details keep the limit from being skipped:
--   * it is volatile plpgsql, so each statement takes a fresh snapshot: when a
--     request inserts many rows at once, every row also counts the rows the
--     same statement already wrote;
--   * it holds a lock per user until the transaction ends, so parallel
--     requests of one user count one after the other instead of all seeing
--     the same total.
create or replace function public.comments_sent_last_minute()
returns bigint
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.comments'), hashtext(auth.uid()::text));
  return (
    select count(*)
    from public.comments
    where user_id = auth.uid()
      and created_at > now() - interval '1 minute'
  );
end;
$$;

alter table public.comments enable row level security;

-- No update policy on purpose: with row level security on, no policy means no
-- row, and the grants below take the right away as well.

drop policy if exists "comments are public to read" on public.comments;
create policy "comments are public to read"
  on public.comments for select
  to anon, authenticated
  using (true);

drop policy if exists "visitors add their own comments" on public.comments;
create policy "visitors add their own comments"
  on public.comments for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.comments_sent_last_minute() < 3
  );

drop policy if exists "visitors delete their own comments" on public.comments;
create policy "visitors delete their own comments"
  on public.comments for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Supabase grants every right on a new table of the public schema to the API
-- roles. Start from nothing and give back only what the policies use: no
-- update, no truncate, and an insert that names only the three columns the
-- visitor writes, so the client never picks id, user_id or created_at.
revoke all on table public.comments from anon, authenticated;
grant select on table public.comments to anon, authenticated;
grant insert (post_id, display_name, body) on table public.comments to authenticated;
grant delete on table public.comments to authenticated;

-- Only the insert policy needs the function, and it runs as the visitor.
revoke all on function public.comments_sent_last_minute() from public, anon;
grant execute on function public.comments_sent_last_minute() to authenticated;
