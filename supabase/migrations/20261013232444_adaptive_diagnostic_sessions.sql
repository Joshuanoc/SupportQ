create table public.diagnostic_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 131072),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create index diagnostic_sessions_owner_updated_idx on public.diagnostic_sessions(user_id, updated_at desc);
alter table public.diagnostic_sessions enable row level security;
revoke all on public.diagnostic_sessions from public, anon, authenticated;
grant select, insert on public.diagnostic_sessions to authenticated;
grant update(state, revision, updated_at) on public.diagnostic_sessions to authenticated;
grant delete on public.diagnostic_sessions to authenticated;
create policy diagnostic_sessions_select on public.diagnostic_sessions for select to authenticated
  using ((select auth.uid()) = user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false));
create policy diagnostic_sessions_insert on public.diagnostic_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false));
create policy diagnostic_sessions_update on public.diagnostic_sessions for update to authenticated
  using ((select auth.uid()) = user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false))
  with check ((select auth.uid()) = user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false));
create policy diagnostic_sessions_delete on public.diagnostic_sessions for delete to authenticated
  using ((select auth.uid()) = user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false));

create function public.save_supportq_session(session_id uuid, session_state jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare next_revision bigint;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise insufficient_privilege; end if;
  if expected_revision < 0 then raise invalid_parameter_value; end if;
  if expected_revision = 0 then
    insert into public.diagnostic_sessions(id, state) values (session_id, session_state)
      on conflict (id) do nothing returning revision into next_revision;
  else
    update public.diagnostic_sessions set state=session_state, revision=revision+1, updated_at=now()
      where id=session_id and revision=expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'Session revision conflict' using errcode='40001'; end if;
  return next_revision;
end;
$$;
revoke all on function public.save_supportq_session(uuid,jsonb,bigint) from public, anon;
grant execute on function public.save_supportq_session(uuid,jsonb,bigint) to authenticated;

-- Private rate counters are never readable or writable through the Data API.
create schema if not exists supportq_private;
revoke all on schema supportq_private from public, anon, authenticated;
create table supportq_private.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  used integer not null default 0,
  minute_start timestamptz not null default now(),
  minute_used integer not null default 0,
  primary key (user_id, usage_day)
);
alter table supportq_private.ai_usage enable row level security;
revoke all on supportq_private.ai_usage from public, anon, authenticated;
-- Definer is necessary for updating private counters, with a fixed caller and limits.
create function supportq_private.reserve_ai_request()
returns boolean language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); counter supportq_private.ai_usage; current_day date := (now() at time zone 'UTC')::date;
begin
  if caller is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise insufficient_privilege; end if;
  insert into supportq_private.ai_usage(user_id,usage_day) values(caller,current_day) on conflict do nothing;
  select * into counter from supportq_private.ai_usage where user_id=caller and usage_day=current_day for update;
  if counter.minute_start < now() - interval '1 minute' then counter.minute_used:=0; counter.minute_start:=now(); end if;
  if counter.used >= 30 or counter.minute_used >= 3 then return false; end if;
  update supportq_private.ai_usage set used=used+1, minute_used=counter.minute_used+1, minute_start=counter.minute_start where user_id=caller and usage_day=current_day;
  return true;
end;
$$;
revoke all on function supportq_private.reserve_ai_request() from public, anon;
grant usage on schema supportq_private to authenticated;
grant execute on function supportq_private.reserve_ai_request() to authenticated;
create function public.reserve_supportq_ai_request() returns boolean language sql security invoker set search_path = '' as $$ select supportq_private.reserve_ai_request(); $$;
revoke all on function public.reserve_supportq_ai_request() from public, anon;
grant execute on function public.reserve_supportq_ai_request() to authenticated;
