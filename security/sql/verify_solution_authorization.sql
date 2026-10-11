-- READ-ONLY verification after staging migration; expected all 0 for privilege counts.
SELECT count(*) AS excessive_grants_remaining
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('support_issues','solutions','feedback','troubleshooting_history')
  AND grantee IN ('anon','authenticated')
  AND privilege_type IN ('TRUNCATE','TRIGGER','REFERENCES');

-- expected: 0 rows
SELECT grantee, column_name
FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name='solutions'
  AND grantee IN ('anon','authenticated') AND privilege_type='UPDATE'
  AND column_name IN ('id','issue_id','created_by','is_verified','created_at');

-- expected: only title, steps, updated_at for authenticated; no anon UPDATE.
SELECT grantee, column_name
FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name='solutions'
  AND grantee IN ('anon','authenticated') AND privilege_type='UPDATE'
ORDER BY grantee, column_name;

-- expected: 3 policies include is_verified = false; insert/update checks issue ownership.
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='solutions'
  AND policyname IN ('solutions_insert_for_own_issue','solutions_update_own','solutions_delete_own')
ORDER BY policyname;

-- expected: true
SELECT relrowsecurity AS rls_enabled
FROM pg_class
WHERE oid='public.solutions'::regclass;
