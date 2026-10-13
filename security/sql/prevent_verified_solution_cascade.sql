-- REVIEW ONLY: run on disposable staging before any authorized production migration.
-- The solutions.issue_id FK is ON DELETE CASCADE. Child DELETE RLS does not
-- protect verified solutions when a parent support_issues row is deleted.
-- This guard must ship together with TRUNCATE revocation in this PR:
-- TRUNCATE bypasses DELETE triggers. Review account deletion workflows.
BEGIN;

CREATE OR REPLACE FUNCTION public.reject_issue_delete_with_verified_solutions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.solutions s
    WHERE s.issue_id = OLD.id AND s.is_verified IS TRUE
  ) THEN
    RAISE EXCEPTION 'Cannot delete an issue containing verified solutions'
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public.reject_issue_delete_with_verified_solutions()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER protect_verified_solutions_on_issue_delete
BEFORE DELETE ON public.support_issues
FOR EACH ROW
EXECUTE FUNCTION public.reject_issue_delete_with_verified_solutions();

COMMIT;

-- Read-only staging verification (expect one enabled trigger; invoker function):
SELECT t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS definition,
       p.prosecdef AS is_security_definer
FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
WHERE t.tgrelid='public.support_issues'::regclass
  AND t.tgname='protect_verified_solutions_on_issue_delete';

-- Mandatory staging tests with two actual non-admin accounts:
-- Owner deleting an issue without solutions succeeds.
-- Owner deleting an issue with only unverified solutions succeeds.
-- Owner deleting an issue with verified solutions returns SQLSTATE 23503;
-- parent, verified child and any other children all survive.
-- Cross-user/anonymous deletes denied. No RLS recursion or permission errors.
-- Confirm anon/authenticated lack TRUNCATE on both parent and child.
-- Verify account deletion and moderator workflows, accessible UI errors.
