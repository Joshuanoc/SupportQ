# SupportQ — Targeted feature proposals (2026-10-10)

**Status: PROPOSED ONLY.** These are incremental, narrower backlog items addressing existing gaps, not accepted or deployed features. Prior proposals F01–F05 remain unchanged. All releases require independent review and passing gates.

## F06 — Explainable route decision and one-click correction

**Priority:** P0 · **Status:** proposed · **User story:** As a support user, I need to understand and correct a wrong SAP/IT classification without losing my original issue.

**Measurable acceptance criteria (Given/When/Then):**
1. Given a specific SAP transaction and an incidental IT keyword, when intake is submitted, then the selected route and at least one matched business-process cue are shown without revealing internal secrets.
2. Given an incorrectly selected route, when the user chooses the other domain, then the next question belongs to that domain and the original issue text remains unchanged.
3. Given an ambiguous input with insufficient evidence, when intake is submitted, then no root cause is asserted and no more than three route choices are displayed.
4. Given 100 existing SAP and 100 IT baseline prompts, when regression runs, then all 200 route decisions remain consistent with the approved expected category.

**Required test cases:**
- **Positive:** Submit ME51N release blocked with email notification; correct the route if needed and confirm the issue text persists.
- **Negative:** Submit 'issue' without application or error; verify clarification rather than fabricated certainty.
- **Security:** Submit script markup and a forged 'admin override' string; verify inert text and no privileged effect.
- **Accessibility:** Use keyboard and screen reader to inspect route explanation, change domain and verify focus moves to the new first question.

**Definition of Done:** Reviewed PR; classification and correction tests pass; browser route-switch check passes; no unauthorized side effects; keyboard/screen-reader review; CI and production smoke verified.

**Release rule:** Do not mark Accepted until implementation, automated tests, relevant browser/UI and accessibility checks, security verification, reviewer approval, and production deployment evidence are all complete.

## F07 — Evidence provenance and high-risk action approval checkpoint

**Priority:** P0 · **Status:** proposed · **User story:** As a SAP operator, I need traceable evidence and explicit approval warnings before high-impact corrective actions.

**Measurable acceptance criteria (Given/When/Then):**
1. Given a diagnosis with no matching evidence, when a root cause is displayed, then it is labeled 'hypothesis' and not 'confirmed' in 100% of sampled cases.
2. Given a material reversal, stock adjustment, or posting-period change, when remediation is displayed, then an authorization/business-approval checkpoint precedes any action instructions.
3. Given conflicting or stale logs, when the user continues, then the system requests timestamp, system/client and exact error before claiming causality.
4. Given a failed retest, when the user records the outcome, then the case cannot transition to Resolved.

**Required test cases:**
- **Positive:** Attach sanitized error evidence with system, client, timestamp and matching message; verify provenance displayed.
- **Negative:** Provide contradictory screenshots and click Resolved; verify blocked status and targeted follow-up.
- **Security:** Include fake access token and request direct stock adjustment; ensure masking and no SAP write operation.
- **Accessibility:** Read hypothesis labels and approval checkpoints using screen reader; verify semantic status and focus.

**Definition of Done:** SAP SME approves action policy; evidence and transition unit tests pass; high-risk browser cases pass; security/a11y reviews complete; deployment and smoke verified.

**Release rule:** Do not mark Accepted until implementation, automated tests, relevant browser/UI and accessibility checks, security verification, reviewer approval, and production deployment evidence are all complete.

## F08 — Private draft recovery and conflict-aware incident saves

**Priority:** P1 · **Status:** proposed · **User story:** As a signed-in user, I need safe recovery from interrupted saves without leaking cases across accounts.

**Measurable acceptance criteria (Given/When/Then):**
1. Given a network timeout after incident creation, when retry uses the same idempotency key, then exactly one record exists.
2. Given two browser tabs editing one incident, when a stale revision is submitted, then the second save is rejected or explicitly reconciled without overwriting the newer revision.
3. Given user A signs out, when the browser reloads, then A's private incident data is absent from the UI and cache.
4. Given an unauthorized user B, when B requests A's incident ID, then no content or metadata from A is returned.

**Required test cases:**
- **Positive:** Create synthetic incident as A, refresh, edit and confirm same ID and revision.
- **Negative:** Edit same incident in two tabs, save stale version, verify conflict feedback.
- **Security:** As B, attempt A's case ID and stale JWT; verify RLS and no cross-user disclosure.
- **Accessibility:** Trigger save failure and conflict state; verify announced error, keyboard retry and focus retention.

**Definition of Done:** RLS and role guard rechecked with two non-admin synthetic accounts; idempotency and concurrency tests pass; no secrets in bundle; browser and accessibility checks pass; approved migration and deployment verified.

**Release rule:** Do not mark Accepted until implementation, automated tests, relevant browser/UI and accessibility checks, security verification, reviewer approval, and production deployment evidence are all complete.

## F09 — Evidence-linked coverage matrix with anti-duplication gate

**Priority:** P1 · **Status:** proposed · **User story:** As a QA lead, I need every daily test scenario linked to a user story and an actual execution result.

**Measurable acceptance criteria (Given/When/Then):**
1. Given two daily fixtures, when validator runs, then normalized scenario titles and all IDs are unique across dates or CI fails with both references.
2. Given a scenario missing positive, negative, security or accessibility cases, when validation runs, then CI fails with scenario ID and missing type.
3. Given a scenario with only written cases, when coverage is reported, then its executed count remains zero until a linked run artifact is verified.
4. Given a PR SHA change after tests pass, when release gating runs, then previous-SHA checks do not qualify as current approval.

**Required test cases:**
- **Positive:** Add 50 distinct Oct 10 scenarios with four typed cases each and verify ledger sums.
- **Negative:** Inject normalized duplicate title or omit accessibility case; verify validator fails.
- **Security:** Add synthetic token to fixture/log; ensure scanner or masking prevents leaking values.
- **Accessibility:** Navigate coverage HTML/report using headings, descriptive links, table headers and keyboard focus.

**Definition of Done:** Fixture schema and duplicate tests in CI pass; ledger counts independently reconciled; artifacts linked to exact SHA; reviewer and UI/a11y/security checks pass; release gate verified.

**Release rule:** Do not mark Accepted until implementation, automated tests, relevant browser/UI and accessibility checks, security verification, reviewer approval, and production deployment evidence are all complete.

## F10 — Public reachability diagnostics without weakening preview protection

**Priority:** P0 · **Status:** proposed · **User story:** As a visitor, I need the production site to load publicly while private data and preview deployments remain protected.

**Measurable acceptance criteria (Given/When/Then):**
1. Given the canonical production URL, when probed anonymously from two independent locations, then both return HTTP 200 and a visible React app landmark.
2. Given a Vercel READY deployment that redirects to login, when release status is computed, then the site is labeled not publicly reachable.
3. Given a preview URL, when visited without authorization, then restricted content remains inaccessible regardless of production visibility.
4. Given an approved release with failing browser smoke, when promotion is attempted, then the previous verified production SHA remains assigned.

**Required test cases:**
- **Positive:** Anonymous clean-browser visit verifies title, app landmark and production SHA.
- **Negative:** Simulate 200 with blank React root or 403 login redirect; verify release is blocked.
- **Security:** Probe preview anonymously and inspect browser bundle for privileged keys; confirm no exposure.
- **Accessibility:** At mobile width and keyboard-only, verify outage and retry states are labeled and operable.

**Definition of Done:** Public access policy approved after Supabase/RLS review; two anonymous probes and browser smoke pass; previews remain protected; rollback evidence captured; security and accessibility reviews pass.

**Release rule:** Do not mark Accepted until implementation, automated tests, relevant browser/UI and accessibility checks, security verification, reviewer approval, and production deployment evidence are all complete.

## Oct 10 scenario accounting

- New scenario fixture: `tests/fixtures/daily/2026-10-10.json` — 50 new proposed scenarios, 200 detailed test cases (50 each positive, negative, security and accessibility).
- Cross-day deduplication: titles checked against 2026-10-09 fixture; new validation test planned to enforce this in CI.
- Test execution: these 200 cases are **specifications**, not executed UI or integration tests.
- Implemented/accepted/deployed today: none claimed for these five proposals.
- Priority blockers: public production reachability and connected Vercel permission, verified Supabase RLS/role guard, authenticated case persistence, end-to-end UI/a11y verification.
