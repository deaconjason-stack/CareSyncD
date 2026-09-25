# CareSyncD v3.2 — “The Living Hospital” Design Specification

Date: 2026-09-24
Status: Approved design baseline
Production baseline: CareSyncD v3.1 (protected; no changes during v3.2 development)
Development branch: `v3.2-living-hospital`

## 1. Product intent

CareSyncD v3.2 evolves the existing educational clinical simulator into a persistent, interconnected hospital career simulation. The goal is for the learner to feel that the hospital continues to operate around them: patients change, census shifts, staff availability changes, orders and labs return, transfers stall or complete, call lights and family needs appear, and decisions can affect later events in the same shift.

CareSyncD remains educational simulation software. It is not for real-patient diagnosis, monitoring, treatment, or clinical decision support. Simulated patient data are fictional, and the platform must discourage entry of PHI.

The product must also support a sustainable paid business model with monthly/yearly subscriptions, subscriber visibility, visitor/conversion analytics, instructor and organization plans, and a secure Founder/Admin command center.

## 2. Core architectural decision

Use Approach 2: build a new Living Hospital Core beside the existing v3.1 engines instead of rewriting them.

The v3.1 production build remains the rollback-safe baseline. v3.2 is developed and tested independently, then promoted only after acceptance criteria are met.

### 2.1 Logical architecture

Living Hospital Core
- Hospital Clock
- Unit Manager
- Census / Admission / Transfer / Discharge Manager
- Staffing & Delegation Engine
- Patient Trajectory Manager
- Dynamic Event & Consequence Engine
- Career & Competency Engine
- Pressure / Surge Manager
- Subscription / Entitlement Client
- Analytics Event Client

Existing v3.1 systems reused where appropriate
- Clinical Simulation Engine
- Shift Engine patterns
- Scoring Engine
- Event Bus
- Persistence Adapter
- Debrief logic
- PWA shell / offline support

Cloud-backed services added behind adapters
- Authentication
- Subscription status and plan entitlements
- Pricing catalog
- Founder/Admin permissions
- Organizations, cohorts, instructors, seats
- Optional cloud backup/sync
- Visitor and conversion analytics
- Audit trail
- PayPal webhook verification

## 3. Living Hospital world model

The hospital is a continuous simulated world, not a sequence of isolated scenarios.

Each simulation tick executes in this order:
1. Advance simulated time.
2. Update patient trajectories.
3. Update hospital operations and staffing.
4. Evaluate eligible events.
5. Resolve consequences from prior learner and system actions.
6. Record timeline evidence and autosave state.

The world does not pause when the learner views another patient. Missed or delayed actions may affect later state, but every clinical change must come from an authored trajectory or validated rule rather than arbitrary randomness.

### 3.1 Difficulty behavior

Guided
- forgiving timing windows
- proactive warnings before major misses
- lower concurrency of disruptions
- in-the-moment teaching interventions

Standard
- realistic compressed workflow
- moderate competing demands
- limited prompting

Challenge
- tighter timing windows
- higher census variability
- overlapping operational pressure
- fewer hints
- consequences unfold before debrief

## 4. Hospital units

Initial v3.2 scope includes six connected units:
- Med-Surg
- Emergency Department
- Telemetry / Step-Down
- ICU
- Pediatrics
- OB

Each unit has specialty-specific workflows, patient archetypes, staffing assumptions, event libraries, trajectory rules, competency expectations, and escalation pathways.

### 4.1 Unit principles

Med-Surg
- admissions/discharges
- medication timing
- falls/wounds/pain/post-op care
- broad prioritization and delegation

Telemetry / Step-Down
- rhythm and monitoring concepts
- higher-acuity reassessment
- escalation thresholds
- transfer readiness

ICU
- lower census, higher complexity
- unstable physiology
- advanced monitoring concepts
- rapid change and disposition decisions

Emergency Department
- variable arrivals and triage
- diagnostics and uncertain disposition
- surge behavior
- boarding / bed pressure

Pediatrics
- age-dependent vital ranges and communication
- caregiver involvement
- pediatric deterioration patterns
- pediatric-specific safety rules

OB
- maternal assessment
- fetal-status simulation concepts
- labor/postpartum workflow
- specialized escalation
- newborn transition concepts

## 5. Transfers and cross-unit movement

The hospital is connected, but the learner does not freely roam at all times.

Default: one assigned unit per shift.
Cross-unit movement can occur when justified by:
- patient transfer
- float assignment
- rapid response / Code Blue
- staffing emergency
- house-supervisor responsibilities
- explicit instructor lab event

Transfers require readiness and operational conditions, including receiving capacity, bed availability, staffing, handoff completion, and transport availability.

## 6. Dynamic census and shift formats

Census behavior depends on mode.

Guided can use controlled/fixed assignments.
Standard and Challenge can use dynamic census driven by admissions, discharges, transfers, deterioration, staffing, and bed pressure.

Supported shift formats:
- Training Shift: 15–30 minute focused sessions
- Career Shift: compressed 8- or 12-hour shifts
- Event Shift: high-intensity focused events such as rapid response, Code Blue, surge, staffing crisis, or specialty events

All formats share the same Living Hospital Core.

## 7. Patient trajectories and consequence memory

Patients carry evolving state including:
- current condition and risk level
- symptoms and vitals
- pending labs/diagnostics/orders
- interventions completed
- missed or delayed care
- unresolved concerns
- communication history
- response to prior actions
- disposition readiness

The core model is:

Decision -> state change -> downstream consequence -> debrief evidence

Patient trajectories may branch into improving, delayed-recognition, or critical-deterioration pathways when clinically appropriate. No single simulated decision may be presented as guaranteeing a real-world outcome.

Nonclinical state is also remembered, including:
- family concerns
- pending callbacks
- delegated tasks
- discharge teaching
- transport requests
- fall-risk items
- unresolved handoff items

## 8. Staffing, workload, and delegation

Each unit maintains live staffing state. Supported roles may include:
- RN
- LPN/LVN
- CNA/PCT
- Charge Nurse
- Respiratory Therapy
- Provider/APP
- Transport
- Unit Clerk
- specialty support relevant to OB/Pediatrics

Delegation is not instant completion. It follows:
Delegate -> accept/decline/delay -> workload queue -> completion/follow-up

Delegation logic considers:
- role and scope configuration
- task type
- urgency
- current workload
- staff availability
- learner follow-up

Staff can call off, go on break, be reassigned, float in/out, become occupied in an emergency, or return later.

## 9. RN and LPN/LVN career paths

RN and LPN/LVN are distinct career paths rather than one generic nurse role.

Scope is configurable by jurisdiction/facility profile. The simulator must not hard-code one universal scope-of-practice rule.

Scope configuration influences:
- delegation options
- allowed responsibilities
- escalation requirements
- competency expectations
- role-specific teaching feedback

## 10. Career progression

Career advancement is competency-gated, not XP-only.

Four competency domains:
1. Clinical Judgment
2. Operations
3. Communication
4. Leadership

Progression requires both:
- minimum performance thresholds
- demonstrated required competencies

XP remains motivational and may drive badges/milestones, but responsibility unlocks are based on competency evidence.

### 10.1 Specialty career trees

Learners choose a starting unit and may deepen or cross-train.

Examples:
- Med-Surg -> Telemetry / Step-Down -> ICU
- ED -> Trauma / High-Acuity ED -> Critical Care
- Telemetry -> ICU -> Advanced Critical Care
- Pediatrics specialty tree
- OB specialty tree

### 10.2 Leadership tree

Bedside Nurse -> Senior/Lead Nurse -> Charge Nurse -> House Supervisor -> Clinical Leader

Higher roles change gameplay by adding staffing, resource allocation, unit flow, and multi-unit responsibility.

## 11. Events, interruptions, and pressure budgets

Events exist at three levels:

Patient-level
- symptoms
- abnormal labs
- pain changes
- family concerns
- delayed response to treatment
- new orders

Unit-level
- call-offs
- admissions
- multiple discharges
- transport delay
- equipment availability
- staffing imbalance

Hospital-level
- ED surge
- bed shortage
- ICU capacity problem
- multiple emergencies
- severe-weather staffing pressure
- system downtime simulation

The engine uses pressure budgets to avoid unfair/random stacking. Guided uses low concurrency. Challenge may overlap events within authored safety limits.

Events must be context-aware and must not fire merely because of timers when the current hospital state makes them nonsensical.

## 12. Debrief and evidence model

Debrief is an evidence reconstruction, not just a score.

Each shift records a timeline of:
- findings
- learner actions
- delegated tasks
- escalations
- staffing changes
- unit events
- patient state changes
- timing windows
- instructor notes (when applicable)

Results are organized by the four competency domains.

Evidence examples should show specific timestamps and actions, e.g. recognition, escalation, reassessment, delegation, missed follow-up, and downstream effects.

A Shift Replay view should allow timeline scrubbing through hospital state changes.

CareSyncD-issued completion certificates and competency reports must be described only as CareSyncD educational records unless external accreditation/recognition is formally obtained.

## 13. Instructor and organization experience

Instructor plan supports:
- cohorts
- learner invitations
- assignments
- due dates
- difficulty selection
- required units/competencies
- debrief review
- cohort analytics
- downloadable results

Organization/School plan adds:
- multiple instructors
- seat management
- organization-wide cohorts
- aggregate reporting
- institution-level admin controls

Instructors may only access assigned learners or organization-scoped data.

## 14. Live instructor observation

Optional live observation is allowed only for explicitly enabled instructor-assigned sessions.

Learner must see a clear “Instructor Observation Active” indicator.

Instructor view may show:
- current unit/patient assignment
- simulation clock
- active/overdue tasks
- learner actions
- patient state changes
- staffing pressure
- escalation events
- running timeline

Instructor may add private timestamped notes.

A separate Simulation Lab mode may allow instructor event injection (new admission, call-off, abnormal lab, rapid response, census increase). Injected events must be recorded in the timeline.

No hidden observation.

If connectivity fails, learner simulation continues locally and instructor reconnects/catches up later.

## 15. Local-first persistence and optional cloud sync

Core simulation remains local-first and offline-capable.

Local profile data includes:
- career path
- role/rank
- competencies
- XP/badges
- completed shifts
- debrief history
- specialty unlocks
- active/resumable shift

Requirements:
- frequent autosnapshots
- resume last shift
- export/import backup
- versioned save migrations
- sync conflict detection

Cloud sync is optional and must not be required to run the simulation after valid access has been established.

## 16. Commercial model

CareSyncD v3.2 is a paid subscription product.

Plans:
- Individual
- Instructor
- Organization/School

Billing cadences:
- monthly
- yearly

Free access model:
- limited demo
- one selected clinical mission
- one short Training Shift
- limited Med-Surg experience
- sample debrief
- career-map preview
- demo profile/competency preview

Premium plans unlock full Living Hospital content and plan-specific features.

## 17. Pricing catalog

Pricing is editable from Founder/Admin controls without code changes.

Pricing catalog supports:
- monthly/yearly prices
- plan activation/deactivation
- public/hidden plans
- promotions/discounts
- feature entitlements
- effective dates
- versioned price records

Existing subscribers are grandfathered by default.

A later migration may move subscribers to a new price only through an intentional approved action and required notice.

## 18. Founder/Admin authority

Founder / Super Admin
- full control
- cannot be removed by ordinary admins
- can approve major pricing changes
- can manage admins, plans, organizations, entitlements, analytics, billing configuration, exports, integrations, and ownership-level settings

Admin (Domonique)
- can manage subscribers, instructors, organizations, promotions, ordinary pricing changes, learning content, support, and reports
- cannot remove/demote Founder or transfer ownership

Major pricing changes require Founder approval.

Automatic major-change triggers include:
- base-price change of 10% or more
- removing grandfathering
- material entitlement movement between plans
- material organization pricing model change
- a promotion or discount greater than 25%
- removal of a billing cadence

All admin changes are auditable.

## 19. Subscription lifecycle

States:
- Anonymous
- Registered Demo User
- Active Subscriber
- Payment Issue / Grace Period
- Canceled (active until paid-through date)
- Expired
- Resubscribed
- Grandfathered

Default failed-payment grace period: 3 days, configurable by Founder.

Account history is preserved after cancellation/expiration.

If entitlement changes mid-shift, the current shift finishes before premium access is restricted.

Organization seat loss must not delete personal learning history.

## 20. Payments

PayPal is the initial payment provider. The design must allow additional card/payment providers later through a provider adapter.

Rules:
- browser checkout result alone cannot grant access
- server verifies PayPal webhook events
- duplicate events are idempotent
- plan/subscription IDs remain server-side
- no payment-card storage in CareSyncD

## 21. Subscriber and visitor intelligence

Founder dashboard provides:

Subscriber visibility
- name/email for identified users
- plan and cadence
- active/canceled/expired/grace status
- start/renewal dates
- last activity
- units/shifts used
- acquisition source

Anonymous analytics
- unique/returning visitors
- pages viewed
- referral source
- device/browser
- approximate region
- pricing views
- demo starts
- account creation
- checkout starts
- verified subscriptions

No attempt is made to identify anonymous visitors by real name until they identify themselves through an account or other explicit mechanism.

Conversion funnel:
Visitor -> Demo -> Account -> Checkout -> Subscriber -> Active Learner -> Renewal

Analytics must exclude simulated patient details and any PHI.

## 22. Backend architecture

The PWA remains browser-first and local-first.

Secure backend handles:
- authentication
- account identities
- subscription status
- entitlements
- pricing catalog
- organizations/cohorts
- cloud backups/sync
- analytics identity/events
- admin permissions
- audit history
- PayPal webhook verification

Initial backend: Supabase, isolated behind repository adapters so the simulation and business-domain layers do not depend directly on vendor-specific APIs. This preserves a future migration path without redesigning the Living Hospital engine.

Secrets, Founder privileges, PayPal credentials, and admin-only logic must never be shipped in the public GitHub frontend.

## 23. Offline entitlement behavior

After successful authentication/entitlement validation, premium simulation may continue offline using cached entitlement state for a default maximum of 7 days. The Founder may shorten this window later through configuration, but extending it beyond 7 days requires an explicit future design decision.

On reconnect:
- progress syncs
- entitlement is revalidated
- conflicts are resolved without blind overwrites

Backend outage must not abruptly terminate an active shift.

## 24. Security and privacy

Requirements:
- MFA-ready admin accounts
- secure session handling
- sensitive-area session expiration
- rate limiting and abuse protection
- least-privilege role access
- audit logging
- secure server-side payment verification
- no PHI collection by design
- privacy export/delete workflows
- separation of billing, account, learning, and simulation data

## 25. Testing strategy

The Living Hospital engine must be deterministic under a fixed seed, initial state, and action sequence.

Automated coverage must include:
- hospital clock
- patient trajectories
- consequence memory
- admissions/transfers/discharges
- staffing and delegation
- dynamic census
- pressure budgets
- all six units
- career progression
- competency gates
- RN/LPN scope profiles
- debrief evidence reconstruction
- persistence/resume
- save migrations
- offline behavior
- sync conflicts
- entitlements
- subscription lifecycle
- pricing versioning/grandfathering
- PayPal webhook idempotency
- Founder/Admin permissions
- instructor/live-observation permissions
- analytics funnel events

Clinical-content tests must validate authored pathways for Pediatrics, OB, ICU, medications, and other high-acuity content.

## 26. Acceptance scenario

A representative end-to-end acceptance test should prove the system can handle a connected event chain such as:

ED surge -> Telemetry has no beds -> ICU transfer pending -> staff call-off -> patient deteriorates -> learner delegates -> discharge completes -> bed opens -> transfer completes -> debrief accurately reconstructs the chain.

## 27. Rollout

Staged deployment:

v3.1 Live
-> v3.2 Development
-> v3.2 Preview
-> Acceptance Testing
-> Production

Production promotion requires passing automated tests and acceptance scenarios.

Rollback must remain possible to the last known-good v3.1 or v3.2 release.

## 28. Non-goals for initial v3.2 release

Unless separately approved later, initial v3.2 does not include:
- real patient integrations
- EHR connectivity
- FDA-regulated clinical decision support claims
- accredited CE claims
- licensure claims
- hidden instructor monitoring
- storing payment-card data
- universal hard-coded RN/LPN scope rules

## 29. Success criteria

v3.2 succeeds when:
1. The hospital continues to evolve while the learner focuses elsewhere.
2. Events remain clinically authored and operationally coherent.
3. Six units behave distinctly but share one hospital world.
4. Career progression changes gameplay and is competency-gated.
5. Learners can complete and resume shifts offline.
6. Instructor/organization workflows are scoped and auditable.
7. Paid access is enforced server-side while progress remains learner-owned.
8. Founder/Admin can see subscribers, plans, pricing, visitor funnels, and usage clearly.
9. Major pricing changes follow approval rules.
10. v3.1 remains protected until v3.2 is proven ready for production.
