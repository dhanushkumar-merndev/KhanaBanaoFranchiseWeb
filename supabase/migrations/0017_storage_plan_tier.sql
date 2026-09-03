-- Which Supabase billing plan this project is on, so the Storage page can
-- show "X left" against the right cap instead of a hardcoded constant an
-- admin would otherwise have to ask an engineer to change in code.
alter table app_settings
  add column plan_tier text not null default 'free'
    check (plan_tier in ('free', 'pro'));
