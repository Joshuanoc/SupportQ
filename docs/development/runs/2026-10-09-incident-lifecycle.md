# SQ-M06-04 — Incident lifecycle

Status: **Tested** locally. Acceptance and deployment remain pending independent review, authorized browser/accessibility verification, passing pull-request CI, and deployment evidence.

## Acceptance criteria

1. Every newly completed incident contains an immutable chronological timeline beginning with Reported, followed by In progress, and ending in exactly one of Resolved or Escalated.
2. Each lifecycle event contains a valid ISO 8601 timestamp, and a transition timestamp cannot precede the current event.
3. Unknown states, skipped states, forged chains, transitions out of a terminal state, and non-terminal completion requests are rejected without modifying the supplied timeline.
4. Generic, deep Wi-Fi, and other deep diagnostic completion paths attach the validated timeline to history records.
5. Incident history exposes available lifecycle events as a keyboard-operable disclosure containing a labeled ordered list and machine-readable time elements.
6. Legacy history records without lifecycle data remain usable and do not show a fabricated timeline.

## Verification cases

| Type | Case | Expected result |
|---|---|---|
| Positive | Complete an in-progress case as resolved and as escalated | A new terminal event is appended with the supplied timestamp |
| Negative | Attempt to skip from Reported to a terminal state or transition a terminal case again | Transition is rejected and input is unchanged |
| Security | Supply unknown states, forged state chains, invalid dates, or a backwards timestamp | Validation rejects the input without accepting caller-asserted state |
| Accessibility | Render a completed lifecycle and a legacy record | The valid timeline is a labeled ordered list inside a native disclosure; the legacy record renders no misleading timeline |

## Definition of Done

- All application completion paths attach the shared validated lifecycle.
- Positive, negative, security, immutability, and accessibility-markup tests pass.
- The production build succeeds and GitHub CI passes for the exact pull-request commit.
- Authorized browser keyboard and screen-reader checks confirm the history disclosure.
- Independent review and deployment evidence are linked before **Accepted** or **Deployed**.
