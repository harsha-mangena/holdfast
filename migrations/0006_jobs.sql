-- Preconstruction jobs (ITBs) — ConstructionBevy-shaped, Holdfast-gated.
create table if not exists hf_jobs (
  id text primary key,
  user_id text not null,
  name text not null,
  owner_name text,
  location text,
  start_date text,
  bid_due text,
  completion_date text,
  bond_required boolean not null default false,
  prevailing_wage boolean not null default false,
  trades text not null default '',
  notes text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists hf_jobs_user_idx on hf_jobs (user_id);
