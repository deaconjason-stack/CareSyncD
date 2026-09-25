# CareSyncD v3.2 Phase 5 — Founder Intelligence, Organizations, and Instructor Live Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Execute every implementation task test-first and keep `main` and `gh-pages` untouched.

**Goal:** Add CareSyncD v3.2 business intelligence, organization/classroom management, Founder/Admin authority, privacy-safe acquisition analytics, and transparent instructor live observation/Simulation Lab workflows while preserving the local-first learner simulation.

**Architecture:** Phase 5 adds pure domain modules under `web/src/analytics/`, `web/src/admin/`, `web/src/organizations/`, and `web/src/instructor/`; UI-facing projections under `web/src/ui/`; and a Supabase migration behind the existing backend boundary. Analytics accept only allowlisted structured fields. Founder intelligence is derived from analytics/subscription/learning events rather than from simulation patient state. Instructor observation consumes an explicit event stream and never owns or pauses the learner simulation.

**Tech Stack:** Node.js 22 ESM, Node test runner, static PWA, PostgreSQL/Supabase RLS, existing CareSyncD v3.2 Living Hospital modules.

**Spec:** `docs/superpowers/specs/2026-09-24-caresyncd-v3.2-living-hospital-design.md`

## Global Constraints

- Work only on `v3.2-living-hospital`; do not modify `main` or `gh-pages`.
- Educational simulation only. No real-patient diagnosis, monitoring, treatment, or clinical decision support.
- No PHI collection by design. Analytics must reject free-text clinical fields and patient identifiers.
- Anonymous visitors remain anonymous until an explicit account-identification event; do not attempt identity enrichment.
- Founder is the highest authority. Ordinary Admin cannot remove/demote Founder, transfer ownership, or silently change high-risk security/payment ownership settings.
- Major pricing rules remain those from Phase 4: base-price change >=10%, promotion/discount >25%, removal of grandfathering/cadence, or material entitlement movement requires Founder approval.
- Instructor observation is off by default, explicit, and visible to the learner.
- Losing instructor connectivity never pauses, ends, rewinds, or mutates the learner simulation.
- Simulation Lab injection is available only in explicitly enabled lab sessions and every injection is timestamped in the simulation timeline.
- Organization seat loss never deletes personal learning history.
- Do not place Supabase service-role credentials or admin secrets in the public frontend.

## Pre-flight shared interfaces

- Task 2 consumes Task 1 analytics events. The analytics event contract is the single source of truth for funnel inputs.
- Task 3 consumes Phase 4 `classifyPricingChange()` to distinguish ordinary vs Founder-required pricing changes.
- Task 4 consumes Task 3 role capabilities to scope organization/instructor operations.
- Task 5 consumes existing Living Hospital `scheduleEvent()` and world timeline conventions; instructor transport state is separate from simulation state.
- Task 7 consumes Tasks 1–5 public functions only, so acceptance verifies boundaries rather than implementation internals.

---

### Task 1: Privacy-safe analytics event contract

**Files:**
- Create: `web/src/analytics/analytics-event.js`
- Test: `web/tests/v32/analytics-event.test.js`

**Interfaces:**
- `ANALYTICS_EVENT_TYPES`
- `createAnalyticsEvent(input)`
- `linkAnalyticsIdentity(event, accountId)`

Approved event types: `page_view`, `pricing_view`, `demo_started`, `account_created`, `checkout_started`, `subscription_verified`, `shift_started`, `shift_completed`, `renewal`.

Approved structured properties: `page`, `referrerHost`, `deviceClass`, `browserFamily`, `regionCode`, `planId`, `cadence`, `source`, `unitId`, `shiftFormat`.

Forbidden keys include patient/clinical/free-text fields such as `patient`, `patientId`, `patientName`, `mrn`, `diagnosis`, `clinicalText`, `note`, `notes`, `freeText`, `symptoms`, `medication`, and any unknown property key.

- [ ] **Step 1: Write failing tests** proving event type allowlisting, property allowlisting, unknown/free-text clinical key rejection, anonymous event creation without account linkage, explicit later identity linkage, timestamp validation, and immutable output.
- [ ] **Step 2: Set `.ci/v32-gate.txt` to `RED tests/v32/analytics-event.test.js` and confirm the RED checkpoint.**
- [ ] **Step 3: Implement the minimum event contract** with normalization, cloning, and no implicit identity enrichment.
- [ ] **Step 4: Change the gate marker to `phase5-task1 analytics contract GREEN`; run the complete v3.2 verification gate and require success.**
- [ ] **Step 5: Commit** `feat: add privacy-safe analytics contract`.

### Task 2: Founder intelligence and conversion funnel

**Files:**
- Create: `web/src/admin/founder-intelligence.js`
- Create: `web/src/ui/founder-dashboard-view-model.js`
- Test: `web/tests/v32/founder-intelligence.test.js`

**Interfaces:**
- `buildConversionFunnel(events)`
- `buildFounderSnapshot({analyticsEvents, subscriptions, learningEvents, asOf})`
- `buildFounderDashboardModel(snapshot)`

**Behavior:**
- Funnel stages: Visitor -> Demo -> Account -> Checkout -> Subscriber -> Active Learner -> Renewal.
- Subscriber metrics: active, payment-issue/grace, canceled, expired, monthly/yearly, per-plan counts, new subscriptions, renewals.
- Learning metrics: shifts started/completed and top unit from structured `unitId` only.
- Acquisition: counts by structured `source` without attempting anonymous-to-name inference.
- Dashboard projection must expose aggregate metrics plus only identified subscriber records supplied by the authenticated backend; anonymous IDs are never displayed as people.

- [ ] **Step 1: Write failing tests** for funnel counting, de-duplication by event ID, active subscriber summaries, plan/cadence split, acquisition source aggregation, top-unit aggregation, and absence of anonymous visitor identity from subscriber rows.
- [ ] **Step 2: Trigger RED** with `RED tests/v32/founder-intelligence.test.js`.
- [ ] **Step 3: Implement pure aggregators and view model.** Use explicit `asOf`; never read `Date.now()` inside aggregation logic.
- [ ] **Step 4: Confirm GREEN** with full branch gate.
- [ ] **Step 5: Commit** `feat: add Founder intelligence model`.

### Task 3: Founder/Admin authority and audit-domain rules

**Files:**
- Create: `web/src/admin/admin-policy.js`
- Create: `web/src/admin/audit-entry.js`
- Test: `web/tests/v32/admin-policy.test.js`

**Interfaces:**
- `ADMIN_ACTIONS`
- `evaluateAdminAction({actorRole, action, targetRole, previousPrice, nextPrice})`
- `createAuditEntry({id, actorId, actorRole, action, targetType, targetId, occurredAt, data})`

**Authority rules:**
- Founder can perform all declared admin actions.
- Admin can manage subscribers, instructors, organizations, ordinary pricing/promotion operations, reports, and content.
- Admin cannot `transfer_ownership`, `remove_founder`, `demote_founder`, `replace_founder`, or change ownership-level payment/security control.
- A pricing proposal classified as major by Phase 4 returns `requiresFounderApproval:true` when initiated by Admin instead of applying immediately.
- Audit data rejects secret-bearing keys such as password, token, secret, serviceRoleKey, clientSecret, cardNumber, cvv.

- [ ] **Step 1: Write failing tests** for Founder supremacy, Admin ordinary operations, forbidden Founder changes, exact 10% pricing proposal routing to approval, 9.9% ordinary pricing eligibility, and secret-free immutable audit entries.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Implement policy using `classifyPricingChange()` from Phase 4** rather than reimplementing thresholds.
- [ ] **Step 4: Confirm GREEN.**
- [ ] **Step 5: Commit** `feat: enforce Founder admin authority`.

### Task 4: Organizations, seats, cohorts, and assignments

**Files:**
- Create: `web/src/organizations/organization-engine.js`
- Test: `web/tests/v32/organizations.test.js`

**Interfaces:**
- `createOrganization({id,name,seatLimit})`
- `addOrganizationMember(state,{accountId,role})`
- `removeOrganizationMember(state,accountId)`
- `createCohort(state,{id,name,instructorIds})`
- `enrollLearner(state,{cohortId,learnerId})`
- `createAssignment(state,input)`
- `visibleLearnerIdsForInstructor(state,instructorId)`

**Rules:**
- Roles inside an organization: `organization_admin`, `instructor`, `learner`.
- Learner seat count may not exceed `seatLimit`; instructor/admin memberships do not consume learner seats unless explicitly modeled later.
- Cohort instructors can access only learners in their assigned cohorts.
- Assignment fields support `unitId`, `difficulty`, `dueAt`, `requiredCompetencies`, `minimumCompletedShifts`, and optional availability window.
- Removing a learner membership removes organization access only; it never mutates the learner’s external/personal progress object.

- [ ] **Step 1: Write failing tests** for seat enforcement, duplicate-membership rejection/idempotency, cohort scoping, instructor visibility, assignment validation, and seat-loss progress preservation.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Implement immutable organization state transitions.**
- [ ] **Step 4: Confirm GREEN.**
- [ ] **Step 5: Commit** `feat: add organization cohort engine`.

### Task 5: Transparent live instructor observation and Simulation Lab

**Files:**
- Create: `web/src/instructor/live-session.js`
- Test: `web/tests/v32/instructor-live-session.test.js`

**Interfaces:**
- `createObservationSession({id,instructorId,learnerId,assignmentId,observationEnabled,labMode})`
- `setInstructorConnection(session,status)`
- `appendObservationFrame(session,frame)`
- `framesAfter(session,sequence)`
- `addInstructorNote(session,{minute,text})`
- `injectLabEvent(world,session,event)`

**Rules:**
- Observation requires `observationEnabled:true`; otherwise no frame stream may be consumed.
- Returned session contains `learnerDisclosure:{observationActive:true}` for observed sessions.
- Frames use strictly increasing sequence numbers and allow reconnect catch-up by sequence.
- Instructor disconnect changes only session transport state; learner world remains byte-for-byte unchanged.
- Notes are private instructor records and timestamped; empty notes are rejected.
- Lab injection requires `labMode:true`. Injection must create an `INSTRUCTOR_LAB_INJECTION` timeline entry and, for schedulable events, use existing `scheduleEvent()` so pressure/prerequisite/cooldown safeguards still apply. It must never directly overwrite a patient trajectory to force an outcome.

- [ ] **Step 1: Write failing tests** for disabled observation, visible disclosure, frame sequencing/catch-up, disconnect safety, private notes, lab-mode requirement, pressure-budget rejection, and auditable successful injection.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Implement live-session domain module**, reusing Living Hospital event scheduling rather than duplicating clinical event rules.
- [ ] **Step 4: Confirm GREEN.**
- [ ] **Step 5: Commit** `feat: add transparent instructor live sessions`.

### Task 6: Phase 5 Supabase schema and RLS

**Files:**
- Create: `supabase/migrations/20260925_phase5_founder_org_live.sql`
- Create: `web/tests/v32/phase5-schema.test.js`

**Tables:**
- `visitor_sessions`
- `analytics_events`
- `organizations`
- `organization_memberships`
- `cohorts`
- `cohort_instructors`
- `cohort_learners`
- `assignments`
- `assignment_results`
- `instructor_sessions`
- `instructor_notes`
- `lab_injections`

**RLS principles:**
- Every table has RLS enabled.
- Learners can read only their own assignment/result and their own instructor-session disclosure rows.
- Instructors can read cohorts/learners only where `cohort_instructors.instructor_id = auth.uid()` and can read/create notes only for instructor sessions they own.
- Organization admins are scoped by organization membership.
- Raw analytics and Founder-wide intelligence are not publicly readable; aggregation/admin reads remain trusted-server/admin-RPC concerns.
- Client roles cannot create/replace Founder authority through organization tables.
- Anonymous analytics ingestion is server/Edge Function controlled; no public insert policy on `analytics_events`.

- [ ] **Step 1: Write a failing static schema test** for all required tables, RLS, unique constraints, organization/cohort scoping policies, own-learner disclosure access, and absence of public analytics/admin writes.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Write migration** with UUIDs/FKs/checks/indexes/RLS. Avoid recursive RLS helpers; use direct membership `exists(...)` predicates with `(select auth.uid())`.
- [ ] **Step 4: Confirm repository GREEN.**
- [ ] **Step 5: Apply migration to `caresyncd-v32-dev` only** (`uwntfyazjkpdvakntsgl`) after repo gate passes.
- [ ] **Step 6: Run Supabase security/performance advisors.** Treat intentional server-only RLS-with-no-policy findings as informational; fix genuine cross-tenant/security findings before continuing.
- [ ] **Step 7: Commit** `feat: add Phase 5 organization and live schema`.

### Task 7: Phase 5 end-to-end acceptance

**Files:**
- Create: `web/tests/v32/phase5-integration.test.js`
- Modify: `.ci/v32-gate.txt`

**Acceptance chain:**
1. Anonymous visitor creates privacy-safe analytics events.
2. Visitor progresses through pricing/demo/account/checkout/subscriber funnel without name inference while anonymous.
3. Identified subscription appears in Founder aggregate after explicit account linkage.
4. Organization with finite seats creates an instructor cohort and learner assignment.
5. Instructor can see only assigned learner.
6. Assigned learner starts an explicitly observed session and receives observation disclosure.
7. Instructor receives ordered frames, disconnects, learner simulation remains unchanged/running, then reconnects and catches up from sequence.
8. Lab-mode instructor injects an authored operational event that is pressure/prerequisite checked and auditable.
9. Analytics attempt carrying `patientId`, note text, or arbitrary clinical free text is rejected.
10. Founder/Admin policy demonstrates that Admin can manage ordinary organization operations but a major pricing change is routed to Founder approval.

- [ ] **Step 1: Write the acceptance test** using only public APIs from Tasks 1–5 plus existing Phase 4/Living Hospital modules.
- [ ] **Step 2: Trigger RED if any final integration seam is missing; implement only the smallest integration correction needed.**
- [ ] **Step 3: Run the complete v3.2 suite twice and preserved v3.1 project/site/production checks through the verification gate.**
- [ ] **Step 4: Set marker to `phase5 founder org instructor acceptance` and require GitHub Actions success.**
- [ ] **Step 5: Re-run Supabase security advisor after the Phase 5 migration.**
- [ ] **Step 6: Commit** `test: verify Phase 5 founder and instructor acceptance`.

## Phase 5 Completion Gate

Phase 5 is complete only when:
- privacy-safe analytics rejects PHI-like/free-text payloads;
- Founder dashboard aggregates subscribers, acquisition, funnel, and learning activity without deanonymizing anonymous visitors;
- Admin cannot mutate Founder/ownership authority;
- organization seats/cohorts/assignments are tenant-scoped;
- live observation is explicit and visible;
- instructor disconnect does not affect learner simulation;
- Simulation Lab injection remains within authored Living Hospital safety/event rules;
- the Phase 5 migration is applied only to `caresyncd-v32-dev` and security advisors show no unresolved cross-tenant vulnerability;
- the full v3.2 verification gate concludes success;
- `main` and `gh-pages` remain unchanged.

After this gate, proceed to Phase 6 integrated preview and final production acceptance.