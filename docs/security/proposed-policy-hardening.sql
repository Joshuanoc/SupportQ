-- REVIEW DRAFT ONLY. Not applied. This is not a migration-history file.
-- Validate against a disposable Supabase environment and two non-admin users.
-- Generate an actual migration with Supabase CLI after review and passing tests.
BEGIN;

-- Preserve the existing private-case model while checking both old and new links.
ALTER POLICY solutions_insert_for_own_issue ON public.solutions
WITH CHECK (
  created_by = (SELECT auth.uid()) AND is_verified = false
  AND EXISTS (SELECT 1 FROM public.support_issues i
    WHERE i.id = solutions.issue_id AND i.user_id = (SELECT auth.uid()))
);
ALTER POLICY solutions_update_own ON public.solutions
USING (
  created_by = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.support_issues i
    WHERE i.id = solutions.issue_id AND i.user_id = (SELECT auth.uid()))
)
WITH CHECK (
  created_by = (SELECT auth.uid()) AND is_verified = false
  AND EXISTS (SELECT 1 FROM public.support_issues i
    WHERE i.id = solutions.issue_id AND i.user_id = (SELECT auth.uid()))
);

-- No client path may self-verify a solution. A future reviewed verification
-- service must define its own authorization, provenance and audit requirements.
REVOKE UPDATE ON public.solutions FROM authenticated;
GRANT UPDATE (title, steps) ON public.solutions TO authenticated;

ALTER POLICY feedback_insert_own ON public.feedback
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.solutions s WHERE s.id = feedback.solution_id)
);
ALTER POLICY feedback_update_own ON public.feedback
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.solutions s WHERE s.id = feedback.solution_id)
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.solutions s WHERE s.id = feedback.solution_id)
);

-- Referenced solution SELECT remains subject to its owner-linked RLS policy.
-- Remove unused table-wide privileges without changing owner DML policies.
REVOKE ALL ON public.support_issues, public.solutions,
  public.troubleshooting_history, public.feedback FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.support_issues,
  public.solutions, public.troubleshooting_history, public.feedback FROM authenticated;

-- profiles currently has no audited anon/authenticated table grants.
-- Before enabling profile edits, use a separate reviewed column-level grant
-- limited to display_name; never grant UPDATE on role or id to browser users.
COMMIT;
