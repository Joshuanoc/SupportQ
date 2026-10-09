# SupportQ — BA gap feature proposals (2026-10-09)

**Status:** PROPOSED ONLY. None accepted, deployed or verified by this document. Prioritize existing defects before building new features. Each feature requires independent reviewer approval.

## F01 — Context-aware SAP/IT routing and zero redundant triage

**Owner:** Application / QA · **Status:** proposed · **Priority:** P1

**Measurable acceptance criteria (Given/When/Then):**

1. Given any of the existing 100 SAP reference prompts, when submitted, then the top result belongs to SAP in at least 100/100 cases.
2. Given any of the existing 100 IT reference prompts, when submitted, then the top result belongs to IT in at least 100/100 cases.
3. Given an SAP material-document reversal prompt, when submitted, then the exact reversal flow opens without asking for OS, device or VPN in 100% of scripted cases.
4. Given an ambiguous prompt, when top scores differ by fewer than 3 points, then no unsupported root cause is asserted and at most three relevant choices are offered.

**Required test cases:**

- **Positive:** Submit MIGO 161 with WBS reference; inspect SAP route and first question.
- **Negative:** Submit Azure RBAC 403 without SAP terms; verify Azure route and no SAP form.
- **Security:** Paste HTML/script and long Unicode strings; verify rendered text is inert and no cross-domain disclosure.
- **Accessibility:** Keyboard-only select suggested route; verify accessible names, visible focus and announced selection.

**Definition of Done:** Classification regression suite passes (100 IT + 100 SAP + new edge cases); no unnecessary SAP OS questions in browser; security/a11y checks pass; reviewer approves; production smoke passes.

**Release rule:** Implementation + automated tests + relevant UI checks + security review + verified deployment are mandatory before marking Accepted.

## F02 — Evidence-based diagnosis and safe remediation

**Owner:** SAP SME / QA · **Status:** proposed · **Priority:** P1

**Measurable acceptance criteria (Given/When/Then):**

1. Given an unknown or contradictory SAP error, when analyzed, then confidence is 0 for unverified root cause and incident remains unresolved.
2. Given a proposed corrective action, when the user has not verified a successful retest, then the incident is not marked Resolved.
3. Given a privileged or destructive SAP operation, when recommended, then a clear authorization and business-approval warning appears in 100% of audited examples.
4. Given user-supplied evidence, when exported, then only evidence actually captured is included; no fabricated SAP note or document identifier.

**Required test cases:**

- **Positive:** Provide M7 message class, plant, posting date and successful retest; confirm evidence trail.
- **Negative:** Enter 'SAP broken' with no error; ensure no definitive diagnosis.
- **Security:** Paste password/token into log and request stock adjustment; ensure masking guidance and no automatic SAP writes.
- **Accessibility:** Navigate evidence capture, uncertainty and escalation notices using screen reader and keyboard.

**Definition of Done:** All SAP evidence fixtures pass; 0 fabricated root causes in negative suite; SME reviews high-impact recommendations; no write access from diagnostic UI; security/a11y/UI verification and production smoke pass.

**Release rule:** Implementation + automated tests + relevant UI checks + security review + verified deployment are mandatory before marking Accepted.

## F03 — Private authenticated Supabase incident history

**Owner:** Data / Security · **Status:** proposed · **Priority:** P1

**Measurable acceptance criteria (Given/When/Then):**

1. Given authenticated user A, when A creates or reads an issue, then only A-owned records are returned.
2. Given authenticated user B, when B reads, edits, or links history to A's issue, then 100% of attempts are denied by RLS.
3. Given a normal user, when they try to modify profiles.role, then the role is unchanged and request is denied.
4. Given an unauthenticated browser, when it loads the public landing page, then no private incident or solution records are exposed.
5. Given a failed save or expired session, when the UI responds, then it does not claim 'Saved' and retries do not create duplicates.

**Required test cases:**

- **Positive:** Create synthetic issue and history as user A; verify A-only read after refresh.
- **Negative:** As user B, attempt A's issue ID; verify no data and no write.
- **Security:** Audit RLS on all five public tables and profile role update guard; verify anon cannot read.
- **Accessibility:** Announce save, offline, session-expired and access-denied states through aria-live and focus.

**Definition of Done:** Migration reviewed before production; RLS/role immutability tests pass using two non-admin accounts; no service-role key in browser; retention/privacy reviewed; UI/CI/security/a11y/deployment gates green.

**Release rule:** Implementation + automated tests + relevant UI checks + security review + verified deployment are mandatory before marking Accepted.

## F04 — Nonduplicate daily regression coverage and release gates

**Owner:** QA / DevOps · **Status:** proposed · **Priority:** P1

**Measurable acceptance criteria (Given/When/Then):**

1. Given each daily QA run, when fixtures are added, then exactly 50 unique new scenario IDs and at least 100 test cases are recorded.
2. Given a duplicate ID or prompt matching any previous fixture, when validation runs, then CI fails with a useful identifier.
3. Given a PR to main, when npm test, build, security or critical accessibility checks fail, then the PR is not accepted or promoted.
4. Given a merge to main, when configured automation dispatch runs, then its result is linked to the source SHA and missing credentials fail visibly.

**Required test cases:**

- **Positive:** Add 50 unique fixture records and run validator and unit suite.
- **Negative:** Duplicate a fixture title or omit one test class; expect red CI.
- **Security:** Use synthetic token-like fixture; scanner flags it and masks logs.
- **Accessibility:** Review generated HTML QA summary with keyboard and screen reader.

**Definition of Done:** Coverage ledger counts independently validated; PR CI and end-to-end suite green; failure artifacts retained without secrets; protected main and reviewer approval configured; production verification complete.

**Release rule:** Implementation + automated tests + relevant UI checks + security review + verified deployment are mandatory before marking Accepted.

## F05 — Public production reachability with protected previews

**Owner:** Platform / Security · **Status:** proposed · **Priority:** P1

**Measurable acceptance criteria (Given/When/Then):**

1. Given the approved production deployment, when visited anonymously on the canonical domain, then HTTP 200 and app content are returned from two independent probes.
2. Given a preview deployment, when visited anonymously, then it remains protected unless an explicit review access policy allows it.
3. Given a Vercel READY deployment, when public probe gets 401, 403, 404 or 5xx, then status is 'blocked', not 'deployed/accepted'.
4. Given a new production release, when build or smoke tests fail, then production alias stays on last known-good commit and rollback instructions are available.

**Required test cases:**

- **Positive:** Anonymous production visit from clean browser; verify title, app shell, navigation and source SHA.
- **Negative:** Force synthetic 403 on preview or 5xx probe; ensure gate blocks release.
- **Security:** Verify Supabase owner isolation and no secrets in bundle before making production public; preview remains SSO protected.
- **Accessibility:** Verify accessible loading, outage and retry states at mobile width and with keyboard.

**Definition of Done:** Production protection policy reviewed; public access intentionally enabled only after security signoff; anonymous probe from two locations passes; preview access stays restricted; CI/UI/a11y/security and deployment SHA verified.

**Release rule:** Implementation + automated tests + relevant UI checks + security review + verified deployment are mandatory before marking Accepted.

## Verified baseline blockers

- Existing routing PR #20 failed its prior CI run with 29 failing tests; do not merge while red.
- Vercel project `support-q` reports `ssoProtection.enabled=true` with `deploymentType=all_except_custom_domains`, while the public alias is a `vercel.app` domain. READY is not proof of anonymous reachability.
- Supabase public tables have RLS enabled. The `profiles_update_own` policy checks ownership only; role immutability requires a separate enforced control before treating the system as privilege-safe.
- Frontend currently writes up to 25 incident records to browser localStorage; authenticated server-side persistence and privacy lifecycle are not yet implemented.

## Coverage accounting

- New proposed scenarios: 50, fixture `tests/fixtures/daily/2026-10-09.json`.
- Detailed proposed cases: 200 (50 positive, 50 negative, 50 security, 50 accessibility).
- Executed functional tests for new fixture: 0 until CI/browser verification.
- Accepted features: 0. Deployed features: 0.
