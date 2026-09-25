-- CareSyncD v3.2 Phase 5: Founder intelligence, organizations, and live instructor mode.
-- Analytics ingestion and broad business administration stay server-controlled.

create table public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null unique,
  identified_account_id uuid references auth.users(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (length(trim(anonymous_id)) > 0)
);

create table public.analytics_events (
  id text primary key,
  visitor_session_id uuid references public.visitor_sessions(id) on delete set null,
  anonymous_id text not null,
  account_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'page_view','pricing_view','demo_started','account_created','checkout_started',
    'subscription_verified','shift_started','shift_completed','renewal'
  )),
  occurred_at timestamptz not null,
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  created_at timestamptz not null default now(),
  check (length(trim(id)) > 0),
  check (length(trim(anonymous_id)) > 0)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seat_limit integer not null check (seat_limit > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0)
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('organization_admin','instructor','learner')),
  created_at timestamptz not null default now(),
  unique (organization_id, account_id)
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0)
);

create table public.cohort_instructors (
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cohort_id, instructor_id)
);

create table public.cohort_learners (
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cohort_id, learner_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  title text not null,
  unit_id text not null check (unit_id in ('med-surg','emergency','telemetry','icu','pediatrics','ob')),
  difficulty text not null check (difficulty in ('guided','standard','challenge')),
  due_at timestamptz not null,
  available_from timestamptz,
  available_until timestamptz,
  required_competencies jsonb not null default '{}'::jsonb check (jsonb_typeof(required_competencies) = 'object'),
  minimum_completed_shifts integer not null default 0 check (minimum_completed_shifts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(title)) > 0),
  check (available_from is null or available_until is null or available_until >= available_from)
);

create table public.assignment_results (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned','started','completed','remediation')),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, learner_id)
);

create table public.instructor_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete set null,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  observation_enabled boolean not null default false,
  lab_mode boolean not null default false,
  connection_status text not null default 'connected' check (connection_status in ('connected','disconnected','closed')),
  disclosure_label text not null default 'Instructor Observation Active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table public.instructor_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.instructor_sessions(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  minute numeric not null check (minute >= 0),
  note_text text not null,
  private boolean not null default true check (private = true),
  created_at timestamptz not null default now(),
  check (length(trim(note_text)) > 0)
);

create table public.lab_injections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.instructor_sessions(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  injected_minute numeric not null check (injected_minute >= 0),
  accepted boolean not null,
  reason text,
  event_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(event_metadata) = 'object'),
  created_at timestamptz not null default now(),
  check (length(trim(event_id)) > 0)
);

create index analytics_events_visitor_session_id_idx on public.analytics_events(visitor_session_id);
create index analytics_events_account_id_idx on public.analytics_events(account_id);
create index analytics_events_anonymous_id_idx on public.analytics_events(anonymous_id);
create index analytics_events_occurred_at_idx on public.analytics_events(occurred_at desc);
create index visitor_sessions_identified_account_id_idx on public.visitor_sessions(identified_account_id);
create index organization_memberships_organization_id_idx on public.organization_memberships(organization_id);
create index organization_memberships_account_id_idx on public.organization_memberships(account_id);
create index cohorts_organization_id_idx on public.cohorts(organization_id);
create index cohort_instructors_instructor_id_idx on public.cohort_instructors(instructor_id);
create index cohort_learners_learner_id_idx on public.cohort_learners(learner_id);
create index assignments_cohort_id_idx on public.assignments(cohort_id);
create index assignment_results_assignment_id_idx on public.assignment_results(assignment_id);
create index assignment_results_learner_id_idx on public.assignment_results(learner_id);
create index instructor_sessions_assignment_id_idx on public.instructor_sessions(assignment_id);
create index instructor_sessions_learner_id_idx on public.instructor_sessions(learner_id);
create index instructor_sessions_instructor_id_idx on public.instructor_sessions(instructor_id);
create index instructor_notes_session_id_idx on public.instructor_notes(session_id);
create index instructor_notes_instructor_id_idx on public.instructor_notes(instructor_id);
create index lab_injections_session_id_idx on public.lab_injections(session_id);
create index lab_injections_instructor_id_idx on public.lab_injections(instructor_id);

alter table public.visitor_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_instructors enable row level security;
alter table public.cohort_learners enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_results enable row level security;
alter table public.instructor_sessions enable row level security;
alter table public.instructor_notes enable row level security;
alter table public.lab_injections enable row level security;

-- Server-only analytics ingestion. There are intentionally no anon/public INSERT
-- policies and no authenticated raw SELECT policies on visitor_sessions or analytics_events.

create policy "organization_memberships_select_own" on public.organization_memberships
  for select to authenticated
  using ((select auth.uid()) = account_id);

create policy "organizations_select_member" on public.organizations
  for select to authenticated
  using (exists (
    select 1 from public.organization_memberships m
    where m.organization_id = organizations.id
      and m.account_id = (select auth.uid())
  ));

create policy "cohort_instructors_select_own" on public.cohort_instructors
  for select to authenticated
  using (instructor_id = (select auth.uid()));

create policy "cohort_learners_select_scoped" on public.cohort_learners
  for select to authenticated
  using (
    learner_id = (select auth.uid())
    or exists (
      select 1 from public.cohort_instructors ci
      where ci.cohort_id = cohort_learners.cohort_id
        and ci.instructor_id = (select auth.uid())
    )
  );

create policy "cohorts_select_scoped" on public.cohorts
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = cohorts.organization_id
        and m.account_id = (select auth.uid())
        and m.role = 'organization_admin'
    )
    or exists (
      select 1 from public.cohort_instructors ci
      where ci.cohort_id = cohorts.id
        and ci.instructor_id = (select auth.uid())
    )
    or exists (
      select 1 from public.cohort_learners cl
      where cl.cohort_id = cohorts.id
        and cl.learner_id = (select auth.uid())
    )
  );

create policy "assignments_select_scoped" on public.assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.cohort_learners cl
      where cl.cohort_id = assignments.cohort_id
        and cl.learner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.cohort_instructors ci
      where ci.cohort_id = assignments.cohort_id
        and ci.instructor_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.cohorts c
      join public.organization_memberships m on m.organization_id = c.organization_id
      where c.id = assignments.cohort_id
        and m.account_id = (select auth.uid())
        and m.role = 'organization_admin'
    )
  );

create policy "assignment_results_select_scoped" on public.assignment_results
  for select to authenticated
  using (
    learner_id = (select auth.uid())
    or exists (
      select 1
      from public.assignments a
      join public.cohort_instructors ci on ci.cohort_id = a.cohort_id
      where a.id = assignment_results.assignment_id
        and ci.instructor_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.assignments a
      join public.cohorts c on c.id = a.cohort_id
      join public.organization_memberships m on m.organization_id = c.organization_id
      where a.id = assignment_results.assignment_id
        and m.account_id = (select auth.uid())
        and m.role = 'organization_admin'
    )
  );

create policy "instructor_sessions_select_participant" on public.instructor_sessions
  for select to authenticated
  using (
    instructor_id = (select auth.uid())
    or learner_id = (select auth.uid())
  );

create policy "instructor_notes_select_own" on public.instructor_notes
  for select to authenticated
  using (
    instructor_id = (select auth.uid())
    and exists (
      select 1 from public.instructor_sessions s
      where s.id = instructor_notes.session_id
        and s.instructor_id = (select auth.uid())
    )
  );

create policy "instructor_notes_insert_own" on public.instructor_notes
  for insert to authenticated
  with check (
    instructor_id = (select auth.uid())
    and exists (
      select 1 from public.instructor_sessions s
      where s.id = instructor_notes.session_id
        and s.instructor_id = (select auth.uid())
    )
  );

create policy "lab_injections_select_own" on public.lab_injections
  for select to authenticated
  using (
    instructor_id = (select auth.uid())
    and exists (
      select 1 from public.instructor_sessions s
      where s.id = lab_injections.session_id
        and s.instructor_id = (select auth.uid())
    )
  );

create policy "lab_injections_insert_lab_session" on public.lab_injections
  for insert to authenticated
  with check (
    instructor_id = (select auth.uid())
    and exists (
      select 1 from public.instructor_sessions s
      where s.id = lab_injections.session_id
        and s.instructor_id = (select auth.uid())
        and s.lab_mode = true
    )
  );

-- Organization creation/membership mutation, cohort enrollment/assignment mutation,
-- instructor-session creation, analytics ingestion, and Founder-wide reporting are
-- intentionally trusted-server operations. No client policy can create Founder authority.
