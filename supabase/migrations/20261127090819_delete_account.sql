-- Delete account (Settings → Delete account).
--
-- Apple requires apps with sign-up to let people delete their account in the app.
-- The app can't delete sign-in accounts itself, so this function does it on the
-- server for the signed-in person only.
--
-- What goes: the sign-in account, then (through "on delete cascade") the profile,
-- every activity log, daily points, achievements, rest days, community memberships
-- and feed events. The profile photo is removed by the app first, through Storage.
--
-- Communities the person created are not deleted out from under their friends:
-- ownership passes to the member who joined earliest. A community with nobody
-- else in it is deleted.
--
-- Safe to run more than once.

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me   uuid := auth.uid();
  comm record;
  heir uuid;
begin
  if me is null then raise exception 'not signed in'; end if;

  for comm in select id from public.communities where created_by = me loop
    select user_id into heir
      from public.community_members
      where community_id = comm.id and user_id <> me
      order by joined_at, user_id
      limit 1;
    if heir is not null then
      update public.communities set created_by = heir where id = comm.id;
      update public.community_members set role = 'owner'
        where community_id = comm.id and user_id = heir;
    end if;
    -- With no heir the community is removed by the cascade below.
  end loop;

  delete from auth.users where id = me;
end $$;

-- Only signed-in people can call it, and it only ever deletes the caller.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
