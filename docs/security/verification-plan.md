# Access-control hardening verification

Status: Proposed / Blocked on disposable database and authenticated A/B fixtures. The SQL draft has NOT been applied or represented as tested.

Observed on 2026-10-09 via read-only catalog queries: RLS on five public tables; advisors report zero lints. Existing support_issues and history inserts check ownership. solutions UPDATE checks created_by but not the new issue owner; INSERT permits caller-supplied is_verified. Feedback INSERT/UPDATE checks user_id but does not require access to the referenced solution. Existing anon/authenticated grants include unused TRUNCATE/REFERENCES/TRIGGER on four tables. profiles has owner UPDATE policy but no audited table grants and no triggers; do not claim confirmed role escalation.

The proposed draft prevents ordinary users from self-verifying solutions and restricts solution UPDATE to title/steps. Editing issue links is deliberately excluded until a reviewed relink workflow exists. Future verification and relinking require separate design.

Before application, create a migration through the CLI and test a disposable environment matching the observed schema:

| Case | Required result |
| --- | --- |
| A creates an unverified solution for A's case | Allowed |
| A creates solution with is_verified=true | Denied |
| A creates/relinks solution to B's case | Denied |
| A edits own unverified solution title/steps | Allowed |
| A changes created_by, issue_id or is_verified | Denied by column privileges |
| B reads/updates A's case/history/solution | No data or denial; unchanged records |
| A inserts feedback for own accessible solution | Allowed |
| A inserts or relinks feedback to B's private solution | Denied |
| Anonymous reads/inserts private case or solution | Denied |
| anon/authenticated attempts TRUNCATE | Permission denied |
| Profile display-name edit after future reviewed grant | Allowed; role/id edit denied |
| Expired-session save | UI announces failure; no saved claim |
| Keyboard/screen-reader save/denial flow | Operable controls and announced feedback |

Use synthetic records and two non-admin sessions; include SELECT, INSERT, UPDATE, DELETE allow/deny assertions and unchanged-row checks. Do not use service_role to claim owner isolation. Run Supabase advisors after applying to the disposable environment; capture schema diff, test output and review evidence before a production migration. Existing production data was not changed.

References: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/database/postgres/column-level-security . Current changelog index was fetched; no database upgrade or GraphQL feature is proposed here.
