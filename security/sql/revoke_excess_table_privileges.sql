-- Review in staging before production. Preserves SELECT/INSERT/UPDATE/DELETE grants.
BEGIN;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
  public.support_issues,
  public.solutions,
  public.feedback,
  public.troubleshooting_history
FROM anon, authenticated;
COMMIT;

-- Post-migration verification: should return zero rows.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('support_issues','solutions','feedback','troubleshooting_history')
  AND grantee IN ('anon','authenticated')
  AND privilege_type IN ('TRUNCATE','TRIGGER','REFERENCES');
