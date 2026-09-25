# CareSyncD v3.2 “The Living Hospital” Program Roadmap

**Status:** Approved architecture roadmap. This file is intentionally non-executable; each phase receives its own TDD implementation plan before code for that phase is changed.

**Spec:** `docs/superpowers/specs/2026-09-24-caresyncd-v3.2-living-hospital-design.md`

**Production rule:** CareSyncD v3.1 remains the live rollback-safe baseline until the final v3.2 acceptance gate passes.

## Why v3.2 is phased

The approved design contains several independently testable subsystems: the Living Hospital simulation core, specialty content/career progression, local persistence/UI, the commercial backend, instructor/organization collaboration, and production integration. Building them as separate phases prevents a failure in billing, sync, or realtime observation from destabilizing the simulation engine or the current production site.

## Phase 1 — Living Hospital Core

Authoritative plan: `docs/superpowers/plans/2026-09-24-caresyncd-v3.2-phase1-core.md`

Deliverables:
- verified v3.1 source materialized into the v3.2 branch
- deterministic hospital clock/world loop
- authored patient trajectories and consequence memory
- staffing and delegation queues
- census, beds, admissions, transfers, discharges
- contextual events and pressure budgets

Gate: all new core tests plus every preserved v3.1 test/check pass; no production deployment changes.

## Phase 2 — Six Units, Career, Competency, Debrief

Deliverables:
- Med-Surg
- Emergency Department
- Telemetry/Step-Down
- ICU
- Pediatrics
- OB
- RN and LPN/LVN configurable scope profiles
- specialty career trees
- leadership progression
- four-domain competency evidence
- evidence-based debrief and shift replay

Gate: each unit passes authored clinical-content tests; XP alone cannot unlock responsibility; replay reconstructs recorded history without rerunning randomness.

## Phase 3 — Local-First Profiles, Offline Persistence, PWA UI

Deliverables:
- schema-v32 IndexedDB storage
- autosnapshots and resume
- backup export/import and migrations
- conflict-safe local/cloud merge semantics
- v3.2 cockpit UI
- career map and competency views
- safe service-worker update behavior

Gate: a shift survives browser close/offline interruption; corrupt imports fail safely; an active simulation is never replaced by a service-worker update.

## Phase 4 — Accounts, Commercial Backend, Pricing, Subscriptions

Deliverables:
- Supabase development project schema and RLS
- account/auth adapter
- Individual, Instructor, Organization/School plans
- monthly/yearly catalog
- editable/versioned pricing
- Founder/Admin pricing approval rules
- PayPal server-side webhook verification
- grandfathering, cancellation, grace period, resubscription
- feature entitlements and 7-day maximum offline entitlement cache

Gate: browser state cannot grant paid access; duplicate/out-of-order PayPal events are idempotent; cross-account reads/writes fail under RLS.

## Phase 5 — Founder Intelligence, Organizations, Instructor Live Mode

Deliverables:
- subscriber dashboard
- anonymous visitor/conversion funnel analytics
- acquisition attribution
- organizations, seats, cohorts, assignments
- Founder/Super Admin vs Admin controls
- audit trail
- transparent live instructor observation
- Simulation Lab event injection

Gate: anonymous visitors remain anonymous until they identify themselves; analytics reject PHI-like/free-text clinical payloads; learner simulation continues if instructor connectivity drops.

## Phase 6 — Integrated Preview, Acceptance, Production Promotion

Deliverables:
- v3.2 preview deployment that cannot overwrite v3.1 production
- whole-system acceptance scenario
- complete client/server test suite
- secret scanning and production checks
- verified production promotion
- rollback record to last known-good v3.1/v3.2 release

Representative acceptance chain:

`ED surge -> Telemetry full -> ICU transfer waiting -> staff call-off -> patient deterioration -> appropriate delegation -> discharge completes -> bed opens -> transfer completes -> debrief reconstructs the chain`

Gate: automated tests and live preview checks all pass before any production promotion.

## Cross-phase constraints

- Educational simulation only; no real-patient diagnosis, monitoring, treatment, or clinical decision support.
- No PHI collection by design.
- No hidden instructor observation.
- No payment-card storage in CareSyncD.
- PayPal first, provider-adapter architecture for future payment methods.
- Founder approval required for base-price changes of 10% or more and promotions/discounts greater than 25%.
- Existing subscribers are grandfathered by default.
- Failed-payment grace defaults to 3 days.
- Cached premium offline entitlement defaults to a maximum of 7 days.
- Secrets and service-role credentials never ship in the public frontend.
