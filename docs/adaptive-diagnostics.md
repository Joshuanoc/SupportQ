# Adaptive troubleshooting foundation

The new module is enabled for Wi-Fi connectivity, SAP material-document reversal and SAP posting-period incidents. Other scenario engines remain on their existing paths.

`adaptiveSession.js` keeps explicit user facts, extracted document/transaction identifiers, completed and unavailable checks, an evidence log, and an outcome. The next action depends on current state. Known or unavailable checks are skipped. Backtracking reconstructs state by replaying only retained answers, removing dependent conclusions. The UI asks one question, offers tappable answers and supports free text. Unknown option text is rejected rather than interpreted as a successful check.

Initial input is normalized for a small set of common spelling mistakes. This is deterministic interpretation, **not an LLM**. It does not promise open-domain understanding. No paid AI service has been configured and no model calls are made. The LLM interpretation/retrieval phases in the requested architecture remain future work; model outputs must be validated before entering diagnostic state. An authenticated server session store and reviewed, versioned source retrieval are also required before claiming the full architecture is complete.

Persistence is browser-tab scoped (`sessionStorage`), with a key for each scenario and report. This supports refresh/re-entry in the same tab, not authenticated cross-device sessions. The UI rebuilds saved state from answers rather than trusting a stored terminal status. No new database or Supabase policy changes are introduced. Reports may contain document references; close the tab to clear this temporary session data. Existing incident history still uses the application's existing local-storage behavior.

Resolution requires explicit user confirmation of the original issue. It is labelled user-confirmed, never independently verified. No confidence probabilities are invented by this engine. SAP period/access changes and managed network changes stay with authorized staff. An unavailable check chooses an alternate path, and escalation describes the evidence gap.

## Validation

`npm test` exercises legacy regression coverage and state transitions. `npm run test:e2e` tests SAP routing/resume, unavailable Wi-Fi checks, correction and keyboard interaction on desktop and mobile Chromium. Axe checks the new conversation UI. Pull requests and main pushes run unit tests, a build, and Playwright with an uploaded HTML report.

## Release boundary

Review the dedicated feature PR and staging journeys before merging. This foundation does not fulfill the complete five-phase architecture definition of done. It is ready for review as the first increment. Do not label the entire system deployed or LLM-powered on this basis.
