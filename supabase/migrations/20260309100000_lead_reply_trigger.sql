-- ========================================================================================
-- Add Support for Lead Replies in Messages Table & Trigger Notifications
-- ========================================================================================

-- Allow messages to be sent by leads (sender_id can be null if from lead)
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_from_lead boolean DEFAULT false;

-- Function to handle notifications for lead replies
CREATE OR REPLACE FUNCTION public.notify_lead_reply()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_owner_id uuid;
    v_lead_name text;
BEGIN
    -- Only trigger if this is an incoming message from a lead
    IF NEW.is_from_lead = true AND NEW.lead_id IS NOT NULL THEN
        
        -- Get the owner of the lead and the lead's name
        SELECT owner_id, concat(first_name, ' ', last_name) INTO v_owner_id, v_lead_name 
        FROM public.leads 
        WHERE id = NEW.lead_id;
        
        IF v_owner_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, agency_id, title, message, type, link)
            VALUES (
                v_owner_id,
                NEW.agency_id,
                'New Reply from ' || COALESCE(v_lead_name, 'Lead'),
                LEFT(NEW.content, 100),
                'message',
                '/dashboard/leads/' || NEW.lead_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_new_lead_reply ON public.messages;
CREATE TRIGGER on_new_lead_reply
    AFTER INSERT ON public.messages
    FOR EACH ROW 
    EXECUTE FUNCTION public.notify_lead_reply();
