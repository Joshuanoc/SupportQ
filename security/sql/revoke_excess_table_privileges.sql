-- REVIEW ONLY: execute in isolated staging first. Production requires explicit approval.
-- Preserve existing SELECT/INSERT/UPDATE/DELETE privileges.
-- PostgreSQL 17's MAINTAIN privilege is not covered by the earlier revocation.
BEGIN;
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE
  public.support_issues,
  public.solutions,
  public.feedback,
  public.troubleshooting_history
FROM anon, authenticated;
COMMIT;

-- Direct-grant verification: expected zero rows.
-- information_schema.role_table_grants does not expose MAINTAIN.
SELECT c.relname AS table_name, gr.rolname AS grantee, a.privilege_type
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
) a
JOIN pg_catalog.pg_roles gr ON gr.oid = a.grantee
WHERE n.nspname = 'public'
  AND c.relname IN ('support_issues','solutions','feedback','troubleshooting_history')
  AND gr.rolname IN ('anon','authenticated')
  AND a.privilege_type IN ('TRUNCATE','TRIGGER','REFERENCES','MAINTAIN');

-- Effective-permission verification: expected zero rows. Includes inherited grants.
SELECT t.tablename, r.rolename, p.privilege
FROM (VALUES ('support_issues'),('solutions'),('feedback'),('troubleshooting_history')) AS t(tablename)
CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(rolename)
CROSS JOIN (VALUES ('TRUNCATE'),('TRIGGER'),('REFERENCES'),('MAINTAIN')) AS p(privilege)
WHERE has_table_privilege(r.rolename, format('public.%I',t.tablename),p.privilege);
