-- ================================================================
-- Migration: 20260316093000_optimize_rls_initplan.sql
-- Description:
--   Reduce per-row auth function evaluation in RLS policies by
--   wrapping auth.uid() calls in (select auth.uid()).
-- ================================================================

-- users
ALTER POLICY "Users view same agency"
ON public.users
USING ((id = (select auth.uid())) OR (agency_id = get_my_agency_id()));

-- agency_integrations
ALTER POLICY "Admins can view their agency integrations"
ON public.agency_integrations
USING (
    agency_id IN (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
          AND users.role IN ('agency_admin', 'super_admin')
    )
);

ALTER POLICY "Admins can insert their agency integrations"
ON public.agency_integrations
WITH CHECK (
    agency_id IN (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
          AND users.role IN ('agency_admin', 'super_admin')
    )
);

ALTER POLICY "Admins can update their agency integrations"
ON public.agency_integrations
USING (
    agency_id IN (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
          AND users.role IN ('agency_admin', 'super_admin')
    )
);

ALTER POLICY "Admins can delete their agency integrations"
ON public.agency_integrations
USING (
    agency_id IN (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
          AND users.role IN ('agency_admin', 'super_admin')
    )
);

-- destination_doc_checklists
ALTER POLICY "Agency members view checklists"
ON public.destination_doc_checklists
USING (
    agency_id = (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
    )
);

ALTER POLICY "Admins manage checklists"
ON public.destination_doc_checklists
USING (
    (
        SELECT users.role
        FROM public.users
        WHERE users.id = (select auth.uid())
    ) IN ('super_admin', 'agency_admin')
);

-- lead_doc_checklist
ALTER POLICY "Agency members view lead checklist"
ON public.lead_doc_checklist
USING (
    agency_id = (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
    )
);

ALTER POLICY "Agency members manage lead checklist"
ON public.lead_doc_checklist
USING (
    agency_id = (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
    )
);

-- application_activities
ALTER POLICY "Agency members view app activities"
ON public.application_activities
USING (
    agency_id = (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
    )
);

ALTER POLICY "Agency members insert app activities"
ON public.application_activities
WITH CHECK (
    agency_id = (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
    )
);
