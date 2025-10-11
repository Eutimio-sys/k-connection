-- Create helper functions to restore profile and grant admin after reset
create or replace function public.ensure_profile_for_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u_email text;
  full_name text;
begin
  if uid is null then
    return;
  end if;
  select email, coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1))
  into u_email, full_name
  from auth.users
  where id = uid;

  if u_email is null then
    return;
  end if;

  insert into public.profiles (id, email, full_name, is_active)
  values (uid, u_email, coalesce(full_name, split_part(u_email,'@',1)), true)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        is_active = true,
        updated_at = now();
end;
$$;

create or replace function public.grant_admin_to_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;
  insert into public.user_roles (user_id, role)
  values (uid, 'admin')
  on conflict (user_id, role) do nothing;
end;
$$;