CREATE OR REPLACE FUNCTION public.fn_upsert_entitlement_on_seat_assign()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'UPDATE') then
    if (new.status = 'assigned'
        and new.assigned_user_id is not null
        and new.course_id is not null) then

      if (old.status is distinct from new.status
          or old.assigned_user_id is distinct from new.assigned_user_id) then

        insert into public.course_entitlements (
          user_id,
          course_id,
          source,
          status,
          created_at
        )
        values (
          new.assigned_user_id,
          new.course_id,
          'org_seat',
          'active',
          now()
        )
        on conflict (user_id, course_id)
        do update set
          status = 'active',
          source = excluded.source;

        -- Stamp the assignee's organization if not already set, so the learner
        -- is visible to their manager's roster and can use org comms. Guarded on
        -- null so an existing org membership is never overwritten by a seat move.
        update public.profiles
        set organization_id = new.organization_id,
            updated_at = now()
        where user_id = new.assigned_user_id
          and organization_id is null
          and new.organization_id is not null;

      end if;
    end if;
  end if;

  return new;
end;
$function$;
