create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_profile_email_from_auth() from public, anon, authenticated;

drop trigger if exists auth_user_email_sync_profile on auth.users;

create trigger auth_user_email_sync_profile
after update of email on auth.users
for each row
execute function public.sync_profile_email_from_auth();

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.email is distinct from auth_user.email;
