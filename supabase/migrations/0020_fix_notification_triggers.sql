-- ================================================================
-- Migration 0020: Fix Notification Triggers
-- Corrects triggers that were using 'body' instead of 'message'.
-- ================================================================

-- 1. Notify on Enrolled
CREATE OR REPLACE FUNCTION public.notify_on_enrolled()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Enrolled' THEN
        INSERT INTO public.notifications (agency_id, user_id, title, message, type, link)
        SELECT
            NEW.agency_id,
            u.id,
            'Student Enrolled 🎓',
            (SELECT first_name || ' ' || last_name FROM public.leads WHERE id = NEW.id) || ' has reached Enrolled status.',
            'lead',
            '/dashboard/leads/' || NEW.id
        FROM public.users u
        WHERE u.agency_id = NEW.agency_id
          AND u.role IN ('super_admin', 'agency_admin');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Notify on New Ticket
CREATE OR REPLACE FUNCTION public.notify_on_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (agency_id, user_id, title, message, type, link)
    SELECT
        NEW.agency_id,
        u.id,
        'New Support Ticket 🎫',
        NEW.ticket_no || ': ' || NEW.subject,
        'ticket',
        '/dashboard/tickets'
    FROM public.users u
    WHERE u.agency_id = NEW.agency_id
      AND u.role IN ('super_admin', 'agency_admin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Notify on Leave Request
CREATE OR REPLACE FUNCTION public.notify_on_leave_request()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (agency_id, user_id, title, message, type, link)
    SELECT
        NEW.agency_id,
        u.id,
        'New Leave Request',
        (SELECT first_name || ' ' || last_name FROM public.users WHERE id = NEW.user_id) || ' requested ' || NEW.leave_type || ' leave.',
        'leave',
        '/dashboard/leave'
    FROM public.users u
    WHERE u.agency_id = NEW.agency_id
      AND u.role IN ('super_admin', 'agency_admin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Notify on Leave Decision
CREATE OR REPLACE FUNCTION public.notify_leave_decision()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
        INSERT INTO public.notifications (agency_id, user_id, title, message, type, link)
        VALUES (
            NEW.agency_id,
            NEW.user_id,
            CASE WHEN NEW.status = 'approved' THEN '✅ Leave Approved' ELSE '❌ Leave Rejected' END,
            NEW.leave_type || ' leave ' || NEW.status || ' for ' || NEW.from_date || ' to ' || NEW.to_date,
            'leave',
            '/dashboard/leave'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Notify on Lead Assigned
CREATE OR REPLACE FUNCTION public.notify_on_lead_assigned()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (agency_id, user_id, title, message, type, link)
    VALUES (
        NEW.agency_id,
        NEW.owner_id,
        'New Lead Assigned 👤',
        NEW.first_name || ' ' || NEW.last_name || ' has been added to your pipeline.',
        'lead',
        '/dashboard/leads/' || NEW.id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
