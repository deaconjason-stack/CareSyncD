# CareSyncD v3.2 Preview Verification Record

**Product:** CareSyncD v3.2 Preview — The Living Hospital  
**Branch:** `v3.2-living-hospital`  
**Preview path:** `https://deaconjason-stack.github.io/CareSyncD/v32-preview/`

## Pinned release identities

- Verified preview source commit: `a0b090d85e34332f4588735b13786e9726566c4f`
- Preview publish commit on `gh-pages`: `10cc91c7812ce238a8fc77a367136bfa540fded9`
- Last known-good v3.1 production / rollback baseline: `af86ff1e6a0839bd505936acb2e4775d54389a5a`

The preview publish commit has the v3.1 production baseline as its direct parent. A GitHub commit comparison between the two shows only files under `v32-preview/` were added. The production root files were unchanged by the preview publication.

## Verification completed before preview publication

- Phase 1 Living Hospital core: green
- Phase 2 six units, career, competency and debrief: green
- Phase 3 local-first persistence/PWA: green
- Phase 4 commercial backend and entitlement security: green
- Phase 5 Founder intelligence, organizations and instructor live mode: green
- Phase 6 integrated shell/runtime/PWA: green
- Phase 6 deterministic whole-system acceptance: green
- Preserved v3.1 tests and production checks: green
- Isolated preview workflow contract: green
- Preview deployment workflow: success

## Representative acceptance chain

The deterministic acceptance test covers:

`ED surge -> Telemetry full -> ICU transfer waiting -> staff call-off -> patient deterioration -> delegated task -> discharge completes -> ICU bed opens -> transfer completes -> debrief/replay reconstructs the chain`

The same fixed seed, initial state and actions reproduce the same final state and debrief evidence.

## Security boundaries verified

- Browser-local state cannot grant premium access without a server-verified entitlement.
- Anonymous analytics reject unapproved free-text/PHI-like properties.
- Instructor observation is disclosed to the learner; there is no hidden-observation mode.
- Instructor disconnect does not stop or mutate the learner simulation.
- Organization instructors are scoped to learners assigned to their cohorts.
- No payment-card data is stored by CareSyncD.
- Service-role and PayPal secret values are not included in the public browser release.
- CareSyncD remains explicitly labeled as educational simulation software, not real-patient diagnosis, monitoring, treatment, or clinical decision support.

## Supabase development environment

CareSyncD v3.2 uses the isolated Supabase development project `caresyncd-v32-dev` (`uwntfyazjkpdvakntsgl`). The commercial schema has Row Level Security enabled. Server-only payment/audit/pricing mutation tables intentionally have no client mutation policies. PayPal webhook code verifies provider signatures server-side before accepting events; live PayPal billing still requires the real PayPal environment credentials/webhook configuration to be verified before it can be considered production billing.

## Rollback procedure

The v3.1 rollback baseline is commit `af86ff1e6a0839bd505936acb2e4775d54389a5a` on `gh-pages`. During preview testing, rollback is not required because root production content remains unchanged. For a future production promotion, the promotion must preserve this SHA (or the then-current last-known-good root SHA) before cutover. If post-promotion smoke tests fail, restore the recorded prior root release immediately rather than repairing a broken live deployment in place.

## Production cutover status

**Not yet authorized.** Preview verification does not authorize replacing the live root. Production promotion requires an explicit final Founder instruction after the security/release audit is green.
