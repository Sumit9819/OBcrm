-- ================================================================
-- Migration: 20260316090000_security_and_performance_hardening.sql
-- Description:
--   1) Harden SECURITY DEFINER functions with fixed search_path
--   2) Fix lead-assignment notification recipient logic
--   3) Add missing foreign-key covering indexes flagged by advisors
-- ================================================================

-- ----------------------------------------------------------------
-- 1) Harden SECURITY DEFINER functions from lead pipeline redesign
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_lead_lost_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status = 'Lost' AND (OLD.status IS DISTINCT FROM 'Lost') THEN
        NEW.lost_at = now();
    ELSIF OLD.status = 'Lost' AND NEW.status <> 'Lost' THEN
        NEW.lost_at = NULL;
        NEW.lost_reason = NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status IN ('Applied', 'Lodged') AND NEW.applied_at IS NULL THEN
        NEW.applied_at = now();
    END IF;

    IF NEW.status IN ('Conditional Offer', 'Unconditional Offer')
       AND NEW.offer_received_at IS NULL THEN
        NEW.offer_received_at = now();
    END IF;

    IF NEW.status = 'Unconditional Offer' AND NEW.unconditional_at IS NULL THEN
        NEW.unconditional_at = now();
    END IF;

    IF NEW.status = 'Visa Filed' AND NEW.visa_filed_at IS NULL THEN
        NEW.visa_filed_at = now();
    END IF;

    IF NEW.status = 'Visa Approved' AND NEW.visa_approved_at IS NULL THEN
        NEW.visa_approved_at = now();
    END IF;

    IF NEW.status = 'Visa Denied' AND NEW.visa_denied_at IS NULL THEN
        NEW.visa_denied_at = now();
    END IF;

    IF NEW.status = 'Enrolled' AND NEW.enrolled_at IS NULL THEN
        NEW.enrolled_at = now();
    END IF;

    IF NEW.status = 'Rejected' AND NEW.rejected_at IS NULL THEN
        NEW.rejected_at = now();
    END IF;

    IF NEW.status = 'Withdrawn' AND NEW.withdrawn_at IS NULL THEN
        NEW.withdrawn_at = now();
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_lead_followup_from_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.next_followup_at IS NOT NULL THEN
        UPDATE public.leads
        SET
            next_followup_at = NEW.next_followup_at,
            followup_note = COALESCE(NEW.comment, NEW.feedback)
        WHERE id = NEW.lead_id
          AND (next_followup_at IS NULL OR NEW.next_followup_at <= next_followup_at);
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_overdue_followups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            l.id AS lead_id,
            l.agency_id,
            l.first_name,
            l.last_name,
            l.assigned_to,
            l.next_followup_at,
            l.followup_note
        FROM public.leads l
        WHERE l.next_followup_at <= now()
          AND l.next_followup_at > (now() - INTERVAL '24 hours')
          AND l.status <> 'Lost'
          AND l.status <> 'Converted'
          AND l.assigned_to IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.notifications n
              WHERE n.user_id = l.assigned_to
                AND n.type = 'followup'
                AND n.link LIKE '%' || l.id::text || '%'
                AND n.created_at > (now() - INTERVAL '24 hours')
          )
    LOOP
        INSERT INTO public.notifications (user_id, agency_id, type, title, message, link)
        VALUES (
            r.assigned_to,
            r.agency_id,
            'followup',
            'Follow-up Due',
            'Follow up with ' || r.first_name || ' ' || r.last_name
                || CASE WHEN r.followup_note IS NOT NULL THEN ': "' || r.followup_note || '"' ELSE '' END,
            '/dashboard/leads/' || r.lead_id::text
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_destination_checklists(p_agency_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'AU', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'AU', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'AU', 'English Test Score (IELTS/PTE)',    'english_test',        true,  3),
        (p_agency_id, 'AU', 'Statement of Purpose (SOP)',        'sop',                 true,  4),
        (p_agency_id, 'AU', 'Genuine Temporary Entrant (GTE) Letter', 'gte_letter',     true,  5),
        (p_agency_id, 'AU', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  6),
        (p_agency_id, 'AU', 'Reference / Recommendation Letters', 'reference_letters',  false, 7),
        (p_agency_id, 'AU', 'Work Experience Documents',         'work_experience',     false, 8)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;

    INSERT INTO public.destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'UK', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'UK', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'UK', 'English Test Score (IELTS/PTE)',    'english_test',        true,  3),
        (p_agency_id, 'UK', 'Personal Statement',                'personal_statement',  true,  4),
        (p_agency_id, 'UK', 'Reference Letters (2)',             'reference_letters',   true,  5),
        (p_agency_id, 'UK', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  6),
        (p_agency_id, 'UK', 'CAS Number (from university)',      'cas_number',          false, 7),
        (p_agency_id, 'UK', 'TB Test Certificate',               'tb_test',             false, 8)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;

    INSERT INTO public.destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'CA', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'CA', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'CA', 'English Test Score (IELTS/PTE)',    'english_test',        true,  3),
        (p_agency_id, 'CA', 'Statement of Purpose (SOP)',        'sop',                 true,  4),
        (p_agency_id, 'CA', 'GIC Receipt (Guaranteed Investment)', 'gic_receipt',       true,  5),
        (p_agency_id, 'CA', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  6),
        (p_agency_id, 'CA', 'Reference Letters',                 'reference_letters',   false, 7),
        (p_agency_id, 'CA', 'Medical Exam Certificate',          'medical_exam',        false, 8)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;

    INSERT INTO public.destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'US', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'US', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'US', 'English Test Score (TOEFL/IELTS)',  'english_test',        true,  3),
        (p_agency_id, 'US', 'Statement of Purpose (SOP)',        'sop',                 true,  4),
        (p_agency_id, 'US', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  5),
        (p_agency_id, 'US', 'Reference Letters (3)',             'reference_letters',   true,  6),
        (p_agency_id, 'US', 'I-20 Form (from university)',       'i20_form',            false, 7),
        (p_agency_id, 'US', 'SAT/GRE/GMAT Score',                'standardized_test',   false, 8)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;

    INSERT INTO public.destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'NZ', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'NZ', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'NZ', 'English Test Score (IELTS/PTE)',    'english_test',        true,  3),
        (p_agency_id, 'NZ', 'Statement of Purpose (SOP)',        'sop',                 true,  4),
        (p_agency_id, 'NZ', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  5),
        (p_agency_id, 'NZ', 'Medical Certificate',               'medical_cert',        false, 6),
        (p_agency_id, 'NZ', 'Police Clearance Certificate',      'police_clearance',    false, 7)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_seed_agency_checklists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.seed_destination_checklists(NEW.id);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.application_activities
            (agency_id, application_id, lead_id, user_id, type, from_status, to_status, description)
        VALUES (
            NEW.agency_id,
            NEW.id,
            NEW.lead_id,
            auth.uid(),
            'status_change',
            OLD.status::text,
            NEW.status::text,
            'Status changed from ' || OLD.status::text || ' to ' || NEW.status::text
        );
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- 2) Fix notification recipient on lead assignment
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_lead_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    recipient_id uuid;
BEGIN
    recipient_id := COALESCE(NEW.assigned_to, NEW.owner_id);

    IF recipient_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (agency_id, user_id, title, message, type, link)
    VALUES (
        NEW.agency_id,
        recipient_id,
        'New Lead Assigned',
        NEW.first_name || ' ' || NEW.last_name || ' has been added to your pipeline.',
        'lead',
        '/dashboard/leads/' || NEW.id
    );

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- 3) Add missing indexes for foreign keys flagged by advisors
-- ----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_application_activities_agency_id
    ON public.application_activities (agency_id);

CREATE INDEX IF NOT EXISTS idx_application_activities_user_id
    ON public.application_activities (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_branch_id
    ON public.applications (branch_id)
    WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_course_id
    ON public.applications (course_id)
    WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_doc_checklist_agency_id
    ON public.lead_doc_checklist (agency_id);

CREATE INDEX IF NOT EXISTS idx_lead_doc_checklist_checklist_id
    ON public.lead_doc_checklist (checklist_id);

CREATE INDEX IF NOT EXISTS idx_lead_doc_checklist_document_id
    ON public.lead_doc_checklist (document_id)
    WHERE document_id IS NOT NULL;
