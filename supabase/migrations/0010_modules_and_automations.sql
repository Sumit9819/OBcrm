-- ==============================================================================
-- Migration 0010: localStorage → Supabase + Automation Triggers + Chat Channels
-- ==============================================================================

-- ============================================================
-- PART 1: New module tables (replacing localStorage)
-- ============================================================

-- 1. Tasks
CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.tasks
    FOR ALL USING (
        owner_id = auth.uid() OR
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','agency_admin')
    );

-- 2. Reminders
CREATE TABLE public.reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    note TEXT,
    remind_at TIMESTAMPTZ NOT NULL,
    snoozed_until TIMESTAMPTZ,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reminders" ON public.reminders
    FOR ALL USING (user_id = auth.uid());

-- 3. Calendar Events
CREATE TABLE public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    meeting_id UUID, -- linked to meetings table (set after meetings table is created)
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    event_type TEXT NOT NULL DEFAULT 'event' CHECK (event_type IN ('event','meeting','follow_up','deadline','reminder')),
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view agency calendar events" ON public.calendar_events
    FOR ALL USING (
        user_id = auth.uid() OR
        (SELECT agency_id FROM public.users WHERE id = auth.uid()) = calendar_events.agency_id
    );

-- 4. Meetings
CREATE TABLE public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    meeting_type TEXT NOT NULL DEFAULT 'online' CHECK (meeting_type IN ('online','in_person','hybrid')),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','cancelled')),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    location TEXT,
    meeting_link TEXT,
    attendees TEXT[], -- array of emails or names
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members view meetings" ON public.meetings
    FOR ALL USING (
        (SELECT agency_id FROM public.users WHERE id = auth.uid()) = meetings.agency_id
    );

-- 5. Leave Requests
CREATE TABLE public.leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL DEFAULT 'annual' CHECK (leave_type IN ('annual','sick','casual','maternity','unpaid')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users submit own leave" ON public.leave_requests
    FOR ALL USING (
        user_id = auth.uid() OR
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','agency_admin')
    );

-- 6. Support Tickets
CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ticket_no TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('technical','billing','hr','general','access')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    submitted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members view tickets" ON public.tickets
    FOR ALL USING (
        (SELECT agency_id FROM public.users WHERE id = auth.uid()) = tickets.agency_id
    );

-- 7. Cash Received
CREATE TABLE public.cash_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    payer_name TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_date DATE NOT NULL,
    method TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','bank_transfer','cheque','online')),
    purpose TEXT,
    note TEXT,
    received_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accountants/Admins manage cash entries" ON public.cash_entries
    FOR ALL USING (
        (SELECT agency_id FROM public.users WHERE id = auth.uid()) = cash_entries.agency_id AND
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','agency_admin','accountant')
    );

-- 8. Newsletter Templates
CREATE TABLE public.newsletter_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'newsletter' CHECK (category IN ('welcome','followup','promotion','update','newsletter')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage newsletter templates" ON public.newsletter_templates
    FOR ALL USING (
        (SELECT agency_id FROM public.users WHERE id = auth.uid()) = newsletter_templates.agency_id AND
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','agency_admin')
    );

-- 9. Attendance Records
CREATE TABLE public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','leave','half_day')),
    note TEXT,
    marked_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attendance" ON public.attendance
    FOR ALL USING (
        (SELECT agency_id FROM public.users WHERE id = auth.uid()) = attendance.agency_id
    );

-- ============================================================
-- PART 2: Chat Channels (group chats + lead-linked threads)
-- ============================================================

CREATE TABLE public.chat_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT, -- NULL for DM channels
    channel_type TEXT NOT NULL DEFAULT 'dm' CHECK (channel_type IN ('dm','group','lead_thread')),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE, -- for lead_thread type
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.channel_members (
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (channel_id, user_id)
);
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Messages now reference channels instead of direct sender/receiver
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE;

-- RLS for channels: members only
CREATE POLICY "Channel members only" ON public.chat_channels
    FOR ALL USING (
        id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
        OR (SELECT agency_id FROM public.users WHERE id = auth.uid()) = chat_channels.agency_id
    );
CREATE POLICY "Channel members access" ON public.channel_members
    FOR ALL USING (
        user_id = auth.uid() OR
        channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
    );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE
    tasks, reminders, calendar_events, meetings, leave_requests,
    tickets, attendance, chat_channels, channel_members;

-- ============================================================
-- PART 3: DB Automation Triggers
-- ============================================================

-- Trigger 1: Lead status change → auto-log to activities
CREATE OR REPLACE FUNCTION public.auto_log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.activities (agency_id, lead_id, user_id, type, description)
        VALUES (
            NEW.agency_id,
            NEW.id,
            NEW.owner_id,
            'stage_change',
            'Status changed from ' || OLD.status || ' → ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_lead_status_change
    AFTER UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_log_status_change();

-- Trigger 2: Lead status → 'Enrolled' → auto-notify admins
CREATE OR REPLACE FUNCTION public.notify_on_enrolled()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Enrolled' THEN
        INSERT INTO public.notifications (agency_id, user_id, title, body, type, link)
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

CREATE TRIGGER trg_lead_enrolled
    AFTER UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_enrolled();

-- Trigger 3: New ticket → notify admins
CREATE OR REPLACE FUNCTION public.notify_on_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (agency_id, user_id, title, body, type, link)
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

CREATE TRIGGER trg_new_ticket
    AFTER INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_ticket();

-- Trigger 4: New meeting → auto-create calendar event
CREATE OR REPLACE FUNCTION public.meeting_to_calendar()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.calendar_events (
        agency_id, user_id, lead_id, meeting_id,
        title, description, start_at, end_at, event_type, color
    ) VALUES (
        NEW.agency_id,
        NEW.created_by,
        NEW.lead_id,
        NEW.id,
        NEW.title,
        NEW.description,
        NEW.start_at,
        NEW.end_at,
        'meeting',
        '#6366f1'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_meeting_to_calendar
    AFTER INSERT ON public.meetings
    FOR EACH ROW
    EXECUTE FUNCTION public.meeting_to_calendar();

-- Trigger 5: Leave approved → auto-mark attendance as 'leave'
CREATE OR REPLACE FUNCTION public.leave_to_attendance()
RETURNS TRIGGER AS $$
DECLARE
    d DATE;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
        d := NEW.from_date;
        WHILE d <= NEW.to_date LOOP
            INSERT INTO public.attendance (agency_id, user_id, date, status, note, marked_by)
            VALUES (NEW.agency_id, NEW.user_id, d, 'leave', 'Auto-filled from approved leave request', NEW.approved_by)
            ON CONFLICT (user_id, date) DO UPDATE
                SET status = 'leave',
                    note = 'Auto-filled from approved leave request';
            d := d + INTERVAL '1 day';
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_leave_to_attendance
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.leave_to_attendance();

-- Trigger 6: Leave request (new) → notify admins
CREATE OR REPLACE FUNCTION public.notify_on_leave_request()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (agency_id, user_id, title, body, type, link)
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

CREATE TRIGGER trg_leave_request_notify
    AFTER INSERT ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_leave_request();

-- Trigger 7: Leave approved/rejected → notify the requester
CREATE OR REPLACE FUNCTION public.notify_leave_decision()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
        INSERT INTO public.notifications (agency_id, user_id, title, body, type, link)
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

CREATE TRIGGER trg_leave_decision
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_leave_decision();

-- Trigger 8: New lead → notify assigned agent
CREATE OR REPLACE FUNCTION public.notify_on_lead_assigned()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (agency_id, user_id, title, body, type, link)
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

CREATE TRIGGER trg_lead_assigned
    AFTER INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_lead_assigned();

-- Trigger 9: Auto ticket_no sequence
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

CREATE OR REPLACE FUNCTION public.set_ticket_no()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_no := 'TKT-' || LPAD(nextval('ticket_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_no
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    WHEN (NEW.ticket_no IS NULL OR NEW.ticket_no = '')
    EXECUTE FUNCTION public.set_ticket_no();
