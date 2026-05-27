-- 2026-05-27 — Fix admin_list_verifications return-type mismatch.
--
-- The function declared `email text` but selected `coalesce(u.email, '')`
-- where auth.users.email is varchar — Postgres rejects a RETURNS TABLE
-- whose column types don't EXACTLY match the query ("structure of query
-- does not match function result type"). Cast every text-ish column to
-- text explicitly so the result type matches the declaration.

set search_path = public;

create or replace function public.admin_list_verifications(p_status text default 'pending')
returns table (
  id           uuid,
  user_id      uuid,
  name         text,
  email        text,
  photos       jsonb,
  pose         text,
  selfie_path  text,
  status       text,
  created_at   timestamptz,
  reviewed_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  return query
    select v.id,
           v.user_id,
           coalesce(up.profile_data->>'name', '')::text as name,
           coalesce(u.email::text, '')                  as email,
           coalesce(up.profile_data->'photos', '[]'::jsonb) as photos,
           v.pose::text,
           v.selfie_path::text,
           v.status::text,
           v.created_at,
           v.reviewed_at
      from public.verification_requests v
      left join public.user_profiles up on up.user_id = v.user_id
      left join auth.users u on u.id = v.user_id
     where p_status = 'all' or v.status = p_status
     order by v.created_at desc
     limit 200;
end;
$$;

revoke all on function public.admin_list_verifications(text) from public;
grant execute on function public.admin_list_verifications(text) to authenticated;
