# SupportQ — October 12, 2026 feature proposals

> Proposed only. No feature below is implemented, accepted or deployed by this document. Avoid duplicating F01–F10 from Oct 9–10.

## F11 — Reviewer-only solution verification with audit trail

**Priority:** P0 · **Status:** Proposed · **User story:** As a solution reviewer, I need verification decisions to be independent of the author so that unreviewed advice cannot appear trusted.

**Measurable acceptance criteria (Given/When/Then):**

1. Given an ordinary issue author, when a solution is created with is_verified=true, then the request is denied or stored unverified and an audit event is recorded.
2. Given an author edits or deletes a verified solution, when the request reaches Supabase, then the operation is rejected by RLS and column grants.
3. Given an authorized reviewer approves a solution, when the privileged server workflow completes, then reviewer identity, UTC timestamp and before/after state are recorded exactly once.
4. Given a reviewer loses reviewer authorization, when they retry an approval, then the operation fails even with an old client-side role label.

**Required test cases:**

- **Positive:** Reviewer approves one eligible solution; status and audit event match.
- **Negative:** Author sends is_verified=true and attempts to delete verified solution; both rejected.
- **Security:** Two non-admin JWTs and a revoked reviewer token cannot bypass column grants, RLS or RPC checks.
- **Accessibility:** Keyboard-only reviewer can inspect evidence, approve and hear an announced status change.

**Definition of Done:** Independent policy review; disposable Supabase branch with two users and reviewer test; migrations and audit tests in CI; accessibility/UI sign-off; production change approval and verified post-deploy checks.

**Release rule:** Accepted requires passing automated and browser tests, accessibility and security review, reviewer sign-off, and verified deployment. Proposed does not imply implementation.

## F12 — Effective privilege drift guard for Supabase releases

**Priority:** P0 · **Status:** Proposed · **User story:** As a security owner, I need a machine-checkable privilege baseline before every schema promotion.

**Measurable acceptance criteria (Given/When/Then):**

1. Given the four exposed SupportQ tables, when a staging validation runs, then anon/authenticated have zero effective TRUNCATE, TRIGGER or REFERENCES privileges.
2. Given solutions sensitive columns, when effective has_column_privilege is checked, then unauthorized UPDATE returns false for is_verified, created_by, issue_id, id and created_at.
3. Given an inherited grant through PUBLIC, when the checker runs, then it fails even if information_schema direct grants appear empty.
4. Given a failing grant check, when release status is computed, then production promotion is blocked and the exact table/role/privilege is reported without secrets.

**Required test cases:**

- **Positive:** Staging least-privilege baseline passes effective checks.
- **Negative:** Synthetic PUBLIC inherited grant makes checker fail.
- **Security:** Run tests as anon and authenticated plus distinct users, never service_role for negative authorization assertions.
- **Accessibility:** Security gate report exposes descriptive role/table headers and keyboard-accessible remediation links.

**Definition of Done:** Reviewed SQL migration and read-only effective-grant assertions; staging policy tests; CI integration with current commit SHA; security review; approved deployment and post-deploy baseline.

**Release rule:** Accepted requires passing automated and browser tests, accessibility and security review, reviewer sign-off, and verified deployment. Proposed does not imply implementation.

## F13 — SAP error-signature parser with confidence thresholds

**Priority:** P1 · **Status:** Proposed · **User story:** As an SAP support user, I need the system to identify exact message class and transaction before proposing changes.

**Measurable acceptance criteria (Given/When/Then):**

1. Given M7 021, when submitted with MIGO and plant, then the engine preserves the exact code and requests missing document context rather than guessing stock.
2. Given a partial or mistyped message, when no safe match exists, then the result says unconfirmed and asks for the exact long text.
3. Given IT HTTP 403 without SAP context, when classified, then it routes IT access rather than SAP FI/MM.
4. Given high-risk stock or period change guidance, when shown, then approval and sandbox verification warnings precede any transaction steps.

**Required test cases:**

- **Positive:** MIGO M7 021 retains code and asks plant/storage location.
- **Negative:** Generic error 021 without SAP cues does not invent SAP message class.
- **Security:** Prompt-injection payload in pasted SAP long text cannot trigger a privileged write or leak credentials.
- **Accessibility:** Screen reader announces classification confidence and next required evidence.

**Definition of Done:** SAP SME validates message map and safe next steps; routing unit tests, UI/a11y checks and security review pass; release evidence linked to deployed SHA.

**Release rule:** Accepted requires passing automated and browser tests, accessibility and security review, reviewer sign-off, and verified deployment. Proposed does not imply implementation.

## F14 — Privacy-safe auth and API telemetry coverage

**Priority:** P1 · **Status:** Proposed · **User story:** As a SupportQ operator, I need useful auth/API event coverage without retaining credentials or user incident contents.

**Measurable acceptance criteria (Given/When/Then):**

1. Given a synthetic failed login, when observed in staging, then a timestamped aggregate event is available without password, token or raw incident body.
2. Given a burst of authorization denials, when threshold is crossed, then one deduplicated alert includes environment, count and correlation ID.
3. Given no auth/API source available, when reporting monitoring status, then coverage is explicitly marked unavailable rather than healthy.
4. Given a legitimate user requests data removal, when retention expires, then telemetry linked to that user is deleted or anonymized under documented policy.

**Required test cases:**

- **Positive:** Staging auth failure creates a redacted metric with UTC timestamp.
- **Negative:** Absent log source is reported as unknown coverage, not zero failures.
- **Security:** Inspect events for bearer tokens, cookies, emails and full incident text; none retained.
- **Accessibility:** Alert panel provides text severity, focusable details and screen-reader-friendly timestamps.

**Definition of Done:** Document retention and access controls; stage with synthetic accounts; verify no PII, alert dedup and a11y; peer/security approval and production log coverage proof.

**Release rule:** Accepted requires passing automated and browser tests, accessibility and security review, reviewer sign-off, and verified deployment. Proposed does not imply implementation.

## F15 — Migration-aware rollback rehearsal before release

**Priority:** P1 · **Status:** Proposed · **User story:** As a release engineer, I need to know whether frontend rollback remains safe after a Supabase migration.

**Measurable acceptance criteria (Given/When/Then):**

1. Given a release with schema changes, when staged, then forward and rollback compatibility checks run against both current and previous app SHAs.
2. Given a non-backward-compatible policy or column change, when rehearsal fails, then production release is blocked with a concrete recovery plan.
3. Given a failed frontend deploy with compatible schema, when rollback occurs in staging, then prior UI workflows and auth controls still pass.
4. Given a rollback completes, when release status is updated, then the active deployment SHA, schema version and smoke evidence match.

**Required test cases:**

- **Positive:** Roll back staging frontend after additive migration; verify owner incident flow.
- **Negative:** Drop required column in disposable staging branch; compatibility gate fails.
- **Security:** Verify rollback never reopens anon data access or restores insecure policies.
- **Accessibility:** Rollback status and recovery instructions remain usable by keyboard and announced to assistive technology.

**Definition of Done:** Disposable staging environment; schema compatibility contract; repeatable rollback smoke and security tests; reviewer approval; authorized production rollout and verified recovery evidence.

**Release rule:** Accepted requires passing automated and browser tests, accessibility and security review, reviewer sign-off, and verified deployment. Proposed does not imply implementation.

## Coverage and release accounting

- 50 new distinct proposed scenarios: `tests/fixtures/daily/2026-10-12.json` (IDs SQ-20261012-001 through -050).
- 200 specified cases: 50 each positive, negative, security and accessibility.
- Prior proposed scenarios on PR #20: 100 (Oct 9 and 10); total with this batch: 150 scenarios, 600 cases.
- Scenario cases are test specifications only; executed functional/UI cases for this batch: **0**.
- Feature proposals to date: 15 (F01–F15); accepted/deployed: **0**.
- Release blockers: review/merge of PR #20; staging authorization checks for PR #37; UI and deployment verification.
