-- Pay book: GC-typed (or extracted-then-confirmed) invoices and payments. Not a bank feed.
create table if not exists hf_pay_lines (
  id text primary key,
  user_id text not null,
  vendor_id text not null,
  kind text not null,
  amount_cents integer not null,
  memo text,
  doc_date text,
  original_filename text,
  created_at timestamptz not null default now()
);
create index if not exists hf_pay_user_idx on hf_pay_lines (user_id, vendor_id);
