# SupportQ least-privilege remediation

## Finding
Read-only inspection on 2026-10-11 found TRUNCATE, TRIGGER and REFERENCES privileges granted to both anon and authenticated on support_issues, solutions, feedback and troubleshooting_history. Supabase Security Advisor returned no lints; that does not prove these grants safe.

## Acceptance criteria
- Given the SQL migration is applied in staging, when checking role_table_grants, then zero matching excessive privileges remain.
- Given an authenticated owner, when using normal incident create/read/update flows, then permitted operations still work.
- Given an anonymous or different authenticated user, when accessing private incidents or changing verified solutions, then requests are denied.
- Given a keyboard-only user, when the UI surfaces a permission denial, then the error is announced and recovery controls remain accessible.

## Test matrix
- Positive: owner can create and view an incident; approved reviewer can perform explicitly authorized verification.
- Negative: anonymous caller cannot truncate or mutate private records; regular user cannot set solutions.is_verified or rewrite ownership fields.
- Security: assert role grants absent, inspect RLS and column UPDATE grants independently, test cross-user access with two real non-admin sessions, inspect RPC/SECURITY DEFINER entry points.
- Accessibility: keyboard focus, visible errors, aria-live feedback on denied operations.

## Definition of Done
Staging migration applied and verified, authorization regression passed, security advisor reviewed, UI flows verified, peer review approved, production migration explicitly authorized and post-deploy checks passed.

## Release status
Migration file committed for review only. No database grants have been changed. Separate solution verification and ownership-column restrictions need a policy/column-grant review before approval. Avoid automatically applying to production.
