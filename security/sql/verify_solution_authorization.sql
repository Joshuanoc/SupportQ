-- READ-ONLY verification after staging migrations. Never apply DDL from this file.
-- Expected: zero excessive direct grants.
SELECT count(*) AS excessive_grants_remaining
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('support_issues','solutions','feedback','troubleshooting_history')
  AND grantee IN ('anon','authenticated')
  AND privilege_type IN ('TRUNCATE','TRIGGER','REFERENCES','MAINTAIN');

-- Expected: 0 rows. Effective checks also detect inherited/PUBLIC grants.
SELECT t.tablename, r.rolename, p.privilege
FROM (VALUES ('support_issues'),('solutions'),('feedback'),('troubleshooting_history')) AS t(tablename)
CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(rolename)
CROSS JOIN (VALUES ('TRUNCATE'),('TRIGGER'),('REFERENCES'),('MAINTAIN')) AS p(privilege)
WHERE has_table_privilege(r.rolename, format('public.%I',t.tablename),p.privilege);

-- Expected: 0 rows. Detect direct or inherited UPDATE access to sensitive columns.
SELECT r.rolename, c.column_name
FROM (VALUES ('anon'),('authenticated')) AS r(rolename)
CROSS JOIN (VALUES ('id'),('issue_id'),('created_by'),('is_verified'),('created_at')) AS c(column_name)
WHERE has_column_privilege(r.rolename,'public.solutions',c.column_name,'UPDATE');

-- Expected: authenticated can update title and steps; anon cannot.
SELECT r.rolename, c.column_name,
       has_column_privilege(r.rolename,'public.solutions',c.column_name,'UPDATE') AS can_update
FROM (VALUES ('anon'),('authenticated')) AS r(rolename)
CROSS JOIN (VALUES ('title'),('steps')) AS c(column_name);

-- Expected: three policies enforce is_verified = false;
-- INSERT and UPDATE checks also enforce owning the parent issue.
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='solutions'
  AND policyname IN ('solutions_insert_for_own_issue','solutions_update_own','solutions_delete_own')
ORDER BY policyname;

-- Expected: true.
SELECT relrowsecurity AS rls_enabled
FROM pg_class WHERE oid='public.solutions'::regclass;

-- Required manual staging test: run as two actual non-admin users (not service_role)
-- and verify allowed owner CRUD; blocked self-verification, cross-user changes,
-- ownership reassignment and deletion/edit of verified solutions.
