
-- ============================================================
-- Phase 1: Lock the Certification Engine
-- ============================================================

-- ------------------------------------------------------------
-- 1) Seat-to-Entitlement Automation (Trigger)
-- ------------------------------------------------------------

create or replace function public.fn_upsert_entitlement_on_seat_assign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seat_assignment_entitlement on public.rvt_seats;

create trigger trg_seat_assignment_entitlement
after update of status, assigned_user_id on public.rvt_seats
for each row
execute function public.fn_upsert_entitlement_on_seat_assign();


-- ------------------------------------------------------------
-- 2) Org Certification Summary View
-- ------------------------------------------------------------

create or replace view public.org_certification_summary as
with members as (
  select organization_id, user_id
  from public.organization_members
  where status = 'active'
),
entitled as (
  select distinct m.organization_id, ce.user_id
  from members m
  join public.course_entitlements ce
    on ce.user_id = m.user_id
   and ce.status = 'active'
),
completed as (
  select distinct m.organization_id, cc.user_id
  from members m
  join public.course_completions cc
    on cc.user_id = m.user_id
   and (cc.completed_at is not null or coalesce(cc.passed, false) = true or coalesce(cc.completion_percent, 0) >= 100)
),
certs as (
  select distinct m.organization_id, uc.user_id
  from members m
  join public.user_certificates uc
    on uc.user_id = m.user_id
   and coalesce(uc.status, 'active') <> 'revoked'
)
select
  m.organization_id,
  count(distinct m.user_id) as total_members,
  count(distinct e.user_id) as entitled_users,
  count(distinct e.user_id) - count(distinct c.user_id) as in_progress_users,
  count(distinct c.user_id) as completed_users,
  count(distinct certs.user_id) as certificates_issued,
  case
    when count(distinct m.user_id) = 0 then 0
    else round((count(distinct certs.user_id)::numeric / count(distinct m.user_id)::numeric) * 100, 2)
  end as certification_rate
from members m
left join entitled e on e.organization_id = m.organization_id and e.user_id = m.user_id
left join completed c on c.organization_id = m.organization_id and c.user_id = m.user_id
left join certs on certs.organization_id = m.organization_id and certs.user_id = m.user_id
group by m.organization_id;


-- ------------------------------------------------------------
-- 3) Certificate Expiry Support
-- ------------------------------------------------------------

alter table public.user_certificates
  add column if not exists expires_at timestamptz;

-- Backfill existing rows
update public.user_certificates
set expires_at = coalesce(issued_at, created_at, now()) + interval '1 year'
where expires_at is null;

-- Auto-set expires_at on insert/update if missing
create or replace function public.fn_set_user_certificate_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.expires_at is null then
    new.expires_at := coalesce(new.issued_at, new.created_at, now()) + interval '1 year';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_user_certificate_expiry on public.user_certificates;

create trigger trg_set_user_certificate_expiry
before insert or update on public.user_certificates
for each row
execute function public.fn_set_user_certificate_expiry();


-- ------------------------------------------------------------
-- 4) Manager Dashboard: get_at_risk_students(org_id uuid)
-- ------------------------------------------------------------

create or replace function public.get_at_risk_students(p_org_id uuid)
returns table (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  completion_percent integer,
  days_inactive integer,
  risk_level text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_allowed boolean;
begin
  v_caller := auth.uid();

  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  -- Authorization: caller must be manager/admin in org
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = v_caller
      and om.status = 'active'
      and (
        om.member_type::text = 'manager'
        or om.role in ('dispensary_admin', 'training_coordinator')
      )
  ) into v_allowed;

  -- Also allow platform admins
  if not v_allowed then
    select exists (
      select 1 from public.user_roles
      where user_roles.user_id = v_caller
        and user_roles.role = 'admin'
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception 'Not authorized for org %', p_org_id;
  end if;

  return query
  with entitled_employees as (
    select distinct om.user_id
    from public.organization_members om
    join public.course_entitlements ce
      on ce.user_id = om.user_id and ce.status = 'active'
    where om.organization_id = p_org_id
      and om.status = 'active'
      and om.member_type::text = 'employee'
  ),
  progress as (
    select
      e.user_id,
      max(coalesce(up.completed_at, up.created_at)) as last_progress_at,
      count(up.id) as progress_rows
    from entitled_employees e
    left join public.user_progress up on up.user_id = e.user_id
    group by e.user_id
  ),
  completion as (
    select
      e.user_id,
      max(coalesce(cc.completion_percent, 0))::int as completion_percent
    from entitled_employees e
    left join public.course_completions cc on cc.user_id = e.user_id
    group by e.user_id
  )
  select
    e.user_id,
    p.email_cache as email,
    p.first_name,
    p.last_name,
    coalesce(c.completion_percent, 0) as completion_percent,
    case
      when pr.last_progress_at is null then 9999
      else greatest(0, floor(extract(epoch from (now() - pr.last_progress_at)) / 86400)::int)
    end as days_inactive,
    case
      when pr.progress_rows = 0 or pr.progress_rows is null then 'not_started'
      when pr.last_progress_at < (now() - interval '7 days') and coalesce(c.completion_percent, 0) < 100 then 'stalled'
      when coalesce(c.completion_percent, 0) < 100 then 'at_risk'
      else 'ok'
    end as risk_level
  from entitled_employees e
  left join progress pr on pr.user_id = e.user_id
  left join completion c on c.user_id = e.user_id
  left join public.profiles p on p.user_id = e.user_id
  where coalesce(c.completion_percent, 0) < 100
  order by
    case
      when pr.progress_rows = 0 or pr.progress_rows is null then 0
      when pr.last_progress_at < (now() - interval '14 days') then 1
      when pr.last_progress_at < (now() - interval '7 days') then 2
      else 3
    end,
    days_inactive desc;
end;
$$;
