# SQ-M06-05 — Safe incident export

Status: **Tested** (local automated coverage and production build). Acceptance and deployment remain pending review and authorized UI/deployment verification.

## Acceptance criteria

1. Every **Copy incident** action sanitizes the assembled incident before it reaches the Clipboard API.
2. The sanitizer removes private-key blocks, authorization credentials, JWTs, common provider tokens, labeled credentials, email addresses, labeled phone numbers, labeled government identifiers, labeled card numbers, and passwords embedded in URLs.
3. Operational evidence such as SAP material-document numbers, company codes, plant codes, movement types, WBS identifiers, and error codes remains available when it is not explicitly labeled as sensitive personal or credential data.
4. Clipboard unavailability or rejection produces an accurate failure message; success is never announced when no copy occurred.
5. Copy feedback is exposed through a polite, atomic status region at each incident-result surface.
6. Control characters are removed, line endings are normalized, and export length is capped at 100,000 characters with a visible truncation marker.
7. Sanitization changes the copied representation only; the diagnostic record and evidence held by the application are unchanged.

## Verification cases

| Type | Case | Expected result |
|---|---|---|
| Positive | Copy a SAP incident containing document `4900123456`, movement `343`, and WBS `PRJ-2026-04` | Operational evidence is preserved |
| Negative | Clipboard API is absent or rejects the write | A failure message is returned and no success is announced |
| Security | Copy synthetic passwords, OTPs, bearer/basic credentials, JWTs, provider tokens, private keys, contact details, identifiers, card numbers, and URL credentials | Each sensitive value is absent from clipboard text |
| Security | Copy more than 100,000 characters or embedded control characters | Output is bounded, normalized, and marked when truncated |
| Accessibility | Complete or fail a copy from each incident-result surface | A text message is exposed through `role="status"`, `aria-live="polite"`, and `aria-atomic="true"` |

## Definition of Done

- All three existing incident-copy paths call the shared sanitizer.
- Positive, negative, and security unit tests pass.
- The production build succeeds.
- GitHub CI passes for the pull-request commit.
- Review confirms the redaction rules and accessible feedback.
- An authorized browser check verifies successful and denied clipboard flows.
- Deployment evidence is linked before the story can move to **Accepted** or **Deployed**.

## Evidence

- Local command: `npm test`
- Local command: `npm run build`
- Pull request and GitHub Actions links are added after publication.
