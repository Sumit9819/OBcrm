-- Hotfix for log_lead_assignment trigger search_path issue

CREATE OR REPLACE FUNCTION public.log_lead_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.activities (agency_id, lead_id, user_id, type, description)
        SELECT
            NEW.agency_id,
            NEW.id,
            auth.uid(),
            'note',
            'Lead assigned to ' || COALESCE(u.first_name || ' ' || u.last_name, 'team member')
        FROM public.users u WHERE u.id = NEW.assigned_to;
    END IF;
    RETURN NEW;
END;
$$;
