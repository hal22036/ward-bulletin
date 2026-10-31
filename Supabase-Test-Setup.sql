-- Run in the NEW Ward Bulletin Studio project, using Supabase SQL Editor.
-- This is a TEST environment. It grants test access only, never real paid subscriptions.
begin;
create schema if not exists bulletin_private;
revoke all on schema bulletin_private from public, anon, authenticated;
create table if not exists bulletin_private.test_checkout_settings (
 singleton boolean primary key default true check (singleton),
 enabled boolean not null default false
);
insert into bulletin_private.test_checkout_settings(singleton,enabled) values(true,true)
on conflict(singleton) do nothing;
revoke all on bulletin_private.test_checkout_settings from public, anon, authenticated;
create table if not exists public.bulletin_test_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 owner_name text not null default '' check(length(owner_name)<=200),
 unit_name text not null default '' check(length(unit_name)<=200)
);
create table if not exists public.bulletin_test_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 plan text not null check(plan in ('bulletin','kids','bundle')),
 billing text not null check(billing in ('monthly','annual')),
 mode text not null default 'test' check(mode='test'),
 confirmed_at timestamptz not null default now()
);
alter table public.bulletin_test_accounts enable row level security;
alter table public.bulletin_test_entitlements enable row level security;
revoke all on public.bulletin_test_accounts,public.bulletin_test_entitlements from public,anon,authenticated;
grant select,insert,update on public.bulletin_test_accounts to authenticated;
grant select on public.bulletin_test_entitlements to authenticated;
drop policy if exists account_read_own on public.bulletin_test_accounts;
create policy account_read_own on public.bulletin_test_accounts for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists account_insert_own on public.bulletin_test_accounts;
create policy account_insert_own on public.bulletin_test_accounts for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists account_update_own on public.bulletin_test_accounts;
create policy account_update_own on public.bulletin_test_accounts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists test_access_read_own on public.bulletin_test_entitlements;
create policy test_access_read_own on public.bulletin_test_entitlements for select to authenticated using ((select auth.uid())=user_id);
create or replace function public.activate_bulletin_test_plan(selected_plan text,selected_billing text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_user_id uuid:=auth.uid(); result public.bulletin_test_entitlements;
begin
 if current_user_id is null then raise exception 'Sign in first'; end if;
 if not coalesce((select enabled from bulletin_private.test_checkout_settings where singleton=true),false) then raise exception 'Test checkout is disabled'; end if;
 if selected_plan is null or selected_plan not in ('bulletin','kids','bundle') or selected_billing is null or selected_billing not in ('monthly','annual') then raise exception 'Invalid test plan'; end if;
 insert into public.bulletin_test_entitlements(user_id,plan,billing,mode,confirmed_at)
 values(current_user_id,selected_plan,selected_billing,'test',now())
 on conflict(user_id) do update set plan=excluded.plan,billing=excluded.billing,mode='test',confirmed_at=excluded.confirmed_at
 returning * into result;
 return to_jsonb(result);
end;
$$;
revoke all on function public.activate_bulletin_test_plan(text,text) from public,anon;
grant execute on function public.activate_bulletin_test_plan(text,text) to authenticated;
commit;
-- Before accepting real payments, disable test checkout:
-- update bulletin_private.test_checkout_settings set enabled=false where singleton=true;
