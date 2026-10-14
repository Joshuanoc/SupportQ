# SupportQ working backlog

This working breakdown has 10 modules and 50 stories. Additional product scope is proposed, pending comparison with any earlier approved specification. No story is Accepted or Deployed. Full per-story acceptance criteria, task lists, test classes and Definition of Done are in `backlog.json`.

| Epic | Stories | Delivery state |
| --- | --- | --- |
| M01 — Intake and routing | SQ-M01-01: Cancellation intent, SQ-M01-02: SAP triage bypass, SQ-M01-03: IT context collisions, SQ-M01-04: Ambiguous intake, SQ-M01-05: Routing regression ledger | Routing PR #20: automated tests passed; preview UI blocked |
| M02 — SAP diagnosis | SQ-M02-01: Reversal evidence, SQ-M02-02: Posting periods, SQ-M02-03: Goods movements, SQ-M02-04: WBS restrictions, SQ-M02-05: Unknown SAP cause | Proposed; see audit for dependencies |
| M03 — IT diagnosis | SQ-M03-01: Network evidence, SQ-M03-02: Identity and MFA, SQ-M03-03: Endpoint recovery, SQ-M03-04: Cloud authorization, SQ-M03-05: Critical security intake | Proposed; see audit for dependencies |
| M04 — Identity and access | SQ-M04-01: Authenticated session, SQ-M04-02: Session expiration, SQ-M04-03: Owner isolation, SQ-M04-04: Profile role protection, SQ-M04-05: Least privilege credentials | Proposed; see audit for dependencies |
| M05 — Case persistence | SQ-M05-01: Case save, SQ-M05-02: Save retry, SQ-M05-03: Private history, SQ-M05-04: Offline failure, SQ-M05-05: Retention and deletion | Proposed; see audit for dependencies |
| M06 — Incident management | SQ-M06-01: Priority calculation, SQ-M06-02: Resolution retest, SQ-M06-03: Escalation evidence, SQ-M06-04: Case lifecycle, SQ-M06-05: Sensitive export | Proposed; see audit for dependencies |
| M07 — Solutions and knowledge | SQ-M07-01: Solution ownership, SQ-M07-02: Verified solutions, SQ-M07-03: Feedback access, SQ-M07-04: Knowledge search, SQ-M07-05: Solution freshness | Proposed; see audit for dependencies |
| M08 — QA and release evidence | SQ-M08-01: Deterministic installs, SQ-M08-02: Unit reports, SQ-M08-03: Selenium POM regression, SQ-M08-04: Daily coverage, SQ-M08-05: Negative release gates | CI PR #21: local checks passed; review pending |
| M09 — Responsive UI and accessibility | SQ-M09-01: Mobile layout, SQ-M09-02: Keyboard flow, SQ-M09-03: Accessible feedback, SQ-M09-04: Reduced motion, SQ-M09-05: Storage resilience | Proposed; see audit for dependencies |
| M10 — Platform and operations | SQ-M10-01: Public production smoke, SQ-M10-02: Protected review preview, SQ-M10-03: Deployment gating, SQ-M10-04: Rollback readiness, SQ-M10-05: Monitoring and alerts | Proposed; see audit for dependencies |

Implementation order: routing defects → SAP/IT evidence correctness → access controls and persistence → incident/solution lifecycle → regression → UI → release operations. Existing workflows and the scenario registry are retained.

Daily expansion: the existing enabled automation already prepared 50 proposed scenarios, 200 specified cases and five features for 2026-10-09 in PR #20. Do not append a second same-day batch or treat specifications as executed tests. Validate nonduplication across every prior daily fixture before each new batch.
