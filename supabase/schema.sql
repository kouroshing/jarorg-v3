-- ============================================================================
-- Jar — projects table
-- Run this in the Supabase SQL editor (or via the CLI) to provision the table.
-- ============================================================================

-- Needed for gen_random_uuid().
create extension if not exists "pgcrypto";

create table if not exists public.projects (
  -- Primary identity
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- Consultation request details
  service_type    text not null
                    check (service_type in ('Photography', 'Videography', 'Modeling', 'Combo', 'Other')),
  title           text,
  brief           text not null,
  preferred_date  timestamptz,
  location        text,

  -- Lead contact info (consultation form)
  contact_name        text,
  contact_phone       text,
  preferred_call_time text
                    check (preferred_call_time in ('morning', 'noon', 'evening')),

  booking_route   text not null
                    check (booking_route in ('instant_pay', 'meeting_request')),

  -- Backend / business management
  status          text not null default 'pending_review'
                    check (status in (
                      'pending_review',
                      'contacted',
                      'converted',
                      'meeting_scheduled',
                      'invoiced',
                      'in_progress',
                      'completed'
                    )),
  -- Hardcoded standard profit-sharing model for future automated invoicing.
  financial_model text not null default '45_45_10_split'
);

-- Common access pattern: newest projects first.
create index if not exists projects_created_at_idx
  on public.projects (created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- The server action uses the service-role key, which bypasses RLS. Enable RLS
-- so the table is locked down to anon/public clients by default.
-- ----------------------------------------------------------------------------
alter table public.projects enable row level security;

-- ----------------------------------------------------------------------------
-- Migration for EXISTING tables (safe to run repeatedly).
-- Adds the consultation-lead columns and relaxes the legacy NOT NULL on title.
-- ----------------------------------------------------------------------------
alter table public.projects
  add column if not exists contact_name        text,
  add column if not exists contact_phone       text,
  add column if not exists preferred_call_time text;

alter table public.projects alter column title drop not null;

-- Allow the admin-panel lifecycle statuses on existing tables.
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in (
    'pending_review',
    'contacted',
    'converted',
    'meeting_scheduled',
    'invoiced',
    'in_progress',
    'completed'
  ));
