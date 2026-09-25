-- Phase 5 performance follow-up from Supabase database advisor.
create index if not exists organizations_created_by_idx
  on public.organizations(created_by);
