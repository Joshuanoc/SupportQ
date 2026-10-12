-- REVIEW ONLY: apply first to an isolated staging database, never automatically to production.
-- Based on the existing SupportQ solutions RLS policies inspected 2026-10-12.
-- Protect verification status, ownership/relationship columns, and verified records.
BEGIN;

ALTER POLICY solutions_insert_for_own_issue ON public.solutions
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND is_verified = FALSE
    AND EXISTS (
      SELECT 1 FROM public.support_issues i
      WHERE i.id = solutions.issue_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY solutions_update_own ON public.solutions
  USING (
    created_by = (SELECT auth.uid())
    AND is_verified = FALSE
    AND EXISTS (
      SELECT 1 FROM public.support_issues i
      WHERE i.id = solutions.issue_id
        AND i.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND is_verified = FALSE
    AND EXISTS (
      SELECT 1 FROM public.support_issues i
      WHERE i.id = solutions.issue_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY solutions_delete_own ON public.solutions
  USING (
    created_by = (SELECT auth.uid())
    AND is_verified = FALSE
    AND EXISTS (
      SELECT 1 FROM public.support_issues i
      WHERE i.id = solutions.issue_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

-- Table-level UPDATE must be revoked before a restrictive column grant can work.
-- Revoke existing explicit column grants too; PostgreSQL may have both.
REVOKE UPDATE ON TABLE public.solutions FROM anon, authenticated;
REVOKE UPDATE (id, issue_id, created_by, is_verified, created_at, title, steps, updated_at)
  ON TABLE public.solutions FROM anon, authenticated;
GRANT UPDATE (title, steps, updated_at) ON TABLE public.solutions TO authenticated;

COMMIT;

-- Run security/sql/verify_solution_authorization.sql after applying in staging.
-- Verified solutions remain immutable to ordinary users. A separately reviewed,
-- authorized server-side workflow is required for moderator verification.
