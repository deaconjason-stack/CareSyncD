# CareSyncD v3.2 Phase 6 — Integrated Preview, Acceptance, and Production Promotion

> **Execution rule:** implement test-first on `v3.2-living-hospital`. Keep `main` and the live GitHub Pages root untouched until the preview and final acceptance gates pass.

**Goal:** Integrate the already-green v3.2 Living Hospital, commercial, Founder intelligence, organization, and instructor systems into a browser-visible v3.2 preview; verify the whole platform end-to-end; preserve a concrete rollback record; and only then promote v3.2 to production.

**Architecture:** Keep the existing v3.1 clinical mission/shift UI available while adding a v3.2 shell beside it. The preview is published under a dedicated `v32-preview/` subdirectory on `gh-pages`, so the live root remains the v3.1 rollback-safe baseline. New v3.2 UI uses the existing pure domain/view-model modules and never embeds service-role or PayPal secrets.

**Spec:** `docs/superpowers/specs/2026-09-24-caresyncd-v3.2-living-hospital-design.md`

## Global constraints

- Work only on `v3.2-living-hospital` until explicit production promotion.
- Educational simulation only; no real-patient diagnosis, monitoring, treatment, or clinical decision support.
- No PHI collection by design.
- Preserve all v3.1 missions/shifts and their tests.
- The preview must visibly identify itself as `CareSyncD v3.2 Preview — The Living Hospital`.
- The six v3.2 units must be discoverable in the browser UI.
- Founder/organization/instructor surfaces must not fabricate customer data; empty/dev states are acceptable until authenticated backend data exist.
- Browser code may use only publishable backend configuration. Service-role, PayPal client-secret, webhook-secret-like, or Founder authority secrets are forbidden in `web/`.
- Production root promotion is a separate final step after preview verification and rollback capture.

---

### Task 1: Integrated v3.2 browser shell

**Files:**
- Create: `web/src/app/v32-shell.js`
- Create: `web/tests/v32/v32-preview-shell.test.js`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`

**Required browser-visible routes/surfaces:**
- Living Hospital
- Career
- Founder Command Center
- Organizations
- Instructor Live
- existing Missions/Shifts/Progress/Debriefs/Settings

**Rules:**
- `Living Hospital` lists all six unit definitions from `unit-catalog.js` rather than duplicating unit metadata.
- `Career` consumes `buildCareerMapModel()`.
- `Founder Command Center` consumes `buildFounderDashboardModel()` with truthful empty/dev state unless backend data are supplied.
- Instructor page describes transparent observation and Simulation Lab; no hidden-observation language.
- Existing v3.1 mission and shift start flows remain intact.
- Every new surface keeps the educational-simulation safety notice visible.

- [ ] Write `v32-preview-shell.test.js` first and trigger `RED tests/v32/v32-preview-shell.test.js`.
- [ ] Implement the smallest shell/router integration that makes the test pass.
- [ ] Run the complete v3.2 gate and preserved v3.1 checks.
- [ ] Commit `feat: integrate v3.2 preview shell`.

### Task 2: Preview runtime and truthful data boundaries

**Files:**
- Create: `web/src/app/v32-preview-runtime.js`
- Create: `web/tests/v32/v32-preview-runtime.test.js`

**Runtime responsibilities:**
- expose six-unit catalog
- expose career map and competency summaries
- expose safe Founder empty/dev model
- expose organization/instructor capability status
- expose backend connection status without inventing subscribers or revenue
- never grant premium from browser-local flags

**Rules:**
- Commercial access must continue to flow through verified entitlement semantics from Phase 4.
- No subscriber names/emails are generated for preview/demo data.
- Backend unavailable/offline state does not stop local simulation.

- [ ] Write failing runtime tests.
- [ ] Trigger RED.
- [ ] Implement runtime composition only from existing public modules.
- [ ] Confirm GREEN.
- [ ] Commit `feat: add v3.2 preview runtime`.

### Task 3: v3.2 PWA cache and release identity

**Files:**
- Modify: `web/service-worker.js`
- Modify: `web/manifest.webmanifest`
- Modify: `web/package.json`
- Create: `web/tests/v32/v32-pwa-release.test.js`

**Rules:**
- release identity becomes v3.2 preview without misrepresenting accreditation or clinical use
- service worker uses a v3.2-specific cache key
- required v3.2 browser modules are cached/offline reachable
- active-shift update deferral remains controlled by existing update coordinator/app behavior
- no backend secrets are precached or embedded

- [ ] Write RED static/offline tests.
- [ ] Update release identity and cache manifest.
- [ ] Confirm complete gate GREEN.
- [ ] Commit `feat: prepare v3.2 preview PWA`.

### Task 4: Whole-system deterministic acceptance

**Files:**
- Create: `web/tests/v32/phase6-integration.test.js`

**Required representative chain:**
`ED surge -> Telemetry full -> ICU transfer waiting -> staff call-off -> patient deterioration -> learner delegates -> discharge completes -> bed opens -> transfer completes -> debrief reconstructs the chain`

**Also verify:**
- deterministic replay under fixed seed/state/actions
- competency evidence survives debrief/replay
- subscription entitlement cannot be browser-forged
- organization/instructor scope remains intact
- instructor disconnect does not alter learner world
- analytics rejects PHI-like/free-text fields
- six units and career trees are still available after integration

- [ ] Write acceptance test against public APIs.
- [ ] Trigger RED if an integration seam is missing.
- [ ] Implement only required integration glue.
- [ ] Run complete v3.2 suite twice plus all preserved project/site/production checks.
- [ ] Commit `test: verify Phase 6 whole-system acceptance`.

### Task 5: Isolated GitHub Pages preview deployment

**Files:**
- Create: `.github/workflows/v32-preview.yml`
- Create: `web/tests/v32/v32-preview-workflow.test.js`

**Deployment rule:**
- publish only to `gh-pages:/v32-preview/`
- do not replace/remove root files
- preview URL target: `https://deaconjason-stack.github.io/CareSyncD/v32-preview/`

**Workflow requirements:**
- branch restricted to `v3.2-living-hospital`
- run full v3.2 test/check gate before publication
- copy `web/` release surface into `v32-preview/` only
- preserve `.git` and all root production content
- fail if target path resolves to repository root

- [ ] Write RED workflow contract test.
- [ ] Add safe preview workflow.
- [ ] Confirm GREEN.
- [ ] Publish preview and verify returned HTTP/browser-visible identity.
- [ ] Commit `ci: add isolated v3.2 preview deployment`.

### Task 6: Security and release audit

**Files:**
- Create: `web/tests/v32/release-security.test.js`
- Create: `docs/releases/caresyncd-v3.2-preview-verification.md`

**Audit:**
- static scan `web/` for service-role/PayPal secret patterns
- confirm Supabase RLS/security advisor has no unresolved cross-tenant vulnerability
- confirm `main` and production `gh-pages` root remain unchanged during preview
- verify preview online and offline shell behavior
- verify production safety language
- record exact preview commit SHA and current v3.1 production/rollback SHA(s)

- [ ] Write audit test.
- [ ] Run full gate twice.
- [ ] Run Supabase security/performance advisors.
- [ ] Record verification/rollback evidence.
- [ ] Commit `docs: record v3.2 preview verification`.

### Task 7: Production promotion (separate live cutover)

**Files:**
- Create/modify promotion workflow only after Tasks 1–6 pass.
- Create: `docs/releases/caresyncd-v3.2-production-promotion.md`

**Promotion gate:**
- preview is green and reachable
- exact preview commit is recorded
- last known-good v3.1 `gh-pages` SHA is recorded
- rollback instructions are tested/documented
- no unresolved security finding
- production promotion requires an explicit final Founder cutover instruction

**Promotion behavior:**
- promote the exact verified v3.2 preview content, not a moving branch head
- preserve or tag the previous production SHA for immediate rollback
- run smoke checks after deployment
- if smoke check fails, restore the recorded previous production SHA/content

## Phase 6 completion gate

Phase 6 development/preview is complete when Tasks 1–6 pass and the isolated preview is verified. Production is complete only after Task 7 is explicitly authorized and the post-promotion smoke checks pass.
