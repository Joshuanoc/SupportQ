# Adaptive diagnostics with AI interpretation and account storage

The new diagnostic engine is enabled for Wi-Fi connectivity, SAP material-document reversal and SAP posting-period incidents. Other scenario engines keep their current diagnosis paths; the AI intake router can select from the complete scenario catalogue.

## User flow

A guest can troubleshoot using choice buttons and deterministic free-text handling. A signed-in user can ask AI to interpret intake or an answer. The UI shows the proposed scenario, quoted observations or answer label, and waits for the user's confirmation before applying them. Model output is never independently verified evidence. Questions, safety boundaries and outcomes remain under the deterministic engine. No SAP or network transaction is executed.

Sign in or create an email/password account through Supabase Auth. Email confirmation is required by the AI endpoint. Save session persists the diagnostic state to the account; Saved sessions resumes it on another device. Save uses a revision check to reject overwriting a newer version. Resume replays the original issue, confirmed intake observations and retained answers rather than trusting stored facts or terminal status. Account changes remount the workspace and clear the previous user's tab cache and local history.

## Server and database

`api/interpret.js` runs only on a server supporting Vercel Functions. It verifies the Supabase access token with `getUser`, rejects anonymous/unconfirmed users, checks origin, method, JSON and input bounds, reserves an atomic database quota and calls the AI SDK with structured output. It has a 20-second model timeout, no retries and a 1200-token output cap. A missing model/credential or quota/database failure produces a safe fallback. No model SDK or gateway credential is imported into the frontend.

The migration adds only `diagnostic_sessions`, two private quota objects and narrowly scoped RPC functions. Existing solution/security tables and policies are untouched. The exposed session-saving RPC uses SECURITY INVOKER and owner RLS. Users can read, insert, update or delete only their own non-anonymous sessions; owner reassignment is also blocked by column privileges. The exposed quota RPC is an invoker wrapper around a private definer function with a fixed caller, empty search path and fixed limits. Quota rows have no authenticated read/write grants. Limits are three AI requests per minute and thirty per UTC day per account; failed model attempts consume quota. Configure a gateway budget separately to bound aggregate spend across accounts.

## Configuration and activation

Copy `.env.example` values into the deployment environment, using the project's Supabase URL and **publishable** key. The frontend needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the server needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Never use a service-role key in the browser. Set `SUPPORTQ_AI_MODEL` to a currently supported gateway model; the example ID was checked against the live catalogue during implementation. Use Vercel OIDC or a budgeted `AI_GATEWAY_API_KEY` on the server. Client configuration is baked into the Vite build, so rebuild after setting it.

Apply `supabase/migrations/20261013232444_adaptive_diagnostic_sessions.sql` to SupportQ after approval. Then configure Supabase site/redirect URLs for the final host and verify email confirmation, sign-in and sign-out there. GitHub Pages supports the guest frontend, but cannot host `/api/interpret`; AI interpretation requires the Vercel deployment (or equivalent backend).

**Current activation blockers:** automatic review rejected applying the live migration without explicit schema-change approval. Vercel environment access returned 403 for the project's team and no authenticated CLI fallback is installed. No live database schema changes, model requests, production merge or deployment were performed. These are provisioning/verification blockers, not tests of a live AI service.

## Validation

`npm test` includes real local PostgreSQL execution through PGlite: schema creation, user isolation for select/update/delete, foreign-owner insert denial, owner reassignment denial, anonymous access denial, revision conflicts, private-counter denial and minute/day AI limits. API tests cover unauthorized, malformed, oversize, cross-origin, unconfigured, rate-limited and provider-failure requests, plus schema and quoted-evidence validation. Persistence tests check replay and forged-state rejection.

`npm run test:e2e` runs desktop/mobile guest journeys and a signed-in flow that confirms AI interpretation, saves a session, resumes it in a separate browser context and signs out. Auth, model and cloud endpoints are mocked in these browser tests; they do not verify a production credential or model response. Axe checks the new conversation UI. Required live staging checks remain email confirmation, real sign-in, owner-scoped save/resume and an authenticated gateway request.

The full original architecture also calls for reviewed, versioned external knowledge retrieval, broader diagnostic coverage and outcome learning. This PR does not claim those systems exist merely because interpretation and persistence code are implemented.
