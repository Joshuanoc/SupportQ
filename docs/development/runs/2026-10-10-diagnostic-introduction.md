# Diagnostic introduction — SQ-M09-03 partial implementation

The user flagged unnecessary diagnostic-engine explanations in the troubleshooting interface. Generic, deep Wi-Fi and other deep flows now start with: “Let’s check what’s causing the issue.”

## Acceptance criteria

- All three introductory messages use the same concise next-step wording.
- No introduction promises adaptive reasoning, unlimited troubleshooting, or escalation behavior beyond the implemented diagnostic branches.
- Existing questions, retest controls, warnings and escalation guidance remain available.
- The introduction remains plain text in the existing message structure and adds no focusable controls.

## Verification cases

| Class | Check | Evidence |
|---|---|---|
| Positive | Generic, Wi-Fi and other deep introductions use the requested sentence | Source inspection: three occurrences |
| Negative | Previous checklist/engine promises are absent | Source inspection |
| Security | Copy-only diff introduces no data handling or execution | Diff review |
| Accessibility | Existing message structure and control order are preserved | Source inspection; live assistive-technology check pending |

## Validation and Definition of Done

Local regression suite: 133/133 passed. Production build and diff whitespace check passed. No new tests were added for this copy-only change. Live browser and screen-reader verification, independent review and deployment evidence remain required for acceptance. SQ-M09-03 as a whole remains Proposed: this change does not complete its intake/save/error status-announcement requirements.
