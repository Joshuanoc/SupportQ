# Browser incident history resilience

Story: SQ-M09-05. Status: Tested (local automated and App SSR only). Accepted: no. Production deployed: no.

## Verified defect and implementation

On main 779aa0d, JSON.parse accepts `null`, `{}` and `[null]` as saved history; subsequent slice/map or history/analytics consumption throws TypeError. The storage write effect also lets quota/access exceptions escape.

This change adds a single historyStorage adapter reused by App initialization and persistence. It checks array/record shapes, required render fields and bounded numeric confidence, retains the newest 25 valid unique records, handles storage getter/read/write failures and bounds stored payload size. The first render does not write back or delete corrupt saved data. A new completed incident can subsequently replace stored history with the validated in-memory list; failed writes preserve that list for the current open session. No database persistence or privacy/retention feature is claimed.

## Acceptance criteria

- Given valid saved records, loading restores the newest 25 and preserves collected evidence fields.
- Given malformed JSON, null, a non-array root, null entries or invalid render fields, loading returns a safe array and announces a warning; valid records are retained.
- Given blocked API access/read or a quota/write failure, no uncaught storage exception escapes and saving does not claim success.
- Given initial corrupt/unavailable storage, App initialization performs zero writes/deletions, including repeated mount effects while history is unchanged.
- Given a successful later save, the storage failure message clears.
- Warning text never includes the underlying exception payload. Feedback is in a persistent polite, atomic status region and requires no extra interaction.

## Test evidence

Local Node suite: 160 passed, 0 failed. This includes 21 storage tests and 6 App SSR tests (including the containing test). Existing SAP/IT routing and diagnostic checks remain green. Vite 8.3.4 production build passed; the existing >500 kB chunk warning remains. Diff whitespace check passed.

Positive cases: evidence-preserving round trip, bounded retention, successful retry. Negative: malformed/non-array data, null/malformed records, duplicate IDs, unavailable API, quotas, oversize payloads. Security: invalid field types are excluded, invalid writes do not touch storage, and exception contents cannot appear in warnings. Accessibility: actual App SSR markup includes role=status, aria-live=polite and aria-atomic=true while the workspace remains renderable.

These are automated/SSR checks, not browser, keyboard or screen-reader test execution. Review and live candidate UI/accessibility checks are still required.

## Definition of Done and remaining work

Implementation and local tests/build are complete. Before Accepted: independently review the PR, verify live candidate navigation/diagnosis/history/analytics with blocked storage and mobile/keyboard/screen-reader coverage, confirm security behavior, and record the exact deployment commit and smoke results. Do not merge or release unreviewed changes.

This run did not add another daily scenario or feature batch, access Vercel/Supabase management, or mutate production.
