-- Add manual user verification function for admin override
create or replace function public.manually_verify_user(
  target_user_id uuid,
  admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result_data jsonb;
begin
  -- Check if caller is admin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  -- Update user's email verification status
  update auth.users
  set email_confirmed_at = now()
  where id = target_user_id
  and email_confirmed_at is null;

  -- Log the manual verification
  insert into public.security_audit_log (
    user_id,
    table_name,
    action_type,
    record_id,
    new_values,
    created_at
  ) values (
    auth.uid(),
    'auth.users',
    'MANUAL_VERIFICATION',
    target_user_id,
    jsonb_build_object(
      'verified_by', auth.uid(),
      'admin_notes', admin_notes,
      'timestamp', now()
    ),
    now()
  );

  -- Return success with user details
  select jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'verified_at', now(),
    'verified_by', auth.uid()
  ) into result_data;

  return result_data;
end;
$$;

-- Add bulk verification function
create or replace function public.bulk_verify_users(
  target_user_ids uuid[],
  admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_count integer := 0;
  result_data jsonb;
begin
  -- Check if caller is admin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  -- Limit bulk operations to 50 users
  if array_length(target_user_ids, 1) > 50 then
    raise exception 'Bulk operation limited to 50 users at once';
  end if;

  -- Update all users' email verification status
  update auth.users
  set email_confirmed_at = now()
  where id = any(target_user_ids)
  and email_confirmed_at is null;

  get diagnostics verified_count = row_count;

  -- Log the bulk verification
  insert into public.security_audit_log (
    user_id,
    table_name,
    action_type,
    new_values,
    created_at
  ) values (
    auth.uid(),
    'auth.users',
    'BULK_VERIFICATION',
    jsonb_build_object(
      'verified_by', auth.uid(),
      'admin_notes', admin_notes,
      'user_ids', target_user_ids,
      'count', verified_count,
      'timestamp', now()
    ),
    now()
  );

  -- Return success with count
  select jsonb_build_object(
    'success', true,
    'verified_count', verified_count,
    'verified_by', auth.uid(),
    'timestamp', now()
  ) into result_data;

  return result_data;
end;
$$;