-- Holdfast: one org per signed-in user. Status is never stored; coverage lines are.
create table if not exists hf_orgs (
  user_id text primary key,
  name text not null default 'My company',
  plan text not null default 'starter',
  billing_status text not null default 'none',
  created_at timestamptz not null default now()
);

create table if not exists hf_vendors (
  id text primary key,
  user_id text not null,
  name text not null,
  trade text,
  contact_email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists hf_vendors_user_idx on hf_vendors (user_id);

create table if not exists hf_requirement_lines (
  id text primary key,
  user_id text not null,
  coverage_type text not null,
  per_occurrence_cents integer,
  aggregate_cents integer,
  requires_ai boolean not null default false,
  requires_wos boolean not null default false
);
create index if not exists hf_req_user_idx on hf_requirement_lines (user_id);

create table if not exists hf_certificates (
  id text primary key,
  user_id text not null,
  vendor_id text,
  status text not null default 'needs_review',
  original_filename text,
  pdf_base64 text,
  extraction_json text,
  error_message text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists hf_certs_user_idx on hf_certificates (user_id);

create table if not exists hf_coverage_lines (
  id text primary key,
  user_id text not null,
  certificate_id text not null,
  coverage_type text not null,
  insurer text,
  policy_number text,
  effective_date text,
  expiration_date text,
  per_occurrence_cents integer,
  aggregate_cents integer,
  additional_insured boolean,
  waiver_of_subrogation boolean
);
create index if not exists hf_cov_cert_idx on hf_coverage_lines (certificate_id);

create table if not exists hf_audit (
  id text primary key,
  user_id text not null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists hf_audit_user_idx on hf_audit (user_id, created_at desc);
