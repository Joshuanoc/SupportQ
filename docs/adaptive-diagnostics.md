# Adaptive diagnostics with AI interpretation and account storage

## Pre-launch security review — 2026-10-14

API validation correction: malformed question values/options now return a safe 400 response instead of throwing before the error handler. Raw JSON is bounded before parsing, and both raw and parsed bodies use a 16,000-byte UTF-8 limit. The platform request-size limit is still needed because the hosting layer receives the body first.

Acceptance criteria: valid authenticated interpretation still succeeds; null/primitive/array question contexts and invalid option entries return 400; oversized whitespace or multibyte bodies return 413; rejected requests reserve zero quota and call the model zero times; errors retain no-store and contain no exception details. Positive, negative and security regressions execute in tests/interpretHandler.test.js. No UI changed; live accessibility of existing error feedback remains a release gate.

Status: implemented and locally tested (162 tests and production build passed). Definition of Done also requires final-head CI, independent review, relevant live UI/security verification and deployment evidence; this change is not Accepted or Deployed.

Checklist accounting: existing PR #35 contains dependency/secret scanning and hosting-header work; do not duplicate it. This branch contains server-only AI credentials, authenticated interpretation, atomic per-account quotas, timeout/output limits and no-store safe errors. These source controls do not establish live configuration or aggregate spend protection. A gateway budget, live HTTPS/header verification, backup restoration evidence and operator-approved privacy/terms pages remain unverified. The separate Selenium trigger last failed for missing SUPPORTQ_AUTOMATION_PAT; repository code cannot supply that secret. Database staging/production changes and hosting management are outside this review's scope.

The new diagnostic engine is enabled for Wi-Fi connectivity, SAP material-document reversal and SAP posting-period incidents. Other scenario engines keep their current diagnosis paths; the AI intake router can select from the complete scenario catalogue.

## User flow

A guest can troubleshoot using choice buttons and deterministic free-text handling. A signed-in user can ask AI to interpret intake or an answer. The UI shows the proposed scenario, quoted observations or answer label, and waits for the user's confirmation before applying them. Model output is never independently verified evidence. Questions, safety boundaries and outcomes remain under the deterministic engine. No SAP or network transaction is executed.

Sign in or create an email/password account through Supabase Auth. Email confirmation is required by the AI endpoint. Save session persists the diagnostic state to the account; Saved sessions resumes it on another device. Save uses a revision check to reject overwriting a newer version. Resume replays the original issue, confirmed intake observations and retained answers rather than trusting stored facts or terminal status. Account changes remount the workspace and clear the previous user's tab cache and local history.

## Server and database

`api/interpret.js` runs only on a server supporting Vercel Functions. It verifies the Supabase access token with `getUser`, rejects anonymous/unconfirmed users, checks origin, method, JSON and input bounds, reserves an atomic database quota and calls the AI SDK with structured output. It has a 20-second model timeout, no retries and a 1200-token output cap. A missing model/credential or quota/database failure produces a safe fallback. No model SDK or gateway credential is imported into the frontend.

The migration adds only `diagnostic_sessions`, two private quota objects and narrowly scoped RPC functions. Existing solution/security tables and policies are untouched. The exposed session-saving RPC uses SECURITY INVOKER and owner RLS. Users can read, insert, update or delete only their own non-anonymous sessions; owner reassignment is also blocked by column privileges. The exposed quota RPC is an invoker wrapper around a private definer function with a fixed caller, empty search path and fixed limits. Quota rows have no authenticated read/write grants. Limits are three AI requests per minute and thirty per UTC day per account; failed model attempts consume quota. Configure a gateway budget separately to bound aggregate spend across accounts.

## Configuration and activation

Copy `.env.example` values into the deployment environment, using the project's Supabase URL and **publishable** key. The frontend needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the server needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Never use a service-role key in the browser. Set `SUPPORTQ_AI_MODEL` to a currently supported gateway model; the example ID was checked against the live catalogue during implementation. Use Vercel OIDC or a budgeted `AI_GATEWAY_API_KEY` on the server. Client configuration is baked into the Vite build, so rebuild after setting it.

The reviewed `supabase/migrations/20261013232444_adaptive_diagnostic_sessions.sql` migration was applied to SupportQ with explicit user approval. Configure Supabase site/redirect URLs for the final host and verify email confirmation, sign-in and sign-out there. GitHub Pages supports the guest frontend, but cannot host `/api/interpret`; AI interpretation requires the Vercel deployment (or equivalent backend).

**Current activation status:** the Supabase migration is applied. Live inspection confirms RLS, owner policies, invoker public RPCs, and denial of anonymous session/RPC access, owner reassignment and authenticated quota-table reads. The security advisor reports only an informational no-policy notice for the private quota table; deny-by-default access is intentional there. Vercel environment access still returns 403 for the project's team and no authenticated CLI fallback is installed. No live model request, production merge or frontend deployment was performed. Vercel provisioning and live staging verification remain blocked.

## Validation

`npm test` includes real local PostgreSQL execution through PGlite: schema creation, user isolation for select/update/delete, foreign-owner insert denial, owner reassignment denial, anonymous access denial, revision conflicts, private-counter denial and minute/day AI limits. API tests cover unauthorized, malformed, oversize, cross-origin, unconfigured, rate-limited and provider-failure requests, plus schema and quoted-evidence validation. Persistence tests check replay and forged-state rejection.

`npm run test:e2e` runs desktop/mobile guest journeys and a signed-in flow that confirms AI interpretation, saves a session, resumes it in a separate browser context and signs out. Auth, model and cloud endpoints are mocked in these browser tests; they do not verify a production credential or model response. Axe checks the new conversation UI. Required live staging checks remain email confirmation, real sign-in, owner-scoped save/resume and an authenticated gateway request.

The full original architecture also calls for reviewed, versioned external knowledge retrieval, broader diagnostic coverage and outcome learning. This PR does not claim those systems exist merely because interpretation and persistence code are implemented.
