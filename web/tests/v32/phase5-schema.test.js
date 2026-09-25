import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl=new URL('../../../supabase/migrations/20260925_phase5_founder_org_live.sql',import.meta.url);
const REQUIRED_TABLES=[
  'visitor_sessions','analytics_events','organizations','organization_memberships','cohorts',
  'cohort_instructors','cohort_learners','assignments','assignment_results',
  'instructor_sessions','instructor_notes','lab_injections'
];

async function sql(){ return (await readFile(migrationUrl,'utf8')).toLowerCase(); }

test('Phase 5 migration creates every analytics, organization, assignment, and live-instructor table',async()=>{
  const text=await sql();
  for(const table of REQUIRED_TABLES){
    assert.match(text,new RegExp(`create table public\\.${table}\\b`),table);
  }
});

test('every Phase 5 table enables row level security',async()=>{
  const text=await sql();
  for(const table of REQUIRED_TABLES){
    assert.match(text,new RegExp(`alter table public\\.${table} enable row level security`),table);
  }
});

test('analytics ingestion and raw Founder intelligence stay server-controlled with no public client policy',async()=>{
  const text=await sql();
  assert.doesNotMatch(text,/create policy[^;]*on public\.analytics_events[^;]*for insert[^;]*to (anon|public)/s);
  assert.doesNotMatch(text,/create policy[^;]*on public\.analytics_events[^;]*for select[^;]*to authenticated/s);
  assert.doesNotMatch(text,/create policy[^;]*on public\.visitor_sessions[^;]*for insert[^;]*to (anon|public)/s);
  assert.match(text,/-- server-only analytics ingestion/i);
});

test('organization memberships are unique per organization/account and learners cannot exceed duplicate membership rows',async()=>{
  const text=await sql();
  assert.match(text,/unique\s*\(organization_id,\s*account_id\)/);
  assert.match(text,/role text not null check \(role in \('organization_admin','instructor','learner'\)\)/);
  assert.match(text,/organization_memberships_select_own/);
  assert.match(text,/\(select auth\.uid\(\)\) = account_id/);
});

test('cohort instructor and learner membership keys prevent duplicate assignments',async()=>{
  const text=await sql();
  assert.match(text,/primary key \(cohort_id, instructor_id\)/);
  assert.match(text,/primary key \(cohort_id, learner_id\)/);
  assert.match(text,/cohort_instructors_select_own/);
  assert.match(text,/cohort_learners_select_scoped/);
});

test('instructor visibility is scoped through cohort_instructors rather than platform-wide learner reads',async()=>{
  const text=await sql();
  assert.match(text,/from public\.cohort_instructors ci[\s\S]*ci\.instructor_id = \(select auth\.uid\(\)\)/);
  assert.match(text,/assignments_select_scoped/);
  assert.match(text,/assignment_results_select_scoped/);
  assert.doesNotMatch(text,/create policy[^;]*on public\.cohort_learners[^;]*using \(true\)/s);
});

test('learner can read own assignment results and own instructor-session disclosure',async()=>{
  const text=await sql();
  assert.match(text,/assignment_results_select_scoped/);
  assert.match(text,/learner_id = \(select auth\.uid\(\)\)/);
  assert.match(text,/instructor_sessions_select_participant/);
  assert.match(text,/learner_id = \(select auth\.uid\(\)\)/);
  assert.match(text,/observation_enabled boolean not null default false/);
});

test('instructor notes and lab injections are limited to sessions owned by the instructor',async()=>{
  const text=await sql();
  assert.match(text,/instructor_notes_select_own/);
  assert.match(text,/instructor_notes_insert_own/);
  assert.match(text,/lab_injections_select_own/);
  assert.match(text,/lab_injections_insert_lab_session/);
  assert.match(text,/s\.instructor_id = \(select auth\.uid\(\)\)/);
  assert.match(text,/s\.lab_mode = true/);
});

test('organization-scoped tables have organization foreign keys and indexes for tenant filtering',async()=>{
  const text=await sql();
  assert.match(text,/organization_memberships_organization_id_idx/);
  assert.match(text,/cohorts_organization_id_idx/);
  assert.match(text,/assignments_cohort_id_idx/);
  assert.match(text,/instructor_sessions_learner_id_idx/);
  assert.match(text,/instructor_sessions_instructor_id_idx/);
});
